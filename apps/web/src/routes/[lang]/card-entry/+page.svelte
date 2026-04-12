<script lang="ts">
  import MiniAppPlaceholder from '$lib/components/MiniAppPlaceholder.svelte';
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Card Entry – StudyPuck</title>
</svelte:head>

<MiniAppPlaceholder
  title="Card Entry"
  accent="entry"
  routePath={`/${$page.params.lang}/card-entry`}
  commandContext="Card Entry"
  description="Capture rough vocabulary notes quickly, then come back for a calmer pass that turns them into structured study cards."
  plannedExperience={[
    'An inbox of unprocessed notes ordered for focused cleanup time.',
    'Fast capture from anywhere in the app through quick-add and command-bar entry.',
    'A dedicated processing workspace for creating draft or active cards from one note.'
  ]}
>
  <div slot="preview" class="entry-preview stack">
    <div class="entry-preview__capture cluster">
      <div class="entry-preview__capture-input">Quick capture a word, phrase, or sentence...</div>
      <div class="entry-preview__capture-button">Add</div>
    </div>

    <div class="entry-preview__badge">Inbox • 12 notes waiting</div>

    <article class="entry-note stack">
      <div class="cluster entry-note__meta">
        <p>Newest note</p>
        <span>2m ago</span>
      </div>
      <p class="entry-note__content">“to make up for lost time”</p>
      <div class="cluster entry-note__actions">
        <span>Process</span>
        <span>Defer</span>
        <span>Delete</span>
      </div>
    </article>

    <article class="entry-note entry-note--muted stack">
      <div class="cluster entry-note__meta">
        <p>Processing workspace</p>
        <span>draft mode</span>
      </div>
      <p class="entry-note__content">One source note, multiple structured cards, optional AI help.</p>
    </article>
  </div>
</MiniAppPlaceholder>

<style>
  .entry-preview {
    --stack-space: var(--space-4);
  }

  .entry-preview__capture,
  .entry-note__meta,
  .entry-note__actions {
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .entry-preview__capture-input,
  .entry-preview__capture-button,
  .entry-preview__badge,
  .entry-note {
    border-radius: var(--radius-md);
    font-family: var(--font-ui);
  }

  .entry-preview__capture-input {
    flex: 1;
    min-block-size: 2.75rem;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    background: var(--color-surface-subtle);
    color: var(--color-text-muted);
  }

  .entry-preview__capture-button {
    min-inline-size: 4.5rem;
    min-block-size: 2.75rem;
    padding: var(--space-3);
    border: 1px solid var(--color-success-border);
    background: var(--color-success-bg);
    color: var(--color-success-text);
    text-align: center;
  }

  .entry-preview__badge {
    inline-size: fit-content;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-success-border);
    background: color-mix(in srgb, var(--color-success-bg) 60%, var(--color-surface));
    color: var(--color-success-text);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .entry-note {
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    --stack-space: var(--space-3);
  }

  .entry-note--muted {
    background: var(--color-surface-subtle);
  }

  .entry-note__meta p,
  .entry-note__content {
    margin: 0;
  }

  .entry-note__meta {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
  }

  .entry-note__content {
    font-size: var(--font-size-h4);
  }

  .entry-note__actions {
    color: var(--color-text-secondary);
    font-size: var(--font-size-small);
  }

  @media (max-width: 40rem) {
    .entry-preview__capture,
    .entry-note__meta,
    .entry-note__actions {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
