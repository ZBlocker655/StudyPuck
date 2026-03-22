import { spawn } from 'node:child_process';
import { maskValue, resolveStudypuckEnv } from './studypuck-env.mjs';

const args = process.argv.slice(2);
const overrides = {};
let checkOnly = false;
let separatorIndex = args.indexOf('--');

for (let index = 0; index < args.length; index += 1) {
	const arg = args[index];
	if (arg === '--check') {
		checkOnly = true;
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

const resolvedEnv = {
	...process.env,
	...resolveStudypuckEnv(),
	...overrides,
};

if (checkOnly) {
	console.log(`Bitwarden item: ${process.env.STUDYPUCK_BITWARDEN_ITEM || 'studypuck-development'}`);
	for (const [key, value] of Object.entries(resolveStudypuckEnv())) {
		console.log(`${key}=${maskValue(value)}`);
	}
	process.exit(0);
}

if (separatorIndex === -1 || separatorIndex === args.length - 1) {
	throw new Error(
		'Usage: node scripts/run-with-bitwarden-env.mjs [--check] [--set KEY=value] -- <command...>'
	);
}

const command = args[separatorIndex + 1];
const commandArgs = args.slice(separatorIndex + 2);

const child = spawn(command, commandArgs, {
	env: resolvedEnv,
	stdio: 'inherit',
});

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}

	process.exit(code ?? 1);
});
