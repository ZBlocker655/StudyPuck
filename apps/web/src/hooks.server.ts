import { SvelteKitAuth } from '@auth/sveltekit';
import Auth0 from '@auth/core/providers/auth0';
import { 
  AUTH_SECRET, 
  AUTH0_CLIENT_ID, 
  AUTH0_CLIENT_SECRET, 
  AUTH0_ISSUER, 
  AUTH0_AUDIENCE 
} from '$env/static/private';

export const { handle, signIn, signOut } = SvelteKitAuth({
  providers: [
    Auth0({
      clientId: AUTH0_CLIENT_ID,
      clientSecret: AUTH0_CLIENT_SECRET,
      issuer: AUTH0_ISSUER,
      authorization: { params: { audience: AUTH0_AUDIENCE } },
      wellKnown: `${AUTH0_ISSUER}.well-known/openid-configuration`,
    }),
  ],
  secret: AUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  trustHost: true,
  basePath: '/auth',
  callbacks: {
    async jwt({ token, user, account, profile }) {
      // Persist the id_token to the JWT token if it exists
      if (account?.id_token) {
        token.id_token = account.id_token;
      }

      // Store user data in JWT when user first signs in
      if (user && profile) {
        token.sub = profile.sub;
        token.email = profile.email;
        token.name = profile.name;
        token.picture = profile.picture;
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