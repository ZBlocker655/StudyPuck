import { resolveSecretValue } from './studypuck-env.mjs';

const key = process.argv[2];

if (!key) {
	throw new Error('Usage: node scripts/bitwarden-secret.mjs <ENV_KEY>');
}

process.stdout.write(resolveSecretValue(key));
