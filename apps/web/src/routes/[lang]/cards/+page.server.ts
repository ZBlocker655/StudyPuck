import { error, redirect } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { CardLibraryRequestError, loadActiveCardDetailData, loadCardLibraryData } from '$lib/server/cards.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
  const { session } = await event.parent();
  const languageCode = event.params.lang;

  if (!session?.user?.id || !languageCode) {
    throw redirect(303, '/');
  }

  const database = getDb(env.DATABASE_URL);
  const selectedCardId = event.url.searchParams.get('card');

  try {
    const library = await loadCardLibraryData(session.user.id, languageCode, event.url, database);

    if (selectedCardId && !library.filteredCardIds.includes(selectedCardId)) {
      throw error(404, 'Active card not found in the current card view.');
    }

    const selectedCard = selectedCardId
      ? await loadActiveCardDetailData(session.user.id, languageCode, selectedCardId, database)
      : null;

    return {
      library,
      selectedCard: selectedCard?.card ?? null,
      selectedCardAvailableGroups: selectedCard?.availableGroups ?? [],
    };
  } catch (requestError) {
    if (requestError instanceof CardLibraryRequestError) {
      throw error(requestError.status, requestError.message);
    }

    throw requestError;
  }
};
