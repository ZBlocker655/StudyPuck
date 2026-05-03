import { error, redirect } from '@sveltejs/kit';
import { getDb } from '@studypuck/database';
import { env } from '$env/dynamic/private';
import { CardLibraryRequestError, loadActiveCardDetailData, loadGroupDetailData } from '$lib/server/cards.js';
import type { PageServerLoad } from './$types.js';

export const load: PageServerLoad = async (event) => {
  const { session } = await event.parent();
  const languageCode = event.params.lang;
  const groupId = event.params.groupId;

  if (!session?.user?.id || !languageCode || !groupId) {
    throw redirect(303, '/');
  }

  const database = getDb(env.DATABASE_URL);
  const selectedCardId = event.url.searchParams.get('card');

  try {
    const groupDetail = await loadGroupDetailData(session.user.id, languageCode, groupId, event.url, database);

    if (selectedCardId && !groupDetail.cards.filteredCardIds.includes(selectedCardId)) {
      throw error(404, 'Active card not found in the current group view.');
    }

    const selectedCard = selectedCardId
      ? await loadActiveCardDetailData(session.user.id, languageCode, selectedCardId, database)
      : null;

    return {
      groupDetail,
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
