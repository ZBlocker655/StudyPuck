<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import ActiveCardDrawer from '$lib/components/cards/ActiveCardDrawer.svelte';
  import CardListStatusBadge from '$lib/components/card-list/CardListStatusBadge.svelte';
  import CardListTagChip from '$lib/components/card-list/CardListTagChip.svelte';
  import type {
    CardLibraryCardDetailData,
    CardLibraryCardListItemData,
    CardLibraryData,
    CardLibraryGroupData,
  } from '$lib/server/cards.js';
  import type { PageData } from './$types.js';

  export let data: PageData;

  let library: CardLibraryData = data.library;
  let selectedCard: CardLibraryCardDetailData | null = data.selectedCard;
  let selectedCardAvailableGroups: CardLibraryGroupData[] = data.selectedCardAvailableGroups;
  let previousLibraryData = data.library;
  let previousSelectedCard = data.selectedCard;
  let previousSelectedCardAvailableGroups = data.selectedCardAvailableGroups;

  $: if (data.library !== previousLibraryData) {
    library = data.library;
    previousLibraryData = data.library;
  }

  $: if (data.selectedCard !== previousSelectedCard) {
    selectedCard = data.selectedCard;
    previousSelectedCard = data.selectedCard;
  }

  $: if (data.selectedCardAvailableGroups !== previousSelectedCardAvailableGroups) {
    selectedCardAvailableGroups = data.selectedCardAvailableGroups;
    previousSelectedCardAvailableGroups = data.selectedCardAvailableGroups;
  }

  $: selectedIndex = selectedCard ? library.filteredCardIds.indexOf(selectedCard.cardId) : -1;

  function buildDrawerUrl(cardId: string | null) {
    const nextUrl = new URL($page.url);

    if (cardId) {
      nextUrl.searchParams.set('card', cardId);
    } else {
      nextUrl.searchParams.delete('card');
    }

    return `${nextUrl.pathname}${nextUrl.search}`;
  }

  async function openCard(cardId: string) {
    await goto(buildDrawerUrl(cardId), {
      keepFocus: true,
      noScroll: true,
    });
  }

  async function navigateDrawer(cardId: string | null) {
    await goto(buildDrawerUrl(cardId), {
      keepFocus: true,
      noScroll: true,
      replaceState: true,
    });
  }

  function sortLibraryItems(items: CardLibraryCardListItemData[]) {
    return [...items].sort((left, right) => {
      const leftTime = left.updatedAtIso ? Date.parse(left.updatedAtIso) : 0;
      const rightTime = right.updatedAtIso ? Date.parse(right.updatedAtIso) : 0;
      return rightTime - leftTime;
    });
  }

  function mapDetailToListItem(card: CardLibraryCardDetailData): CardLibraryCardListItemData {
    return {
      cardId: card.cardId,
      content: card.content,
      meaning: card.meaning,
      cardType: card.cardType,
      updatedAtIso: card.updatedAtIso ?? new Date().toISOString(),
      updatedAtLabel: 'Just now',
      groups: card.groups,
    };
  }

  function handleCardUpdated(event: CustomEvent<{ card: CardLibraryCardDetailData; availableGroups: CardLibraryGroupData[] }>) {
    selectedCard = event.detail.card;
    selectedCardAvailableGroups = event.detail.availableGroups;

    const nextItem = mapDetailToListItem(event.detail.card);
    const otherItems = library.items.filter((item) => item.cardId !== nextItem.cardId);
    const nextItems = sortLibraryItems([nextItem, ...otherItems]);

    library = {
      ...library,
      items: nextItems,
      filteredCardIds: nextItems.map((item) => item.cardId),
    };
  }

  function handleCardDeleted(event: CustomEvent<{ cardId: string }>) {
    const nextItems = library.items.filter((item) => item.cardId !== event.detail.cardId);

    library = {
      ...library,
      items: nextItems,
      totalCount: nextItems.length,
      filteredCardIds: nextItems.map((item) => item.cardId),
    };

    selectedCard = null;
    void navigateDrawer(null);
  }
</script>

<svelte:head>
  <title>Cards – StudyPuck</title>
</svelte:head>

<section class="cards-page stack" style="--stack-space: var(--space-5)">
  <header class="stack" style="--stack-space: var(--space-2)">
    <p class="cards-page__eyebrow">Library</p>
    <h1>Cards</h1>
    <p>Open any active card to edit it in the shared drawer without leaving the current card set.</p>
  </header>

  {#if library.items.length === 0}
    <section class="cards-page__state stack" style="--stack-space: var(--space-2)">
      <div class="cards-page__state-icon" aria-hidden="true">🃏</div>
      <h2>No active cards yet</h2>
      <p>Promote a draft card in Card Entry to start building your library.</p>
    </section>
  {:else}
    <section class="cards-page__list stack" style="--stack-space: var(--space-3)">
      <div class="cards-page__columns" aria-hidden="true">
        <span>Card</span>
        <span>Groups</span>
        <span>Updated</span>
      </div>

      {#each library.items as item (item.cardId)}
        <button type="button" class="cards-page__row" on:click={() => void openCard(item.cardId)}>
          <div class="cards-page__content stack" style="--stack-space: var(--space-1)">
            <div class="cluster cards-page__heading">
              <CardListStatusBadge label="Active" tone="active" />
              <h2>{item.content}</h2>
            </div>

            {#if item.meaning}
              <p class="cards-page__meaning">{item.meaning}</p>
            {/if}
          </div>

          <div class="cards-page__groups">
            {#if item.groups.length === 0}
              <span class="cards-page__empty-groups">No groups yet</span>
            {:else}
              {#each item.groups as group}
                <CardListTagChip label={group.groupName} />
              {/each}
            {/if}
          </div>

          <span class="cards-page__updated">{item.updatedAtLabel}</span>
        </button>
      {/each}
    </section>
  {/if}
</section>

{#if selectedCard && selectedIndex >= 0}
  <ActiveCardDrawer
    lang={$page.params.lang ?? ''}
    card={selectedCard}
    availableGroups={selectedCardAvailableGroups}
    selectedIndex={selectedIndex}
    totalCount={library.filteredCardIds.length}
    hasPrevious={selectedIndex > 0}
    hasNext={selectedIndex < library.filteredCardIds.length - 1}
    on:updated={handleCardUpdated}
    on:deleted={handleCardDeleted}
    on:close={() => void navigateDrawer(null)}
    on:previous={() => void navigateDrawer(library.filteredCardIds[selectedIndex - 1] ?? null)}
    on:next={() => void navigateDrawer(library.filteredCardIds[selectedIndex + 1] ?? null)}
  />
{/if}

<style>
  .cards-page {
    padding: calc(var(--shell-header-height) + var(--space-5)) var(--space-4) var(--space-7);
  }

  .cards-page__eyebrow {
    margin: 0;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .cards-page h1,
  .cards-page h2,
  .cards-page p {
    margin: 0;
  }

  .cards-page__state {
    align-items: center;
    justify-items: center;
    padding: var(--space-6);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    text-align: center;
  }

  .cards-page__state-icon {
    font-size: 2rem;
  }

  .cards-page__columns {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(10rem, 1fr) auto;
    gap: var(--space-3);
    padding: 0 var(--space-4) var(--space-2);
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .cards-page__row {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(10rem, 1fr) auto;
    gap: var(--space-3);
    align-items: start;
    inline-size: 100%;
    padding: var(--space-4);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    color: inherit;
    text-align: start;
    transition:
      border-color var(--duration-fast) var(--ease-standard),
      background var(--duration-fast) var(--ease-standard);
  }

  .cards-page__row:hover,
  .cards-page__row:focus-visible {
    border-color: var(--color-border);
    background: color-mix(in srgb, var(--color-surface-raised) 45%, var(--color-surface));
  }

  .cards-page__heading {
    align-items: center;
    gap: var(--space-2);
  }

  .cards-page__heading h2 {
    font-size: var(--font-size-h4);
  }

  .cards-page__meaning,
  .cards-page__updated,
  .cards-page__empty-groups {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  .cards-page__groups {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .cards-page__row:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (max-width: 900px) {
    .cards-page {
      padding-inline: var(--space-3);
    }

    .cards-page__columns {
      display: none;
    }

    .cards-page__row {
      grid-template-columns: 1fr;
    }
  }
</style>
