<script lang="ts">
  import { createEventDispatcher, onDestroy, tick } from 'svelte';
  import type {
    CardEntryGroupData,
    CardEntryNoteDraftCardData,
    CardEntryNoteShellData,
  } from '$lib/server/card-entry.js';

  type EditableListField = 'examples' | 'mnemonics';
  type SaveState = 'idle' | 'saving' | 'saved' | 'error';

  const dispatch = createEventDispatcher<{
    updated: {
      card: CardEntryNoteDraftCardData;
      availableGroups: CardEntryGroupData[];
    };
    noteUpdated: {
      note: CardEntryNoteShellData;
    };
    removed: {
      note: CardEntryNoteShellData;
    };
  }>();

  export let lang: string;
  export let noteId: string;
  export let card: CardEntryNoteDraftCardData;
  export let availableGroups: CardEntryGroupData[] = [];
  export let disabled = false;

  let draft = structuredClone(card);
  let previousCard = card;
  let saveState: SaveState = 'idle';
  let saveError: string | null = null;
  let saveToken = 0;
  let savedIndicatorTimer: ReturnType<typeof setTimeout> | null = null;
  let groupQuery = '';
  let groupMenuOpen = false;
  let groupFieldElement: HTMLDivElement | null = null;
  let groupSearchInput: HTMLInputElement | null = null;
  let llmInstructionsOpen = Boolean(card.llmInstructions);
  let removePending = false;

  $: if (card !== previousCard) {
    draft = structuredClone(card);
    previousCard = card;
    llmInstructionsOpen = Boolean(card.llmInstructions);
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

  function normalizeList(values: string[]) {
    return values.map((value) => value.trim()).filter(Boolean);
  }

  function closeGroupMenu() {
    groupMenuOpen = false;
    groupQuery = '';
  }

  async function openGroupMenu() {
    if (disabled) {
      return;
    }

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

  function buildPayload() {
    return {
      content: draft.content,
      meaning: draft.meaning ?? '',
      examples: normalizeList(draft.examples),
      mnemonics: normalizeList(draft.mnemonics),
      llmInstructions: draft.llmInstructions ?? '',
      groups: draft.groups.map((group) => ({
        groupId: group.groupId?.trim() ? group.groupId : null,
        groupName: group.groupName,
      })),
    };
  }

  async function persistDraft() {
    if (disabled) {
      return;
    }

    clearSavedIndicatorTimer();
    saveState = 'saving';
    saveError = null;

    const currentSaveToken = ++saveToken;

    try {
      const response = await fetch(`/${lang}/card-entry/notes/${noteId}/draft-cards/${card.cardId}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify(buildPayload()),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            card?: CardEntryNoteDraftCardData;
            availableGroups?: CardEntryGroupData[];
            message?: string;
          }
        | null;

      if (!response.ok || !data?.card || !data.availableGroups) {
        throw new Error(data?.message ?? 'The draft card could not be saved right now.');
      }

      if (currentSaveToken !== saveToken) {
        return;
      }

      draft = data.card;
      saveState = 'saved';
      dispatch('updated', {
        card: data.card,
        availableGroups: data.availableGroups,
      });
      scheduleSavedIndicatorReset();
    } catch (error) {
      if (currentSaveToken !== saveToken) {
        return;
      }

      saveState = 'error';
      saveError = error instanceof Error ? error.message : 'The draft card could not be saved right now.';
    }
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

  async function toggleGroup(group: CardEntryGroupData) {
    if (disabled) {
      return;
    }

    draft = {
      ...draft,
      groups: [...draft.groups, group].sort((left, right) => left.groupName.localeCompare(right.groupName)),
    };

    closeGroupMenu();
    await persistDraft();
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

  async function removeDraftCard() {
    if (disabled || removePending) {
      return;
    }

    removePending = true;

    try {
      const response = await fetch(`/${lang}/card-entry/notes/${noteId}/draft-cards/${card.cardId}`, {
        method: 'DELETE',
      });

      const data = (await response.json().catch(() => null)) as
        | (CardEntryNoteShellData & {
            message?: string;
          })
        | null;

      if (!response.ok || !data?.noteId) {
        throw new Error(data?.message ?? 'The draft card could not be removed right now.');
      }

      dispatch('removed', {
        note: data,
      });
    } catch (error) {
      saveState = 'error';
      saveError = error instanceof Error ? error.message : 'The draft card could not be removed right now.';
    } finally {
      removePending = false;
    }
  }

  async function dismissDuplicateWarning(warningId: string) {
    if (disabled) {
      return;
    }

    saveState = 'saving';
    saveError = null;

    try {
      const response = await fetch(
        `/${lang}/card-entry/notes/${noteId}/draft-cards/${card.cardId}/duplicate-warnings`,
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
          },
          body: JSON.stringify({ warningId }),
        }
      );
      const data = (await response.json().catch(() => null)) as
        | (CardEntryNoteShellData & {
            message?: string;
          })
        | null;

      if (!response.ok || !data?.noteId) {
        throw new Error(data?.message ?? 'The duplicate warning could not be updated right now.');
      }

      dispatch('noteUpdated', {
        note: data,
      });
      saveState = 'saved';
      scheduleSavedIndicatorReset();
    } catch (error) {
      saveState = 'error';
      saveError =
        error instanceof Error ? error.message : 'The duplicate warning could not be updated right now.';
    }
  }

  onDestroy(() => {
    clearSavedIndicatorTimer();
  });
</script>

<article class="draft-card stack" style="--stack-space: var(--space-4)">
  <header class="draft-card__header cluster">
    <div class="stack" style="--stack-space: var(--space-1)">
      <p class="draft-card__eyebrow">Draft card</p>
    </div>

    <div class="draft-card__status-wrap stack" style="--stack-space: var(--space-1)">
      <p class={`draft-card__status draft-card__status--${saveState}`} aria-live="polite">
        {signpostLabel || ' '}
      </p>
      {#if saveError}
        <p class="draft-card__error">{saveError}</p>
      {/if}
    </div>
  </header>

  <label class="draft-card__field stack" style="--stack-space: var(--space-2)">
    <span class="draft-card__label">Content</span>
    <textarea
      class="draft-card__textarea"
      rows="3"
      bind:value={draft.content}
      placeholder="Card content..."
      disabled={disabled}
      on:blur={() => void persistDraft()}
    ></textarea>
  </label>

  <label class="draft-card__field stack" style="--stack-space: var(--space-2)">
    <span class="draft-card__label">Meaning</span>
    <textarea
      class="draft-card__textarea"
      rows="3"
      value={draft.meaning ?? ''}
      placeholder="Meaning..."
      disabled={disabled}
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
    class="draft-card__field stack"
    style="--stack-space: var(--space-2)"
    bind:this={groupFieldElement}
    on:focusout={handleGroupFieldFocusOut}
  >
    <div class="cluster draft-card__field-head">
      <span class="draft-card__label">Groups</span>
      <button
        type="button"
        class="draft-card__group-trigger"
        disabled={disabled}
        aria-expanded={groupMenuOpen}
        on:click={() => void (groupMenuOpen ? closeGroupMenu() : openGroupMenu())}
      >
        + Add group
      </button>
    </div>

    <div class="draft-card__group-chips cluster">
      {#if draft.groups.length === 0}
        <p class="draft-card__empty-inline">No groups yet.</p>
      {:else}
        {#each draft.groups as group}
          <button
            type="button"
            class="draft-card__group-chip"
            disabled={disabled}
            on:click={() => void removeGroup(group.groupId)}
          >
            {group.groupName}
            <span aria-hidden="true">✕</span>
          </button>
        {/each}
      {/if}
    </div>

    {#if groupMenuOpen}
      <div class="draft-card__group-menu stack" style="--stack-space: var(--space-2)">
        <input
          type="text"
          class="draft-card__group-search"
          bind:this={groupSearchInput}
          bind:value={groupQuery}
          placeholder="Search groups..."
          disabled={disabled}
          on:keydown={handleGroupSearchKeydown}
        />

        <div class="draft-card__group-options stack" style="--stack-space: var(--space-1)">
          {#if filteredGroups.length === 0 && !canCreateGroup}
            <p class="draft-card__empty-inline">No matching groups.</p>
          {/if}

          {#each filteredGroups as group}
            <button
              type="button"
              class="draft-card__group-option"
              disabled={disabled}
              on:click={() => void toggleGroup(group)}
            >
              <span>{group.groupName}</span>
            </button>
          {/each}

          {#if canCreateGroup}
            <button
              type="button"
              class="draft-card__create-group"
              disabled={disabled}
              on:click={() => void createGroupFromQuery()}
            >
              + Create "{groupQuery.trim()}"
            </button>
          {/if}
        </div>
      </div>
    {/if}

    {#if draft.groupSuggestions.length > 0}
      <div class="stack" style="--stack-space: var(--space-2)">
        <p class="draft-card__suggestions-label">AI suggests</p>
        <div class="draft-card__suggestions cluster">
          {#each draft.groupSuggestions as suggestion}
            <button
              type="button"
              class="draft-card__suggestion"
              disabled={disabled}
              on:click={() => void toggleGroup(suggestion)}
            >
              {suggestion.groupName}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>

  <div class="draft-card__field stack" style="--stack-space: var(--space-2)">
    <div class="cluster draft-card__field-head">
      <span class="draft-card__label">Example sentences</span>
      <button type="button" class="draft-card__list-button" disabled={disabled} on:click={() => addListValue('examples')}>
        + Add
      </button>
    </div>

    <div class="stack" style="--stack-space: var(--space-2)">
      {#if draft.examples.length === 0}
        <p class="draft-card__empty-inline">No example sentences yet.</p>
      {/if}

      {#each draft.examples as example, index}
        <div class="draft-card__list-row">
          <textarea
            class="draft-card__list-input"
            rows="3"
            value={example}
            placeholder="Example sentence..."
            disabled={disabled}
            on:input={(event) => updateListValue('examples', index, event.currentTarget.value)}
            on:blur={() => void persistDraft()}
          ></textarea>
          <button
            type="button"
            class="draft-card__list-remove"
            disabled={disabled}
            aria-label={`Remove example sentence ${index + 1}`}
            on:click={() => void removeListValue('examples', index)}
          >
            ✕
          </button>
        </div>
      {/each}
    </div>
  </div>

  <div class="draft-card__field stack" style="--stack-space: var(--space-2)">
    <div class="cluster draft-card__field-head">
      <span class="draft-card__label">Mnemonics</span>
      <button type="button" class="draft-card__list-button" disabled={disabled} on:click={() => addListValue('mnemonics')}>
        + Add
      </button>
    </div>

    <div class="stack" style="--stack-space: var(--space-2)">
      {#if draft.mnemonics.length === 0}
        <p class="draft-card__empty-inline">No mnemonics yet.</p>
      {/if}

      {#each draft.mnemonics as mnemonic, index}
        <div class="draft-card__list-row">
          <textarea
            class="draft-card__list-input"
            rows="4"
            value={mnemonic}
            placeholder="Mnemonic..."
            disabled={disabled}
            on:input={(event) => updateListValue('mnemonics', index, event.currentTarget.value)}
            on:blur={() => void persistDraft()}
          ></textarea>
          <button
            type="button"
            class="draft-card__list-remove"
            disabled={disabled}
            aria-label={`Remove mnemonic ${index + 1}`}
            on:click={() => void removeListValue('mnemonics', index)}
          >
            ✕
          </button>
        </div>
      {/each}
    </div>
  </div>

  <details class="draft-card__details" bind:open={llmInstructionsOpen}>
    <summary>Special instructions for practicing this card</summary>
    <label class="stack" style="--stack-space: var(--space-2)">
      <span class="visually-hidden">Special instructions for practicing this card</span>
      <textarea
        class="draft-card__textarea"
        rows="4"
        value={draft.llmInstructions ?? ''}
        placeholder="Optional: tell StudyPuck what to focus on, avoid, or reinforce, when it is quizzing you on this card."
        disabled={disabled}
        on:input={(event) => {
          draft = {
            ...draft,
            llmInstructions: event.currentTarget.value,
          };
        }}
        on:blur={() => void persistDraft()}
      ></textarea>
    </label>
  </details>

  {#if draft.duplicateWarnings.some((warning) => !warning.dismissed)}
    <div class="stack" style="--stack-space: var(--space-2)">
      {#each draft.duplicateWarnings.filter((warning) => !warning.dismissed) as warning}
        <section class="draft-card__warning" role="alert">
          <p class="draft-card__warning-title">{warning.title}</p>
          <p class="draft-card__warning-copy">Similar to: {warning.similarCardLabel}</p>
          <div class="draft-card__warning-actions cluster">
            <button
              type="button"
              class="draft-card__warning-dismiss"
              disabled={disabled}
              on:click={() => void dismissDuplicateWarning(warning.warningId)}
            >
              Dismiss
            </button>
          </div>
        </section>
      {/each}
    </div>
  {/if}

  <footer class="draft-card__footer">
    <button
      type="button"
      class="draft-card__remove"
      disabled={disabled || removePending}
      on:click={() => void removeDraftCard()}
    >
      {removePending ? 'Removing draft card...' : 'Remove this draft card'}
    </button>
  </footer>
</article>

<style>
  .draft-card {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .draft-card__header,
  .draft-card__field-head,
  .draft-card__group-chips,
  .draft-card__status-wrap {
    align-items: start;
  }

  .draft-card__header,
  .draft-card__field-head {
    justify-content: space-between;
    gap: var(--space-3);
  }

  .draft-card__eyebrow,
  .draft-card__meaning,
  .draft-card__label,
  .draft-card__status,
  .draft-card__error,
  .draft-card__warning-title,
  .draft-card__warning-copy,
  .draft-card__suggestions-label,
  .draft-card__empty-inline {
    margin: 0;
  }

  .draft-card__eyebrow,
  .draft-card__label {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .draft-card__meaning,
  .draft-card__empty-inline {
    color: var(--color-text-secondary);
  }

  .draft-card__status {
    min-inline-size: 5rem;
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    text-align: right;
  }

  .draft-card__status--saving {
    color: var(--color-text-secondary);
  }

  .draft-card__status--saved {
    color: var(--color-success-text);
  }

  .draft-card__status--error,
  .draft-card__error {
    color: var(--color-error-text);
  }

  .draft-card__error {
    font-size: var(--font-size-small);
    text-align: right;
  }

  .draft-card__textarea,
  .draft-card__group-search,
  .draft-card__list-input {
    inline-size: 100%;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    color: var(--color-text-primary);
    font: inherit;
  }

  .draft-card__textarea {
    resize: vertical;
    min-block-size: 6rem;
  }

  .draft-card__group-trigger,
  .draft-card__list-button,
  .draft-card__create-group,
  .draft-card__remove {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    padding: var(--space-2) var(--space-3);
  }

  .draft-card__group-menu {
    padding: var(--space-3);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
  }

  .draft-card__group-option {
    display: flex;
    inline-size: 100%;
    justify-content: space-between;
    align-items: center;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
  }

  .draft-card__group-chip {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
    border: 1px solid color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
    border-radius: var(--radius-md);
    background: var(--color-primary-subtle);
    color: var(--color-primary-text);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    padding: var(--space-1) var(--space-3);
  }

  .draft-card__group-option:hover:not(:disabled) {
    border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
    background: var(--color-primary-subtle);
  }

  .draft-card__suggestions-label {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  .draft-card__suggestions {
    gap: var(--space-2);
  }

  .draft-card__suggestion,
  .draft-card__warning-dismiss {
    border: 1px solid color-mix(in srgb, var(--color-primary) 25%, var(--color-border));
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    padding: var(--space-2) var(--space-3);
  }

  .draft-card__list-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-2);
    align-items: start;
  }

  .draft-card__list-input {
    min-block-size: 5.5rem;
    overflow-y: auto;
    overflow-x: hidden;
    resize: vertical;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .draft-card__list-remove {
    inline-size: 2.5rem;
    block-size: 2.5rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
  }

  .draft-card__details {
    padding: var(--space-3);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
  }

  .draft-card__details summary {
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    font-weight: 600;
  }

  .draft-card__details[open] summary {
    margin-block-end: var(--space-3);
  }

  .draft-card__warning {
    padding: var(--space-3);
    border: 1px solid var(--color-warning-border);
    border-radius: var(--radius-md);
    background: var(--color-warning-bg);
  }

  .draft-card__warning-title {
    color: var(--color-warning-text);
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    font-weight: 600;
  }

  .draft-card__warning-copy {
    color: var(--color-warning-text);
    font-size: var(--font-size-small);
  }

  .draft-card__warning-actions {
    justify-content: flex-end;
    margin-top: var(--space-2);
  }

  .draft-card__footer {
    display: flex;
    justify-content: end;
  }

  .draft-card__remove {
    border-color: color-mix(in srgb, var(--color-error-text) 35%, var(--color-border));
    color: var(--color-error-text);
  }

  .draft-card__textarea:focus-visible,
  .draft-card__group-search:focus-visible,
  .draft-card__group-option:focus-visible,
  .draft-card__list-input:focus-visible,
  .draft-card__group-trigger:focus-visible,
  .draft-card__list-button:focus-visible,
  .draft-card__create-group:focus-visible,
  .draft-card__group-chip:focus-visible,
  .draft-card__suggestion:focus-visible,
  .draft-card__warning-dismiss:focus-visible,
  .draft-card__list-remove:focus-visible,
  .draft-card__remove:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  button:disabled,
  input:disabled,
  textarea:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  @media (max-width: 40rem) {
    .draft-card {
      padding: var(--space-4);
    }

    .draft-card__header,
    .draft-card__field-head {
      align-items: stretch;
      flex-direction: column;
    }

    .draft-card__status,
    .draft-card__error {
      text-align: left;
    }

    .draft-card__footer {
      justify-content: stretch;
    }

    .draft-card__remove {
      inline-size: 100%;
    }
  }
</style>
