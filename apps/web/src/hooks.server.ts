import { SvelteKitAuth } from '@auth/sveltekit';
import Auth0 from '@auth/core/providers/auth0';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle, RequestEvent } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getDb, upsertUser } from '@studypuck/database';
import {
	getEnvVar,
	getPublicOrigin,
	getRedirectProxyUrl,
	normalizeRedirectTarget,
} from '$lib/server/public-origin';
import { getE2ESession, isE2ETestRequestAllowed } from '$lib/server/e2e-auth';

function getAuthSetting(
	name: 'AUTH0_CLIENT_ID' | 'AUTH0_CLIENT_SECRET' | 'AUTH0_ISSUER' | 'AUTH0_AUDIENCE' | 'AUTH_SECRET',
	event: RequestEvent
) {
	if (!isE2ETestRequestAllowed(event)) {
		return getEnvVar(name, env, event);
	}

	switch (name) {
		case 'AUTH0_CLIENT_ID':
			return env.AUTH0_CLIENT_ID || 'e2e-client-id';
		case 'AUTH0_CLIENT_SECRET':
			return env.AUTH0_CLIENT_SECRET || 'e2e-client-secret';
		case 'AUTH0_ISSUER':
			return env.AUTH0_ISSUER || 'https://studypuck.example.auth0.com/';
		case 'AUTH0_AUDIENCE':
			return env.AUTH0_AUDIENCE || 'https://studypuck.example/api';
		case 'AUTH_SECRET':
			return env.AUTH_SECRET || 'studypuck-e2e-secret';
	}
}

const { handle: authHandle, signIn, signOut } = SvelteKitAuth(async (event) => {
	const publicOrigin = getPublicOrigin(event, env);

	return {
		providers: [
			Auth0({
				clientId: getAuthSetting('AUTH0_CLIENT_ID', event),
				clientSecret: getAuthSetting('AUTH0_CLIENT_SECRET', event),
				issuer: getAuthSetting('AUTH0_ISSUER', event),
				authorization: { params: { audience: getAuthSetting('AUTH0_AUDIENCE', event) } },
				wellKnown: `${getAuthSetting('AUTH0_ISSUER', event)}.well-known/openid-configuration`,
			}),
		],
		redirectProxyUrl: getRedirectProxyUrl(event, env),
		secret: getAuthSetting('AUTH_SECRET', event),
		useSecureCookies: publicOrigin.startsWith('https://'),
		session: {
			strategy: 'jwt',
			maxAge: 7 * 24 * 60 * 60, // 7 days
		},
		trustHost: true,
		callbacks: {
			async redirect({ url, baseUrl }) {
				return normalizeRedirectTarget({ url, baseUrl, publicOrigin });
			},

			async jwt({ token, user, profile }) {
				// Store user data in JWT when user first signs in
				if (user && profile) {
					// Handle Auth0 profile fields that can be null
					token.sub = profile.sub ?? undefined;
					token.email = profile.email ?? undefined;
					token.name = profile.name ?? undefined;
					token.picture = profile.picture ?? undefined;
				}

				return token;
			},

			async session({ session, token }) {
				// Structure session data
				if (token) {
					session.user = {
						id: token.sub as string,
						email: token.email as string,
						name: (token.name as string) || null,
						image: (token.picture as string) || null,
						emailVerified: null,
					};
				}

				return session;
			},
		},
		events: {
			async signIn({ user, profile }) {
				// Sync Auth0 profile data to the database on every sign-in
				if (!user.email || !profile?.sub) return;

				try {
					const database = getDb(getEnvVar('DATABASE_URL', env, event));
					await upsertUser(
						{
							userId: profile.sub,
							email: user.email,
							name:
								(profile.name as string | undefined) ??
								(profile.nickname as string | undefined) ??
								null,
							pictureUrl: (profile.picture as string | undefined) ?? null,
						},
						database as any
					);
				} catch (err) {
					// Log but don't block auth if DB is unavailable
					console.error('Failed to sync user profile to database:', err);
				}
			},
		},
		pages: {
			error: '/auth/error',
		},
	};
});

const e2eSessionHandle: Handle = async ({ event, resolve }) => {
	const auth = event.locals.auth;

	event.locals.auth = async () => {
		const e2eSession = getE2ESession(event.cookies, event);

		if (e2eSession) {
			return e2eSession;
		}

		return auth ? await auth() : null;
	};

	return resolve(event);
};

export const handle = sequence(authHandle, e2eSessionHandle);

export { signIn, signOut };
