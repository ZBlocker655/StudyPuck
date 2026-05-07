<script lang="ts">
  import { goto, invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { onDestroy, onMount } from 'svelte';
  import ActiveCardDrawer from '$lib/components/cards/ActiveCardDrawer.svelte';
  import CardListBulkActionBar from '$lib/components/card-list/CardListBulkActionBar.svelte';
  import CardListColumns from '$lib/components/card-list/CardListColumns.svelte';
  import CardListFilterBar from '$lib/components/card-list/CardListFilterBar.svelte';
  import CardListRow from '$lib/components/card-list/CardListRow.svelte';
  import CardListTagChip from '$lib/components/card-list/CardListTagChip.svelte';
  import {
    cardLibraryTypeOptions,
    formatCardLibraryGroupFilterLabel,
    formatCardLibraryTypeFilterLabel,
    getVisibleCardGroups,
    mapCardDetailToListItem,
    sortCardLibraryGroups,
    sortCardLibraryItems,
    type CardLibraryCardType,
  } from '$lib/cards/library.js';
  import { commandBar } from '$lib/stores/commandBar.js';
  import type {
    CardLibraryCardDetailData,
    CardLibraryCardListItemData,
    CardLibraryData,
    CardLibraryGroupData,
  } from '$lib/server/cards.js';
  import type { PageData } from './$types.js';

  export let data: PageData;

  type BulkAction = 'assign-group' | 'delete';
  type ActionFeedback = {
    title: string;
    message: string;
  };

  let library: CardLibraryData = data.library;
  let selectedCard: CardLibraryCardDetailData | null = data.selectedCard;
  let selectedCardAvailableGroups: CardLibraryGroupData[] = data.selectedCardAvailableGroups;
  let previousLibraryData = data.library;
  let previousSelectedCard = data.selectedCard;
  let previousSelectedCardAvailableGroups = data.selectedCardAvailableGroups;
  let searchQuery = data.library.filters.searchText;
  let selectedGroupIds = [...data.library.filters.groupIds];
  let selectedType: CardLibraryCardType | null = data.library.filters.cardType;
  let lastAppliedFilterState = '';
  let lastRequestedFilterState = '';
  let filterSyncTimer: ReturnType<typeof setTimeout> | null = null;
  let selectedCardIds: string[] = [];
  let isRefreshing = false;
  let actionFeedback: ActionFeedback | null = null;
  let pendingAction: { action: BulkAction; cardIds: string[] } | null = null;
  let bulkAssignOpen = false;
  let selectedBulkGroupId: string | null = null;
  let isMobileViewport = false;
  let viewportMediaQuery: MediaQueryList | null = null;

  function serializeFilterState(nextSearchQuery: string, nextGroupIds: string[], nextType: CardLibraryCardType | null) {
    return JSON.stringify({
      searchQuery: nextSearchQuery.trim(),
      groupIds: [...nextGroupIds],
      type: nextType,
    });
  }

  function syncViewportMode() {
    isMobileViewport = viewportMediaQuery?.matches ?? false;
  }

  onMount(() => {
    viewportMediaQuery = window.matchMedia('(max-width: 900px)');
    syncViewportMode();
    viewportMediaQuery.addEventListener('change', syncViewportMode);
  });

  onDestroy(() => {
    filterSyncTimer && clearTimeout(filterSyncTimer);
    viewportMediaQuery?.removeEventListener('change', syncViewportMode);
  });

  $: currentLang = $page.params.lang ?? '';
  $: commandBar.setWorkspaceContext(currentLang || null, null);
  $: commandBar.setSurfaceContext(
    selectedCard
      ? {
          surface: 'card_detail_drawer',
          sourceSurface: 'card_library_list',
          cardId: selectedCard.cardId,
        }
      : {
          surface: 'card_library_list',
          filters: library.filters,
          selectedCardIds,
        },
  );
  $: if (!selectedCard) {
    commandBar.setTargetHint(null, null);
  }

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

  $: appliedFilterState = serializeFilterState(
    library.filters.searchText,
    library.filters.groupIds,
    library.filters.cardType,
  );

  $: if (appliedFilterState !== lastAppliedFilterState) {
    searchQuery = library.filters.searchText;
    selectedGroupIds = [...library.filters.groupIds];
    selectedType = library.filters.cardType;
    lastAppliedFilterState = appliedFilterState;
    lastRequestedFilterState = appliedFilterState;
    selectedCardIds = selectedCardIds.filter((cardId) => library.filteredCardIds.includes(cardId));
  }

  $: currentFilterState = serializeFilterState(searchQuery, selectedGroupIds, selectedType);

  $: if (currentFilterState !== lastAppliedFilterState && currentFilterState !== lastRequestedFilterState) {
    scheduleFilterNavigation(currentFilterState);
  }

  $: selectedIndex = selectedCard ? library.filteredCardIds.indexOf(selectedCard.cardId) : -1;
  $: isSelectMode = selectedCardIds.length > 0;
  $: sortedAvailableGroups = sortCardLibraryGroups(library.availableGroups);
  $: selectedGroupNames = sortedAvailableGroups
    .filter((group) => selectedGroupIds.includes(group.groupId))
    .map((group) => group.groupName);
  $: groupFilterLabel = formatCardLibraryGroupFilterLabel(selectedGroupNames);
  $: typeFilterLabel = formatCardLibraryTypeFilterLabel(selectedType);
  $: hasActiveFilters = searchQuery.trim().length > 0 || selectedGroupIds.length > 0 || selectedType !== null;

  function scheduleFilterNavigation(nextFilterState: string) {
    if (filterSyncTimer) {
      clearTimeout(filterSyncTimer);
    }

    filterSyncTimer = setTimeout(() => {
      lastRequestedFilterState = nextFilterState;
      selectedCardIds = [];
      bulkAssignOpen = false;
      selectedBulkGroupId = null;
      actionFeedback = null;
      void goto(buildFilterUrl(), {
        keepFocus: true,
        noScroll: true,
        replaceState: true,
      });
    }, 150);
  }

  function buildFilterUrl(cardId: string | null = null) {
    const nextUrl = new URL($page.url);

    if (searchQuery.trim().length > 0) {
      nextUrl.searchParams.set('q', searchQuery.trim());
    } else {
      nextUrl.searchParams.delete('q');
    }

    nextUrl.searchParams.delete('group');

    for (const groupId of selectedGroupIds) {
      nextUrl.searchParams.append('group', groupId);
    }

    if (selectedType) {
      nextUrl.searchParams.set('type', selectedType);
    } else {
      nextUrl.searchParams.delete('type');
    }

    if (cardId) {
      nextUrl.searchParams.set('card', cardId);
    } else {
      nextUrl.searchParams.delete('card');
    }

    return `${nextUrl.pathname}${nextUrl.search}`;
  }

  async function openCard(cardId: string) {
    await goto(buildFilterUrl(cardId), {
      keepFocus: true,
      noScroll: true,
    });
  }

  async function navigateDrawer(cardId: string | null) {
    await goto(buildFilterUrl(cardId), {
      keepFocus: true,
      noScroll: true,
      replaceState: true,
    });
  }

  function clearFilters() {
    searchQuery = '';
    selectedGroupIds = [];
    selectedType = null;
  }

  function toggleSelection(cardId: string) {
    if (selectedCardIds.includes(cardId)) {
      selectedCardIds = selectedCardIds.filter((selectedCardId) => selectedCardId !== cardId);
      return;
    }

    selectedCardIds = [...selectedCardIds, cardId];
  }

  function clearSelection() {
    selectedCardIds = [];
    bulkAssignOpen = false;
    selectedBulkGroupId = null;
  }

  function dismissActionFeedback() {
    actionFeedback = null;
  }

  function handleRowActivate(cardId: string) {
    if (isMobileViewport && isSelectMode) {
      toggleSelection(cardId);
      return;
    }

    void openCard(cardId);
  }

  function handleRowLongPress(cardId: string) {
    if (!isMobileViewport) {
      return;
    }

    if (!selectedCardIds.includes(cardId)) {
      selectedCardIds = [...selectedCardIds, cardId];
    }
  }

  function getMobileMeta(item: CardLibraryCardListItemData) {
    const groupSummary = getVisibleCardGroups(item.groups);
    const segments = [];

    if (item.meaning) {
      segments.push(item.meaning);
    }

    if (groupSummary.visibleGroups.length > 0) {
      segments.push(
        `${groupSummary.visibleGroups.map((group) => group.groupName).join(', ')}${groupSummary.overflowCount > 0 ? ` +${groupSummary.overflowCount}` : ''}`,
      );
    }

    segments.push(item.updatedAtLabel);
    return segments.join(' · ');
  }

  function isPending(action: BulkAction) {
    return pendingAction?.action === action && pendingAction.cardIds.length === selectedCardIds.length;
  }

  async function applyCardsAction(action: BulkAction, options?: { groupId?: string }) {
    if (selectedCardIds.length === 0 || !currentLang) {
      return;
    }

    pendingAction = {
      action,
      cardIds: [...selectedCardIds],
    };
    actionFeedback = null;

    try {
      const response = await fetch(`/${currentLang}/cards/actions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action,
          cardIds: selectedCardIds,
          groupId: options?.groupId ?? null,
        }),
      });

      const responseBody = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(responseBody?.message ?? 'The card action could not be completed right now.');
      }

      selectedCardIds = [];
      bulkAssignOpen = false;
      selectedBulkGroupId = null;
      isRefreshing = true;
      await invalidateAll();
    } catch (error) {
      actionFeedback = {
        title: 'Action failed',
        message: error instanceof Error ? error.message : 'The card action could not be completed right now.',
      };
    } finally {
      isRefreshing = false;
      pendingAction = null;
    }
  }

  function handleCardUpdated(event: CustomEvent<{ card: CardLibraryCardDetailData; availableGroups: CardLibraryGroupData[] }>) {
    selectedCard = event.detail.card;
    selectedCardAvailableGroups = event.detail.availableGroups;

    const nextItem = mapCardDetailToListItem(event.detail.card);
    const otherItems = library.items.filter((item) => item.cardId !== nextItem.cardId);
    const nextItems = sortCardLibraryItems([nextItem, ...otherItems]);

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
  <header class="cards-page__header stack" style="--stack-space: var(--space-2)">
    <p class="cards-page__eyebrow">Cards</p>
    <h1>Cards</h1>
  </header>

  <CardListFilterBar
    bind:searchQuery
    bind:selectedGroupIds
    bind:selectedType
    availableGroups={sortedAvailableGroups}
    availableTypes={cardLibraryTypeOptions}
    searchLabel="Search cards"
    searchPlaceholder="Search cards..."
    groupFilterLabel={groupFilterLabel}
    typeFilterLabel={typeFilterLabel}
    clearGroupLabel="All groups"
    clearTypeLabel="All types"
  />

  {#if isSelectMode}
    <div class="cards-page__bulk-actions">
      <CardListBulkActionBar
        selectedCount={selectedCardIds.length}
        itemLabelSingular="card"
        itemLabelPlural="cards"
        primaryActionLabel="Assign to group"
        primaryActionPendingLabel="Assigning..."
        secondaryActionLabel="Delete"
        secondaryActionPendingLabel="Deleting..."
        disabled={pendingAction !== null}
        pendingAction={isPending('assign-group') ? 'primary' : isPending('delete') ? 'secondary' : null}
        on:primary={() => {
          if (sortedAvailableGroups.length === 0) {
            actionFeedback = {
              title: 'No groups available',
              message: 'Create a group first before assigning cards to it.',
            };
            return;
          }

          bulkAssignOpen = true;
          selectedBulkGroupId = sortedAvailableGroups[0]?.groupId ?? null;
        }}
        on:secondary={() => void applyCardsAction('delete')}
        on:clear={clearSelection}
      />
    </div>
  {/if}

  {#if actionFeedback}
    <section class="cards-page__feedback" role="status" aria-live="polite">
      <div class="stack" style="--stack-space: var(--space-1)">
        <p class="cards-page__feedback-title">{actionFeedback.title}</p>
        <p>{actionFeedback.message}</p>
      </div>

      <button type="button" class="cards-page__feedback-dismiss" on:click={dismissActionFeedback}>Dismiss</button>
    </section>
  {/if}

  {#if isRefreshing}
    <section class="cards-page__state">
      <h2>Refreshing cards…</h2>
      <p>Updating the card library with your latest changes.</p>
    </section>
  {:else if library.items.length === 0 && !hasActiveFilters}
    <section class="cards-page__state">
      <div class="cards-page__state-icon" aria-hidden="true">📭</div>
      <h2>No cards yet</h2>
      <p>Start by adding your first card in Card Entry.</p>
      <a class="cards-page__state-cta" href={`/${currentLang}/card-entry`}>Go to Card Entry</a>
    </section>
  {:else if library.items.length === 0}
    <section class="cards-page__state">
      <div class="cards-page__state-icon" aria-hidden="true">🔎</div>
      <h2>No cards match your filters</h2>
      <p>Try adjusting your search or clearing the active filters.</p>
      <button type="button" class="cards-page__state-cta" on:click={clearFilters}>Clear filters</button>
    </section>
  {:else}
    <section class="cards-page__list stack" style="--stack-space: var(--space-3)">
      <CardListColumns
        labels={['Prompt / Content', 'Groups', 'Updated']}
        rowTemplate="1rem minmax(0, 2.2fr) minmax(10rem, 1fr) auto"
      />

      {#each library.items as item (item.cardId)}
        {@const groupSummary = getVisibleCardGroups(item.groups)}

        <CardListRow
          selected={selectedCardIds.includes(item.cardId)}
          checkboxLabel="Select card"
          rowTemplate="1rem minmax(0, 2.2fr) minmax(10rem, 1fr) auto"
          clickable
          hasActions={false}
          mobileShowCheckbox={!isMobileViewport || isSelectMode}
          on:toggleSelection={() => toggleSelection(item.cardId)}
          on:activate={() => handleRowActivate(item.cardId)}
          on:longpress={() => handleRowLongPress(item.cardId)}
        >
          <div slot="content" class="cards-row__content stack" style="--stack-space: var(--space-1)">
            <h2>{item.content}</h2>

            {#if item.meaning}
              <p class="cards-row__meaning">{item.meaning}</p>
            {/if}

            <p class="cards-row__mobile-meta">{getMobileMeta(item)}</p>
          </div>

          <div slot="groups" class="cards-row__groups">
            {#if groupSummary.visibleGroups.length === 0}
              <span class="cards-row__groups-empty">No groups yet</span>
            {:else}
              {#each groupSummary.visibleGroups as group}
                <CardListTagChip label={group.groupName} />
              {/each}

              {#if groupSummary.overflowCount > 0}
                <span class="cards-row__groups-more">+{groupSummary.overflowCount} more</span>
              {/if}
            {/if}
          </div>

          <span slot="updated" class="cards-row__updated">{item.updatedAtLabel}</span>
        </CardListRow>
      {/each}
    </section>
  {/if}
</section>

{#if bulkAssignOpen}
  <div class="cards-page__dialog-backdrop">
    <div class="cards-page__dialog stack" style="--stack-space: var(--space-3)" role="dialog" aria-modal="true" aria-labelledby="cards-bulk-assign-title">
      <h2 id="cards-bulk-assign-title">Assign {selectedCardIds.length} {selectedCardIds.length === 1 ? 'card' : 'cards'} to a group</h2>

      <div class="stack" style="--stack-space: var(--space-2)">
        {#each sortedAvailableGroups as group}
          <label class="cards-page__dialog-option">
            <input type="radio" bind:group={selectedBulkGroupId} value={group.groupId} />
            <span>{group.groupName}</span>
          </label>
        {/each}
      </div>

      <div class="cards-page__dialog-actions cluster">
        <button
          type="button"
          class="cards-page__dialog-button"
          on:click={() => {
            bulkAssignOpen = false;
            selectedBulkGroupId = null;
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          class="cards-page__dialog-button cards-page__dialog-button--primary"
          disabled={!selectedBulkGroupId || pendingAction !== null}
          on:click={() => void applyCardsAction('assign-group', { groupId: selectedBulkGroupId ?? undefined })}
        >
          {isPending('assign-group') ? 'Assigning…' : 'Assign cards'}
        </button>
      </div>
    </div>
  </div>
{/if}

{#if selectedCard && selectedIndex >= 0}
  <ActiveCardDrawer
    lang={currentLang}
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
    padding: calc(var(--shell-header-height) + var(--space-5)) var(--space-4) calc(var(--space-7) + 4.5rem);
  }

  .cards-page__eyebrow,
  .cards-page__feedback-title,
  .cards-row__updated,
  .cards-row__groups-empty,
  .cards-row__groups-more {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
  }

  .cards-page__eyebrow {
    margin: 0;
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .cards-page h1,
  .cards-page h2,
  .cards-page p {
    margin: 0;
  }

  .cards-page__feedback,
  .cards-page__state,
  .cards-page__dialog {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .cards-page__feedback {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    border-color: color-mix(in srgb, var(--color-error-border) 65%, var(--color-border));
    background: color-mix(in srgb, var(--color-error-bg) 18%, var(--color-surface));
  }

  .cards-page__feedback-title {
    color: var(--color-error-text);
    font-size: var(--font-size-small);
    font-weight: 600;
  }

  .cards-page__feedback-dismiss,
  .cards-page__state-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.55rem 0.9rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    cursor: pointer;
    font-family: var(--font-ui);
    text-decoration: none;
  }

  .cards-page__feedback-dismiss {
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-text-secondary);
    text-decoration: underline;
  }

  .cards-page__state {
    padding: var(--space-5);
    text-align: center;
    box-shadow: var(--shadow-sm);
  }

  .cards-page__state-icon {
    margin-block-end: var(--space-3);
    font-size: 2rem;
  }

  .cards-page__bulk-actions {
    position: sticky;
    inset-block-start: calc(var(--shell-header-height) + var(--space-3));
    z-index: 1;
  }

  .cards-row__content {
    min-inline-size: 0;
  }

  .cards-row__content h2,
  .cards-row__meaning,
  .cards-row__mobile-meta {
    overflow-wrap: anywhere;
  }

  .cards-row__content h2 {
    display: -webkit-box;
    overflow: hidden;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: var(--font-size-h4);
    line-height: var(--leading-heading);
  }

  .cards-row__meaning {
    display: -webkit-box;
    overflow: hidden;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    color: var(--color-text-secondary);
    line-height: 1.45;
  }

  .cards-row__groups {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
  }

  .cards-row__groups-more,
  .cards-row__mobile-meta {
    font-size: var(--font-size-small);
  }

  .cards-row__mobile-meta {
    display: none;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
  }

  .cards-page__dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 30;
    display: grid;
    place-items: center;
    padding: var(--space-4);
    background: color-mix(in srgb, var(--neutral-900) 18%, transparent);
  }

  .cards-page__dialog {
    inline-size: min(100%, 28rem);
    padding: var(--space-4);
    box-shadow: var(--shadow-lg);
  }

  .cards-page__dialog-option,
  .cards-page__dialog-actions {
    align-items: center;
    gap: var(--space-2);
  }

  .cards-page__dialog-option {
    display: flex;
    font-family: var(--font-ui);
  }

  .cards-page__dialog-actions {
    justify-content: flex-end;
  }

  .cards-page__dialog-button {
    min-block-size: 2.75rem;
    padding-inline: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
  }

  .cards-page__dialog-button--primary {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  @media (max-width: 900px) {
    .cards-page {
      padding-inline: var(--space-3);
    }

    .cards-page__bulk-actions {
      position: fixed;
      inset-inline: var(--space-3);
      inset-block-end: calc(4.5rem + var(--space-2));
      inset-block-start: auto;
      z-index: 5;
    }

    .cards-row__meaning,
    .cards-row__groups,
    .cards-row__updated {
      display: none;
    }

    .cards-row__mobile-meta {
      display: block;
    }
  }
</style>
