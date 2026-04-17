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
} from './neon-ephemeral-branch.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const packageDir = resolve(repoRoot, 'packages', 'database');
const BRANCH_PREFIX = 'test-db-package-';
const PARENT_BRANCH = 'development';

const baseEnv = getNeonBranchEnv({ allowSecretFallback: false });
const { roleName, databaseName } = getConnectionOptions(baseEnv.DATABASE_URL);
const preserveOnFailure = shouldPreserveOnFailure();
let branchName;
let branchCreated = false;

try {
	cleanupStaleBranches({
		env: baseEnv,
		prefix: BRANCH_PREFIX,
		label: 'database-package test',
	});

	branchName = createBranchName(BRANCH_PREFIX);
	console.log(`Creating ephemeral database-package test branch: ${branchName}`);
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
	};

	const exitCode = await runCommandStreaming(
		'pnpm',
		['--dir', packageDir, 'run', 'test:branch:raw'],
		testEnv,
		repoRoot
	);

	if (exitCode !== 0) {
		throw new Error(`Database package tests exited with code ${exitCode}`);
	}
} catch (error) {
	if (branchCreated && branchName && preserveOnFailure) {
		console.error(
			`Preserving Neon database-package test branch for debugging because PRESERVE_TEST_DB_ON_FAILURE is enabled: ${branchName}`
		);
		const message = error instanceof Error ? error.message : String(error);
		console.error(message);
		process.exit(1);
	}

	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	process.exitCode = 1;
} finally {
	if (branchCreated && branchName && !(process.exitCode && preserveOnFailure)) {
		try {
			console.log(`Deleting ephemeral database-package test branch: ${branchName}`);
			deleteBranch(branchName, baseEnv);
		} catch (cleanupError) {
			const message =
				cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
			console.error(`Failed to delete Neon database-package test branch ${branchName}: ${message}`);
			process.exitCode = 1;
		}
	}
}
