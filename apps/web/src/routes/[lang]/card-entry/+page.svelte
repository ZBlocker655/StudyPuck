<script lang="ts">
  import { enhance } from '$app/forms';
  import type { SubmitFunction } from '@sveltejs/kit';
  import { invalidateAll } from '$app/navigation';
  import { navigating, page } from '$app/stores';
  import { cardEntryShellCounts } from '$lib/stores/cardEntryShell.js';
  import type { ActionData, PageData } from './$types.js';

  export let data: PageData;
  export let form: ActionData;

  let inlineNoteContent = form?.operation === 'add-note' ? form.submittedContent ?? '' : '';
  let pendingInlineAdd = false;
  let pendingRowAction:
    | {
        noteId: string;
        operation: 'defer-note' | 'delete-note';
      }
    | null = null;
  let refreshingInbox = false;

  $: if (form?.operation === 'add-note') {
    inlineNoteContent = form.submittedContent ?? inlineNoteContent;
  }

  $: nextSort = data.inbox.sort === 'oldest-first' ? 'newest-first' : 'oldest-first';
  $: sortLabel = data.inbox.sort === 'oldest-first' ? 'Oldest first' : 'Newest first';
  $: currentLanguageCode = $page.params.lang ?? '';
  $: isSortNavigationPending =
    $navigating?.to?.url.pathname === $page.url.pathname &&
    $navigating?.to?.url.search !== $page.url.search;

  const enhanceInlineAdd: SubmitFunction = () => {
    pendingInlineAdd = true;

    return async ({ result, update }) => {
      pendingInlineAdd = false;
      await update();

      if (result.type === 'success') {
        inlineNoteContent = '';
        if (currentLanguageCode) {
          cardEntryShellCounts.adjustCount(currentLanguageCode, 1);
        }
        refreshingInbox = true;
        await invalidateAll();
        refreshingInbox = false;
      }
    };
  };

  function enhanceRowAction(noteId: string, operation: 'defer-note' | 'delete-note'): SubmitFunction {
    return () => {
      pendingRowAction = { noteId, operation };

      return async ({ result, update }) => {
        await update();

        if (result.type === 'success') {
          if (currentLanguageCode) {
            cardEntryShellCounts.adjustCount(currentLanguageCode, -1);
          }
          refreshingInbox = true;
          await invalidateAll();
          refreshingInbox = false;
        }

        pendingRowAction = null;
      };
    };
  }

  function isNotePending(noteId: string, operation: 'defer-note' | 'delete-note') {
    return pendingRowAction?.noteId === noteId && pendingRowAction.operation === operation;
  }
</script>

<svelte:head>
  <title>Card Entry – StudyPuck</title>
</svelte:head>

<section class="card-entry-page stack" style="--stack-space: var(--space-5)">
  <header class="card-entry-header cluster">
    <div class="stack" style="--stack-space: var(--space-2)">
      <p class="card-entry-header__eyebrow">Inbox</p>
      <div class="card-entry-header__title cluster">
        <h1>Card Entry</h1>
        <span class="card-entry-count" aria-label={`${data.inbox.unprocessedNoteCount} unprocessed notes`}>
          {data.inbox.unprocessedNoteCount}
        </span>
      </div>
      <p class="card-entry-header__copy">Capture rough notes quickly, then come back for a calmer pass through the backlog.</p>
    </div>

    <a
      class="card-entry-sort"
      href={`/${$page.params.lang}/card-entry?sort=${nextSort}`}
      aria-label={`Switch sort order. Currently ${sortLabel}.`}
    >
      {sortLabel}
      <span aria-hidden="true">▾</span>
    </a>
  </header>

  <form
    method="POST"
    action="?/addNote"
    class="quick-capture stack"
    style="--stack-space: var(--space-3)"
    use:enhance={enhanceInlineAdd}
  >
    <label class="quick-capture__label" for="card-entry-note-input">New note</label>
    <div class="quick-capture__controls">
      <input
        id="card-entry-note-input"
        name="content"
        type="text"
        bind:value={inlineNoteContent}
        class="quick-capture__input"
        placeholder="New note..."
        autocomplete="off"
        disabled={pendingInlineAdd}
      />
      <button
        type="submit"
        class="quick-capture__submit"
        disabled={pendingInlineAdd || inlineNoteContent.trim().length === 0}
      >
        {pendingInlineAdd ? 'Adding...' : 'Add'}
      </button>
    </div>

    {#if form?.operation === 'add-note' && form?.errorMessage}
      <p class="quick-capture__error" role="alert">{form.errorMessage}</p>
    {/if}
  </form>

  {#if form?.operation !== 'add-note' && form?.errorMessage}
    <div class="inbox-state inbox-state--error" role="alert">
      <h2>Action failed</h2>
      <p>{form.errorMessage}</p>
    </div>
  {/if}

  {#if data.loadError}
    <div class="inbox-state inbox-state--error" role="alert">
      <h2>Card Entry is unavailable</h2>
      <p>{data.loadError}</p>
    </div>
  {:else if refreshingInbox || isSortNavigationPending}
    <div class="inbox-state" aria-live="polite">
      <h2>Loading inbox…</h2>
      <p>Refreshing the current note queue.</p>
    </div>
  {:else if data.inbox.notes.length === 0}
    <div class="inbox-state inbox-state--empty">
      <div class="inbox-state__icon" aria-hidden="true">📥</div>
      <h2>Your inbox is empty</h2>
      <p>Use the quick-add field, the + button, or type /add to capture a note from anywhere.</p>
    </div>
  {:else}
    <div class="inbox-list stack" style="--stack-space: var(--space-3)">
      {#each data.inbox.notes as note}
        <div class="note-row-shell">
          <div class="note-row-track">
            <a
              href={`/${$page.params.lang}/card-entry/notes/${note.noteId}`}
              class="note-row stack"
              style="--stack-space: var(--space-3)"
            >
              <p class="note-row__content">{note.content}</p>
              <div class="note-row__meta cluster">
                <span>{note.createdAtLabel}</span>
                <span>{note.sourceLabel}</span>
              </div>
            </a>

            <div class="note-row__actions" aria-label={`Actions for note from ${note.createdAtLabel}`}>
              <a
                href={`/${$page.params.lang}/card-entry/notes/${note.noteId}`}
                class="note-row__action note-row__action--process"
              >
                Process →
              </a>

              <form method="POST" action="?/deferNote" use:enhance={enhanceRowAction(note.noteId, 'defer-note')}>
                <input type="hidden" name="noteId" value={note.noteId} />
                <button
                  type="submit"
                  class="note-row__action"
                  disabled={isNotePending(note.noteId, 'defer-note') || isNotePending(note.noteId, 'delete-note')}
                >
                  {isNotePending(note.noteId, 'defer-note') ? 'Deferring…' : 'Defer'}
                </button>
              </form>

              <form method="POST" action="?/deleteNote" use:enhance={enhanceRowAction(note.noteId, 'delete-note')}>
                <input type="hidden" name="noteId" value={note.noteId} />
                <button
                  type="submit"
                  class="note-row__action note-row__action--danger"
                  disabled={isNotePending(note.noteId, 'defer-note') || isNotePending(note.noteId, 'delete-note')}
                >
                  {isNotePending(note.noteId, 'delete-note') ? 'Deleting…' : 'Delete'}
                </button>
              </form>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .card-entry-page {
    padding: calc(var(--shell-header-height) + var(--space-5)) var(--space-4) calc(var(--space-7) + 4.5rem);
  }

  .card-entry-header,
  .card-entry-header__title,
  .card-entry-sort,
  .note-row__meta {
    align-items: center;
    gap: var(--space-3);
  }

  .card-entry-header {
    justify-content: space-between;
  }

  .card-entry-header__eyebrow {
    margin: 0;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .card-entry-header__title h1,
  .card-entry-header__copy,
  .note-row__content,
  .note-row__meta,
  .inbox-state h2,
  .inbox-state p {
    margin: 0;
  }

  .card-entry-header__title h1 {
    font-size: var(--font-size-h2);
  }

  .card-entry-header__copy {
    max-inline-size: 42rem;
    color: var(--color-text-secondary);
  }

  .card-entry-count,
  .card-entry-sort {
    border-radius: 999px;
    font-family: var(--font-ui);
  }

  .card-entry-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-inline-size: 2rem;
    min-block-size: 2rem;
    padding-inline: 0.6rem;
    background: var(--color-primary);
    color: var(--color-text-inverse);
    font-weight: 700;
  }

  .card-entry-sort {
    display: inline-flex;
    justify-content: center;
    min-block-size: 2.75rem;
    padding-inline: var(--space-4);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    text-decoration: none;
  }

  .quick-capture__label {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .quick-capture__controls {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-3);
  }

  .quick-capture__input,
  .quick-capture__submit,
  .note-row__action {
    min-block-size: 2.75rem;
    border-radius: var(--radius-md);
    font-family: var(--font-ui);
  }

  .quick-capture__input {
    inline-size: 100%;
    padding-inline: var(--space-3);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .quick-capture__submit,
  .note-row__action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding-inline: var(--space-4);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    text-decoration: none;
  }

  .quick-capture__submit {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .quick-capture__error {
    margin: 0;
    color: var(--color-danger-text, #8b1a1a);
    font-family: var(--font-ui);
  }

  .inbox-state {
    padding: var(--space-6);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    text-align: center;
    box-shadow: var(--shadow-sm);
  }

  .inbox-state--error {
    text-align: start;
  }

  .inbox-state__icon {
    margin-block-end: var(--space-3);
    font-size: 2rem;
  }

  .inbox-list {
    padding-block-end: var(--space-4);
  }

  .note-row-shell {
    overflow-x: auto;
    border-radius: var(--radius-lg);
    scrollbar-width: none;
    scroll-snap-type: x mandatory;
    overscroll-behavior-x: contain;
  }

  .note-row-shell::-webkit-scrollbar {
    display: none;
  }

  .note-row-track {
    display: grid;
    grid-template-columns: minmax(100%, 1fr) 13rem;
    min-inline-size: calc(100% + 13rem);
  }

  .note-row,
  .note-row__actions {
    scroll-snap-align: start;
  }

  .note-row {
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    color: inherit;
    text-decoration: none;
  }

  .note-row__content {
    display: -webkit-box;
    overflow: hidden;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    font-size: var(--font-size-h4);
    line-height: 1.4;
  }

  .note-row__meta {
    justify-content: space-between;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .note-row__actions {
    display: grid;
    align-content: stretch;
    gap: var(--space-2);
    padding-inline-start: var(--space-3);
  }

  .note-row__actions form {
    display: contents;
  }

  .note-row__action {
    inline-size: 100%;
  }

  .note-row__action--process {
    border-color: var(--color-primary);
    color: var(--color-primary-text);
  }

  .note-row__action--danger {
    border-color: var(--color-danger-border, #c04040);
    color: var(--color-danger-text, #8b1a1a);
  }

  .card-entry-sort:focus-visible,
  .quick-capture__input:focus-visible,
  .quick-capture__submit:focus-visible,
  .note-row:focus-visible,
  .note-row__action:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (min-width: 64rem) {
    .card-entry-page {
      padding-inline: calc(var(--shell-sidebar-width) + var(--space-6)) var(--space-6);
      padding-block-end: calc(var(--space-7) + 5rem);
    }

    .note-row-shell {
      overflow: visible;
      scroll-snap-type: none;
    }

    .note-row-track {
      grid-template-columns: minmax(0, 1fr) auto;
      min-inline-size: 100%;
      align-items: stretch;
      gap: var(--space-3);
    }

    .note-row__actions {
      align-content: center;
      grid-auto-flow: column;
      opacity: 0;
      pointer-events: none;
      transition: opacity 160ms ease;
    }

    .note-row-shell:hover .note-row__actions,
    .note-row-shell:focus-within .note-row__actions {
      opacity: 1;
      pointer-events: auto;
    }
  }

  @media (max-width: 63.99rem) {
    .card-entry-page {
      padding-inline: var(--space-3);
    }

    .card-entry-header {
      align-items: stretch;
      flex-direction: column;
    }

    .quick-capture__controls {
      grid-template-columns: 1fr;
    }
  }
</style>
