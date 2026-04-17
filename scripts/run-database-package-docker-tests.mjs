import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runCommandStreaming } from './neon-ephemeral-branch.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const packageDir = resolve(repoRoot, 'packages', 'database');
const baseEnv = { ...process.env };
let setupCompleted = false;

try {
	const setupExitCode = await runCommandStreaming(
		'pnpm',
		['--dir', packageDir, 'run', 'test:docker:setup'],
		baseEnv,
		repoRoot
	);
	if (setupExitCode !== 0) {
		throw new Error(`Docker test database setup exited with code ${setupExitCode}`);
	}
	setupCompleted = true;

	const testExitCode = await runCommandStreaming(
		'pnpm',
		['--dir', packageDir, 'run', 'test:docker:raw'],
		baseEnv,
		repoRoot
	);
	if (testExitCode !== 0) {
		throw new Error(`Docker database package tests exited with code ${testExitCode}`);
	}
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);
	console.error(message);
	process.exitCode = 1;
} finally {
	if (setupCompleted) {
		const cleanupExitCode = await runCommandStreaming(
			'pnpm',
			['--dir', packageDir, 'run', 'test:docker:cleanup'],
			baseEnv,
			repoRoot
		);
		if (cleanupExitCode !== 0) {
			console.error(`Docker test database cleanup exited with code ${cleanupExitCode}`);
			process.exitCode = 1;
		}
	}
}
