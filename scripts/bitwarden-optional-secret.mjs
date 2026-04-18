import { resolveSecretValue } from './studypuck-env.mjs';

const key = process.argv[2];

if (!key) {
	throw new Error('Usage: node scripts/bitwarden-optional-secret.mjs <ENV_KEY>');
}

try {
	process.stdout.write(resolveSecretValue(key));
} catch (error) {
	const message = error instanceof Error ? error.message : String(error);

	if (message.includes(`missing a custom field named ${key}`)) {
		process.stdout.write('');
		process.exit(0);
	}

	throw error;
}
