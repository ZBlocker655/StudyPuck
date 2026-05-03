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

  let cards: CardLibraryData = data.groupDetail.cards;
  let selectedCard: CardLibraryCardDetailData | null = data.selectedCard;
  let selectedCardAvailableGroups: CardLibraryGroupData[] = data.selectedCardAvailableGroups;
  let previousCards = data.groupDetail.cards;
  let previousSelectedCard = data.selectedCard;
  let previousSelectedCardAvailableGroups = data.selectedCardAvailableGroups;

  $: if (data.groupDetail.cards !== previousCards) {
    cards = data.groupDetail.cards;
    previousCards = data.groupDetail.cards;
  }

  $: if (data.selectedCard !== previousSelectedCard) {
    selectedCard = data.selectedCard;
    previousSelectedCard = data.selectedCard;
  }

  $: if (data.selectedCardAvailableGroups !== previousSelectedCardAvailableGroups) {
    selectedCardAvailableGroups = data.selectedCardAvailableGroups;
    previousSelectedCardAvailableGroups = data.selectedCardAvailableGroups;
  }

  $: selectedIndex = selectedCard ? cards.filteredCardIds.indexOf(selectedCard.cardId) : -1;

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

  function sortCards(items: CardLibraryCardListItemData[]) {
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
    const otherItems = cards.items.filter((item) => item.cardId !== nextItem.cardId);
    const nextItems = sortCards([nextItem, ...otherItems]);

    cards = {
      ...cards,
      items: nextItems,
      filteredCardIds: nextItems.map((item) => item.cardId),
    };
  }

  function handleCardDeleted(event: CustomEvent<{ cardId: string }>) {
    const nextItems = cards.items.filter((item) => item.cardId !== event.detail.cardId);

    cards = {
      ...cards,
      items: nextItems,
      totalCount: nextItems.length,
      filteredCardIds: nextItems.map((item) => item.cardId),
    };

    selectedCard = null;
    void navigateDrawer(null);
  }
</script>

<svelte:head>
  <title>{data.groupDetail.group.groupName} – StudyPuck</title>
</svelte:head>

<section class="group-detail-page stack" style="--stack-space: var(--space-5)">
  <header class="stack" style="--stack-space: var(--space-2)">
    <p class="group-detail-page__eyebrow">Cards</p>
    <h1>{data.groupDetail.group.groupName}</h1>
    {#if data.groupDetail.group.description}
      <p>{data.groupDetail.group.description}</p>
    {/if}
    <p class="group-detail-page__count">
      {data.groupDetail.group.activeCardCount} active {data.groupDetail.group.activeCardCount === 1 ? 'card' : 'cards'}
    </p>
  </header>

  {#if cards.items.length === 0}
    <section class="group-detail-page__state stack" style="--stack-space: var(--space-2)">
      <div class="group-detail-page__state-icon" aria-hidden="true">📂</div>
      <h2>No cards in this group yet</h2>
      <p>Add cards to this group from the library once they are active.</p>
    </section>
  {:else}
    <section class="group-detail-page__list stack" style="--stack-space: var(--space-3)">
      <div class="group-detail-page__columns" aria-hidden="true">
        <span>Card</span>
        <span>Groups</span>
        <span>Updated</span>
      </div>

      {#each cards.items as item (item.cardId)}
        <button type="button" class="group-detail-page__row" on:click={() => void openCard(item.cardId)}>
          <div class="group-detail-page__content stack" style="--stack-space: var(--space-1)">
            <div class="cluster group-detail-page__heading">
              <CardListStatusBadge label="Active" tone="active" />
              <h2>{item.content}</h2>
            </div>

            {#if item.meaning}
              <p class="group-detail-page__meaning">{item.meaning}</p>
            {/if}
          </div>

          <div class="group-detail-page__groups">
            {#if item.groups.length === 0}
              <span class="group-detail-page__empty-groups">No groups yet</span>
            {:else}
              {#each item.groups as group}
                <CardListTagChip label={group.groupName} />
              {/each}
            {/if}
          </div>

          <span class="group-detail-page__updated">{item.updatedAtLabel}</span>
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
    totalCount={cards.filteredCardIds.length}
    hasPrevious={selectedIndex > 0}
    hasNext={selectedIndex < cards.filteredCardIds.length - 1}
    on:updated={handleCardUpdated}
    on:deleted={handleCardDeleted}
    on:close={() => void navigateDrawer(null)}
    on:previous={() => void navigateDrawer(cards.filteredCardIds[selectedIndex - 1] ?? null)}
    on:next={() => void navigateDrawer(cards.filteredCardIds[selectedIndex + 1] ?? null)}
  />
{/if}

<style>
  .group-detail-page {
    padding: calc(var(--shell-header-height) + var(--space-5)) var(--space-4) var(--space-7);
  }

  .group-detail-page__eyebrow,
  .group-detail-page__count,
  .group-detail-page__meaning,
  .group-detail-page__updated,
  .group-detail-page__empty-groups {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
  }

  .group-detail-page__eyebrow {
    margin: 0;
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .group-detail-page h1,
  .group-detail-page h2,
  .group-detail-page p {
    margin: 0;
  }

  .group-detail-page__state {
    align-items: center;
    justify-items: center;
    padding: var(--space-6);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    text-align: center;
  }

  .group-detail-page__state-icon {
    font-size: 2rem;
  }

  .group-detail-page__columns {
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

  .group-detail-page__row {
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

  .group-detail-page__row:hover,
  .group-detail-page__row:focus-visible {
    border-color: var(--color-border);
    background: color-mix(in srgb, var(--color-surface-raised) 45%, var(--color-surface));
  }

  .group-detail-page__heading {
    align-items: center;
    gap: var(--space-2);
  }

  .group-detail-page__heading h2 {
    font-size: var(--font-size-h4);
  }

  .group-detail-page__groups {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .group-detail-page__row:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (max-width: 900px) {
    .group-detail-page {
      padding-inline: var(--space-3);
    }

    .group-detail-page__columns {
      display: none;
    }

    .group-detail-page__row {
      grid-template-columns: 1fr;
    }
  }
</style>
