import { createAuth } from '$lib/auth';
import { PrivateEnv } from '$lib/schemas/auth';
import { env } from '$env/dynamic/private';

export const handle = async ({ event, resolve }) => {
  try {
    // Multi-source environment variable access for different runtimes
    const envSource = {
      AUTH_SECRET: env.AUTH_SECRET || 
                   (typeof process !== 'undefined' ? process.env.AUTH_SECRET : undefined) ||
                   event.platform?.env?.AUTH_SECRET,
      AUTH0_CLIENT_ID: env.AUTH0_CLIENT_ID || 
                       (typeof process !== 'undefined' ? process.env.AUTH0_CLIENT_ID : undefined) ||
                       event.platform?.env?.AUTH0_CLIENT_ID,
      AUTH0_CLIENT_SECRET: env.AUTH0_CLIENT_SECRET || 
                           (typeof process !== 'undefined' ? process.env.AUTH0_CLIENT_SECRET : undefined) ||
                           event.platform?.env?.AUTH0_CLIENT_SECRET,
      AUTH0_ISSUER: env.AUTH0_ISSUER || 
                    (typeof process !== 'undefined' ? process.env.AUTH0_ISSUER : undefined) ||
                    event.platform?.env?.AUTH0_ISSUER,
      AUTH0_AUDIENCE: env.AUTH0_AUDIENCE || 
                      (typeof process !== 'undefined' ? process.env.AUTH0_AUDIENCE : undefined) ||
                      event.platform?.env?.AUTH0_AUDIENCE
    };
    
    // Enhanced debugging - log exactly what we found
    console.log('=== ENVIRONMENT DEBUG ===');
    console.log('SvelteKit env available AUTH vars:', Object.keys(env).filter(k => k.startsWith('AUTH')));
    console.log('process available:', typeof process !== 'undefined');
    if (typeof process !== 'undefined') {
      console.log('process.env AUTH vars:', Object.keys(process.env).filter(k => k.startsWith('AUTH')));
    }
    console.log('platform.env available:', !!event.platform?.env);
    if (event.platform?.env) {
      console.log('platform.env AUTH vars:', Object.keys(event.platform.env).filter(k => k.startsWith('AUTH')));
    }
    console.log('Final envSource values:');
    Object.keys(envSource).forEach(key => {
      console.log(`${key}: ${envSource[key] ? 'SET' : 'MISSING'} (length: ${envSource[key]?.length || 0})`);
    });
    console.log('=== END DEBUG ===');
    
    const validatedEnv = PrivateEnv.parse(envSource);
    const { handle } = createAuth(validatedEnv);
    return handle({ event, resolve });
  } catch (error) {
    console.error('Environment validation failed:', error);
    console.error('Error details:', error.issues || error.message);
    
    // Return a proper error response instead of crashing
    return new Response('Internal Server Error: Missing required environment variables', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};