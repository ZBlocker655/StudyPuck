import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
	cleanupStaleBranches,
	createBranchName,
	deleteBranch,
	getConnectionOptions,
	getExpirationTimestamp,
	getNeonBranchEnv,
	runCommandStreaming,
	runNeon,
	shouldPreserveOnFailure,
	formatWindowsCommand,
} from './neon-ephemeral-branch.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const webAppDir = resolve(repoRoot, 'apps', 'web');
const viteCliPath = resolve(webAppDir, 'node_modules', 'vite', 'bin', 'vite.js');
const playwrightArgs = process.argv.slice(2);
const BRANCH_PREFIX = 'test-e2e-web-';
const PARENT_BRANCH = 'development';
const SERVER_HOST = '127.0.0.1';
const DEFAULT_SERVER_PORT = 4173;
const SERVER_START_TIMEOUT_MS = 180_000;

const startLongRunningCommand = (command, commandArgs, env, cwd) =>
	process.platform === 'win32'
		? spawn(formatWindowsCommand(command, commandArgs), {
				cwd,
				env,
				shell: true,
				stdio: 'inherit',
			})
		: spawn(command, commandArgs, {
				cwd,
				env,
				stdio: 'inherit',
			});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const findAvailablePort = async (preferredPort) => {
	for (let port = preferredPort; port < preferredPort + 20; port += 1) {
		const isAvailable = await new Promise((resolve) => {
			const server = createServer();
			server.unref();
			server.once('error', () => resolve(false));
			server.listen(port, SERVER_HOST, () => {
				server.close(() => resolve(true));
			});
		});

		if (isAvailable) {
			return port;
		}
	}

	throw new Error(`Unable to find an available Playwright port starting at ${preferredPort}.`);
};

const waitForServer = async (url, timeoutMs) => {
	const deadline = Date.now() + timeoutMs;

	while (Date.now() < deadline) {
		try {
			const response = await fetch(url, { redirect: 'manual' });
			if (response.status < 500) {
				return;
			}
		} catch {
			// Keep polling until timeout.
		}

		await delay(1_000);
	}

	throw new Error(`Timed out waiting ${timeoutMs}ms for ${url} to become ready.`);
};

const baseEnv = getNeonBranchEnv({ includeStudypuckEnv: true });
const { roleName, databaseName } = getConnectionOptions(baseEnv.DATABASE_URL);
const preserveOnFailure = shouldPreserveOnFailure();
let branchName;
let branchCreated = false;
let serverProcess;

try {
	cleanupStaleBranches({
		env: baseEnv,
		prefix: BRANCH_PREFIX,
		label: 'browser-test',
	});

	branchName = createBranchName(BRANCH_PREFIX);
	console.log(`Creating ephemeral browser-test branch: ${branchName}`);
	runNeon(
		[
			'branches',
			'create',
			'--name',
			branchName,
			'--parent',
			PARENT_BRANCH,
			'--expires-at',
			getExpirationTimestamp(),
		],
		baseEnv
	);
	branchCreated = true;

	const testDatabaseUrl = runNeon(
		[
			'connection-string',
			branchName,
			'--database-name',
			databaseName,
			'--role-name',
			roleName,
			'--ssl',
			'require',
		],
		baseEnv
	);

	const testEnv = {
		...baseEnv,
		TEST_DATABASE_URL: testDatabaseUrl,
		DATABASE_URL: testDatabaseUrl,
		E2E_TEST_MODE: 'enabled',
	};
	const requestedPort = process.env.PLAYWRIGHT_PORT;
	const serverPort = requestedPort
		? Number(requestedPort)
		: await findAvailablePort(DEFAULT_SERVER_PORT);
	const serverUrl = `http://${SERVER_HOST}:${serverPort}`;

	// Retry migration up to 3 times — Neon compute endpoints may need a few seconds to
	// warm up after branch creation, and a cold-start TLS failure can crash the driver
	// (exit code 3221225501 on Windows) rather than returning a graceful error.
	let migrateExitCode = 1;
	for (let attempt = 1; attempt <= 3; attempt++) {
		if (attempt > 1) {
			console.log(`Migration attempt ${attempt - 1} failed (exit ${migrateExitCode}), waiting 8s for Neon endpoint warm-up...`);
			await delay(8_000);
		}
		migrateExitCode = await runCommandStreaming(
			'pnpm',
			['--dir', webAppDir, 'db:migrate'],
			testEnv,
			repoRoot
		);
		if (migrateExitCode === 0) break;
	}
	if (migrateExitCode !== 0) {
		throw new Error(`Database migration exited with code ${migrateExitCode}`);
	}

	serverProcess = startLongRunningCommand(
		'node',
		[
			viteCliPath,
			'dev',
			'--host',
			SERVER_HOST,
			'--port',
			String(serverPort),
			'--strictPort',
		],
		testEnv,
		webAppDir
	);

	if (!requestedPort && serverPort !== DEFAULT_SERVER_PORT) {
		console.log(`Port ${DEFAULT_SERVER_PORT} is busy; using Playwright port ${serverPort} instead.`);
	}

	await waitForServer(serverUrl, SERVER_START_TIMEOUT_MS);

	const exitCode = await runCommandStreaming(
		'pnpm',
		[
			'--dir',
			webAppDir,
			'test:e2e',
			...(playwrightArgs.length > 0 ? ['--', ...playwrightArgs] : []),
		],
		{
			...testEnv,
			PLAYWRIGHT_MANAGED_SERVER: '1',
			PLAYWRIGHT_BASE_URL: serverUrl,
			PLAYWRIGHT_PORT: String(serverPort),
		},
		repoRoot
	);

	if (exitCode !== 0) {
		throw new Error(`Playwright exited with code ${exitCode}`);
	}
} catch (error) {
	if (branchCreated && branchName && preserveOnFailure) {
		console.error(
			`Preserving Neon browser-test branch for debugging because PRESERVE_TEST_DB_ON_FAILURE is enabled: ${branchName}`
		);
		const message = error instanceof Error ? error.message : String(error);
		console.error(message);
		process.exit(1);
	}

	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	process.exitCode = 1;
} finally {
	if (serverProcess && !serverProcess.killed) {
		serverProcess.kill();
	}

	if (branchCreated && branchName && !(process.exitCode && preserveOnFailure)) {
		try {
			console.log(`Deleting ephemeral browser-test branch: ${branchName}`);
			deleteBranch(branchName, baseEnv);
		} catch (cleanupError) {
			const message =
				cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
			console.error(`Failed to delete Neon browser-test branch ${branchName}: ${message}`);
			process.exitCode = 1;
		}
	}
}
