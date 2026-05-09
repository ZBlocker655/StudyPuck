<script lang="ts">
  import { createEventDispatcher, onDestroy, tick } from 'svelte';
  import { get } from 'svelte/store';
  import CardListStatusBadge from '$lib/components/card-list/CardListStatusBadge.svelte';
  import type { CardLibraryCardDetailData, CardLibraryGroupData } from '$lib/server/cards.js';
  import { commandBar } from '$lib/stores/commandBar.js';
  import { activeCardSuggestionActions } from '$lib/stores/activeCardSuggestionActions.js';

  type EditableListField = 'examples' | 'mnemonics';
  type ActiveCardFocusedField =
    | 'content'
    | 'meaning'
    | 'groups'
    | 'examples'
    | 'mnemonics'
    | 'llmInstructions';
  type SaveState = 'idle' | 'saving' | 'saved' | 'error';

  const dispatch = createEventDispatcher<{
    updated: {
      card: CardLibraryCardDetailData;
      availableGroups: CardLibraryGroupData[];
    };
    deleted: {
      cardId: string;
    };
    close: void;
    previous: void;
    next: void;
  }>();

  export let lang: string;
  export let card: CardLibraryCardDetailData;
  export let availableGroups: CardLibraryGroupData[] = [];
  export let selectedIndex = 0;
  export let totalCount = 1;
  export let hasPrevious = false;
  export let hasNext = false;
  export let disabled = false;

  let draft = structuredClone(card);
  let previousCard = card;
  let lastSavedPayload = '';
  let saveState: SaveState = 'idle';
  let saveError: string | null = null;
  let saveToken = 0;
  let saveRequest: Promise<boolean> | null = null;
  let pendingPayloadSignature: string | null = null;
  let savedIndicatorTimer: ReturnType<typeof setTimeout> | null = null;
  let groupQuery = '';
  let groupMenuOpen = false;
  let deleteConfirmOpen = false;
  let removePending = false;
  let drawerElement: HTMLElement | null = null;
  let groupFieldElement: HTMLDivElement | null = null;
  let groupSearchInput: HTMLInputElement | null = null;
  let llmInstructionsOpen = Boolean(card.llmInstructions);
  let lastHandledSuggestionActionId = get(activeCardSuggestionActions)?.actionId ?? 0;

  function normalizeList(values: string[]) {
    return values.map((value) => value.trim()).filter(Boolean);
  }

  function serializePayload(payload: ReturnType<typeof buildPayload>) {
    return JSON.stringify(payload);
  }

  function buildPayloadFromCard(source: CardLibraryCardDetailData) {
    return {
      content: source.content,
      meaning: source.meaning ?? '',
      examples: normalizeList(source.examples),
      mnemonics: normalizeList(source.mnemonics),
      llmInstructions: source.llmInstructions ?? '',
      groups: source.groups.map((group) => ({
        groupId: group.groupId?.trim() ? group.groupId : null,
        groupName: group.groupName,
      })),
    };
  }

  function buildPayload() {
    return buildPayloadFromCard(draft);
  }

  function clearSavedIndicatorTimer() {
    if (!savedIndicatorTimer) {
      return;
    }

    clearTimeout(savedIndicatorTimer);
    savedIndicatorTimer = null;
  }

  function scheduleSavedIndicatorReset() {
    clearSavedIndicatorTimer();
    savedIndicatorTimer = setTimeout(() => {
      saveState = 'idle';
    }, 2_000);
  }

  function closeGroupMenu() {
    groupMenuOpen = false;
    groupQuery = '';
  }

  async function openGroupMenu() {
    if (disabled) {
      return;
    }

    commandBar.setTargetHint(card.cardId, 'groups');
    groupMenuOpen = true;
    await tick();
    groupSearchInput?.focus();
  }

  function handleGroupFieldFocusOut(event: FocusEvent) {
    const nextFocused = event.relatedTarget;

    if (!(nextFocused instanceof Node) || !groupFieldElement?.contains(nextFocused)) {
      closeGroupMenu();
    }
  }

  function handleGroupSearchKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeGroupMenu();
    }
  }

  $: normalizedGroupQuery = groupQuery.trim().toLocaleLowerCase();
  $: selectedGroupIds = new Set(draft.groups.map((group) => group.groupId));
  $: filteredGroups = availableGroups.filter(
    (group) =>
      !selectedGroupIds.has(group.groupId) &&
      group.groupName.toLocaleLowerCase().includes(normalizedGroupQuery)
  );
  $: canCreateGroup =
    normalizedGroupQuery.length > 0 &&
    !availableGroups.some((group) => group.groupName.trim().toLocaleLowerCase() === normalizedGroupQuery);
  $: signpostLabel =
    saveState === 'saving'
      ? 'Saving...'
      : saveState === 'saved'
        ? 'Saved ✓'
        : saveState === 'error'
          ? 'Save failed'
          : '';

  $: if (card !== previousCard) {
    const previousCardId = previousCard.cardId;
    draft = structuredClone(card);
    previousCard = card;
    lastSavedPayload = serializePayload(buildPayloadFromCard(card));
    llmInstructionsOpen = Boolean(card.llmInstructions);
    groupQuery = '';
    groupMenuOpen = false;
    deleteConfirmOpen = false;
    removePending = false;
    saveState = 'idle';
    saveError = null;
    saveToken++;
    saveRequest = null;
    pendingPayloadSignature = null;

    if (!disabled && previousCardId !== card.cardId) {
      commandBar.setTargetHint(card.cardId, null);
    }
  }

  $: if (!lastSavedPayload) {
    lastSavedPayload = serializePayload(buildPayloadFromCard(card));
  }

  async function persistDraft(): Promise<boolean> {
    if (disabled) {
      return false;
    }

    const payload = buildPayload();
    const payloadSignature = serializePayload(payload);

    if (payloadSignature === lastSavedPayload) {
      if (saveState === 'error') {
        saveState = 'idle';
        saveError = null;
      }

      return true;
    }

    if (saveRequest && pendingPayloadSignature === payloadSignature) {
      return saveRequest;
    }

    clearSavedIndicatorTimer();
    saveState = 'saving';
    saveError = null;

    const currentSaveToken = ++saveToken;
    pendingPayloadSignature = payloadSignature;

    const request = (async () => {
      try {
        const response = await fetch(`/${lang}/cards/${card.cardId}`, {
          method: 'PATCH',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const data = (await response.json().catch(() => null)) as
          | {
              card?: CardLibraryCardDetailData;
              availableGroups?: CardLibraryGroupData[];
              message?: string;
            }
          | null;

        if (!response.ok || !data?.card || !data.availableGroups) {
          throw new Error(data?.message ?? 'The card could not be saved right now.');
        }

        if (currentSaveToken !== saveToken) {
          return false;
        }

        draft = data.card;
        lastSavedPayload = serializePayload(buildPayloadFromCard(data.card));
        saveState = 'saved';
        dispatch('updated', {
          card: data.card,
          availableGroups: data.availableGroups,
        });
        scheduleSavedIndicatorReset();
        return true;
      } catch (error) {
        if (currentSaveToken !== saveToken) {
          return false;
        }

        saveState = 'error';
        saveError = error instanceof Error ? error.message : 'The card could not be saved right now.';
        return false;
      } finally {
        if (pendingPayloadSignature === payloadSignature) {
          saveRequest = null;
          pendingPayloadSignature = null;
        }
      }
    })();

    saveRequest = request;
    return request;
  }

  function updateListValue(field: EditableListField, index: number, value: string) {
    const nextValues = [...draft[field]];
    nextValues[index] = value;
    draft = {
      ...draft,
      [field]: nextValues,
    };
  }

  function addListValue(field: EditableListField) {
    saveToken++;
    draft = {
      ...draft,
      [field]: [...draft[field], ''],
    };
  }

  async function removeListValue(field: EditableListField, index: number) {
    draft = {
      ...draft,
      [field]: draft[field].filter((_, currentIndex) => currentIndex !== index),
    };

    await persistDraft();
  }

  function handleFieldFocus(field: ActiveCardFocusedField) {
    if (!disabled) {
      commandBar.setTargetHint(card.cardId, field);
    }
  }

  async function applySuggestedListValue(field: EditableListField, text: string) {
    if (disabled) {
      return;
    }

    const trimmedText = text.trim();

    if (!trimmedText) {
      return;
    }

    saveToken++;
    draft = {
      ...draft,
      [field]: [...draft[field], trimmedText],
    };
    commandBar.setTargetHint(card.cardId, field);

    await persistDraft();
  }

  async function addExistingGroup(group: CardLibraryGroupData) {
    if (disabled || draft.groups.some((item) => item.groupId === group.groupId)) {
      return;
    }

    draft = {
      ...draft,
      groups: [...draft.groups, group].sort((left, right) => left.groupName.localeCompare(right.groupName)),
    };

    closeGroupMenu();
    await persistDraft();
  }

  $: if (
    $activeCardSuggestionActions &&
    $activeCardSuggestionActions.actionId !== lastHandledSuggestionActionId &&
    $activeCardSuggestionActions.cardId === card.cardId
  ) {
    lastHandledSuggestionActionId = $activeCardSuggestionActions.actionId;

    if ($activeCardSuggestionActions.suggestionType === 'append_mnemonic') {
      void applySuggestedListValue('mnemonics', $activeCardSuggestionActions.text);
    } else if ($activeCardSuggestionActions.suggestionType === 'append_example_sentence') {
      void applySuggestedListValue('examples', $activeCardSuggestionActions.text);
    } else if ($activeCardSuggestionActions.suggestionType === 'add_card_to_group') {
      const matchingGroup = availableGroups.find((group) => group.groupId === $activeCardSuggestionActions.groupId);

      if (matchingGroup) {
        void addExistingGroup(matchingGroup);
      }
    } else if ($activeCardSuggestionActions.suggestionType === 'remove_card_from_group') {
      void removeGroup($activeCardSuggestionActions.groupId);
    }
  }

  async function toggleGroup(group: CardLibraryGroupData) {
    await addExistingGroup(group);
  }

  async function createGroupFromQuery() {
    if (disabled || !canCreateGroup) {
      return;
    }

    draft = {
      ...draft,
      groups: [
        ...draft.groups,
        {
          groupId: '',
          groupName: groupQuery.trim(),
        },
      ],
    };

    closeGroupMenu();
    await persistDraft();
  }

  async function removeGroup(groupId: string) {
    if (disabled) {
      return;
    }

    draft = {
      ...draft,
      groups: draft.groups.filter((group) => group.groupId !== groupId),
    };

    await persistDraft();
  }

  async function handleClose() {
    deleteConfirmOpen = false;

    if (await persistDraft()) {
      dispatch('close');
    }
  }

  async function handleNavigate(direction: 'previous' | 'next') {
    deleteConfirmOpen = false;

    if (await persistDraft()) {
      dispatch(direction);
    }
  }

  async function confirmDelete() {
    if (disabled || removePending) {
      return;
    }

    removePending = true;

    try {
      const response = await fetch(`/${lang}/cards/${card.cardId}`, {
        method: 'DELETE',
      });

      const data = (await response.json().catch(() => null)) as
        | {
            deletedCardIds?: string[];
            message?: string;
          }
        | null;

      if (!response.ok || !data?.deletedCardIds?.includes(card.cardId)) {
        throw new Error(data?.message ?? 'The card could not be removed right now.');
      }

      dispatch('deleted', {
        cardId: card.cardId,
      });
    } catch (error) {
      saveState = 'error';
      saveError = error instanceof Error ? error.message : 'The card could not be removed right now.';
    } finally {
      removePending = false;
      deleteConfirmOpen = false;
    }
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key !== 'Escape') {
      return;
    }

    event.preventDefault();

    if (deleteConfirmOpen) {
      deleteConfirmOpen = false;
      return;
    }

    void handleClose();
  }

  function handleDrawerKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !drawerElement) {
      return;
    }

    const focusableElements = Array.from(
      drawerElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], textarea:not([disabled]), input:not([disabled]), details summary'
      )
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

  function autoResize(node: HTMLTextAreaElement) {
    const resize = () => {
      node.style.height = 'auto';
      node.style.height = `${node.scrollHeight}px`;
    };

    resize();
    node.addEventListener('input', resize);

    return {
      update: resize,
      destroy() {
        node.removeEventListener('input', resize);
      },
    };
  }

  onDestroy(() => {
    clearSavedIndicatorTimer();
  });
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<button
  type="button"
  class="active-card-drawer__backdrop"
  aria-label="Close card detail drawer"
  on:click={() => void handleClose()}
></button>

<div
  bind:this={drawerElement}
  class="active-card-drawer stack"
  style="--stack-space: var(--space-4)"
  role="dialog"
  tabindex="-1"
  aria-modal="true"
  aria-labelledby="active-card-drawer-title"
  on:keydown={handleDrawerKeydown}
>
  <header class="active-card-drawer__header stack" style="--stack-space: var(--space-3)">
    <div class="active-card-drawer__header-row">
      <div class="active-card-drawer__nav cluster">
        <button
          type="button"
          class="active-card-drawer__nav-button"
          disabled={!hasPrevious || disabled || removePending}
          aria-label="Previous card"
          on:click={() => void handleNavigate('previous')}
        >
          ←
        </button>
        <button
          type="button"
          class="active-card-drawer__nav-button"
          disabled={!hasNext || disabled || removePending}
          aria-label="Next card"
          on:click={() => void handleNavigate('next')}
        >
          →
        </button>
        <p id="active-card-drawer-title" class="active-card-drawer__position">
          Card {selectedIndex + 1} of {totalCount}
        </p>
      </div>

      <div class="active-card-drawer__status-wrap stack" style="--stack-space: var(--space-1)">
        <p class={`active-card-drawer__status active-card-drawer__status--${saveState}`} aria-live="polite">
          {signpostLabel || ' '}
        </p>
        <button
          type="button"
          class="active-card-drawer__close"
          aria-label="Close drawer"
          disabled={disabled || removePending}
          on:click={() => void handleClose()}
        >
          ✕
        </button>
      </div>
    </div>

    {#if saveError}
      <p class="active-card-drawer__error">{saveError}</p>
    {/if}
  </header>

  <div class="active-card-drawer__body stack" style="--stack-space: var(--space-4)">
    <CardListStatusBadge label="Active" tone="active" />

    <label class="active-card-drawer__field stack" style="--stack-space: var(--space-2)">
      <span class="active-card-drawer__label">Content</span>
      <textarea
        use:autoResize
        class="active-card-drawer__textarea"
        rows="2"
        bind:value={draft.content}
        placeholder="Card content..."
        disabled={disabled || removePending}
        on:focus={() => handleFieldFocus('content')}
        on:blur={() => void persistDraft()}
      ></textarea>
    </label>

    <label class="active-card-drawer__field stack" style="--stack-space: var(--space-2)">
      <span class="active-card-drawer__label">Meaning</span>
      <textarea
        use:autoResize
        class="active-card-drawer__textarea"
        rows="2"
        value={draft.meaning ?? ''}
        placeholder="Meaning..."
        disabled={disabled || removePending}
        on:focus={() => handleFieldFocus('meaning')}
        on:input={(event) => {
          draft = {
            ...draft,
            meaning: event.currentTarget.value,
          };
        }}
        on:blur={() => void persistDraft()}
      ></textarea>
    </label>

    <div
      class="active-card-drawer__field stack"
      style="--stack-space: var(--space-2)"
      bind:this={groupFieldElement}
      on:focusout={handleGroupFieldFocusOut}
    >
      <div class="cluster active-card-drawer__field-head">
        <span class="active-card-drawer__label">Groups</span>
        <button
          type="button"
          class="active-card-drawer__inline-action"
          disabled={disabled || removePending}
          aria-expanded={groupMenuOpen}
          on:focus={() => handleFieldFocus('groups')}
          on:click={() => void (groupMenuOpen ? closeGroupMenu() : openGroupMenu())}
        >
          + Add group
        </button>
      </div>

      <div class="active-card-drawer__group-chips cluster">
        {#if draft.groups.length === 0}
          <p class="active-card-drawer__empty-inline">No groups yet.</p>
        {:else}
          {#each draft.groups as group}
            <button
              type="button"
              class="active-card-drawer__group-chip"
              disabled={disabled || removePending}
              on:click={() => void removeGroup(group.groupId)}
            >
              {group.groupName}
              <span aria-hidden="true">✕</span>
            </button>
          {/each}
        {/if}
      </div>

      {#if groupMenuOpen}
        <div class="active-card-drawer__group-menu stack" style="--stack-space: var(--space-2)">
          <input
            type="text"
            class="active-card-drawer__group-search"
             bind:this={groupSearchInput}
             bind:value={groupQuery}
             placeholder="Search groups..."
             disabled={disabled || removePending}
             on:focus={() => handleFieldFocus('groups')}
             on:keydown={handleGroupSearchKeydown}
           />

          <div class="active-card-drawer__group-options stack" style="--stack-space: var(--space-1)">
            {#if filteredGroups.length === 0 && !canCreateGroup}
              <p class="active-card-drawer__empty-inline">No matching groups.</p>
            {/if}

            {#each filteredGroups as group}
              <button
                type="button"
                class="active-card-drawer__group-option"
                disabled={disabled || removePending}
                on:click={() => void toggleGroup(group)}
              >
                {group.groupName}
              </button>
            {/each}

            {#if canCreateGroup}
              <button
                type="button"
                class="active-card-drawer__create-group"
                disabled={disabled || removePending}
                on:click={() => void createGroupFromQuery()}
              >
                + Create "{groupQuery.trim()}"
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <div class="active-card-drawer__field stack" style="--stack-space: var(--space-2)">
      <div class="cluster active-card-drawer__field-head">
        <span class="active-card-drawer__label">Example sentences</span>
        <button
          type="button"
          class="active-card-drawer__inline-action"
          disabled={disabled || removePending}
          on:click={() => addListValue('examples')}
        >
          + Add
        </button>
      </div>

      <div class="stack" style="--stack-space: var(--space-2)">
        {#if draft.examples.length === 0}
          <p class="active-card-drawer__empty-inline">No example sentences yet.</p>
        {/if}

        {#each draft.examples as example, index}
          <div class="active-card-drawer__list-row">
            <textarea
              use:autoResize
              class="active-card-drawer__list-input"
              rows="2"
              value={example}
              placeholder="Example sentence..."
              disabled={disabled || removePending}
              on:focus={() => handleFieldFocus('examples')}
              on:input={(event) => updateListValue('examples', index, event.currentTarget.value)}
              on:blur={() => void persistDraft()}
            ></textarea>
            <button
              type="button"
              class="active-card-drawer__remove-list-item"
              aria-label="Remove example sentence"
              disabled={disabled || removePending}
              on:click={() => void removeListValue('examples', index)}
            >
              Remove
            </button>
          </div>
        {/each}
      </div>
    </div>

    <div class="active-card-drawer__field stack" style="--stack-space: var(--space-2)">
      <div class="cluster active-card-drawer__field-head">
        <span class="active-card-drawer__label">Mnemonics</span>
        <button
          type="button"
          class="active-card-drawer__inline-action"
          disabled={disabled || removePending}
          on:click={() => addListValue('mnemonics')}
        >
          + Add
        </button>
      </div>

      <div class="stack" style="--stack-space: var(--space-2)">
        {#if draft.mnemonics.length === 0}
          <p class="active-card-drawer__empty-inline">No mnemonics yet.</p>
        {/if}

        {#each draft.mnemonics as mnemonic, index}
          <div class="active-card-drawer__list-row">
            <textarea
              use:autoResize
              class="active-card-drawer__list-input"
              rows="2"
              value={mnemonic}
              placeholder="Mnemonic..."
              disabled={disabled || removePending}
              on:focus={() => handleFieldFocus('mnemonics')}
              on:input={(event) => updateListValue('mnemonics', index, event.currentTarget.value)}
              on:blur={() => void persistDraft()}
            ></textarea>
            <button
              type="button"
              class="active-card-drawer__remove-list-item"
              aria-label="Remove mnemonic"
              disabled={disabled || removePending}
              on:click={() => void removeListValue('mnemonics', index)}
            >
              Remove
            </button>
          </div>
        {/each}
      </div>
    </div>

    <details class="active-card-drawer__llm" bind:open={llmInstructionsOpen}>
      <summary class="active-card-drawer__llm-summary">LLM instructions</summary>
      <div class="stack" style="--stack-space: var(--space-2)">
        <textarea
          use:autoResize
          class="active-card-drawer__textarea"
          rows="2"
          value={draft.llmInstructions ?? ''}
          placeholder="Optional guidance for future LLM work on this card..."
          disabled={disabled || removePending}
          on:focus={() => handleFieldFocus('llmInstructions')}
          on:input={(event) => {
            draft = {
              ...draft,
              llmInstructions: event.currentTarget.value,
            };
          }}
          on:blur={() => void persistDraft()}
        ></textarea>
      </div>
    </details>
  </div>

  <footer class="active-card-drawer__footer">
    <button
      type="button"
      class="active-card-drawer__delete"
      disabled={disabled || removePending}
      on:click={() => {
        deleteConfirmOpen = true;
      }}
    >
      {removePending ? 'Deleting…' : 'Delete card'}
    </button>
  </footer>

  {#if deleteConfirmOpen}
    <div class="active-card-drawer__confirm-backdrop">
      <div class="active-card-drawer__confirm stack" style="--stack-space: var(--space-3)" role="alertdialog" aria-modal="true">
        <h2>Delete "{draft.content}"?</h2>
        <p>This card will be permanently deleted and removed from all groups. This cannot be undone.</p>
        <div class="active-card-drawer__confirm-actions cluster">
          <button
            type="button"
            class="active-card-drawer__confirm-cancel"
            disabled={removePending}
            on:click={() => {
              deleteConfirmOpen = false;
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            class="active-card-drawer__confirm-delete"
            disabled={removePending}
            on:click={() => void confirmDelete()}
          >
            {removePending ? 'Deleting…' : 'Delete card'}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .active-card-drawer__backdrop {
    position: fixed;
    inset: 0;
    z-index: 52;
    border: 0;
    background: color-mix(in srgb, var(--neutral-900) 18%, transparent);
  }

  .active-card-drawer {
    position: fixed;
    inset-block: 0;
    inset-inline-end: 0;
    z-index: 53;
    inline-size: min(36rem, 100vw);
    padding: var(--space-4);
    border-inline-start: 1px solid var(--color-border);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-lg);
    overflow: auto;
  }

  .active-card-drawer__header {
    position: sticky;
    inset-block-start: calc(var(--space-4) * -1);
    padding-block-start: var(--space-4);
    padding-block-end: var(--space-2);
    border-block-end: 1px solid var(--color-border);
    background: var(--color-surface-raised);
    z-index: 1;
  }

  .active-card-drawer__header-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .active-card-drawer__nav {
    align-items: center;
    gap: var(--space-2);
  }

  .active-card-drawer__nav-button,
  .active-card-drawer__close,
  .active-card-drawer__inline-action,
  .active-card-drawer__delete,
  .active-card-drawer__confirm-cancel,
  .active-card-drawer__confirm-delete,
  .active-card-drawer__remove-list-item,
  .active-card-drawer__group-chip,
  .active-card-drawer__group-option,
  .active-card-drawer__create-group,
  .active-card-drawer__group-search,
  .active-card-drawer__textarea,
  .active-card-drawer__list-input {
    font-family: var(--font-ui);
  }

  .active-card-drawer__nav-button,
  .active-card-drawer__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 2.5rem;
    min-block-size: 2.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .active-card-drawer__position {
    margin: 0;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  .active-card-drawer__status-wrap {
    align-items: flex-end;
  }

  .active-card-drawer__status {
    min-block-size: 1.25rem;
    margin: 0;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  .active-card-drawer__status--error,
  .active-card-drawer__error,
  .active-card-drawer__delete,
  .active-card-drawer__confirm-delete {
    color: var(--color-danger-text);
  }

  .active-card-drawer__error {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  .active-card-drawer__body {
    padding-block-start: var(--space-2);
    padding-block-end: var(--space-5);
  }

  .active-card-drawer__field-head {
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .active-card-drawer__label {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .active-card-drawer__inline-action,
  .active-card-drawer__remove-list-item,
  .active-card-drawer__delete,
  .active-card-drawer__confirm-cancel,
  .active-card-drawer__confirm-delete,
  .active-card-drawer__group-option,
  .active-card-drawer__create-group {
    border: 0;
    background: transparent;
    cursor: pointer;
  }

  .active-card-drawer__textarea,
  .active-card-drawer__list-input,
  .active-card-drawer__group-search {
    inline-size: 100%;
    min-block-size: 2.75rem;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    resize: none;
  }

  .active-card-drawer__empty-inline {
    margin: 0;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  .active-card-drawer__group-chips,
  .active-card-drawer__confirm-actions {
    gap: var(--space-2);
  }

  .active-card-drawer__group-chip {
    display: inline-flex;
    align-items: center;
    gap: var(--space-1);
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-pill, 999px);
    background: var(--color-surface-subtle);
    color: var(--color-text-secondary);
  }

  .active-card-drawer__group-menu {
    padding: var(--space-3);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .active-card-drawer__group-option,
  .active-card-drawer__create-group {
    display: block;
    inline-size: 100%;
    padding: var(--space-2) var(--space-1);
    border-radius: var(--radius-sm);
    color: var(--color-text-primary);
    text-align: start;
  }

  .active-card-drawer__create-group {
    color: var(--color-primary-text);
    font-weight: 600;
  }

  .active-card-drawer__list-row {
    display: grid;
    gap: var(--space-2);
  }

  .active-card-drawer__remove-list-item {
    justify-self: start;
    color: var(--color-text-secondary);
    font-size: var(--font-size-small);
    text-decoration: underline;
  }

  .active-card-drawer__llm {
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .active-card-drawer__llm-summary {
    cursor: pointer;
    padding: var(--space-3);
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    font-weight: 600;
  }

  .active-card-drawer__llm :global(textarea) {
    margin: 0 var(--space-3) var(--space-3);
    inline-size: calc(100% - (var(--space-3) * 2));
  }

  .active-card-drawer__footer {
    padding-block-start: var(--space-3);
    border-block-start: 1px solid var(--color-border-subtle);
  }

  .active-card-drawer__delete {
    padding: 0;
    font-weight: 600;
  }

  .active-card-drawer__confirm-backdrop {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    padding: var(--space-4);
    background: color-mix(in srgb, var(--neutral-900) 28%, transparent);
  }

  .active-card-drawer__confirm {
    inline-size: min(100%, 22rem);
    padding: var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-lg);
  }

  .active-card-drawer__confirm h2,
  .active-card-drawer__confirm p {
    margin: 0;
  }

  .active-card-drawer__confirm-cancel,
  .active-card-drawer__confirm-delete {
    min-block-size: 2.75rem;
    padding-inline: var(--space-4);
    border-radius: var(--radius-md);
  }

  .active-card-drawer__confirm-cancel {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-secondary);
  }

  .active-card-drawer__confirm-delete {
    border: 1px solid var(--color-danger-text);
    background: color-mix(in srgb, var(--color-danger-text) 10%, var(--color-surface));
  }

  .active-card-drawer__nav-button:disabled,
  .active-card-drawer__close:disabled,
  .active-card-drawer__inline-action:disabled,
  .active-card-drawer__delete:disabled,
  .active-card-drawer__confirm-cancel:disabled,
  .active-card-drawer__confirm-delete:disabled,
  .active-card-drawer__remove-list-item:disabled,
  .active-card-drawer__group-chip:disabled,
  .active-card-drawer__group-option:disabled,
  .active-card-drawer__create-group:disabled,
  .active-card-drawer__group-search:disabled,
  .active-card-drawer__textarea:disabled,
  .active-card-drawer__list-input:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .active-card-drawer__nav-button:focus-visible,
  .active-card-drawer__close:focus-visible,
  .active-card-drawer__inline-action:focus-visible,
  .active-card-drawer__delete:focus-visible,
  .active-card-drawer__confirm-cancel:focus-visible,
  .active-card-drawer__confirm-delete:focus-visible,
  .active-card-drawer__remove-list-item:focus-visible,
  .active-card-drawer__group-chip:focus-visible,
  .active-card-drawer__group-option:focus-visible,
  .active-card-drawer__create-group:focus-visible,
  .active-card-drawer__group-search:focus-visible,
  .active-card-drawer__textarea:focus-visible,
  .active-card-drawer__list-input:focus-visible,
  .active-card-drawer__llm-summary:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (max-width: 63.99rem) {
    .active-card-drawer {
      inline-size: 100vw;
      border-inline-start: 0;
      padding-block-end: calc(var(--space-5) + env(safe-area-inset-bottom));
    }
  }
</style>
