import { createAuth } from '$lib/auth';
import { PrivateEnv } from '$lib/schemas/auth';

export const handle = async ({ event, resolve }) => {
  // Get environment variables from platform or process.env as fallback
  const envSource = event.platform?.env || process.env;
  
  try {
    const env = PrivateEnv.parse(envSource);
    const { handle } = createAuth(env);
    return handle({ event, resolve });
  } catch (error) {
    console.error('Environment validation failed:', error);
    console.error('Available env keys:', Object.keys(envSource || {}));
    
    // Return a proper error response instead of crashing
    return new Response('Internal Server Error: Missing required environment variables', {
      status: 500,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};