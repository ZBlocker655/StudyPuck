import { createAuth } from '$lib/auth';
import { PrivateEnv } from '$lib/schemas/auth';
import { env } from '$env/dynamic/private';

export const handle = async ({ event, resolve }) => {
  try {
    // Unified approach: try SvelteKit env first, fallback to process.env for Cloudflare
    const envSource = {
      AUTH_SECRET: env.AUTH_SECRET || process.env.AUTH_SECRET,
      AUTH0_CLIENT_ID: env.AUTH0_CLIENT_ID || process.env.AUTH0_CLIENT_ID,
      AUTH0_CLIENT_SECRET: env.AUTH0_CLIENT_SECRET || process.env.AUTH0_CLIENT_SECRET,
      AUTH0_ISSUER: env.AUTH0_ISSUER || process.env.AUTH0_ISSUER,
      AUTH0_AUDIENCE: env.AUTH0_AUDIENCE || process.env.AUTH0_AUDIENCE
    };
    
    const validatedEnv = PrivateEnv.parse(envSource);
    const { handle } = createAuth(validatedEnv);
    return handle({ event, resolve });
  } catch (error) {
    console.error('Environment validation failed:', error);
    console.error('SvelteKit env keys:', Object.keys(env).filter(k => k.startsWith('AUTH')));
    console.error('process.env keys:', Object.keys(process.env).filter(k => k.startsWith('AUTH')));
    
    // Return a proper error response instead of crashing
    return new Response('Internal Server Error: Missing required environment variables', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};