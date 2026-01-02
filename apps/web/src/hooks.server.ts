import { createAuth } from '$lib/auth';
import { PrivateEnv } from '$lib/schemas/auth';

export const handle = async ({ event, resolve }) => {
  try {
    // Access environment variables using various methods for Cloudflare Pages
    const envSource = {
      AUTH_SECRET: process.env.AUTH_SECRET,
      AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
      AUTH0_CLIENT_SECRET: process.env.AUTH0_CLIENT_SECRET,
      AUTH0_ISSUER: process.env.AUTH0_ISSUER,
      AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE
    };
    
    const env = PrivateEnv.parse(envSource);
    const { handle } = createAuth(env);
    return handle({ event, resolve });
  } catch (error) {
    console.error('Environment validation failed:', error);
    console.error('Available process.env keys:', Object.keys(process.env).filter(k => k.startsWith('AUTH')));
    
    // Return a proper error response instead of crashing
    return new Response('Internal Server Error: Missing required environment variables', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};