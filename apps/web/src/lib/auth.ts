import { SvelteKitAuth } from '@auth/sveltekit';
import Auth0 from '@auth/core/providers/auth0';
import { Auth0UserSchema } from './schemas/auth.js';
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
  callbacks: {
        async jwt({ token, user, account, profile }) {
          // Persist the id_token to the JWT token if it exists
          if (account?.id_token) {
            token.id_token = account.id_token;
          }
    
          // Validate Auth0 profile data when user first signs in
          if (user && profile) {
            try {
              const validatedProfile = Auth0UserSchema.parse(profile);
    
              // Store validated user data in JWT
              token.sub = validatedProfile.sub;
              token.email = validatedProfile.email;
              token.name = validatedProfile.name;
              token.picture = validatedProfile.picture;
            } catch (error) {
              console.error('Invalid Auth0 profile data:', error);
              throw new Error('Invalid user profile data from Auth0');
            }
          }
    
          return token;
        },
    
        async session({ session, token }) {
          // Make the id_token available in the session object
          if (token.id_token) {
            session.id_token = token.id_token as string; // Assert as string
          }
    
          // Validate and structure session data
          if (token) {
            session.user = {
              id: token.sub as string,
              email: token.email as string,
              name: token.name as string || null,
              image: token.picture as string || null,
            };
          }
    
          return session;
        },
      },
      pages: {
        error: '/auth/error',
      },
      trustHost: true,
    });
    
    // Extend the Session type to include id_token
    declare module "@auth/sveltekit" {
      interface Session {
        id_token?: string;
      }
    }