import { SvelteKitAuth } from '@auth/sveltekit';
import Auth0 from '@auth/core/providers/auth0';
import { env } from '$env/dynamic/private';

// Clean environment variable access for all runtimes (proven working solution)
const getEnvVar = (name: string): string => {
  // 1. SvelteKit dynamic (works in local dev + GitHub Actions + Cloudflare)
  const dynamicVal = env[name as keyof typeof env];
  if (dynamicVal) {
    return dynamicVal;
  }

  throw new Error(`Required environment variable ${name} not found`);
};

export const { handle, signIn, signOut } = SvelteKitAuth({
  providers: [
    Auth0({
      clientId: getEnvVar('AUTH0_CLIENT_ID'),
      clientSecret: getEnvVar('AUTH0_CLIENT_SECRET'),
      issuer: getEnvVar('AUTH0_ISSUER'),
      authorization: { params: { audience: getEnvVar('AUTH0_AUDIENCE') } },
      wellKnown: `${getEnvVar('AUTH0_ISSUER')}.well-known/openid-configuration`,
    }),
  ],
  secret: getEnvVar('AUTH_SECRET'),
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  trustHost: true,
  // Remove basePath - let Auth.js auto-detect for Cloudflare Workers compatibility
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Persist the id_token to the JWT token if it exists
      if (account?.id_token) {
        token.id_token = account.id_token;
      }

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
      // Make the id_token available in the session object
      if (token.id_token) {
        session.id_token = token.id_token as string;
      }

      // Structure session data
      if (token) {
        session.user = {
          id: token.sub as string,
          email: token.email as string,
          name: token.name as string || null,
          image: token.picture as string || null,
          emailVerified: null,
        };
      }

      return session;
    },
  },
  pages: {
    error: '/auth/error',
  },
});

// Extend the Session type to include id_token
declare module "@auth/sveltekit" {
  interface Session {
    id_token?: string;
  }
}