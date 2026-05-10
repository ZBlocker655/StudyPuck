<script lang="ts">
  import { page } from '$app/stores';
  import type { PageData } from './$types.js';

  export let data: PageData;

  type ReviewSessionData = NonNullable<PageData['reviewSession']>;

  const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });

  $: reviewSession = data.reviewSession;
  $: currentLanguage = $page.params.lang ?? '';
  $: firstItem = reviewSession?.items[0] ?? null;
  $: queuePreview = reviewSession?.items.slice(1, 5) ?? [];
  $: homeHref = buildHomeHref();

  function formatCardLabel(count: number, noun = 'card'): string {
    return `${count} ${noun}${count === 1 ? '' : 's'}`;
  }

  function formatShortDate(value: string | null): string {
    return value ? shortDateFormatter.format(new Date(value)) : 'Due now';
  }

  function buildHomeHref(): string {
    if (!reviewSession) {
      return `/${currentLanguage}/card-review`;
    }

    const params = new URLSearchParams();

    for (const groupId of reviewSession.selection.groupIds) {
      params.append('group', groupId);
    }

    if (reviewSession.selection.limit !== null) {
      params.set('limit', String(reviewSession.selection.limit));
    }

    const query = params.toString();
    return `/${currentLanguage}/card-review${query ? `?${query}` : ''}`;
  }
</script>

<svelte:head>
  <title>Card Review Session – StudyPuck</title>
</svelte:head>

{#if data.loadError}
  <section class="review-session stack" style="--stack-space: var(--space-5)">
    <header class="review-session__header stack" style="--stack-space: var(--space-2)">
      <p class="review-session__eyebrow">Session</p>
      <h1>Card Review</h1>
      <p class="review-session__copy">{data.loadError}</p>
    </header>
  </section>
{:else if reviewSession}
  <section class="review-session stack" style="--stack-space: var(--space-5)">
    <header class="review-session__header stack" style="--stack-space: var(--space-2)">
      <p class="review-session__eyebrow">Session</p>
      <div class="review-session__title cluster">
        <h1>Card Review</h1>
        <a class="review-session__back-link" href={homeHref}>Back to setup</a>
      </div>
      <p class="review-session__copy">
        {#if reviewSession.totalCount > 0}
          Session ready with {formatCardLabel(reviewSession.totalCount)} from {formatCardLabel(reviewSession.selection.groupIds.length, 'group')}.
        {:else}
          No due cards were loaded for this selection.
        {/if}
      </p>
    </header>

    <section class="review-session__summary cluster" aria-label="Session summary">
      <div class="review-session__summary-item stack" style="--stack-space: var(--space-1)">
        <span class="review-session__summary-label">Groups</span>
        <span class="review-session__summary-value">{formatCardLabel(reviewSession.selection.groupIds.length, 'group')}</span>
      </div>

      <div class="review-session__summary-item stack" style="--stack-space: var(--space-1)">
        <span class="review-session__summary-label">Mode</span>
        <span class="review-session__summary-value">
          {#if reviewSession.selection.limit === null}
            All due cards
          {:else}
            Limit {reviewSession.selection.limit}
          {/if}
        </span>
      </div>

      <div class="review-session__summary-item stack" style="--stack-space: var(--space-1)">
        <span class="review-session__summary-label">Loaded</span>
        <span class="review-session__summary-value">{formatCardLabel(reviewSession.totalCount)}</span>
      </div>
    </section>

    {#if reviewSession.totalCount === 0}
      <section class="review-state review-state--empty stack" style="--stack-space: var(--space-2)">
        <h2>Nothing due right now</h2>
        <p>Return to the setup screen to adjust the selected groups or wait for the next due cards to arrive.</p>
      </section>
    {:else if firstItem}
      <article class="review-card stack" style="--stack-space: var(--space-4)">
        <div class="review-card__header cluster">
          <div class="stack" style="--stack-space: var(--space-1)">
            <p class="review-card__eyebrow">First queued card</p>
            <h2>{firstItem.content}</h2>
          </div>
          <p class="review-card__due">Due {formatShortDate(firstItem.nextDueAtIso)}</p>
        </div>

        {#if firstItem.meaning}
          <p class="review-card__meaning">{firstItem.meaning}</p>
        {/if}

        {#if firstItem.examples.length > 0}
          <div class="stack" style="--stack-space: var(--space-2)">
            <p class="review-card__section-label">Examples</p>
            <ol class="review-card__examples stack" style="--stack-space: var(--space-2)">
              {#each firstItem.examples as example}
                <li>{example}</li>
              {/each}
            </ol>
          </div>
        {/if}

        {#if firstItem.mnemonics.length > 0}
          <div class="review-card__mnemonic stack" style="--stack-space: var(--space-2)">
            <p class="review-card__section-label">Mnemonic</p>
            <p>{firstItem.mnemonics[0]}</p>
          </div>
        {/if}

        {#if firstItem.groups.length > 0}
          <div class="review-card__groups cluster" aria-label="Card groups">
            {#each firstItem.groups as group}
              <span class="review-card__group-chip">{group.groupName}</span>
            {/each}
          </div>
        {/if}
      </article>

      {#if queuePreview.length > 0}
        <section class="review-queue stack" style="--stack-space: var(--space-3)" aria-labelledby="queue-preview-title">
          <div class="stack" style="--stack-space: var(--space-1)">
            <h2 id="queue-preview-title">Queue preview</h2>
            <p class="review-queue__copy">The next few cards queued after the opener.</p>
          </div>

          <ol class="review-queue__list stack" style="--stack-space: var(--space-2)">
            {#each queuePreview as item}
              <li class="review-queue__item">
                <div class="stack" style="--stack-space: var(--space-1)">
                  <span class="review-queue__content">{item.content}</span>
                  {#if item.meaning}
                    <span class="review-queue__meaning">{item.meaning}</span>
                  {/if}
                </div>
                <span class="review-queue__meta">{formatShortDate(item.nextDueAtIso)}</span>
              </li>
            {/each}
          </ol>

          {#if reviewSession.totalCount > queuePreview.length + 1}
            <p class="review-queue__remaining">
              +{reviewSession.totalCount - queuePreview.length - 1} more queued
            </p>
          {/if}
        </section>
      {/if}
    {/if}
  </section>
{/if}

<style>
  .review-session {
    padding: calc(var(--shell-header-height) + var(--space-5)) var(--space-4) calc(var(--space-7) + 4.5rem);
  }

  .review-session__eyebrow,
  .review-session__summary-label,
  .review-card__eyebrow,
  .review-card__section-label,
  .review-queue__copy,
  .review-queue__meaning,
  .review-queue__remaining,
  .review-card__due {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  .review-session__eyebrow,
  .review-session__summary-label,
  .review-card__eyebrow,
  .review-card__section-label {
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .review-session__title,
  .review-card__header,
  .review-queue__item {
    justify-content: space-between;
    gap: var(--space-3);
  }

  .review-session__header h1,
  .review-session__copy,
  .review-session__summary-value,
  .review-state h2,
  .review-state p,
  .review-card__header h2,
  .review-card__meaning,
  .review-card__mnemonic p,
  .review-queue__content,
  .review-queue__remaining {
    margin: 0;
  }

  .review-session__back-link {
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    text-decoration: none;
  }

  .review-session__summary {
    gap: var(--space-3);
  }

  .review-session__summary-item,
  .review-card,
  .review-queue,
  .review-state {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .review-session__summary-item {
    flex: 1 1 10rem;
    min-inline-size: min(100%, 10rem);
    padding: var(--space-3) var(--space-4);
  }

  .review-session__summary-value,
  .review-queue__content {
    font-family: var(--font-ui);
    font-weight: 600;
  }

  .review-card,
  .review-queue,
  .review-state {
    padding: var(--space-4);
  }

  .review-card {
    background: color-mix(in srgb, var(--color-info-bg) 24%, var(--color-surface));
    border-color: var(--color-info-border);
  }

  .review-card__header h2 {
    font-size: clamp(2rem, 8vw, 3rem);
    line-height: var(--leading-tight);
  }

  .review-card__meaning {
    font-size: var(--font-size-h4);
  }

  .review-card__examples {
    padding-inline-start: 1.25rem;
    margin: 0;
  }

  .review-card__mnemonic {
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background: var(--color-warning-bg);
    border: 1px solid var(--color-warning-border);
  }

  .review-card__groups {
    gap: var(--space-2);
  }

  .review-card__group-chip {
    display: inline-flex;
    align-items: center;
    min-block-size: 1.875rem;
    padding-inline: var(--space-3);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
  }

  .review-queue__list {
    padding: 0;
    margin: 0;
    list-style: none;
  }

  .review-queue__item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
  }

  @media (max-width: 48rem) {
    .review-session__title,
    .review-card__header {
      flex-direction: column;
      align-items: flex-start;
    }

    .review-queue__item {
      grid-template-columns: 1fr;
      justify-items: start;
    }
  }
</style>
