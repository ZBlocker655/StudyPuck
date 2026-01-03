import { createAuth } from '$lib/auth';
import { PrivateEnv } from '$lib/schemas/auth';
import { env } from '$env/dynamic/private';

export const handle = async ({ event, resolve }) => {
  try {
    // Clean environment variable access for all runtimes
    const getEnvVar = (name: string): string | undefined => {
      // 1. SvelteKit dynamic (works in local dev + GitHub Actions)
      const dynamicVal = env[name as keyof typeof env];
      if (dynamicVal) return dynamicVal;
      
      // 2. Cloudflare Pages platform env (runtime only)
      const platformVal = event.platform?.env?.[name];
      if (platformVal) return platformVal;
      
      return undefined;
    };

    const envSource = {
      AUTH_SECRET: getEnvVar('AUTH_SECRET'),
      AUTH0_CLIENT_ID: getEnvVar('AUTH0_CLIENT_ID'),
      AUTH0_CLIENT_SECRET: getEnvVar('AUTH0_CLIENT_SECRET'),
      AUTH0_ISSUER: getEnvVar('AUTH0_ISSUER'),
      AUTH0_AUDIENCE: getEnvVar('AUTH0_AUDIENCE'),
    };
    
    const validatedEnv = PrivateEnv.parse(envSource);
    const { handle } = createAuth(validatedEnv);
    return handle({ event, resolve });
  } catch (error) {
    console.error('Authentication configuration failed:', error);
    
    // Return a proper error response instead of crashing
    return new Response('Internal Server Error: Authentication configuration error', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};