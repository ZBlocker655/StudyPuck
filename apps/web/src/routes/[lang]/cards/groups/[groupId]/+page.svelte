<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onDestroy, onMount, tick } from 'svelte';
  import ActiveCardDrawer from '$lib/components/cards/ActiveCardDrawer.svelte';
  import CardListBulkActionBar from '$lib/components/card-list/CardListBulkActionBar.svelte';
  import CardListColumns from '$lib/components/card-list/CardListColumns.svelte';
  import CardListFilterBar from '$lib/components/card-list/CardListFilterBar.svelte';
  import CardListRow from '$lib/components/card-list/CardListRow.svelte';
  import CardListTagChip from '$lib/components/card-list/CardListTagChip.svelte';
  import {
    buildGroupDetailMobileMeta,
    filterAddableGroupCards,
    matchesGroupDetailFilters,
    withCurrentGroupMembership,
    type GroupDetailCardType,
  } from '$lib/cards/group-detail.js';
  import { buildDeleteGroupMessage } from '$lib/cards/groups.js';
  import {
    cardLibraryTypeOptions,
    formatCardLibraryTypeFilterLabel,
    mapCardDetailToListItem,
    sortCardLibraryGroups,
    sortCardLibraryItems,
  } from '$lib/cards/library.js';
  import type {
    CardLibraryCardDetailData,
    CardLibraryCardListItemData,
    CardLibraryData,
    CardLibraryGroupData,
    GroupDetailData,
  } from '$lib/server/cards.js';
  import type { PageData } from './$types.js';

  export let data: PageData;

  type BulkAction = 'assign-group' | 'delete' | 'remove-from-group';
  type ActionFeedback = {
    title: string;
    message: string;
  };

  let groupDetail: GroupDetailData = data.groupDetail;
  let selectedCard: CardLibraryCardDetailData | null = data.selectedCard;
  let selectedCardAvailableGroups: CardLibraryGroupData[] = data.selectedCardAvailableGroups;
  let previousGroupDetail = data.groupDetail;
  let previousSelectedCard = data.selectedCard;
  let previousSelectedCardAvailableGroups = data.selectedCardAvailableGroups;

  let cards: CardLibraryData = data.groupDetail.cards;
  let addableCards = data.groupDetail.addableCards;
  let group = data.groupDetail.group;
  let searchQuery = data.groupDetail.cards.filters.searchText;
  let selectedType: GroupDetailCardType | null = data.groupDetail.cards.filters.cardType;
  let lastAppliedFilterState = '';
  let lastRequestedFilterState = '';
  let filterSyncTimer: ReturnType<typeof setTimeout> | null = null;
  let selectedCardIds: string[] = [];
  let actionFeedback: ActionFeedback | null = null;
  let pendingBulkAction: BulkAction | null = null;
  let bulkAssignOpen = false;
  let selectedBulkGroupId: string | null = null;
  let isMobileViewport = false;
  let viewportMediaQuery: MediaQueryList | null = null;

  let addCardsDrawerOpen = false;
  let addCardsDrawerElement: HTMLElement | null = null;
  let addCardsSearchQuery = '';
  let addCardsSelectedIds: string[] = [];
  let addCardsPending = false;

  let isEditingName = false;
  let isEditingDescription = false;
  let groupNameDraft = data.groupDetail.group.groupName;
  let groupDescriptionDraft = data.groupDetail.group.description ?? '';
  let groupNameError = '';
  let groupDescriptionError = '';
  let groupNameInput: HTMLInputElement | null = null;
  let groupDescriptionInput: HTMLTextAreaElement | null = null;
  let groupSavePending = false;

  let deleteDialogOpen = false;
  let deleteGroupPending = false;
  let deleteDialogCancelButton: HTMLButtonElement | null = null;

  function serializeFilterState(nextSearchQuery: string, nextType: GroupDetailCardType | null) {
    return JSON.stringify({
      searchQuery: nextSearchQuery.trim(),
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
  $: currentGroupId = group.groupId;
  $: currentGroupSummary = {
    groupId: group.groupId,
    groupName: group.groupName,
  };

  $: if (data.groupDetail !== previousGroupDetail) {
    groupDetail = data.groupDetail;
    group = data.groupDetail.group;
    cards = data.groupDetail.cards;
    addableCards = data.groupDetail.addableCards;
    previousGroupDetail = data.groupDetail;
  }

  $: if (data.selectedCard !== previousSelectedCard) {
    selectedCard = data.selectedCard;
    previousSelectedCard = data.selectedCard;
  }

  $: if (data.selectedCardAvailableGroups !== previousSelectedCardAvailableGroups) {
    selectedCardAvailableGroups = data.selectedCardAvailableGroups;
    previousSelectedCardAvailableGroups = data.selectedCardAvailableGroups;
  }

  $: appliedFilterState = serializeFilterState(cards.filters.searchText, cards.filters.cardType);

  $: if (appliedFilterState !== lastAppliedFilterState) {
    searchQuery = cards.filters.searchText;
    selectedType = cards.filters.cardType;
    lastAppliedFilterState = appliedFilterState;
    lastRequestedFilterState = appliedFilterState;
    selectedCardIds = selectedCardIds.filter((cardId) => cards.filteredCardIds.includes(cardId));
  }

  $: currentFilterState = serializeFilterState(searchQuery, selectedType);

  $: if (currentFilterState !== lastAppliedFilterState && currentFilterState !== lastRequestedFilterState) {
    scheduleFilterNavigation(currentFilterState);
  }

  $: selectedIndex = selectedCard ? cards.filteredCardIds.indexOf(selectedCard.cardId) : -1;
  $: isSelectMode = selectedCardIds.length > 0;
  $: typeFilterLabel = formatCardLibraryTypeFilterLabel(selectedType);
  $: hasActiveFilters = searchQuery.trim().length > 0 || selectedType !== null;
  $: filteredAddableCards = filterAddableGroupCards(addableCards.items, addCardsSearchQuery);
  $: sortedAssignableGroups = sortCardLibraryGroups(cards.availableGroups.filter((item) => item.groupId !== currentGroupId));

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
      addCardsDrawerOpen = false;
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
    selectedType = null;
  }

  function dismissActionFeedback() {
    actionFeedback = null;
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

  function replaceCards(nextItems: CardLibraryCardListItemData[]) {
    cards = {
      ...cards,
      items: nextItems,
      totalCount: nextItems.length,
      filteredCardIds: nextItems.map((item) => item.cardId),
    };
  }

  function removeCardIdsFromCurrentList(cardIds: string[]) {
    replaceCards(cards.items.filter((item) => !cardIds.includes(item.cardId)));
    selectedCardIds = selectedCardIds.filter((cardId) => !cardIds.includes(cardId));

    if (selectedCard && cardIds.includes(selectedCard.cardId)) {
      selectedCard = null;
      void navigateDrawer(null);
    }
  }

  function addItemsToAddableList(items: CardLibraryCardListItemData[]) {
    const existingIds = new Set(addableCards.items.map((item) => item.cardId));
    const nextItems = [
      ...addableCards.items,
      ...items.filter((item) => !existingIds.has(item.cardId)),
    ];

    addableCards = {
      items: sortCardLibraryItems(nextItems),
      totalCount: nextItems.length,
    };
  }

  function removeAddableCardIds(cardIds: string[]) {
    const nextItems = addableCards.items.filter((item) => !cardIds.includes(item.cardId));
    addableCards = {
      items: nextItems,
      totalCount: nextItems.length,
    };
  }

  async function applyBulkAction(action: BulkAction, options?: { groupId?: string }) {
    if (selectedCardIds.length === 0 || !currentLang) {
      return;
    }

    pendingBulkAction = action;
    actionFeedback = null;

    try {
      const endpoint = action === 'remove-from-group'
        ? `/${currentLang}/cards/groups/${currentGroupId}/actions`
        : `/${currentLang}/cards/actions`;
      const body = action === 'remove-from-group'
        ? {
            action: 'remove-cards',
            cardIds: selectedCardIds,
          }
        : {
            action,
            cardIds: selectedCardIds,
            groupId: options?.groupId ?? null,
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const responseBody = (await response.json().catch(() => null)) as
        | {
            message?: string;
            deletedCardIds?: string[];
            removedCardIds?: string[];
          }
        | null;

      if (!response.ok) {
        throw new Error(responseBody?.message ?? 'The card action could not be completed right now.');
      }

      if (action === 'delete') {
        const deletedCardIds = responseBody?.deletedCardIds ?? [];
        const deletedCount = cards.items.filter((item) => deletedCardIds.includes(item.cardId)).length;
        removeCardIdsFromCurrentList(deletedCardIds);
        group = {
          ...group,
          activeCardCount: Math.max(group.activeCardCount - deletedCount, 0),
        };
      }

      if (action === 'remove-from-group') {
        const removedCardIds = responseBody?.removedCardIds ?? [];
        const removedItems = cards.items
          .filter((item) => removedCardIds.includes(item.cardId))
          .map((item) => ({
            ...item,
            groups: item.groups.filter((itemGroup) => itemGroup.groupId !== currentGroupId),
          }));

        removeCardIdsFromCurrentList(removedCardIds);
        addItemsToAddableList(removedItems);
        group = {
          ...group,
          activeCardCount: Math.max(group.activeCardCount - removedCardIds.length, 0),
        };
      }

      selectedCardIds = [];
      bulkAssignOpen = false;
      selectedBulkGroupId = null;
    } catch (error) {
      actionFeedback = {
        title: 'Action failed',
        message: error instanceof Error ? error.message : 'The card action could not be completed right now.',
      };
    } finally {
      pendingBulkAction = null;
    }
  }

  function handleCardUpdated(event: CustomEvent<{ card: CardLibraryCardDetailData; availableGroups: CardLibraryGroupData[] }>) {
    selectedCard = event.detail.card;
    selectedCardAvailableGroups = event.detail.availableGroups;

    const stillInGroup = event.detail.card.groups.some((itemGroup) => itemGroup.groupId === currentGroupId);

    if (!stillInGroup) {
      removeCardIdsFromCurrentList([event.detail.card.cardId]);
      addItemsToAddableList([
        {
          ...mapCardDetailToListItem(event.detail.card),
          groups: event.detail.card.groups.filter((itemGroup) => itemGroup.groupId !== currentGroupId),
        },
      ]);
      group = {
        ...group,
        activeCardCount: Math.max(group.activeCardCount - 1, 0),
      };
      return;
    }

    const nextItem = mapCardDetailToListItem(event.detail.card);
    const otherItems = cards.items.filter((item) => item.cardId !== nextItem.cardId);
    const nextItems = sortCardLibraryItems([nextItem, ...otherItems]);

    replaceCards(nextItems);
    removeAddableCardIds([nextItem.cardId]);
  }

  function handleCardDeleted(event: CustomEvent<{ cardId: string }>) {
    const deletedCount = cards.items.some((item) => item.cardId === event.detail.cardId) ? 1 : 0;
    removeCardIdsFromCurrentList([event.detail.cardId]);
    group = {
      ...group,
      activeCardCount: Math.max(group.activeCardCount - deletedCount, 0),
    };
  }

  function openAddCardsDrawer() {
    addCardsDrawerOpen = true;
    addCardsSearchQuery = '';
    addCardsSelectedIds = [];
    tick().then(() => addCardsDrawerElement?.focus());
  }

  function closeAddCardsDrawer() {
    if (addCardsPending) {
      return;
    }

    addCardsDrawerOpen = false;
    addCardsSearchQuery = '';
    addCardsSelectedIds = [];
  }

  function toggleAddCardSelection(cardId: string) {
    if (addCardsSelectedIds.includes(cardId)) {
      addCardsSelectedIds = addCardsSelectedIds.filter((selectedCardId) => selectedCardId !== cardId);
      return;
    }

    addCardsSelectedIds = [...addCardsSelectedIds, cardId];
  }

  async function addSelectedCardsToGroup() {
    if (addCardsSelectedIds.length === 0 || !currentLang) {
      return;
    }

    addCardsPending = true;
    actionFeedback = null;

    try {
      const response = await fetch(`/${currentLang}/cards/groups/${currentGroupId}/actions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add-cards',
          cardIds: addCardsSelectedIds,
        }),
      });

      const responseBody = (await response.json().catch(() => null)) as
        | {
            addedCardIds?: string[];
            message?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(responseBody?.message ?? 'The cards could not be added right now.');
      }

      const addedCardIds = responseBody?.addedCardIds ?? [];
      const addedItems = addableCards.items
        .filter((item) => addedCardIds.includes(item.cardId))
        .map((item) => ({
          ...item,
          groups: withCurrentGroupMembership(item.groups, currentGroupSummary),
        }));

      const visibleAddedItems = addedItems.filter((item) => matchesGroupDetailFilters(item, searchQuery, selectedType));

      if (visibleAddedItems.length > 0) {
        replaceCards(sortCardLibraryItems([...visibleAddedItems, ...cards.items]));
      }

      removeAddableCardIds(addedCardIds);
      group = {
        ...group,
        activeCardCount: group.activeCardCount + addedCardIds.length,
      };
      closeAddCardsDrawer();
    } catch (error) {
      actionFeedback = {
        title: 'Add cards failed',
        message: error instanceof Error ? error.message : 'The cards could not be added right now.',
      };
    } finally {
      addCardsPending = false;
    }
  }

  function beginEditingName() {
    groupNameDraft = group.groupName;
    groupNameError = '';
    isEditingName = true;
    tick().then(() => {
      groupNameInput?.focus();
      groupNameInput?.select();
    });
  }

  function beginEditingDescription() {
    groupDescriptionDraft = group.description ?? '';
    groupDescriptionError = '';
    isEditingDescription = true;
    tick().then(() => {
      groupDescriptionInput?.focus();
      groupDescriptionInput?.select();
    });
  }

  async function saveGroupMetadata(source: 'name' | 'description') {
    if (groupSavePending || !currentLang) {
      return;
    }

    groupSavePending = true;
    actionFeedback = null;

    try {
      const response = await fetch(`/${currentLang}/cards/groups/${currentGroupId}/actions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-group',
          groupName: source === 'name' ? groupNameDraft : group.groupName,
          description: source === 'description' ? groupDescriptionDraft : (group.description ?? ''),
        }),
      });

      const responseBody = (await response.json().catch(() => null)) as
        | {
            group?: GroupDetailData['group'];
            message?: string;
          }
        | null;

      if (!response.ok || !responseBody?.group) {
        throw new Error(responseBody?.message ?? 'The group could not be updated right now.');
      }

      const previousGroupId = group.groupId;
      group = responseBody.group;
      groupNameDraft = responseBody.group.groupName;
      groupDescriptionDraft = responseBody.group.description ?? '';
      groupNameError = '';
      groupDescriptionError = '';
      isEditingName = false;
      isEditingDescription = false;
      cards = {
        ...cards,
        availableGroups: sortCardLibraryGroups(
          cards.availableGroups.map((item) => item.groupId === previousGroupId
            ? { ...item, groupName: responseBody.group?.groupName ?? item.groupName }
            : item),
        ),
      };
      selectedCardAvailableGroups = sortCardLibraryGroups(
        selectedCardAvailableGroups.map((item) => item.groupId === previousGroupId
          ? { ...item, groupName: responseBody.group?.groupName ?? item.groupName }
          : item),
      );

      if (selectedCard) {
        selectedCard = {
          ...selectedCard,
          groups: selectedCard.groups.map((item) => item.groupId === previousGroupId
            ? { ...item, groupName: responseBody.group?.groupName ?? item.groupName }
            : item),
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The group could not be updated right now.';

      if (source === 'name') {
        groupNameDraft = group.groupName;
        groupNameError = message;
        isEditingName = false;
      } else {
        groupDescriptionDraft = group.description ?? '';
        groupDescriptionError = message;
        isEditingDescription = false;
      }
    } finally {
      groupSavePending = false;
    }
  }

  async function confirmDeleteGroup() {
    if (deleteGroupPending || !currentLang) {
      return;
    }

    deleteGroupPending = true;
    actionFeedback = null;

    try {
      const response = await fetch(`/${currentLang}/cards/groups/${currentGroupId}/actions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete-group',
        }),
      });

      const responseBody = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(responseBody?.message ?? 'The group could not be deleted right now.');
      }

      await goto(`/${currentLang}/cards/groups`);
    } catch (error) {
      actionFeedback = {
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'The group could not be deleted right now.',
      };
    } finally {
      deleteGroupPending = false;
      deleteDialogOpen = false;
    }
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') {
      return;
    }

    if (deleteDialogOpen) {
      deleteDialogOpen = false;
      return;
    }

    if (addCardsDrawerOpen) {
      event.preventDefault();
      closeAddCardsDrawer();
      return;
    }
  }

  function handleAddCardsDrawerKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !addCardsDrawerElement) {
      return;
    }

    const focusableElements = Array.from(
      addCardsDrawerElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], textarea:not([disabled]), input:not([disabled])',
      ),
    );

    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<svelte:head>
  <title>{group.groupName} - StudyPuck</title>
</svelte:head>

<section class="group-detail-page stack" style="--stack-space: var(--space-5)">
  <header class="group-detail-page__header stack" style="--stack-space: var(--space-3)">
    <a class="group-detail-page__back-link" href={`/${currentLang}/cards/groups`}>← Back to Groups</a>

    <div class="group-detail-page__header-main">
      <div class="stack" style="--stack-space: var(--space-2)">
        {#if isEditingName}
          <div class="stack" style="--stack-space: var(--space-1)">
            <input
              bind:this={groupNameInput}
              bind:value={groupNameDraft}
              class="group-detail-page__name-input"
              aria-label="Group name"
              disabled={groupSavePending}
              on:blur={() => void saveGroupMetadata('name')}
              on:keydown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void saveGroupMetadata('name');
                }
              }}
            />
            {#if groupNameError}
              <p class="group-detail-page__error" role="alert">{groupNameError}</p>
            {/if}
          </div>
        {:else}
          <button type="button" class="group-detail-page__name-button" on:click={beginEditingName}>
            <h1>{group.groupName}</h1>
          </button>
        {/if}

        {#if isEditingDescription}
          <div class="stack" style="--stack-space: var(--space-1)">
            <textarea
              bind:this={groupDescriptionInput}
              bind:value={groupDescriptionDraft}
              class="group-detail-page__description-input"
              aria-label="Group description"
              rows="3"
              disabled={groupSavePending}
              on:blur={() => void saveGroupMetadata('description')}
            ></textarea>
            {#if groupDescriptionError}
              <p class="group-detail-page__error" role="alert">{groupDescriptionError}</p>
            {/if}
          </div>
        {:else}
          <button type="button" class="group-detail-page__description-button" on:click={beginEditingDescription}>
            <p class:group-detail-page__description--placeholder={!group.description} class="group-detail-page__description">
              {group.description ?? 'Add a description...'}
            </p>
          </button>
        {/if}

        <p class="group-detail-page__count">
          {group.activeCardCount} {group.activeCardCount === 1 ? 'card' : 'cards'}
        </p>
      </div>

      <div class="group-detail-page__header-actions cluster">
        <button type="button" class="group-detail-page__header-button group-detail-page__header-button--danger" on:click={() => {
          deleteDialogOpen = true;
          tick().then(() => {
            deleteDialogCancelButton?.focus();
          });
        }}>
          Delete Group
        </button>
      </div>
    </div>
  </header>

  <div class="group-detail-page__toolbar">
    <CardListFilterBar
      bind:searchQuery
      bind:selectedType
      availableGroups={[]}
      availableTypes={cardLibraryTypeOptions}
      searchLabel="Search cards"
      searchPlaceholder="Search cards..."
      typeFilterLabel={typeFilterLabel}
      clearTypeLabel="All types"
      showGroupFilter={false}
    />

    <button type="button" class="group-detail-page__toolbar-button" on:click={openAddCardsDrawer}>
      + Add Cards
    </button>
  </div>

  {#if isSelectMode}
    <div class="group-detail-page__bulk-actions">
      <CardListBulkActionBar
        selectedCount={selectedCardIds.length}
        itemLabelSingular="card"
        itemLabelPlural="cards"
        primaryActionLabel="Assign to group"
        primaryActionPendingLabel="Assigning..."
        secondaryActionLabel="Delete"
        secondaryActionPendingLabel="Deleting..."
        tertiaryActionLabel="Remove from group"
        tertiaryActionPendingLabel="Removing..."
        disabled={pendingBulkAction !== null}
        pendingAction={pendingBulkAction === 'assign-group'
          ? 'primary'
          : pendingBulkAction === 'delete'
            ? 'secondary'
            : pendingBulkAction === 'remove-from-group'
              ? 'tertiary'
              : null}
        on:primary={() => {
          if (sortedAssignableGroups.length === 0) {
            actionFeedback = {
              title: 'No other groups available',
              message: 'Create another group first before assigning cards elsewhere.',
            };
            return;
          }

          bulkAssignOpen = true;
          selectedBulkGroupId = sortedAssignableGroups[0]?.groupId ?? null;
        }}
        on:secondary={() => void applyBulkAction('delete')}
        on:tertiary={() => void applyBulkAction('remove-from-group')}
        on:clear={clearSelection}
      />
    </div>
  {/if}

  {#if actionFeedback}
    <section class="group-detail-page__feedback" role="status" aria-live="polite">
      <div class="stack" style="--stack-space: var(--space-1)">
        <p class="group-detail-page__feedback-title">{actionFeedback.title}</p>
        <p>{actionFeedback.message}</p>
      </div>

      <button type="button" class="group-detail-page__feedback-dismiss" on:click={dismissActionFeedback}>Dismiss</button>
    </section>
  {/if}

  {#if cards.items.length === 0 && !hasActiveFilters}
    <section class="group-detail-page__state">
      <div class="group-detail-page__state-icon" aria-hidden="true">📂</div>
      <h2>No cards in this group yet</h2>
      <p>Add cards from the library to start building this group.</p>
      <button type="button" class="group-detail-page__state-cta" on:click={openAddCardsDrawer}>+ Add Cards</button>
    </section>
  {:else if cards.items.length === 0}
    <section class="group-detail-page__state">
      <div class="group-detail-page__state-icon" aria-hidden="true">🔎</div>
      <h2>No cards match your filters</h2>
      <p>Try adjusting your search or clearing the active filters.</p>
      <button type="button" class="group-detail-page__state-cta" on:click={clearFilters}>Clear filters</button>
    </section>
  {:else}
    <section class="group-detail-page__list stack" style="--stack-space: var(--space-3)">
      <CardListColumns labels={['Prompt / Content', 'Updated']} rowTemplate="1rem minmax(0, 2.4fr) auto" />

      {#each cards.items as item (item.cardId)}
        <CardListRow
          selected={selectedCardIds.includes(item.cardId)}
          checkboxLabel="Select card"
          rowTemplate="1rem minmax(0, 2.4fr) auto"
          clickable
          showGroups={false}
          hasActions={false}
          mobileShowCheckbox={!isMobileViewport || isSelectMode}
          on:toggleSelection={() => toggleSelection(item.cardId)}
          on:activate={() => handleRowActivate(item.cardId)}
          on:longpress={() => handleRowLongPress(item.cardId)}
        >
          <div slot="content" class="group-detail-row__content stack" style="--stack-space: var(--space-1)">
            <h2>{item.content}</h2>

            {#if item.meaning}
              <p class="group-detail-row__meaning">{item.meaning}</p>
            {/if}

            <p class="group-detail-row__mobile-meta">{buildGroupDetailMobileMeta(item)}</p>
          </div>

          <span slot="updated" class="group-detail-row__updated">{item.updatedAtLabel}</span>
        </CardListRow>
      {/each}
    </section>
  {/if}
</section>

{#if bulkAssignOpen}
  <div class="group-detail-page__dialog-backdrop">
    <section class="group-detail-page__dialog stack" style="--stack-space: var(--space-3)" role="dialog" aria-modal="true" aria-labelledby="group-detail-bulk-assign-title">
      <h2 id="group-detail-bulk-assign-title">Assign {selectedCardIds.length} {selectedCardIds.length === 1 ? 'card' : 'cards'} to a group</h2>

      <div class="stack" style="--stack-space: var(--space-2)">
        {#each sortedAssignableGroups as assignableGroup}
          <label class="group-detail-page__dialog-option">
            <input type="radio" bind:group={selectedBulkGroupId} value={assignableGroup.groupId} />
            <span>{assignableGroup.groupName}</span>
          </label>
        {/each}
      </div>

      <div class="group-detail-page__dialog-actions cluster">
        <button
          type="button"
          class="group-detail-page__dialog-button"
          on:click={() => {
            bulkAssignOpen = false;
            selectedBulkGroupId = null;
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          class="group-detail-page__dialog-button group-detail-page__dialog-button--primary"
          disabled={!selectedBulkGroupId || pendingBulkAction !== null}
          on:click={() => void applyBulkAction('assign-group', { groupId: selectedBulkGroupId ?? undefined })}
        >
          {pendingBulkAction === 'assign-group' ? 'Assigning...' : 'Assign cards'}
        </button>
      </div>
    </section>
  </div>
{/if}

{#if addCardsDrawerOpen}
  <button
    type="button"
    class="group-detail-page__drawer-backdrop"
    aria-label="Close add cards drawer"
    on:click={closeAddCardsDrawer}
  ></button>

  <div
    bind:this={addCardsDrawerElement}
    class="group-detail-page__drawer stack"
    style="--stack-space: var(--space-4)"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="group-detail-add-cards-title"
    on:keydown={handleAddCardsDrawerKeydown}
  >
    <header class="group-detail-page__drawer-header cluster">
      <h2 id="group-detail-add-cards-title">Add cards to {group.groupName}</h2>
      <button type="button" class="group-detail-page__drawer-close" aria-label="Close drawer" on:click={closeAddCardsDrawer}>
        ×
      </button>
    </header>

    {#if addableCards.totalCount === 0 && group.activeCardCount === 0}
      <section class="group-detail-page__drawer-state stack" style="--stack-space: var(--space-3)">
        <h3>No cards to add.</h3>
        <p>Create cards in Card Entry first.</p>
        <a class="group-detail-page__state-cta" href={`/${currentLang}/card-entry`}>Go to Card Entry</a>
      </section>
    {:else if addableCards.totalCount === 0}
      <section class="group-detail-page__drawer-state stack" style="--stack-space: var(--space-3)">
        <h3>All your cards are already in this group.</h3>
        <button type="button" class="group-detail-page__state-cta" on:click={closeAddCardsDrawer}>Close</button>
      </section>
    {:else}
      <label class="group-detail-page__drawer-search stack" style="--stack-space: var(--space-2)">
        <span class="group-detail-page__label">Search cards</span>
        <input
          bind:value={addCardsSearchQuery}
          class="group-detail-page__drawer-search-input"
          type="search"
          placeholder="Search cards..."
          autocomplete="off"
        />
      </label>

      {#if filteredAddableCards.length === 0}
        <section class="group-detail-page__drawer-state stack" style="--stack-space: var(--space-3)">
          <h3>No cards match your search.</h3>
          <p>Try a different prompt or meaning search.</p>
        </section>
      {:else}
        <section class="group-detail-page__drawer-list stack" style="--stack-space: var(--space-2)">
          {#each filteredAddableCards as item (item.cardId)}
            <label class="group-detail-page__drawer-row">
              <input
                type="checkbox"
                checked={addCardsSelectedIds.includes(item.cardId)}
                on:change={() => toggleAddCardSelection(item.cardId)}
              />

              <div class="group-detail-page__drawer-row-body stack" style="--stack-space: var(--space-1)">
                <div class="group-detail-page__drawer-row-heading cluster">
                  <strong>{item.content}</strong>
                  <span class="group-detail-page__drawer-row-updated">{item.updatedAtLabel}</span>
                </div>

                {#if item.meaning}
                  <p>{item.meaning}</p>
                {/if}

                <div class="group-detail-page__drawer-row-groups">
                  {#if item.groups.length === 0}
                    <span class="group-detail-page__drawer-row-empty">No groups yet</span>
                  {:else}
                    {#each item.groups.slice(0, 2) as itemGroup}
                      <CardListTagChip label={itemGroup.groupName} />
                    {/each}
                    {#if item.groups.length > 2}
                      <span class="group-detail-page__drawer-row-empty">+{item.groups.length - 2} more</span>
                    {/if}
                  {/if}
                </div>
              </div>
            </label>
          {/each}
        </section>
      {/if}

      <footer class="group-detail-page__drawer-footer">
        <button
          type="button"
          class="group-detail-page__drawer-submit"
          disabled={addCardsSelectedIds.length === 0 || addCardsPending}
          on:click={addSelectedCardsToGroup}
        >
          {#if addCardsPending}
            Adding...
          {:else if addCardsSelectedIds.length === 0}
            Add cards
          {:else}
            Add {addCardsSelectedIds.length} {addCardsSelectedIds.length === 1 ? 'card' : 'cards'}
          {/if}
        </button>
      </footer>
    {/if}
  </div>
{/if}

{#if deleteDialogOpen}
  <div class="group-detail-page__dialog-backdrop">
    <section class="group-detail-page__dialog stack" style="--stack-space: var(--space-3)" role="alertdialog" aria-modal="true" aria-labelledby="group-detail-delete-title">
      <h2 id="group-detail-delete-title">Delete "{group.groupName}"?</h2>
      <p>{buildDeleteGroupMessage(group)}</p>
      <div class="group-detail-page__dialog-actions cluster">
        <button type="button" class="group-detail-page__dialog-button" bind:this={deleteDialogCancelButton} disabled={deleteGroupPending} on:click={() => {
          deleteDialogOpen = false;
        }}>
          Cancel
        </button>
        <button
          type="button"
          class="group-detail-page__dialog-button group-detail-page__dialog-button--danger"
          disabled={deleteGroupPending}
          on:click={confirmDeleteGroup}
        >
          {deleteGroupPending ? 'Deleting...' : 'Delete Group'}
        </button>
      </div>
    </section>
  </div>
{/if}

{#if selectedCard && selectedIndex >= 0}
  <ActiveCardDrawer
    lang={currentLang}
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
    padding: calc(var(--shell-header-height) + var(--space-5)) var(--space-4) calc(var(--space-7) + 4.5rem);
  }

  .group-detail-page__header-main,
  .group-detail-page__header-actions,
  .group-detail-page__dialog-actions,
  .group-detail-page__drawer-header,
  .group-detail-page__drawer-row-heading {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .group-detail-page__toolbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-3);
    align-items: end;
  }

  .group-detail-page__back-link,
  .group-detail-page__count,
  .group-detail-page__feedback-title,
  .group-detail-row__meaning,
  .group-detail-row__updated,
  .group-detail-page__description,
  .group-detail-page__drawer-row-empty,
  .group-detail-page__drawer-row-updated {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
  }

  .group-detail-page h1,
  .group-detail-page h2,
  .group-detail-page h3,
  .group-detail-page p {
    margin: 0;
  }

  .group-detail-page__back-link {
    text-decoration: none;
  }

  .group-detail-page__name-button,
  .group-detail-page__description-button {
    display: block;
    inline-size: fit-content;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    text-align: start;
    cursor: pointer;
  }

  .group-detail-page__description-button {
    inline-size: 100%;
  }

  .group-detail-page__description--placeholder {
    color: var(--color-text-muted);
  }

  .group-detail-page__name-input,
  .group-detail-page__description-input,
  .group-detail-page__drawer-search-input {
    inline-size: 100%;
    min-block-size: 2.75rem;
    padding: 0.7rem 0.95rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: inherit;
  }

  .group-detail-page__description-input {
    resize: vertical;
  }

  .group-detail-page__error {
    color: var(--color-danger-text);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  .group-detail-page__header-button,
  .group-detail-page__toolbar-button,
  .group-detail-page__state-cta,
  .group-detail-page__dialog-button,
  .group-detail-page__drawer-submit {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: 2.75rem;
    padding-inline: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    text-decoration: none;
    cursor: pointer;
  }

  .group-detail-page__toolbar-button,
  .group-detail-page__drawer-submit,
  .group-detail-page__dialog-button--primary {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .group-detail-page__header-button--danger,
  .group-detail-page__dialog-button--danger {
    color: var(--color-danger-text);
    border-color: color-mix(in srgb, var(--color-danger-border) 60%, var(--color-border));
    background: color-mix(in srgb, var(--color-danger-text) 10%, var(--color-surface));
  }

  .group-detail-page__bulk-actions {
    position: sticky;
    inset-block-start: calc(var(--shell-header-height) + var(--space-3));
    z-index: 1;
  }

  .group-detail-page__feedback,
  .group-detail-page__state,
  .group-detail-page__dialog,
  .group-detail-page__drawer-state {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .group-detail-page__feedback {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    border-color: color-mix(in srgb, var(--color-error-border) 65%, var(--color-border));
    background: color-mix(in srgb, var(--color-error-bg) 18%, var(--color-surface));
  }

  .group-detail-page__feedback-title {
    color: var(--color-error-text);
    font-size: var(--font-size-small);
    font-weight: 600;
  }

  .group-detail-page__feedback-dismiss {
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-text-secondary);
    text-decoration: underline;
    cursor: pointer;
    font-family: var(--font-ui);
  }

  .group-detail-page__state,
  .group-detail-page__drawer-state {
    padding: var(--space-5);
    text-align: center;
  }

  .group-detail-page__state-icon {
    margin-block-end: var(--space-3);
    font-size: 2rem;
  }

  .group-detail-row__content {
    min-inline-size: 0;
  }

  .group-detail-row__mobile-meta {
    display: none;
  }

  .group-detail-page__dialog-backdrop,
  .group-detail-page__drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: 52;
    background: color-mix(in srgb, var(--neutral-900) 22%, transparent);
  }

  .group-detail-page__dialog-backdrop {
    display: grid;
    place-items: center;
    padding: var(--space-4);
  }

  .group-detail-page__dialog {
    inline-size: min(100%, 28rem);
    padding: var(--space-5);
  }

  .group-detail-page__drawer {
    position: fixed;
    inset-block: 0;
    inset-inline-end: 0;
    z-index: 53;
    inline-size: min(34rem, 100vw);
    padding: var(--space-4);
    border-inline-start: 1px solid var(--color-border);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-lg);
  }

  .group-detail-page__drawer-header,
  .group-detail-page__drawer-footer {
    position: sticky;
    background: var(--color-surface-raised);
  }

  .group-detail-page__drawer-header {
    inset-block-start: 0;
    padding-block-end: var(--space-2);
    border-block-end: 1px solid var(--color-border);
  }

  .group-detail-page__drawer-footer {
    inset-block-end: 0;
    padding-block-start: var(--space-2);
    border-block-start: 1px solid var(--color-border);
  }

  .group-detail-page__drawer-close {
    border: 0;
    background: none;
    color: var(--color-text-secondary);
    font-size: var(--font-size-h4);
    cursor: pointer;
  }

  .group-detail-page__label {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .group-detail-page__drawer-list {
    overflow: auto;
  }

  .group-detail-page__drawer-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-3);
    padding: var(--space-3);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    cursor: pointer;
  }

  .group-detail-page__drawer-row input {
    margin-block-start: 0.2rem;
  }

  .group-detail-page__drawer-row-groups {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .group-detail-page__header-button:focus-visible,
  .group-detail-page__toolbar-button:focus-visible,
  .group-detail-page__state-cta:focus-visible,
  .group-detail-page__dialog-button:focus-visible,
  .group-detail-page__drawer-submit:focus-visible,
  .group-detail-page__feedback-dismiss:focus-visible,
  .group-detail-page__name-button:focus-visible,
  .group-detail-page__description-button:focus-visible,
  .group-detail-page__name-input:focus-visible,
  .group-detail-page__description-input:focus-visible,
  .group-detail-page__drawer-search-input:focus-visible,
  .group-detail-page__drawer-close:focus-visible,
  .group-detail-page__back-link:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (max-width: 900px) {
    .group-detail-page {
      padding-inline: var(--space-3);
    }

    .group-detail-page__header-main,
    .group-detail-page__toolbar {
      grid-template-columns: 1fr;
    }

    .group-detail-page__header-main,
    .group-detail-page__header-actions {
      flex-direction: column;
    }

    .group-detail-page__toolbar-button {
      inline-size: 100%;
    }

    .group-detail-row__mobile-meta {
      display: block;
    }

    .group-detail-row__updated {
      display: none;
    }

    .group-detail-page__drawer {
      inline-size: 100vw;
      border-inline-start: 0;
      padding-block-end: calc(var(--space-5) + env(safe-area-inset-bottom));
    }
  }
</style>
