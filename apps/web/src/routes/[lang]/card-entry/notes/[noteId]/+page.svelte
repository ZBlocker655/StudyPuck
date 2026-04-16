<script lang="ts">
  import { page } from '$app/stores';
  import type { PageData } from './$types.js';

  let { data } = $props<{ data: PageData }>();
</script>

<svelte:head>
  <title>Process Note – StudyPuck</title>
</svelte:head>

<section class="note-shell stack" style="--stack-space: var(--space-5)">
  <a class="note-shell__back" href={`/${$page.params.lang}/card-entry`}>← Back to inbox</a>

  <header class="note-shell__header stack" style="--stack-space: var(--space-3)">
    <p class="note-shell__meta">{data.note.sourceLabel} · {data.note.createdAtLabel}</p>
    <h1>Processing workspace is next</h1>
    <p class="note-shell__content">{data.note.content}</p>
  </header>

  <section class="note-shell__placeholder stack" style="--stack-space: var(--space-3)" aria-labelledby="note-shell-placeholder-title">
    <h2 id="note-shell-placeholder-title">Temporary handoff page</h2>
    <p>
      This route is wired so the inbox’s Process action already lands in the right place. The full draft-card
      workspace is still scheduled for issue 117.
    </p>
  </section>
</section>

<style>
  .note-shell {
    padding: calc(var(--shell-header-height) + var(--space-5)) var(--space-4) calc(var(--space-7) + 4.5rem);
  }

  .note-shell__back,
  .note-shell__meta,
  .note-shell__placeholder p,
  .note-shell__content {
    margin: 0;
  }

  .note-shell__back {
    color: var(--color-primary-text);
    font-family: var(--font-ui);
    text-decoration: none;
  }

  .note-shell__header,
  .note-shell__placeholder {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .note-shell__meta {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .note-shell__header h1,
  .note-shell__placeholder h2 {
    margin: 0;
  }

  .note-shell__content {
    font-size: var(--font-size-h4);
    line-height: 1.5;
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
