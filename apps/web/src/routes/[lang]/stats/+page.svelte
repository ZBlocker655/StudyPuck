<script lang="ts">
  import { page } from '$app/stores';
  import { getLanguageByCode } from '$lib/config/languages.js';

  export let data: {
    statistics: import('$lib/server/statistics.js').StatisticsData;
  };

  const todayMetrics = [
    { label: 'Notes captured', key: 'notesCaptured' },
    { label: 'Draft cards created', key: 'draftCardsCreated' },
    { label: 'Notes processed', key: 'notesProcessed' },
    { label: 'Cards promoted to active', key: 'cardsPromotedToActive' },
    { label: 'Notes deferred', key: 'notesDeferred' },
    { label: 'Notes deleted', key: 'notesDeleted' },
    { label: 'Groups created', key: 'groupsCreated' },
  ] as const;

  $: currentLanguage = getLanguageByCode($page.params.lang);
</script>

<svelte:head>
  <title>Statistics – StudyPuck</title>
</svelte:head>

<section class="center stack app-screen" style="--stack-space: var(--space-5)">
  <header class="stack" style="--stack-space: var(--space-2)">
    <p class="screen-eyebrow text-muted">Analytics</p>
    <h1>Statistics</h1>
    <p>Daily activity for {currentLanguage?.label ?? 'your active language'}, starting with the Card Entry work that shipped in milestone 2.1.</p>
  </header>

  <section class="stats-section stack" style="--stack-space: var(--space-4)" aria-labelledby="card-entry-stats-title">
    <div class="stack" style="--stack-space: var(--space-1)">
      <p class="screen-eyebrow text-muted">Card Entry</p>
      <h2 id="card-entry-stats-title">Today</h2>
    </div>

    <div class="stats-grid">
      {#each todayMetrics as metric}
        <article class="stat-tile stack" style="--stack-space: var(--space-2)">
          <p class="stat-tile__label">{metric.label}</p>
          <p class="stat-tile__value">{data.statistics.cardEntryToday[metric.key]}</p>
        </article>
      {/each}
    </div>

    <div class="stack" style="--stack-space: var(--space-3)">
      <h3 class="recent-activity__title">Recent active days</h3>

      {#if data.statistics.cardEntryRecentDays.length === 0}
        <section class="empty-state">
          <p>No Card Entry activity yet for this language.</p>
        </section>
      {:else}
        <ol class="recent-activity-list stack" style="--stack-space: var(--space-2)">
          {#each data.statistics.cardEntryRecentDays as day}
            <li class="recent-activity-row">
              <div>
                <p class="recent-activity-row__label">{day.label}</p>
                <p class="recent-activity-row__date">{day.date}</p>
              </div>

              <div class="recent-activity-row__metrics">
                {#if day.notesCaptured > 0}
                  <span>{day.notesCaptured} captured</span>
                {/if}
                {#if day.draftCardsCreated > 0}
                  <span>{day.draftCardsCreated} drafts</span>
                {/if}
                {#if day.notesProcessed > 0}
                  <span>{day.notesProcessed} processed</span>
                {/if}
                {#if day.cardsPromotedToActive > 0}
                  <span>{day.cardsPromotedToActive} promoted</span>
                {/if}
                {#if day.notesDeferred > 0}
                  <span>{day.notesDeferred} deferred</span>
                {/if}
                {#if day.notesDeleted > 0}
                  <span>{day.notesDeleted} deleted</span>
                {/if}
                {#if day.groupsCreated > 0}
                  <span>{day.groupsCreated} groups</span>
                {/if}
              </div>
            </li>
          {/each}
        </ol>
      {/if}
    </div>
  </section>
</section>

<style>
  .app-screen {
    --center-max: 60rem;
    padding-inline: var(--space-5);
    padding-block: var(--space-5) calc(var(--space-8) + 4.5rem);
  }

  .screen-eyebrow {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .stats-section,
  .stat-tile,
  .recent-activity-row,
  .empty-state {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .stats-section,
  .empty-state {
    padding: var(--space-5);
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: var(--space-3);
  }

  .stat-tile {
    padding: var(--space-4);
  }

  .stat-tile__label,
  .stat-tile__value,
  .recent-activity__title,
  .recent-activity-row__label,
  .recent-activity-row__date,
  .empty-state p {
    margin: 0;
  }

  .stat-tile__label,
  .recent-activity-row__date {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  .stat-tile__value {
    font-size: clamp(1.75rem, 5vw, 2.5rem);
    line-height: 1;
  }

  .recent-activity-list {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .recent-activity-row {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: var(--space-3);
    align-items: center;
    padding: var(--space-3) var(--space-4);
  }

  .recent-activity-row__metrics {
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: var(--space-2);
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  @media (max-width: 48rem) {
    .app-screen {
      padding-inline: var(--space-4);
    }

    .recent-activity-row {
      grid-template-columns: 1fr;
    }

    .recent-activity-row__metrics {
      justify-content: flex-start;
    }
  }
</style>
