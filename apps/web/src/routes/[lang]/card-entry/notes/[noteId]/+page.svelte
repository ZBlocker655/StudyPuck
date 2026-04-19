<script lang="ts">
  import type { ActionData, PageData } from './$types.js';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import DraftCardEditor from '$lib/components/card-entry/DraftCardEditor.svelte';
  import { getUnresolvedDuplicateWarnings, replaceDraftCardInNote } from '$lib/card-entry/workspace.js';
  import type { CardEntryNoteShellData } from '$lib/server/card-entry.js';

  export let data: PageData;
  export let form: ActionData;

  let note: CardEntryNoteShellData = data.note;
  let isRefreshing = false;
  let pollingError: string | null = null;
  let semanticError: string | null = null;
  let workspaceError: string | null = null;
  let addCardPending = false;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;
  let showDuplicateDialog = false;
  let signOffForm: HTMLFormElement | null = null;
  let semanticRefreshPending = false;
  let semanticRefreshQueued = false;

  $: currentLang = $page.params.lang ?? '';
  $: actionError = (form as { errorMessage?: string } | null | undefined)?.errorMessage ?? null;
  $: unresolvedDuplicateWarnings = getUnresolvedDuplicateWarnings(note);
  $: signOffDisabled =
    note.draftCards.length === 0 ||
    note.aiState === 'queued' ||
    note.aiState === 'processing' ||
    semanticRefreshPending;
  $: signOffLabel =
    note.draftCards.length === 0
      ? 'Sign off unavailable — add at least one draft card'
    : note.aiState === 'queued' || note.aiState === 'processing'
        ? 'Sign off unavailable while AI is still processing'
        : semanticRefreshPending
          ? 'Checking suggestions and duplicates before sign off...'
        : `Sign off — Promote all to active (${note.draftCards.length} ${
            note.draftCards.length === 1 ? 'card' : 'cards'
          }) →`;

  function clearPollTimer() {
    if (!pollTimer) {
      return;
    }

    clearTimeout(pollTimer);
    pollTimer = null;
  }

  function shouldPollAiState(currentNote: CardEntryNoteShellData) {
    return currentNote.aiState === 'queued' || currentNote.aiState === 'processing';
  }

  async function refreshProcessingState() {
    if (isRefreshing) {
      return;
    }

    isRefreshing = true;

    try {
      const response = await fetch(`/${currentLang}/card-entry/notes/${note.noteId}/processing`);

      if (!response.ok) {
        throw new Error(`Unexpected note processing status response: ${response.status}`);
      }

      note = await response.json();
      pollingError = null;

      if (!shouldPollAiState(note)) {
        void refreshSemanticAssistance();
      }
    } catch (error) {
      console.error('Failed to refresh Card Entry note processing state:', error);
      pollingError = 'The latest AI processing status could not be loaded right now.';
    } finally {
      isRefreshing = false;

      if (shouldPollAiState(note)) {
        pollTimer = setTimeout(() => {
          void refreshProcessingState();
        }, 2_000);
      }
    }
  }

  async function refreshSemanticAssistance() {
    if (semanticRefreshPending) {
      semanticRefreshQueued = true;
      return;
    }

    if (shouldPollAiState(note) || note.draftCards.length === 0) {
      return;
    }

    semanticRefreshPending = true;

    try {
      const response = await fetch(`/${currentLang}/card-entry/notes/${note.noteId}/semantic-assistance`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error(`Unexpected semantic assistance response: ${response.status}`);
      }

      note = await response.json();
      semanticError = null;
    } catch (error) {
      console.error('Failed to refresh Card Entry semantic assistance:', error);
      semanticError = 'Suggestions and duplicate checks could not be refreshed right now.';
    } finally {
      semanticRefreshPending = false;

      if (semanticRefreshQueued) {
        semanticRefreshQueued = false;
        void refreshSemanticAssistance();
      }
    }
  }

  async function addDraftCard() {
    if (addCardPending) {
      return;
    }

    addCardPending = true;
    workspaceError = null;

    try {
      const response = await fetch(`/${currentLang}/card-entry/notes/${note.noteId}/draft-cards`, {
        method: 'POST',
      });

      const updatedNote = (await response.json().catch(() => null)) as
        | (CardEntryNoteShellData & { message?: string })
        | null;

      if (!response.ok || !updatedNote?.noteId) {
        throw new Error(updatedNote?.message ?? 'A draft card could not be created right now.');
      }

      note = updatedNote;
      void refreshSemanticAssistance();
    } catch (error) {
      workspaceError = error instanceof Error ? error.message : 'A draft card could not be created right now.';
    } finally {
      addCardPending = false;
    }
  }

  function handleDraftCardUpdated(event: CustomEvent<{ card: CardEntryNoteShellData['draftCards'][number]; availableGroups: CardEntryNoteShellData['availableGroups'] }>) {
    note = replaceDraftCardInNote(note, event.detail.card, event.detail.availableGroups);
    workspaceError = null;
    void refreshSemanticAssistance();
  }

  function handleDraftCardNoteUpdated(event: CustomEvent<{ note: CardEntryNoteShellData }>) {
    note = event.detail.note;
    workspaceError = null;
    semanticError = null;
  }

  function handleDraftCardRemoved(event: CustomEvent<{ note: CardEntryNoteShellData }>) {
    note = event.detail.note;
    workspaceError = null;
    void refreshSemanticAssistance();
  }

  function handleSignOffClick(event: MouseEvent) {
    if (signOffDisabled || unresolvedDuplicateWarnings.length === 0) {
      return;
    }

    event.preventDefault();
    showDuplicateDialog = true;
  }

  function closeDuplicateDialog() {
    showDuplicateDialog = false;
  }

  function submitSignOffAnyway() {
    showDuplicateDialog = false;
    signOffForm?.requestSubmit();
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && showDuplicateDialog) {
      closeDuplicateDialog();
    }
  }

  onMount(() => {
    if (shouldPollAiState(note)) {
      void refreshProcessingState();
    } else {
      void refreshSemanticAssistance();
    }

    return () => {
      clearPollTimer();
    };
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
  <title>Note Processing – StudyPuck</title>
</svelte:head>

<section class="note-workspace stack" style="--stack-space: var(--space-4)">
  <a class="note-workspace__back" href={`/${$page.params.lang}/card-entry`}>← Back to inbox</a>

  {#if actionError || workspaceError}
    <section class="note-workspace__alert" role="alert">
      <h2>Action failed</h2>
      <p>{actionError ?? workspaceError}</p>
    </section>
  {/if}

  <header class="note-workspace__header stack" style="--stack-space: var(--space-3)">
    <div class="note-workspace__header-top cluster">
      <div class="stack" style="--stack-space: var(--space-1)">
        <p class="note-workspace__meta">{note.sourceLabel} · {note.createdAtLabel}</p>
        <h1>Note Processing</h1>
      </div>

      <div class="note-workspace__actions cluster">
        <form method="POST" action="?/deferNote">
          <button type="submit" class="note-workspace__action">Defer</button>
        </form>
        <form method="POST" action="?/deleteNote">
          <button type="submit" class="note-workspace__action note-workspace__action--danger">Delete</button>
        </form>
      </div>
    </div>

    <p class="note-workspace__content">{note.content}</p>
  </header>

  {#if note.aiState === 'queued' || note.aiState === 'processing'}
    <section class="note-workspace__status note-workspace__status--loading stack" style="--stack-space: var(--space-2)" aria-live="polite">
      <h2>AI is preparing your cards…</h2>
      <p>
        {note.aiState === 'queued'
          ? 'This note is queued for preprocessing.'
          : 'Draft cards are still being generated for this note.'}
      </p>
      {#if pollingError}
        <p class="note-workspace__status-detail">{pollingError}</p>
      {:else if isRefreshing}
        <p class="note-workspace__status-detail">Refreshing the latest processing state…</p>
      {/if}
    </section>
  {:else if note.aiState === 'failed'}
    <section class="note-workspace__status note-workspace__status--error stack" style="--stack-space: var(--space-2)" role="alert">
      <h2>AI processing failed</h2>
      <p>You can keep working here manually and add draft cards yourself.</p>
      {#if pollingError}
        <p class="note-workspace__status-detail">{pollingError}</p>
      {/if}
    </section>
  {/if}

  <section class="note-workspace__drafts stack" style="--stack-space: var(--space-4)" aria-labelledby="draft-panels-title">
    <div class="stack" style="--stack-space: var(--space-1)">
      <h2 id="draft-panels-title">Draft cards</h2>
      <p class="note-workspace__supporting">
        Edit each linked draft inline. Fields save automatically when focus leaves them.
      </p>
      {#if semanticRefreshPending}
        <p class="note-workspace__supporting">Refreshing suggestions and duplicate checks…</p>
      {:else if semanticError}
        <p class="note-workspace__supporting note-workspace__supporting--error">{semanticError}</p>
      {/if}
    </div>

    {#if note.draftCards.length === 0}
      <section class="note-workspace__empty">
        <h3>No draft cards yet</h3>
        <p>
          {note.aiState === 'queued' || note.aiState === 'processing'
            ? 'AI is still working, but you can start a manual draft now.'
            : 'Add a draft card to start shaping this note into active cards.'}
        </p>
      </section>
    {:else}
      {#each note.draftCards as draftCard (draftCard.cardId)}
        <DraftCardEditor
          lang={currentLang}
          noteId={note.noteId}
          card={draftCard}
          availableGroups={note.availableGroups}
          on:updated={handleDraftCardUpdated}
          on:noteUpdated={handleDraftCardNoteUpdated}
          on:removed={handleDraftCardRemoved}
        />
      {/each}
    {/if}

    <button
      type="button"
      class="note-workspace__add-card"
      disabled={addCardPending}
      on:click={() => void addDraftCard()}
    >
      {addCardPending ? 'Adding draft card...' : '+ Add another card'}
    </button>
  </section>

  <div class="note-workspace__signoff">
    <form method="POST" action="?/signOffNote" bind:this={signOffForm}>
      <button
        type="submit"
        class="note-workspace__signoff-button"
        disabled={signOffDisabled}
        aria-disabled={signOffDisabled}
        on:click={handleSignOffClick}
      >
        {signOffLabel}
      </button>
    </form>
  </div>

  {#if showDuplicateDialog}
    <div class="note-workspace__dialog-backdrop">
      <div class="note-workspace__dialog" role="alertdialog" aria-modal="true" aria-labelledby="duplicate-dialog-title">
        <div class="stack" style="--stack-space: var(--space-3)">
          <div class="stack" style="--stack-space: var(--space-1)">
            <h2 id="duplicate-dialog-title">Duplicate warnings</h2>
            <p>These draft cards still have possible duplicates.</p>
          </div>

          <div class="stack" style="--stack-space: var(--space-2)">
            {#each unresolvedDuplicateWarnings as warning}
              <section class="note-workspace__dialog-warning">
                <p class="note-workspace__dialog-card">{warning.cardLabel}</p>
                <p class="note-workspace__dialog-copy">{warning.similarCardLabel}</p>
              </section>
            {/each}
          </div>

          <div class="note-workspace__dialog-actions cluster">
            <button type="button" class="note-workspace__dialog-button note-workspace__dialog-button--primary" on:click={submitSignOffAnyway}>
              Promote anyway
            </button>
            <button type="button" class="note-workspace__dialog-button" on:click={closeDuplicateDialog}>
              Go back
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</section>

<style>
  .note-workspace {
    padding: calc(var(--shell-header-height) + var(--space-5)) var(--space-4) calc(var(--space-8) + 5rem);
  }

  .note-workspace__back,
  .note-workspace__meta,
  .note-workspace__content,
  .note-workspace__supporting,
  .note-workspace__supporting--error,
  .note-workspace__empty h3,
  .note-workspace__empty p,
  .note-workspace__status h2,
  .note-workspace__status p,
  .note-workspace__alert h2,
  .note-workspace__alert p,
  .note-workspace__dialog h2,
  .note-workspace__dialog p,
  .note-workspace__dialog-card,
  .note-workspace__dialog-copy {
    margin: 0;
  }

  .note-workspace__back {
    color: var(--color-primary-text);
    font-family: var(--font-ui);
    text-decoration: none;
  }

  .note-workspace__header,
  .note-workspace__status,
  .note-workspace__empty,
  .note-workspace__alert {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .note-workspace__header {
    position: sticky;
    inset-block-start: calc(var(--shell-header-height) + var(--space-3));
    z-index: 2;
  }

  .note-workspace__header-top,
  .note-workspace__actions,
  .note-workspace__dialog-actions {
    justify-content: space-between;
    gap: var(--space-3);
  }

  .note-workspace__meta {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .note-workspace__content {
    max-inline-size: var(--measure-body);
    font-size: var(--font-size-h4);
    line-height: var(--leading-body);
  }

  .note-workspace__supporting--error {
    color: var(--color-error-text);
  }

  .note-workspace__supporting,
  .note-workspace__status-detail,
  .note-workspace__empty p,
  .note-workspace__dialog-copy {
    color: var(--color-text-secondary);
  }

  .note-workspace__status--loading {
    border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
  }

  .note-workspace__status--error,
  .note-workspace__alert {
    border-color: color-mix(in srgb, var(--color-error-text) 35%, var(--color-border));
  }

  .note-workspace__drafts {
    padding-block-end: var(--space-3);
  }

  .note-workspace__add-card,
  .note-workspace__action,
  .note-workspace__signoff-button,
  .note-workspace__dialog-button {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    padding: var(--space-2) var(--space-4);
  }

  .note-workspace__add-card {
    inline-size: fit-content;
  }

  .note-workspace__action--danger {
    color: var(--color-error-text);
    border-color: color-mix(in srgb, var(--color-error-text) 35%, var(--color-border));
  }

  .note-workspace__signoff {
    position: sticky;
    inset-block-end: var(--space-3);
    z-index: 3;
  }

  .note-workspace__signoff-button {
    inline-size: min(100%, 44rem);
    padding: var(--space-4) var(--space-5);
    border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-sm);
    color: var(--color-primary-text);
    font-weight: 600;
  }

  .note-workspace__signoff-button:disabled {
    color: var(--color-text-disabled);
    border-color: var(--color-border);
  }

  .note-workspace__dialog-backdrop {
    position: fixed;
    inset: 0;
    display: grid;
    place-items: center;
    padding: var(--space-4);
    background: color-mix(in srgb, var(--color-background) 20%, transparent);
    backdrop-filter: blur(2px);
    z-index: 10;
  }

  .note-workspace__dialog {
    inline-size: min(100%, 34rem);
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-md);
  }

  .note-workspace__dialog-warning {
    padding: var(--space-3);
    border: 1px solid var(--color-warning-border);
    border-radius: var(--radius-md);
    background: var(--color-warning-bg);
  }

  .note-workspace__dialog-card {
    color: var(--color-warning-text);
    font-family: var(--font-ui);
    font-weight: 600;
  }

  .note-workspace__dialog-copy {
    color: var(--color-warning-text);
  }

  .note-workspace__dialog-button--primary {
    color: var(--color-primary-text);
    border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border));
  }

  .note-workspace__back:focus-visible,
  .note-workspace__add-card:focus-visible,
  .note-workspace__action:focus-visible,
  .note-workspace__signoff-button:focus-visible,
  .note-workspace__dialog-button:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (min-width: 64rem) {
    .note-workspace {
      padding-inline: calc(var(--shell-sidebar-width) + var(--space-6)) var(--space-6);
    }
  }

  @media (max-width: 48rem) {
    .note-workspace {
      padding-inline: var(--space-3);
      padding-block-end: calc(var(--space-8) + 6rem);
    }

    .note-workspace__header-top,
    .note-workspace__actions,
    .note-workspace__dialog-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .note-workspace__signoff-button {
      inline-size: 100%;
    }

    .note-workspace__dialog {
      align-self: end;
      inline-size: 100%;
    }
  }
</style>
