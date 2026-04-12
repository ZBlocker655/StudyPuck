import { redirect } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { DEFAULT_LANGUAGE, replaceLanguageInPath, getLanguageByCode } from '$lib/config/languages.js';
import { loadActiveStudyLanguages } from '$lib/server/homepage.js';
import type { LayoutServerLoad } from './$types.js';

export const load: LayoutServerLoad = async (event) => {
  const parentData = await event.parent();

  if (!getLanguageByCode(event.params.lang)) {
    throw redirect(303, replaceLanguageInPath(event.url.pathname, DEFAULT_LANGUAGE.code));
  }

  if (!parentData.session?.user?.id) {
    throw redirect(303, '/');
  }

  const database = getDb(env.DATABASE_URL);
  const activeLanguages = await loadActiveStudyLanguages(parentData.session.user.id, database);

  if (activeLanguages.length === 0) {
    throw redirect(303, '/onboarding');
  }

  const availableLanguages = activeLanguages
    .map((language) => getLanguageByCode(language.languageId))
    .filter((language) => language !== undefined);

  const currentLanguageConfigured = availableLanguages.some((language) => language.code === event.params.lang);

  if (!currentLanguageConfigured) {
    throw redirect(303, `/${availableLanguages[0]?.code ?? DEFAULT_LANGUAGE.code}/`);
  }

  return {
    availableLanguages,
  };
};
