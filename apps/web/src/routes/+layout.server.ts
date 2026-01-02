import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async (event) => {
  // Auth.js session handling with monitoring for Cloudflare Pages issues
  try {
    const session = await event.locals.auth();
    
    // Log successful auth for monitoring
    if (session?.user) {
      console.log('✅ Auth session loaded successfully for user:', session.user.id);
    }
    
    return { session };
  } catch (error) {
    // CRITICAL: Auth is failing - log detailed error for debugging
    const err = error as Error;
    console.error('🚨 CRITICAL: Auth session failed completely');
    console.error('Error type:', err.constructor?.name || 'Unknown');
    console.error('Error message:', err.message || 'No message');
    console.error('Error stack:', err.stack || 'No stack trace');
    console.error('Request URL:', event.url.href);
    console.error('User-Agent:', event.request.headers.get('user-agent'));
    
    // Return auth failure state with explicit flag
    return { 
      session: null,
      authError: {
        failed: true,
        error: err.message || 'Auth system error',
        timestamp: new Date().toISOString()
      }
    };
  }
};