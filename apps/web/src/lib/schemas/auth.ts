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

/**
 * Export TypeScript types
 */
export type Auth0User = z.infer<typeof Auth0UserSchema>;
export type Session = z.infer<typeof SessionSchema>;
export type JWT = z.infer<typeof JWTSchema>;