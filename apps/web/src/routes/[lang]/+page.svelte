<script lang="ts">
  import { page } from '$app/stores';
  import type { PageData } from './$types.js';
  import { getLanguageByCode } from '$lib/config/languages.js';

  export let data: PageData;

  $: currentLanguage = getLanguageByCode($page.params.lang);
</script>

<svelte:head>
  <title>{currentLanguage?.label ?? 'StudyPuck'} – Dashboard</title>
</svelte:head>

<section class="center dashboard-page stack">
  <h1 class="visually-hidden">{currentLanguage?.label ?? 'StudyPuck'} dashboard</h1>

  <div class="dashboard-widgets">
    <article class="action-card action-card--review stack">
      <p class="action-card__label">Cards Due for Review</p>

      {#if data.dashboard.reviewDueCount > 0}
        <p class="action-card__count">{data.dashboard.reviewDueCount}</p>
        <a class="action-card__cta" href={`/${$page.params.lang}/card-review`}>Review Now →</a>
      {:else}
        <p class="action-card__empty">✓ No cards due today. Come back tomorrow!</p>
      {/if}
    </article>

    <article class="action-card action-card--inbox stack">
      <p class="action-card__label">Notes in Inbox</p>

      {#if data.dashboard.inboxNoteCount > 0}
        <p class="action-card__count">{data.dashboard.inboxNoteCount}</p>
        <a class="action-card__cta" href={`/${$page.params.lang}/card-entry`}>Enter Cards →</a>
      {:else}
        <p class="action-card__empty">✓ Inbox is clear.</p>
      {/if}
    </article>
  </div>

  {#if data.dashboard.streakDays > 0}
    <p class="dashboard-streak">🔥 {data.dashboard.streakDays}-day study streak</p>
  {:else}
    <p class="dashboard-streak dashboard-streak--empty">Start your streak today</p>
  {/if}

  <nav class="quick-access" aria-label="Quick access">
    <a class="quick-access__link" href={`/${$page.params.lang}/card-entry`}>Card Entry</a>
    <a class="quick-access__link" href={`/${$page.params.lang}/card-review`}>Card Review</a>
    <a class="quick-access__link" href={`/${$page.params.lang}/translation-drills`}>Translation Drills</a>
  </nav>
</section>

<style>
  .dashboard-page {
    --center-max: 56rem;
    padding-block: var(--space-5);
    padding-inline: var(--space-5);
    --stack-space: var(--space-5);
  }

  .dashboard-widgets {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-5);
  }

  .action-card {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    min-block-size: 16rem;
    --stack-space: var(--space-4);
  }

  .action-card--review {
    border-color: var(--color-info-border);
    background: color-mix(in srgb, var(--color-info-bg) 35%, var(--color-surface));
  }

  .action-card--inbox {
    border-color: var(--color-success-border);
    background: color-mix(in srgb, var(--color-success-bg) 35%, var(--color-surface));
  }

  .action-card__label,
  .action-card__count,
  .action-card__empty,
  .dashboard-streak {
    margin: 0;
  }

  .action-card__label {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  .action-card__count {
    font-size: clamp(3rem, 10vw, 4.5rem);
    line-height: 1;
    letter-spacing: var(--tracking-heading);
  }

  .action-card__cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: fit-content;
    min-block-size: 2.75rem;
    padding-block: var(--space-3);
    padding-inline: var(--space-4);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    color: var(--color-text-primary);
    text-decoration: none;
    font-family: var(--font-ui);
    font-weight: 600;
  }

  .action-card__empty {
    color: var(--color-text-secondary);
    font-size: var(--font-size-h4);
  }

  .dashboard-streak {
    font-family: var(--font-ui);
    font-size: var(--font-size-h4);
  }

  .dashboard-streak--empty {
    color: var(--color-text-muted);
  }

  .quick-access {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
  }

  .quick-access__link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: 2.75rem;
    padding-block: var(--space-3);
    padding-inline: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    text-decoration: none;
  }

  .action-card__cta:focus-visible,
  .quick-access__link:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (max-width: 48rem) {
    .dashboard-page {
      padding-inline: var(--space-4);
    }

    .dashboard-widgets {
      grid-template-columns: 1fr;
    }

    .quick-access {
      flex-direction: column;
    }
  }
</style>
