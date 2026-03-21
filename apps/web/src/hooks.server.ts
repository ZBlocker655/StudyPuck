import { SvelteKitAuth } from '@auth/sveltekit';
import Auth0 from '@auth/core/providers/auth0';
import { env } from '$env/dynamic/private';
import { getDb, upsertUser } from '@studypuck/database';
import {
	getEnvVar,
	getPublicOrigin,
	getRedirectProxyUrl,
	normalizeRedirectTarget,
} from '$lib/server/public-origin';

export const { handle, signIn, signOut } = SvelteKitAuth(async (event) => {
	const publicOrigin = getPublicOrigin(event, env);

	return {
		providers: [
			Auth0({
				clientId: getEnvVar('AUTH0_CLIENT_ID', env, event),
				clientSecret: getEnvVar('AUTH0_CLIENT_SECRET', env, event),
				issuer: getEnvVar('AUTH0_ISSUER', env, event),
				authorization: { params: { audience: getEnvVar('AUTH0_AUDIENCE', env, event) } },
				wellKnown: `${getEnvVar('AUTH0_ISSUER', env, event)}.well-known/openid-configuration`,
			}),
		],
		redirectProxyUrl: getRedirectProxyUrl(event, env),
		secret: getEnvVar('AUTH_SECRET', env, event),
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
