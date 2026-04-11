import { redirect } from '@sveltejs/kit';
import { DEFAULT_LANGUAGE } from '$lib/config/languages.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
  const { session } = await event.parent();

  if (session?.user?.id) {
    throw redirect(303, `/${DEFAULT_LANGUAGE.code}/`);
  }

  return {};
};
