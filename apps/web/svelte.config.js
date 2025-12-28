import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		adapter: adapter({
			// See https://kit.svelte.dev/docs/adapter-cloudflare
			// for more information about creating a Worker site
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		})
	}
};

export default config;

