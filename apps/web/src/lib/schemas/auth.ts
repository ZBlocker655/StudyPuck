import { z } from 'zod';

/**
 * Schema for Auth0 user profile
 */
export const Auth0UserSchema = z.object({
  sub: z.string(), // Auth0 user ID
  email: z.string().email(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
  nickname: z.string().optional(),
  preferred_username: z.string().optional(),
  updated_at: z.string().optional(),
});

/**
 * Schema for Auth.js session
 */
export const SessionSchema = z.object({
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    name: z.string().optional(),
    image: z.string().url().optional(),
  }),
  expires: z.string(),
});

/**
 * Schema for Auth.js JWT token
 */
export const JWTSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
  picture: z.string().url().optional(),
  iat: z.number(),
  exp: z.number(),
});

export const PrivateEnv = z.object({
  AUTH_SECRET: z.string(),
  AUTH0_CLIENT_ID: z.string(),
  AUTH0_CLIENT_SECRET: z.string(),
  AUTH0_ISSUER: z.string(),
  AUTH0_AUDIENCE: z.string(),
});

/**
 * Export TypeScript types
 */
export type Auth0User = z.infer<typeof Auth0UserSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type JWT = z.infer<typeof JWTSchema>;
export type PrivateEnv = z.infer<typeof PrivateEnv>;