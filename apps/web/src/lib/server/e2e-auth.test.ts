import { afterEach, describe, expect, it } from 'vitest';
import {
	getE2ESession,
	getE2ESessionCookieName,
	isE2ETestRequestAllowed,
	serializeE2ESession,
} from './e2e-auth.js';

const originalE2ETestMode = process.env.E2E_TEST_MODE;

const createEvent = (url: string) => ({ url: new URL(url) });

const createCookies = (value?: string) => ({
	get(name: string) {
		return name === getE2ESessionCookieName() ? value : undefined;
	},
});

afterEach(() => {
	if (originalE2ETestMode === undefined) {
		delete process.env.E2E_TEST_MODE;
		return;
	}

	process.env.E2E_TEST_MODE = originalE2ETestMode;
});

describe('e2e auth guards', () => {
	it('allows e2e mode on localhost when explicitly enabled', () => {
		process.env.E2E_TEST_MODE = 'enabled';

		expect(isE2ETestRequestAllowed(createEvent('http://127.0.0.1:4173/'))).toBe(true);
	});

	it('allows e2e mode on remote dev hosts when explicitly enabled', () => {
		process.env.E2E_TEST_MODE = 'enabled';

		expect(isE2ETestRequestAllowed(createEvent('https://studypuck-1234.app.github.dev/'))).toBe(true);
	});

	it('rejects e2e mode on production hosts even when the env flag is enabled', () => {
		process.env.E2E_TEST_MODE = 'enabled';

		expect(isE2ETestRequestAllowed(createEvent('https://studypuck.app/'))).toBe(false);
	});

	it('only returns an injected session for allowed hosts', () => {
		process.env.E2E_TEST_MODE = 'enabled';

		const cookies = createCookies(
			serializeE2ESession({
				userId: 'auth0|e2e-user',
				email: 'e2e@example.com',
				name: 'E2E User',
			})
		);

		expect(getE2ESession(cookies, createEvent('https://studypuck.app/'))).toBeNull();
		expect(getE2ESession(cookies, createEvent('http://localhost:4173/'))?.user.email).toBe(
			'e2e@example.com'
		);
	});
});
