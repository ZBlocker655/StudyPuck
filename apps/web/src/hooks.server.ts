import { createAuth } from '$lib/auth';
import { PrivateEnv } from '$lib/schemas/auth';
import { env } from '$env/dynamic/private';

export const handle = async ({ event, resolve }) => {
  try {
    // Multi-source environment variable access for different runtimes
    const envSource = {
      AUTH_SECRET: env.AUTH_SECRET || 
                   ((globalThis as any).process?.env?.AUTH_SECRET) ||
                   (event.platform as any)?.env?.AUTH_SECRET,
      AUTH0_CLIENT_ID: env.AUTH0_CLIENT_ID || 
                       ((globalThis as any).process?.env?.AUTH0_CLIENT_ID) ||
                       (event.platform as any)?.env?.AUTH0_CLIENT_ID,
      AUTH0_CLIENT_SECRET: env.AUTH0_CLIENT_SECRET || 
                           ((globalThis as any).process?.env?.AUTH0_CLIENT_SECRET) ||
                           (event.platform as any)?.env?.AUTH0_CLIENT_SECRET,
      AUTH0_ISSUER: env.AUTH0_ISSUER || 
                    ((globalThis as any).process?.env?.AUTH0_ISSUER) ||
                    (event.platform as any)?.env?.AUTH0_ISSUER,
      AUTH0_AUDIENCE: env.AUTH0_AUDIENCE || 
                      ((globalThis as any).process?.env?.AUTH0_AUDIENCE) ||
                      (event.platform as any)?.env?.AUTH0_AUDIENCE
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