import { execFileSync, execSync } from 'node:child_process';

const bitwardenCommand = process.platform === 'win32' ? 'bw.cmd' : 'bw';

export const requiredSecretKeys = [
	'AUTH_SECRET',
	'AUTH0_CLIENT_ID',
	'AUTH0_CLIENT_SECRET',
	'AUTH0_ISSUER',
	'AUTH0_AUDIENCE',
	'DATABASE_URL',
];

const supportedSecretKeys = [...requiredSecretKeys, 'NEON_API_KEY'];

export const optionalEnvKeys = ['AUTH_URL', 'AUTH_REDIRECT_PROXY_URL', 'ORIGIN'];

const defaultBitwardenItem = 'StudyPuck Dev';
let cachedItem;

const shellQuoteArg = (arg) => {
	if (!/[\s"&|<>^%]/u.test(arg)) return arg;
	return `"${arg.replace(/"/g, '\\"')}"`;
};

const runBitwarden = (args) => {
	try {
		if (process.platform === 'win32') {
			// execFileSync cannot run .cmd files on Windows without shell: true.
			// Use execSync (which runs via cmd.exe) instead.
			const cmd = ['bw', ...args.map(shellQuoteArg)].join(' ');
			return execSync(cmd, {
				encoding: 'utf8',
				env: process.env,
				stdio: ['ignore', 'pipe', 'pipe'],
			}).trim();
		}

		return execFileSync(bitwardenCommand, args, {
			encoding: 'utf8',
			env: process.env,
			stdio: ['ignore', 'pipe', 'pipe'],
		}).trim();
	} catch (error) {
		const details = error instanceof Error ? error.message : String(error);
		throw new Error(`Bitwarden command failed: bw ${args.join(' ')}\n${details}`);
	}
};

const maybeLoginWithApiKey = () => {
	if (!process.env.BW_CLIENTID || !process.env.BW_CLIENTSECRET) {
		return;
	}

	try {
		runBitwarden(['login', '--apikey']);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (
			!message.includes('already logged in') &&
			!message.includes('You are already logged in')
		) {
			throw error;
		}
	}
};

const ensureBitwardenSession = () => {
	if (process.env.BW_SESSION) {
		return process.env.BW_SESSION;
	}

	maybeLoginWithApiKey();

	if (process.env.BW_PASSWORD) {
		process.env.BW_SESSION = runBitwarden(['unlock', '--passwordenv', 'BW_PASSWORD', '--raw']);
		return process.env.BW_SESSION;
	}

	const unlockCmd = process.platform === 'win32'
		? '$env:BW_SESSION = $(bw unlock --raw)'
		: 'export BW_SESSION=$(bw unlock --raw)';
	throw new Error(`Bitwarden is locked. Run this first:\n  ${unlockCmd}`);
};

const getBitwardenItemRef = () =>
	process.env.STUDYPUCK_BITWARDEN_ITEM || defaultBitwardenItem;

const getExactBitwardenItem = () => {
	if (cachedItem) {
		return cachedItem;
	}

	ensureBitwardenSession();

	const itemRef = getBitwardenItemRef();
	let item;

	if (/^[0-9a-f-]{36}$/i.test(itemRef)) {
		item = JSON.parse(runBitwarden(['get', 'item', itemRef]));
	} else {
		const matches = JSON.parse(runBitwarden(['list', 'items', '--search', itemRef]));
		const exactMatches = matches.filter((entry) => entry.name === itemRef);
		const resolvedMatches = exactMatches.length > 0 ? exactMatches : matches;

		if (resolvedMatches.length !== 1) {
			throw new Error(
				`Expected exactly one Bitwarden item for ${itemRef}, but found ${resolvedMatches.length}.`
			);
		}

		item = resolvedMatches[0];
	}

	cachedItem = item;
	return item;
};

const readItemField = (item, fieldName) => {
	const field = item.fields?.find((entry) => entry.name === fieldName);
	if (!field?.value) {
		throw new Error(
			`Bitwarden item ${item.name ?? item.id} is missing a custom field named ${fieldName}.`
		);
	}

	return field.value;
};

export const resolveSecretValue = (key) => {
	if (!supportedSecretKeys.includes(key)) {
		throw new Error(`Unsupported StudyPuck secret key: ${key}`);
	}

	if (process.env[key]) {
		return process.env[key];
	}

	const item = getExactBitwardenItem();
	return readItemField(item, key);
};

export const resolveStudypuckEnv = () => {
	const resolved = {
		APP_ENV: process.env.APP_ENV || 'development',
	};

	for (const key of requiredSecretKeys) {
		resolved[key] = resolveSecretValue(key);
	}

	for (const key of optionalEnvKeys) {
		if (process.env[key]) {
			resolved[key] = process.env[key];
		}
	}

	return resolved;
};

export const maskValue = (value) => {
	if (!value) {
		return '<missing>';
	}

	if (value.length <= 8) {
		return '********';
	}

	return `${value.slice(0, 4)}...${value.slice(-4)}`;
};
