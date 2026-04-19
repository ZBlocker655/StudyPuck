<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { filterDraftCards, formatDraftGroupFilterLabel } from '$lib/card-entry/drafts.js';
  import CardListBulkActionBar from '$lib/components/card-list/CardListBulkActionBar.svelte';
  import CardListColumns from '$lib/components/card-list/CardListColumns.svelte';
  import CardListFilterBar from '$lib/components/card-list/CardListFilterBar.svelte';
  import CardListRow from '$lib/components/card-list/CardListRow.svelte';
  import CardListStatusBadge from '$lib/components/card-list/CardListStatusBadge.svelte';
  import CardListTagChip from '$lib/components/card-list/CardListTagChip.svelte';
  import type { CardEntryDraftListItemData, CardEntryDraftsData } from '$lib/server/card-entry.js';

  export let data: {
    drafts: CardEntryDraftsData;
    loadError: string | null;
  };

  type DraftAction = 'promote' | 'delete';
  type ActionFeedback = {
    kind: 'missing-groups' | 'error';
    message: string;
    cardIds: string[];
  };

  let searchQuery = '';
  let selectedGroupIds: string[] = [];
  let selectedCardIds: string[] = [];
  let actionFeedback: ActionFeedback | null = null;
  let isRefreshing = false;
  let pendingAction: { action: DraftAction; cardIds: string[] } | null = null;

  $: currentLang = $page.params.lang ?? '';
  $: drafts = data.drafts;
  $: filteredItems = filterDraftCards(drafts.items, searchQuery, selectedGroupIds);
  $: selectedGroupNames = drafts.availableGroups
    .filter((group: CardEntryDraftsData['availableGroups'][number]) => selectedGroupIds.includes(group.groupId))
    .map((group: CardEntryDraftsData['availableGroups'][number]) => group.groupName);
  $: groupFilterLabel = formatDraftGroupFilterLabel(selectedGroupNames);
  $: isSelectMode = selectedCardIds.length > 0;
  $: cardsMissingGroupsForPromotion = new Set(
    actionFeedback?.kind === 'missing-groups' ? actionFeedback.cardIds : []
  );

  function getPrimarySourceNote(item: CardEntryDraftListItemData) {
    return item.sourceNotes[0] ?? null;
  }

  function getSourcePreview(item: CardEntryDraftListItemData) {
    const primarySourceNote = getPrimarySourceNote(item);

    if (!primarySourceNote) {
      return 'No source note linked';
    }

    if (item.sourceNotes.length === 1) {
      return primarySourceNote.content;
    }

    return `${primarySourceNote.content} +${item.sourceNotes.length - 1} more`;
  }

  function getSelectedCardIdsForAction(cardIds?: string[]) {
    if (cardIds && cardIds.length > 0) {
      return cardIds;
    }

    return selectedCardIds;
  }

  function clearFilters() {
    searchQuery = '';
    selectedGroupIds = [];
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
  }

  function dismissActionFeedback() {
    actionFeedback = null;
  }

  function isPending(cardId: string, action: DraftAction) {
    return pendingAction?.action === action && pendingAction.cardIds.includes(cardId);
  }

  function buildActionFeedback(action: DraftAction, cardIds: string[], message: string): ActionFeedback {
    const missingGroupCardIds =
      action === 'promote'
        ? cardIds.filter((cardId) => {
            const card = drafts.items.find((item) => item.cardId === cardId);
            return (card?.groups.length ?? 0) === 0;
          })
        : [];

    if (missingGroupCardIds.length > 0 && message.toLocaleLowerCase().includes('group')) {
      return {
        kind: 'missing-groups',
        message,
        cardIds: missingGroupCardIds,
      };
    }

    return {
      kind: 'error',
      message,
      cardIds,
    };
  }

  async function applyDraftAction(action: DraftAction, requestedCardIds?: string[]) {
    const cardIds = getSelectedCardIdsForAction(requestedCardIds);

    if (cardIds.length === 0 || !currentLang) {
      return;
    }

    pendingAction = { action, cardIds };
    actionFeedback = null;

    try {
      const response = await fetch(`/${currentLang}/card-entry/drafts/actions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action,
          cardIds,
        }),
      });

      const responseBody = (await response.json().catch(() => null)) as { message?: string } | null;

      if (!response.ok) {
        throw new Error(responseBody?.message ?? 'The draft action could not be completed right now.');
      }

      selectedCardIds = selectedCardIds.filter((cardId) => !cardIds.includes(cardId));
      isRefreshing = true;
      await invalidateAll();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The draft action could not be completed right now.';
      actionFeedback = buildActionFeedback(action, cardIds, message);
    } finally {
      isRefreshing = false;
      pendingAction = null;
    }
  }
</script>

<svelte:head>
  <title>Drafts – StudyPuck</title>
</svelte:head>

<section class="drafts-page stack" style="--stack-space: var(--space-5)">
  <header class="drafts-header cluster">
    <div class="stack" style="--stack-space: var(--space-2)">
      <p class="drafts-header__eyebrow">Card Entry</p>
      <div class="drafts-header__title cluster">
        <h1>Drafts</h1>
        <span class="drafts-count" aria-label={`${drafts.draftCardCount} draft cards`}>
          {drafts.draftCardCount}
        </span>
      </div>
      <p class="drafts-header__copy">Review draft cards across the whole language, then promote or delete them in batches.</p>
    </div>

    <div class="drafts-header__links cluster">
      <a class="drafts-header__link" href={`/${currentLang}/card-entry`}>← Back to inbox</a>
    </div>
  </header>

  {#if data.loadError}
    <section class="drafts-state drafts-state--error" role="alert">
      <h2>Drafts are unavailable</h2>
      <p>{data.loadError}</p>
    </section>
  {:else}
    <CardListFilterBar
      bind:searchQuery
      bind:selectedGroupIds
      availableGroups={drafts.availableGroups}
      searchLabel="Search drafts"
      searchPlaceholder="Search drafts..."
      groupFilterLabel={groupFilterLabel}
      clearGroupLabel="Clear group filters"
    />

    {#if isSelectMode}
      <CardListBulkActionBar
        selectedCount={selectedCardIds.length}
        itemLabelSingular="draft"
        itemLabelPlural="drafts"
        primaryActionLabel="Promote selected"
        primaryActionPendingLabel="Promoting..."
        secondaryActionLabel="Delete"
        secondaryActionPendingLabel="Deleting..."
        disabled={pendingAction !== null}
        pendingAction={pendingAction?.action === 'promote' && pendingAction.cardIds.length === selectedCardIds.length
          ? 'primary'
          : pendingAction?.action === 'delete' && pendingAction.cardIds.length === selectedCardIds.length
            ? 'secondary'
            : null}
        on:primary={() => void applyDraftAction('promote')}
        on:secondary={() => void applyDraftAction('delete')}
        on:clear={clearSelection}
      />
    {/if}

    {#if actionFeedback}
      <section class="drafts-feedback drafts-feedback--error" role="status" aria-live="polite">
        <div class="drafts-feedback__body stack" style="--stack-space: var(--space-1)">
          <p class="drafts-feedback__title">
            {actionFeedback.kind === 'missing-groups' ? 'Add a group before promoting' : 'Action failed'}
          </p>
          <p>{actionFeedback.message}</p>
        </div>

        <button type="button" class="drafts-feedback__dismiss" on:click={dismissActionFeedback}>Dismiss</button>
      </section>
    {/if}

    {#if isRefreshing}
      <section class="drafts-state" aria-live="polite">
        <h2>Refreshing drafts…</h2>
        <p>Updating the list and card-entry counts.</p>
      </section>
    {:else if drafts.items.length === 0}
      <section class="drafts-state drafts-state--empty">
        <div class="drafts-state__icon" aria-hidden="true">📝</div>
        <h2>No draft cards yet</h2>
        <p>Process a note in Card Entry to generate or create your first draft cards.</p>
        <a class="drafts-state__cta" href={`/${currentLang}/card-entry`}>Go to Card Entry</a>
      </section>
    {:else if filteredItems.length === 0}
      <section class="drafts-state drafts-state--empty">
        <div class="drafts-state__icon" aria-hidden="true">🔎</div>
        <h2>No drafts match your filters</h2>
        <p>Try adjusting the search or clearing the active group filters.</p>
        <button type="button" class="drafts-state__cta" on:click={clearFilters}>Clear filters</button>
      </section>
    {:else}
      <section class="drafts-list stack" style="--stack-space: var(--space-3)">
        <CardListColumns labels={['Content / Source', 'Groups', 'Updated']} />

        {#each filteredItems as item (item.cardId)}
          {@const primarySourceNote = getPrimarySourceNote(item)}
          <CardListRow
            selected={selectedCardIds.includes(item.cardId)}
            checkboxLabel="Select draft card"
            on:toggleSelection={() => toggleSelection(item.cardId)}
          >
              <a
                slot="content"
                class="draft-row__content-link stack"
                style="--stack-space: var(--space-1)"
                href={primarySourceNote ? `/${currentLang}/card-entry/notes/${primarySourceNote.noteId}` : '#'}
              >
                <div class="draft-row__heading cluster">
                  <CardListStatusBadge label="Draft" tone="draft" />
                  <h2>{item.content}</h2>
                </div>

                {#if item.meaning}
                  <p class="draft-row__meaning">{item.meaning}</p>
                {/if}

                <p class="draft-row__source">Source: {getSourcePreview(item)}</p>
              </a>

              <div slot="groups" class="draft-row__groups">
                {#if item.groups.length === 0}
                  {#if cardsMissingGroupsForPromotion.has(item.cardId)}
                    <span class="draft-row__groups-warning">Needs a group before promotion</span>
                  {:else}
                    <span class="draft-row__groups-empty">No groups yet</span>
                  {/if}
                {:else}
                  {#each item.groups as group}
                    <CardListTagChip label={group.groupName} />
                  {/each}
                {/if}
              </div>

              <span slot="updated" class="draft-row__updated-label">{item.updatedAtLabel}</span>

              <div slot="actions">
                <button
                  type="button"
                  class="card-list-action card-list-action--promote"
                  disabled={pendingAction !== null}
                  on:click|stopPropagation={() => void applyDraftAction('promote', [item.cardId])}
                >
                  {isPending(item.cardId, 'promote') ? 'Promoting…' : 'Promote'}
                </button>
                <a
                  class="card-list-action"
                  href={primarySourceNote ? `/${currentLang}/card-entry/notes/${primarySourceNote.noteId}` : '#'}
                >
                  Edit
                </a>
                <button
                  type="button"
                  class="card-list-action card-list-action--danger"
                  disabled={pendingAction !== null}
                  on:click|stopPropagation={() => void applyDraftAction('delete', [item.cardId])}
                >
                  {isPending(item.cardId, 'delete') ? 'Deleting…' : 'Delete'}
                </button>
              </div>
          </CardListRow>
        {/each}
      </section>
    {/if}
  {/if}
</section>

<style>
  .drafts-page {
    padding: calc(var(--shell-header-height) + var(--space-5)) var(--space-4) calc(var(--space-7) + 4.5rem);
  }

  .drafts-header,
  .drafts-header__title,
  .drafts-header__links,
  .draft-row__heading {
    align-items: center;
    gap: var(--space-3);
  }

  .drafts-header {
    justify-content: space-between;
  }

  .drafts-header__eyebrow,
  .drafts-header__link {
    margin: 0;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .drafts-header__title h1,
  .drafts-header__copy,
  .drafts-state h2,
  .drafts-state p,
  .draft-row__heading h2,
  .draft-row__meaning,
  .draft-row__source {
    margin: 0;
  }

  .drafts-header__title h1 {
    font-size: var(--font-size-h2);
  }

  .drafts-header__copy {
    max-inline-size: 44rem;
    color: var(--color-text-secondary);
  }

  .drafts-count,
  .drafts-state {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .drafts-count {
    display: inline-flex;
    min-inline-size: 2.25rem;
    justify-content: center;
    padding: 0.1rem 0.45rem;
    border-radius: var(--radius-sm);
    background: var(--color-primary-subtle);
    color: var(--color-primary-text);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
  }

  .drafts-header__link {
    display: inline-flex;
    align-items: center;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    text-decoration: none;
  }

  .drafts-state__cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.55rem 0.9rem;
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    cursor: pointer;
    text-decoration: none;
    color: var(--color-text-primary);
    font-family: var(--font-ui);
  }

  .drafts-feedback {
    display: flex;
    align-items: start;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-3) var(--space-4);
    border: 1px solid color-mix(in srgb, var(--color-error-border) 65%, var(--color-border));
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--color-error-bg) 18%, var(--color-surface));
  }

  .drafts-feedback__title,
  .drafts-feedback__body p {
    margin: 0;
  }

  .drafts-feedback__title {
    color: var(--color-error-text);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .drafts-feedback__dismiss {
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-text-secondary);
    font: inherit;
    font-family: var(--font-ui);
    text-decoration: underline;
    cursor: pointer;
  }

  .drafts-state {
    padding: var(--space-5);
    text-align: center;
    box-shadow: var(--shadow-sm);
  }

  .drafts-state--error {
    background: color-mix(in srgb, var(--color-danger-text) 8%, var(--color-surface-raised));
  }

  .drafts-state__icon {
    margin-block-end: var(--space-3);
    font-size: 2rem;
  }

  .drafts-list {
    overflow: clip;
  }

  .draft-row__content-link {
    display: grid;
    min-inline-size: 0;
    color: inherit;
    text-decoration: none;
  }

  .draft-row__heading {
    align-items: start;
    gap: var(--space-2);
  }

  .draft-row__heading h2,
  .draft-row__meaning,
  .draft-row__source {
    overflow-wrap: anywhere;
  }

  .draft-row__heading h2 {
    display: -webkit-box;
    overflow: hidden;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    font-size: var(--font-size-h4);
    line-height: var(--leading-heading);
  }

  .draft-row__meaning,
  .draft-row__source,
  .draft-row__updated-label,
  .draft-row__groups-empty {
    color: var(--color-text-secondary);
  }

  .draft-row__meaning {
    display: -webkit-box;
    overflow: hidden;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    color: var(--color-text-secondary);
    line-height: 1.45;
  }

  .draft-row__source {
    display: -webkit-box;
    overflow: hidden;
    line-clamp: 1;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    line-height: 1.4;
  }

  .draft-row__groups {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    padding-block-start: 0.15rem;
  }

  .draft-row__groups-empty,
  .draft-row__updated-label {
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  .draft-row__groups-warning {
    color: var(--color-error-text);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    line-height: 1.35;
  }

  .draft-row__updated-label {
    padding-block-start: 0.15rem;
    white-space: nowrap;
  }

  .drafts-header__link:focus-visible,
  .drafts-feedback__dismiss:focus-visible,
  .drafts-state__cta:focus-visible,
  .draft-row__content-link:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary-text) 18%, transparent);
    border-radius: var(--radius-sm);
  }

  @media (max-width: 900px) {
    .draft-row__content-link {
      inline-size: 100%;
    }
  }

  @media (max-width: 640px) {
    .drafts-page {
      padding-inline: var(--space-3);
    }

    .drafts-header,
    .drafts-header {
      align-items: start;
      flex-direction: column;
    }

    .drafts-feedback {
      flex-direction: column;
      gap: var(--space-2);
    }
  }
</style>
