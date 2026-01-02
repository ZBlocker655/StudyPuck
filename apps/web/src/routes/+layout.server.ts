import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async (event) => {
  // Graceful auth handling to avoid basePath errors in Cloudflare Pages
  try {
    const session = await event.locals.auth();
    return { session };
  } catch (error) {
    console.error('Auth session failed, returning null session:', error);
    return { session: null };
  }
};