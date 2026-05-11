<script lang="ts">
  import { page } from '$app/stores';
  import { commandBar } from '$lib/stores/commandBar.js';
  import type { PageData } from './$types.js';

  export let data: PageData;

  type ReviewHomeData = NonNullable<PageData['home']>;

  const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });

  let selectedGroupIds = data.home?.selection.groupIds ?? [];
  let countMode: ReviewHomeData['selection']['countMode'] = data.home?.selection.countMode ?? 'all_due';
  let sessionLimit: number | undefined = data.home?.selection.limit ?? 10;

  $: home = data.home;
  $: currentLanguage = $page.params.lang ?? '';
  $: commandBar.setWorkspaceContext(currentLanguage || null, null);
  $: allGroups = home?.groups ?? [];
  $: selectedGroups = allGroups.filter((group) => selectedGroupIds.includes(group.groupId));
  $: selectedDueCount = selectedGroups.reduce((count, group) => count + group.dueCardCount, 0);
  $: selectedRotationCount = selectedGroups.reduce((count, group) => count + group.activeCardCount, 0);
  $: allGroupsSelected = allGroups.length > 0 && selectedGroupIds.length === allGroups.length;
  $: parsedLimit = typeof sessionLimit === 'number' && Number.isInteger(sessionLimit) ? sessionLimit : null;
  $: effectiveLimit = countMode === 'limit' && parsedLimit !== null && parsedLimit >= 1 && parsedLimit <= 100
    ? parsedLimit
    : null;
  $: startDisabled = !home
    || selectedGroupIds.length === 0
    || selectedDueCount === 0
    || (countMode === 'limit' && effectiveLimit === null);
  $: selectedNextDueIso = selectedGroups.reduce<string | null>((soonest, group) => {
    if (!group.nextDueAtIso) {
      return soonest;
    }

    if (!soonest) {
      return group.nextDueAtIso;
    }

    return new Date(group.nextDueAtIso) < new Date(soonest) ? group.nextDueAtIso : soonest;
  }, null);
  $: setupHint = getSetupHint();
  $: commandBar.setSurfaceContext(
    home
      ? {
          surface: 'card_review_setup',
          selection: {
            groupIds: selectedGroupIds,
            limit: effectiveLimit,
            countMode,
          },
        }
      : null,
  );
  $: commandBar.setTargetHint(null, null);

  function formatRelativeDateLabel(value: string | null): string {
    if (!value) {
      return 'Never';
    }

    const target = new Date(value);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const targetDay = new Date(target.getFullYear(), target.getMonth(), target.getDate());
    const differenceInDays = Math.round((today.getTime() - targetDay.getTime()) / 86_400_000);

    if (differenceInDays <= 0) {
      return 'Today';
    }

    if (differenceInDays === 1) {
      return 'Yesterday';
    }

    return `${differenceInDays} days ago`;
  }

  function formatShortDate(value: string | null): string {
    return value ? shortDateFormatter.format(new Date(value)) : 'No date available';
  }

  function formatCardLabel(count: number, noun = 'card'): string {
    return `${count} ${noun}${count === 1 ? '' : 's'}`;
  }

  function selectAllGroups() {
    selectedGroupIds = allGroups.map((group) => group.groupId);
  }

  function getSetupHint(): string | null {
    if (!home) {
      return null;
    }

    if (selectedGroupIds.length === 0) {
      return 'Select one or more groups to build a Card Review session.';
    }

    if (countMode === 'limit' && effectiveLimit === null) {
      if (parsedLimit !== null && parsedLimit > 100) {
        return 'Use a session size of 100 cards or fewer.';
      }

      return 'Enter a session size of at least 1 card.';
    }

    if (selectedDueCount > 0) {
      return `Ready to review ${formatCardLabel(selectedDueCount, 'due card')} across ${formatCardLabel(selectedGroups.length, 'group')}.`;
    }

    if (selectedNextDueIso) {
      return `No cards are due in the selected groups. Next due: ${formatShortDate(selectedNextDueIso)}.`;
    }

    return 'No cards are due in the selected groups yet.';
  }
</script>

<svelte:head>
  <title>Card Review – StudyPuck</title>
</svelte:head>

{#if data.loadError}
  <section class="review-home stack" style="--stack-space: var(--space-5)">
    <header class="review-home__header stack" style="--stack-space: var(--space-2)">
      <p class="review-home__eyebrow">Setup</p>
      <h1>Card Review</h1>
      <p class="review-home__copy">{data.loadError}</p>
    </header>
  </section>
{:else if home}
  <section class="review-home stack" style="--stack-space: var(--space-5)">
    <header class="review-home__header stack" style="--stack-space: var(--space-2)">
      <p class="review-home__eyebrow">Setup</p>
      <h1>Card Review</h1>
      <p class="review-home__copy">Select the groups you want to review, then launch a due-card session from the current setup.</p>
    </header>

    <section class="review-stats cluster" aria-label="Card Review quick stats">
      <div class="review-stat stack" style="--stack-space: var(--space-1)">
        <span class="review-stat__label">Streak</span>
        <span class="review-stat__value">
          {#if home.stats.currentStreakDays > 0}
            🔥 {home.stats.currentStreakDays}-day streak
          {:else}
            Start your streak
          {/if}
        </span>
      </div>

      <div class="review-stat stack" style="--stack-space: var(--space-1)">
        <span class="review-stat__label">In rotation</span>
        <span class="review-stat__value">{formatCardLabel(home.stats.cardsInRotation)}</span>
      </div>

      <div class="review-stat stack" style="--stack-space: var(--space-1)">
        <span class="review-stat__label">Due now</span>
        <span class="review-stat__value">{formatCardLabel(home.stats.dueNowCount)}</span>
      </div>

      <div class="review-stat stack" style="--stack-space: var(--space-1)">
        <span class="review-stat__label">Last reviewed</span>
        <span class="review-stat__value">{formatRelativeDateLabel(home.stats.lastReviewedAtIso)}</span>
      </div>
    </section>

    <form class="review-setup stack" style="--stack-space: var(--space-4)" method="GET" action={`/${currentLanguage}/card-review/session`}>
      <section class="review-panel stack" style="--stack-space: var(--space-3)" aria-labelledby="review-groups-title">
        <div class="review-panel__header cluster">
          <div class="stack" style="--stack-space: var(--space-1)">
            <h2 id="review-groups-title">Select groups to review</h2>
            <p class="review-panel__copy">
              {formatCardLabel(selectedRotationCount)} in rotation · {formatCardLabel(selectedDueCount, 'due card')} in the current selection
            </p>
          </div>

          <button
            type="button"
            class="review-panel__link"
            onclick={selectAllGroups}
            disabled={allGroupsSelected}
          >
            Select all
          </button>
        </div>

        {#if allGroups.length === 0}
          <div class="review-state review-state--empty">
            <h3>No review groups yet</h3>
            <p>Add cards to one or more groups to start building Card Review sessions.</p>
          </div>
        {:else}
          <div class="review-group-list stack" style="--stack-space: 0">
            {#each allGroups as group}
              <label class="review-group-row">
                <span class="review-group-row__check">
                  <input bind:group={selectedGroupIds} type="checkbox" name="group" value={group.groupId} />
                </span>

                <span class="review-group-row__copy stack" style="--stack-space: var(--space-1)">
                  <span class="review-group-row__name">{group.groupName}</span>
                  <span class="review-group-row__meta">{formatCardLabel(group.activeCardCount)} in rotation</span>
                </span>

                <span class="review-group-row__counts">{formatCardLabel(group.dueCardCount, 'due card')} today</span>
              </label>
            {/each}
          </div>
        {/if}
      </section>

      <section class="review-panel stack" style="--stack-space: var(--space-3)" aria-labelledby="review-count-title">
        <div class="stack" style="--stack-space: var(--space-1)">
          <h2 id="review-count-title">Card count</h2>
          <p class="review-panel__copy">Choose the full due queue or trim this pass to a smaller focused session.</p>
        </div>

        <label class="review-option">
          <input bind:group={countMode} type="radio" name="countMode" value="all_due" />

          <span class="review-option__body stack" style="--stack-space: var(--space-1)">
            <span class="review-option__title">All due cards</span>
            <span class="review-option__meta">{formatCardLabel(selectedDueCount, 'due card')} in the selected groups</span>
          </span>
        </label>

        <label class="review-option review-option--limit">
          <input bind:group={countMode} type="radio" name="countMode" value="limit" />

          <span class="review-option__body stack" style="--stack-space: var(--space-1)">
            <span class="review-option__title">Limit to N cards</span>
            <span class="review-option__meta">Use a smaller review pass without changing the selected groups.</span>
          </span>

          <input
            bind:value={sessionLimit}
            class="review-option__input"
            type="number"
            aria-label="Session size"
            name="limit"
            min="1"
            max={Math.max(1, Math.min(selectedDueCount || 1, 100))}
            disabled={countMode !== 'limit'}
          />
        </label>

        <div class="review-setup__actions stack" style="--stack-space: var(--space-3)">
          <button class="review-start-button" type="submit" disabled={startDisabled}>Start Session</button>

          {#if setupHint}
            <p class="review-setup__hint" aria-live="polite">{setupHint}</p>
          {/if}

          <p class="review-setup__supporting">
            Reviewed today: {formatCardLabel(home.stats.reviewedTodayCount)}
          </p>
        </div>
      </section>
    </form>
  </section>
{/if}

<style>
  .review-home {
    padding: calc(var(--shell-header-height) + var(--space-5)) var(--space-4) calc(var(--space-7) + 4.5rem);
  }

  .review-home__eyebrow,
  .review-stat__label,
  .review-group-row__meta,
  .review-panel__copy,
  .review-option__meta,
  .review-setup__hint,
  .review-setup__supporting {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  .review-home__eyebrow,
  .review-stat__label {
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .review-home__header h1,
  .review-home__copy,
  .review-stat__value,
  .review-panel__header h2,
  .review-state h3,
  .review-state p,
  .review-group-row__name,
  .review-group-row__counts,
  .review-option__title,
  .review-setup__hint,
  .review-setup__supporting {
    margin: 0;
  }

  .review-home__copy {
    max-inline-size: 44rem;
  }

  .review-stats {
    gap: var(--space-3);
  }

  .review-stat,
  .review-panel,
  .review-state {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .review-stat {
    flex: 1 1 11rem;
    min-inline-size: min(100%, 11rem);
    padding: var(--space-3) var(--space-4);
    background: color-mix(in srgb, var(--color-info-bg) 30%, var(--color-surface));
    border-color: var(--color-info-border);
  }

  .review-stat__value {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    font-weight: 600;
  }

  .review-panel {
    padding: var(--space-4);
  }

  .review-panel__header {
    justify-content: space-between;
    gap: var(--space-3);
  }

  .review-panel__link {
    border: 0;
    padding: 0;
    background: transparent;
    color: var(--color-primary);
    cursor: pointer;
  }

  .review-panel__link:disabled {
    color: var(--color-text-disabled);
    cursor: default;
  }

  .review-state {
    padding: var(--space-4);
  }

  .review-group-list {
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    overflow: clip;
  }

  .review-group-row {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    gap: var(--space-3);
    align-items: center;
    min-block-size: 3.5rem;
    padding: var(--space-3) var(--space-4);
    cursor: pointer;
  }

  .review-group-row:nth-child(even) {
    background: color-mix(in srgb, var(--color-surface-subtle) 55%, var(--color-surface));
  }

  .review-group-row__check input {
    inline-size: 1rem;
    block-size: 1rem;
    accent-color: var(--color-primary);
  }

  .review-group-row__copy {
    min-inline-size: 0;
  }

  .review-group-row__name {
    font-family: var(--font-ui);
    font-weight: 600;
  }

  .review-group-row__counts {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    text-align: end;
  }

  .review-option {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-3);
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  .review-option--limit {
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .review-option input[type='radio'] {
    margin: 0;
    accent-color: var(--color-primary);
  }

  .review-option__body {
    min-inline-size: 0;
  }

  .review-option__title {
    font-family: var(--font-ui);
    font-weight: 600;
  }

  .review-option__input,
  .review-start-button {
    min-block-size: 2.75rem;
    border-radius: var(--radius-md);
    font-family: var(--font-ui);
  }

  .review-option__input {
    inline-size: 5.5rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--color-border);
    background: var(--color-surface-raised);
    color: var(--color-text-primary);
  }

  .review-setup__actions {
    align-items: stretch;
  }

  .review-start-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 100%;
    padding-inline: var(--space-4);
    border: 1px solid var(--color-primary);
    background: var(--color-primary);
    color: var(--color-text-inverse);
    font-weight: 600;
    text-decoration: none;
  }

  .review-start-button:disabled {
    border-color: var(--color-border);
    background: var(--color-surface-subtle);
    color: var(--color-text-disabled);
    cursor: not-allowed;
  }
  @media (max-width: 48rem) {
    .review-group-row,
    .review-option--limit {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .review-group-row__counts,
    .review-option__input {
      grid-column: 2;
      justify-self: start;
      text-align: start;
    }

    .review-panel__header {
      align-items: flex-start;
    }
  }
</style>
