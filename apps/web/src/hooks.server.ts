import { createAuth } from '$lib/auth';
import { PrivateEnv } from '$lib/schemas/auth';
import { 
  AUTH_SECRET,
  AUTH0_CLIENT_ID, 
  AUTH0_CLIENT_SECRET,
  AUTH0_ISSUER,
  AUTH0_AUDIENCE 
} from '$env/static/private';

export const handle = async ({ event, resolve }) => {
  try {
    // Use SvelteKit's static private env imports instead of platform.env
    const env = PrivateEnv.parse({
      AUTH_SECRET,
      AUTH0_CLIENT_ID,
      AUTH0_CLIENT_SECRET,
      AUTH0_ISSUER,
      AUTH0_AUDIENCE
    });
    
    const { handle } = createAuth(env);
    return handle({ event, resolve });
  } catch (error) {
    console.error('Environment validation failed:', error);
    
    // Return a proper error response instead of crashing
    return new Response('Internal Server Error: Missing required environment variables', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};