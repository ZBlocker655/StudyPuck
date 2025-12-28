// This file is the single entry point for all server-side requests.
// The handle function from our auth.ts file is a SvelteKit hook that
// will intercept requests to /auth/* and handle them automatically.
export { handle } from '$lib/auth.js';