import { SvelteKitAuth } from '@auth/sveltekit';
import Auth0 from '@auth/core/providers/auth0';
import { Auth0UserSchema, type Session, type JWT } from './schemas/auth.js';
import {
  AUTH_SECRET,
  AUTH0_ID,
  AUTH0_SECRET,
  AUTH0_DOMAIN,
  AUTH0_ISSUER
} from '$env/static/private';

export const { handle, signIn, signOut } = SvelteKitAuth({
  providers: [
    Auth0({
      clientId: AUTH0_ID,
      clientSecret: AUTH0_SECRET,
      issuer: AUTH0_ISSUER,
      wellKnown: `${AUTH0_DOMAIN}/.well-known/openid_configuration`,
    }),
  ],
  secret: AUTH_SECRET,
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days (matching PWA session requirements)
  },
  callbacks: {
    async jwt({ token, user, account, profile }) {
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
    signIn: '/auth/signin',
    error: '/auth/error',
  },
});