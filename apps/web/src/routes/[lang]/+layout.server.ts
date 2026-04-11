import { redirect } from '@sveltejs/kit';
import { DEFAULT_LANGUAGE, replaceLanguageInPath, getLanguageByCode } from '$lib/config/languages.js';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async (event) => {
  const parentData = await event.parent();

  if (!getLanguageByCode(event.params.lang)) {
    throw redirect(303, replaceLanguageInPath(event.url.pathname, DEFAULT_LANGUAGE.code));
  }

  if (!parentData.session?.user?.id) {
    throw redirect(303, '/');
  }

  return {};
};
