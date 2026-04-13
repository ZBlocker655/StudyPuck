import { dev } from '$app/environment';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { isLocalOrRemoteDevHostname } from '$lib/server/public-origin';

const E2E_SESSION_COOKIE = 'studypuck_e2e_session';

type E2ESessionPayload = {
	userId: string;
	email: string;
	name?: string | null;
	image?: string | null;
};

export function isE2ETestModeEnabled() {
	return process.env.E2E_TEST_MODE === 'enabled';
}

export function isE2ETestRequestAllowed(event: Pick<RequestEvent, 'url'>) {
	return isE2ETestModeEnabled() && isLocalOrRemoteDevHostname(event.url.hostname);
}

export function getE2ESessionCookieName() {
	return E2E_SESSION_COOKIE;
}

export function serializeE2ESession(payload: E2ESessionPayload) {
	return encodeURIComponent(JSON.stringify(payload));
}

export function getE2ESession(cookies: Pick<Cookies, 'get'>, event: Pick<RequestEvent, 'url'>) {
	if (!isE2ETestRequestAllowed(event)) {
		return null;
	}

	const rawValue = cookies.get(E2E_SESSION_COOKIE);

	if (!rawValue) {
		return null;
	}

	try {
		const parsed = JSON.parse(decodeURIComponent(rawValue)) as E2ESessionPayload;

		if (!parsed.userId || !parsed.email) {
			return null;
		}

		return {
			expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
			user: {
				id: parsed.userId,
				email: parsed.email,
				name: parsed.name ?? null,
				image: parsed.image ?? null,
				emailVerified: null,
			},
		};
	} catch {
		return null;
	}
}

export function getE2ESessionCookieOptions() {
	return {
		httpOnly: true,
		path: '/',
		sameSite: 'lax' as const,
		secure: !dev,
	};
}
