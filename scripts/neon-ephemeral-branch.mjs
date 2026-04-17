import { execFileSync, execSync, spawn } from 'node:child_process';
import { resolveSecretValue, resolveStudypuckEnv } from './studypuck-env.mjs';

export const quoteWindowsArg = (value) => {
	if (!/[\s"]/u.test(value)) {
		return value;
	}

	return `"${value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, '$1$1')}"`;
};

export const formatWindowsCommand = (command, commandArgs) =>
	[quoteWindowsArg(command), ...commandArgs.map(quoteWindowsArg)].join(' ');

export const runCommandCapture = (command, commandArgs, env) => {
	if (process.platform === 'win32') {
		return execSync(formatWindowsCommand(command, commandArgs), {
			encoding: 'utf8',
			env,
			stdio: ['ignore', 'pipe', 'pipe'],
		}).trim();
	}

	return execFileSync(command, commandArgs, {
		encoding: 'utf8',
		env,
		stdio: ['ignore', 'pipe', 'pipe'],
	}).trim();
};

export const runCommandStreaming = (command, commandArgs, env, cwd) =>
	new Promise((resolve) => {
		const child =
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

		child.on('exit', (code, signal) => {
			if (signal) {
				process.kill(process.pid, signal);
				return;
			}

			resolve(code ?? 1);
		});
	});

export const runNeon = (args, env) => runCommandCapture('npx', ['--yes', 'neonctl', ...args], env);

export const deleteBranch = (branchName, env) => {
	runNeon(['branches', 'delete', branchName, '--force'], env);
};

export const listBranches = (env) => {
	const output = runNeon(['branches', 'list', '--output', 'json'], env);
	const parsed = JSON.parse(output);
	return Array.isArray(parsed) ? parsed : [];
};

export const createBranchName = (prefix) => `${prefix}${Date.now().toString(36)}`;

export const getExpirationTimestamp = (lifetimeMs = 24 * 60 * 60 * 1000) =>
	new Date(Date.now() + lifetimeMs).toISOString();

export const shouldPreserveOnFailure = () =>
	['1', 'true', 'yes'].includes((process.env.PRESERVE_TEST_DB_ON_FAILURE ?? '').toLowerCase());

export const getConnectionOptions = (databaseUrl) => {
	const parsed = new URL(databaseUrl);
	const roleName = decodeURIComponent(parsed.username);
	const databaseName = decodeURIComponent(parsed.pathname.replace(/^\//, ''));

	if (!roleName || !databaseName) {
		throw new Error('DATABASE_URL must include both a role name and database name.');
	}

	return { roleName, databaseName };
};

export const cleanupStaleBranches = ({ env, prefix, label }) => {
	const staleBranches = listBranches(env)
		.map((branch) => branch?.name)
		.filter((name) => typeof name === 'string' && name.startsWith(prefix));

	for (const branchName of staleBranches) {
		console.log(`Removing stale ${label} branch: ${branchName}`);
		deleteBranch(branchName, env);
	}
};

export const getNeonBranchEnv = ({
	includeStudypuckEnv = false,
	allowSecretFallback = true,
	requireDatabaseUrl = true,
} = {}) => {
	const env = { ...process.env };

	if (includeStudypuckEnv) {
		Object.assign(env, resolveStudypuckEnv());
	}

	if (!env.DATABASE_URL && requireDatabaseUrl) {
		env.DATABASE_URL = env.DEV_DATABASE_URL || env.PROD_DATABASE_URL;
		if (!env.DATABASE_URL) {
			if (!allowSecretFallback) {
				throw new Error(
					'DATABASE_URL is required for the Neon branch workflow. Provide DATABASE_URL or DEV_DATABASE_URL in the environment before running this command.'
				);
			}
			env.DATABASE_URL = resolveSecretValue('DATABASE_URL');
		}
	}

	if (!env.NEON_API_KEY) {
		if (!allowSecretFallback) {
			throw new Error(
				'NEON_API_KEY is required for the Neon branch workflow. Provide it in the environment before running this command.'
			);
		}
		env.NEON_API_KEY = resolveSecretValue('NEON_API_KEY');
	}

	return env;
};
