import { execFileSync, execSync, spawn } from 'node:child_process';
import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { maskValue, optionalEnvKeys, optionalSecretKeys, resolveStudypuckEnv, requiredSecretKeys } from './studypuck-env.mjs';

const args = process.argv.slice(2);
const overrides = {};
let checkOnly = false;
let scanOnly = false;
let writeDevVars = false;
let separatorIndex = args.indexOf('--');

for (let index = 0; index < args.length; index += 1) {
	const arg = args[index];
	if (arg === '--check') {
		checkOnly = true;
		continue;
	}

	if (arg === '--scan') {
		scanOnly = true;
		continue;
	}

	if (arg === '--write-dev-vars') {
		writeDevVars = true;
		continue;
	}

	if (arg === '--set') {
		const assignment = args[index + 1];
		if (!assignment || !assignment.includes('=')) {
			throw new Error('Expected KEY=value after --set');
		}

		const [key, ...valueParts] = assignment.split('=');
		overrides[key] = valueParts.join('=');
		index += 1;
		continue;
	}

	if (arg === '--') {
		separatorIndex = index;
		break;
	}
}

const baseEnv = {
	...process.env,
	...overrides,
};

const quoteWindowsArg = (value) => {
	if (!/[\s"]/u.test(value)) {
		return value;
	}

	return `"${value.replace(/(\\*)"/g, '$1$1\\"').replace(/(\\+)$/g, '$1$1')}"`;
};

const formatWindowsCommand = (command, commandArgs) =>
	[quoteWindowsArg(command), ...commandArgs.map(quoteWindowsArg)].join(' ');

const canRunCommand = (command, commandArgs) => {
	try {
		if (process.platform === 'win32') {
			execSync(formatWindowsCommand(command, commandArgs), {
				encoding: 'utf8',
				env: process.env,
				stdio: ['ignore', 'pipe', 'pipe'],
			});
			return true;
		}

		execFileSync(command, commandArgs, {
			encoding: 'utf8',
			env: process.env,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		return true;
	} catch {
		return false;
	}
};

const getVarlockInvocation = () => {
	const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

	if (canRunCommand(pnpmCommand, ['exec', 'varlock', '--version'])) {
		return {
			command: pnpmCommand,
			args: ['exec', 'varlock'],
		};
	}

	const standaloneCommand = process.platform === 'win32' ? 'varlock.cmd' : 'varlock';
	if (canRunCommand(standaloneCommand, ['--version'])) {
		return {
			command: standaloneCommand,
			args: [],
		};
	}

	return null;
};

const varlockInvocation = getVarlockInvocation();

const runCommand = (command, commandArgs, env) =>
	new Promise((resolve) => {
		const child =
			process.platform === 'win32'
				? spawn(formatWindowsCommand(command, commandArgs), {
						env,
						shell: true,
						stdio: 'inherit',
					})
				: spawn(command, commandArgs, {
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

const runVarlockSubcommand = async (subcommand, subcommandArgs = []) => {
	if (!varlockInvocation) {
		return false;
	}

	const exitCode = await runCommand(
		varlockInvocation.command,
		[...varlockInvocation.args, subcommand, ...subcommandArgs],
		baseEnv
	);
	process.exit(exitCode);
};

if (checkOnly) {
	await runVarlockSubcommand('load');

	const resolvedEnv = {
		...process.env,
		...resolveStudypuckEnv(),
		...overrides,
	};
	console.log(`Bitwarden item: ${process.env.STUDYPUCK_BITWARDEN_ITEM || 'StudyPuck Dev'}`);
	for (const [key, value] of Object.entries(resolvedEnv)) {
		console.log(`${key}=${maskValue(value)}`);
	}
	process.exit(0);
}

if (scanOnly) {
	await runVarlockSubcommand('scan');
	throw new Error(
		'Varlock is not installed in this environment. Install `varlock` to use scan support, or continue using the existing secure commands for run/load behavior.'
	);
}

if (separatorIndex === -1 || separatorIndex === args.length - 1) {
	throw new Error(
		'Usage: node scripts/run-with-bitwarden-env.mjs [--check] [--scan] [--set KEY=value] -- <command...>'
	);
}

const command = args[separatorIndex + 1];
const commandArgs = args.slice(separatorIndex + 2);

// varlock run misquotes resolved .cmd paths on Windows — fall through to the
// Bitwarden-based fallback below instead.
// Also skip varlock run when --write-dev-vars is set, since we need to write
// .dev.vars from the resolved env before the child process starts.
if (process.platform !== 'win32' && !writeDevVars) {
	await runVarlockSubcommand('run', ['--', command, ...commandArgs]);
}

const fallbackEnv = {
	...process.env,
	...resolveStudypuckEnv(),
	...overrides,
};

const devVarsPath = join(process.cwd(), 'apps/web/.dev.vars');

if (writeDevVars) {
	// Auto-detect ORIGIN: Codespaces forwarded URL or local wrangler default.
	if (!fallbackEnv.ORIGIN) {
		const codespaceName = process.env.CODESPACE_NAME;
		fallbackEnv.ORIGIN = codespaceName
			? `https://${codespaceName}-8788.app.github.dev`
			: 'http://127.0.0.1:8788';
	}

	const devVarsKeys = [
		...requiredSecretKeys,
		...optionalSecretKeys,
		...optionalEnvKeys,
		...Object.keys(overrides),
		'ORIGIN',
	];
	const lines = devVarsKeys
		.filter((k) => fallbackEnv[k])
		.map((k) => `${k}="${fallbackEnv[k].replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`)
		.join('\n');
	writeFileSync(devVarsPath, lines + '\n', { encoding: 'utf8' });
}

const exitCode = await runCommand(command, commandArgs, fallbackEnv);

if (writeDevVars) {
	try { unlinkSync(devVarsPath); } catch { /* ignore */ }
}

process.exit(exitCode);
