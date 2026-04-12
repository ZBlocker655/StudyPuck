<script lang="ts">
  export let title: string;
  export let description: string;
  export let routePath: string;
  export let commandContext: string;
  export let milestoneNote = 'Coming in Milestone 2.x';
  export let plannedExperience: string[] = [];
  export let accent: 'entry' | 'review' | 'drills' = 'entry';
</script>

<section class={`center stack placeholder-page placeholder-page--${accent}`}>
  <header class="stack placeholder-page__header">
    <p class="placeholder-page__eyebrow text-muted">Mini-app</p>
    <h1>{title}</h1>
    <p class="placeholder-page__summary">{description}</p>
  </header>

  <div class="cluster placeholder-page__meta" aria-label="Page metadata">
    <p class="placeholder-chip">{routePath}</p>
    <p class="placeholder-chip">Command bar context: {commandContext}</p>
    <p class="placeholder-chip placeholder-chip--accent">{milestoneNote}</p>
  </div>

  <div class="placeholder-page__layout">
    <section class="placeholder-preview stack" aria-label={`${title} preview`}>
      <slot name="preview" />
    </section>

    <aside class="placeholder-notes stack">
      <div class="stack placeholder-notes__section">
        <h2>Planned experience</h2>
        <ul class="placeholder-list">
          {#each plannedExperience as item}
            <li>{item}</li>
          {/each}
        </ul>
      </div>

      <div class="placeholder-note">
        <p>This screen is intentionally polished now so navigation, context, and shell behavior feel complete before the working workflows arrive.</p>
      </div>
    </aside>
  </div>
</section>

<style>
  .placeholder-page {
    --center-max: 72rem;
    padding-inline: var(--space-5);
    padding-block: var(--space-5);
    --stack-space: var(--space-5);
  }

  .placeholder-page__header {
    max-inline-size: 46rem;
    --stack-space: var(--space-2);
  }

  .placeholder-page__eyebrow,
  .placeholder-page__summary,
  .placeholder-page__header h1,
  .placeholder-note p {
    margin: 0;
  }

  .placeholder-page__eyebrow {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .placeholder-page__summary {
    color: var(--color-text-secondary);
    max-inline-size: var(--measure-body);
  }

  .placeholder-page__meta {
    gap: var(--space-2);
    align-items: center;
  }

  .placeholder-chip {
    margin: 0;
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
  }

  .placeholder-chip--accent {
    border-color: var(--placeholder-accent-border);
    background: var(--placeholder-accent-bg);
    color: var(--placeholder-accent-text);
  }

  .placeholder-page__layout {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(18rem, 24rem);
    gap: var(--space-5);
    align-items: start;
  }

  .placeholder-preview,
  .placeholder-notes {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .placeholder-preview {
    min-block-size: 26rem;
    --stack-space: var(--space-4);
  }

  .placeholder-notes,
  .placeholder-notes__section {
    --stack-space: var(--space-4);
  }

  .placeholder-notes h2,
  .placeholder-note p {
    font-size: var(--font-size-h4);
  }

  .placeholder-notes h2,
  .placeholder-list {
    margin: 0;
  }

  .placeholder-list {
    padding-inline-start: 1.25rem;
    color: var(--color-text-secondary);
  }

  .placeholder-note {
    padding: var(--space-4);
    border: 1px solid var(--placeholder-accent-border);
    border-radius: var(--radius-md);
    background: var(--placeholder-accent-bg);
    color: var(--placeholder-accent-text);
  }

  .placeholder-page--entry {
    --placeholder-accent-border: var(--color-success-border);
    --placeholder-accent-bg: color-mix(in srgb, var(--color-success-bg) 70%, var(--color-surface));
    --placeholder-accent-text: var(--color-success-text);
  }

  .placeholder-page--review {
    --placeholder-accent-border: var(--color-info-border);
    --placeholder-accent-bg: color-mix(in srgb, var(--color-info-bg) 70%, var(--color-surface));
    --placeholder-accent-text: var(--color-info-text);
  }

  .placeholder-page--drills {
    --placeholder-accent-border: var(--color-primary);
    --placeholder-accent-bg: var(--color-primary-subtle);
    --placeholder-accent-text: var(--color-primary-text);
  }

  @media (max-width: 64rem) {
    .placeholder-page__layout {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 48rem) {
    .placeholder-page {
      padding-inline: var(--space-4);
    }
  }
</style>
