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
    console.error('🚨 CRITICAL: Auth session failed completely');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Request URL:', event.url.href);
    console.error('User-Agent:', event.request.headers.get('user-agent'));
    
    // Return auth failure state with explicit flag
    return { 
      session: null,
      authError: {
        failed: true,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
};