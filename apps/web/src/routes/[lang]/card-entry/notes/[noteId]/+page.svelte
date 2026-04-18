<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import type { CardEntryNoteShellData } from '$lib/server/card-entry.js';
  import type { PageData } from './$types.js';

  export let data: PageData;

  let note: CardEntryNoteShellData = data.note;
  let isRefreshing = false;
  let pollingError: string | null = null;
  let pollTimer: ReturnType<typeof setTimeout> | null = null;

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
      const response = await fetch(`/${$page.params.lang}/card-entry/notes/${note.noteId}/processing`);

      if (!response.ok) {
        throw new Error(`Unexpected note processing status response: ${response.status}`);
      }

      note = await response.json();
      pollingError = null;
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

  onMount(() => {
    if (shouldPollAiState(note)) {
      void refreshProcessingState();
    }

    return () => {
      clearPollTimer();
    };
  });
</script>

<svelte:head>
  <title>Note Processing – StudyPuck</title>
</svelte:head>

<section class="note-shell stack" style="--stack-space: var(--space-5)">
  <a class="note-shell__back" href={`/${$page.params.lang}/card-entry`}>← Back to inbox</a>

  <header class="note-shell__header stack" style="--stack-space: var(--space-3)">
    <p class="note-shell__meta">{note.sourceLabel} · {note.createdAtLabel}</p>
    <h1>Note Processing</h1>
    <p class="note-shell__content">{note.content}</p>
  </header>

  {#if note.aiState === 'queued' || note.aiState === 'processing'}
    <section class="note-shell__status note-shell__status--loading stack" style="--stack-space: var(--space-3)" aria-live="polite">
      <h2>AI is preparing your cards…</h2>
      <p>
        {note.aiState === 'queued'
          ? 'This note is queued for preprocessing.'
          : 'Draft cards are being generated for this note now.'}
      </p>
      {#if pollingError}
        <p class="note-shell__status-detail">{pollingError}</p>
      {:else if isRefreshing}
        <p class="note-shell__status-detail">Refreshing the latest processing state…</p>
      {/if}
    </section>
  {:else if note.aiState === 'failed'}
    <section class="note-shell__status note-shell__status--error stack" style="--stack-space: var(--space-3)" role="alert">
      <h2>AI processing failed</h2>
      <p>The note stays in Card Entry so it can still be finished manually as the workspace evolves.</p>
      {#if pollingError}
        <p class="note-shell__status-detail">{pollingError}</p>
      {/if}
    </section>
  {/if}

  {#if note.draftCards.length > 0}
    <section class="draft-preview stack" style="--stack-space: var(--space-4)" aria-labelledby="draft-preview-title">
      <div class="draft-preview__heading stack" style="--stack-space: var(--space-2)">
        <h2 id="draft-preview-title">Draft cards</h2>
        <p>The shared AI preprocessing pipeline has populated these draft fields for the upcoming inline editor.</p>
      </div>

      {#each note.draftCards as draftCard}
        <article class="draft-preview__card stack" style="--stack-space: var(--space-3)">
          <div class="stack" style="--stack-space: var(--space-2)">
            <p class="draft-preview__label">Content</p>
            <p class="draft-preview__value">{draftCard.content}</p>
          </div>

          {#if draftCard.meaning}
            <div class="stack" style="--stack-space: var(--space-2)">
              <p class="draft-preview__label">Meaning</p>
              <p class="draft-preview__value">{draftCard.meaning}</p>
            </div>
          {/if}

          {#if draftCard.examples.length > 0}
            <div class="stack" style="--stack-space: var(--space-2)">
              <p class="draft-preview__label">Examples</p>
              <ul class="draft-preview__list">
                {#each draftCard.examples as example}
                  <li>{example}</li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if draftCard.mnemonics.length > 0}
            <div class="stack" style="--stack-space: var(--space-2)">
              <p class="draft-preview__label">Mnemonics</p>
              <ul class="draft-preview__list">
                {#each draftCard.mnemonics as mnemonic}
                  <li>{mnemonic}</li>
                {/each}
              </ul>
            </div>
          {/if}

          {#if draftCard.llmInstructions}
            <div class="stack" style="--stack-space: var(--space-2)">
              <p class="draft-preview__label">LLM instructions</p>
              <p class="draft-preview__value">{draftCard.llmInstructions}</p>
            </div>
          {/if}
        </article>
      {/each}
    </section>
  {:else if note.aiState === 'complete'}
    <section class="note-shell__status stack" style="--stack-space: var(--space-3)">
      <h2>No draft cards were generated</h2>
      <p>The note finished preprocessing without draft output, so it remains ready for manual follow-up.</p>
    </section>
  {/if}
</section>

<style>
  .note-shell {
    padding: calc(var(--shell-header-height) + var(--space-5)) var(--space-4) calc(var(--space-7) + 4.5rem);
  }

  .note-shell__back,
  .note-shell__meta,
  .note-shell__content,
  .note-shell__status h2,
  .note-shell__status p,
  .draft-preview__heading h2,
  .draft-preview__heading p,
  .draft-preview__label,
  .draft-preview__value,
  .draft-preview__list {
    margin: 0;
  }

  .note-shell__back {
    color: var(--color-primary-text);
    font-family: var(--font-ui);
    text-decoration: none;
  }

  .note-shell__header,
  .note-shell__status,
  .draft-preview__card {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .note-shell__meta,
  .draft-preview__label {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .note-shell__content {
    font-size: var(--font-size-h4);
    line-height: 1.5;
  }

  .note-shell__status--loading {
    border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
  }

  .note-shell__status--error {
    border-color: color-mix(in srgb, var(--color-danger-text) 40%, var(--color-border));
  }

  .note-shell__status-detail {
    color: var(--color-text-secondary);
  }

  .draft-preview__heading p {
    color: var(--color-text-secondary);
  }

  .draft-preview__value {
    line-height: 1.5;
  }

  .draft-preview__list {
    padding-inline-start: 1.25rem;
  }

  .note-shell__back:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (min-width: 64rem) {
    .note-shell {
      padding-inline: calc(var(--shell-sidebar-width) + var(--space-6)) var(--space-6);
      padding-block-end: calc(var(--space-7) + 5rem);
    }
  }

  @media (max-width: 63.99rem) {
    .note-shell {
      padding-inline: var(--space-3);
    }
  }
</style>
