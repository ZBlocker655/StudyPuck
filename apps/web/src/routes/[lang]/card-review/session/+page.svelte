<script lang="ts">
  import { page } from '$app/stores';
  import { get } from 'svelte/store';
  import { tick } from 'svelte';
  import ActiveCardDrawer from '$lib/components/cards/ActiveCardDrawer.svelte';
  import { commandBar } from '$lib/stores/commandBar.js';
  import { cardReviewSessionActions, type CardReviewSessionActionRequest } from '$lib/stores/cardReviewSessionActions.js';
  import type { CardLibraryCardDetailData, CardLibraryGroupData } from '$lib/server/cards.js';
  import type { PageData } from './$types.js';

  export let data: PageData;

  type ReviewSessionData = NonNullable<PageData['reviewSession']>;
  type SessionItem = ReviewSessionData['items'][number];
  type SessionActionResult = {
    action: 'rate' | 'pin' | 'snooze' | 'disable';
    cardId: string;
    rating: 'easy' | 'medium' | 'hard' | null;
    message: string;
  };
  type SessionActionResponse = Partial<SessionActionResult> & {
    message?: string;
  };

  const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  });

  let queueItems: SessionItem[] = [];
  let initialTotalCount = 0;
  let sessionAvailableGroups: CardLibraryGroupData[] = [];
  let ratingCounts = {
    easy: 0,
    medium: 0,
    hard: 0,
  };
  let secondaryActionCounts = {
    pin: 0,
    snooze: 0,
    disable: 0,
  };
  let startedAtMs = Date.now();
  let completionAtMs: number | null = null;
  let endedEarly = false;
  let actionPending = false;
  let actionError: string | null = null;
  let actionMessage = '';
  let drawerCardId: string | null = null;
  let endSessionOpen = false;
  let endSessionDialog: HTMLElement | null = null;
  let endSessionButton: HTMLButtonElement | null = null;
  let sessionOutcomeHeading: HTMLHeadingElement | null = null;
  let previousReviewSession = data.reviewSession;
  let lastHandledSessionActionId = get(cardReviewSessionActions)?.actionId ?? 0;

  $: reviewSession = data.reviewSession;
  $: currentLanguage = $page.params.lang ?? '';
  $: commandBar.setWorkspaceContext(currentLanguage || null, null);
  $: currentItem = queueItems[0] ?? null;
  $: completedCount = initialTotalCount - queueItems.length;
  $: currentCardNumber = currentItem ? completedCount + 1 : initialTotalCount;
  $: reviewedCount = ratingCounts.easy + ratingCounts.medium + ratingCounts.hard;
  $: hasPinnedCards = secondaryActionCounts.pin > 0;
  $: sessionComplete = Boolean(reviewSession) && initialTotalCount > 0 && (queueItems.length === 0 || endedEarly);
  $: homeHref = buildHomeHref();
  $: translationDrillsHref = `/${currentLanguage}/translation-drills`;
  $: rootHomeHref = currentLanguage ? `/${currentLanguage}` : '/';
  $: drawerIndex = drawerCardId ? queueItems.findIndex((item) => item.cardId === drawerCardId) : -1;
  $: drawerItem = drawerIndex >= 0 ? queueItems[drawerIndex] : null;
  $: drawerCard = drawerItem ? toDrawerCard(drawerItem) : null;
  $: queuePreview = queueItems.slice(1, 6);
  $: completionDurationLabel = formatDuration((completionAtMs ?? Date.now()) - startedAtMs);
  $: commandBar.setSurfaceContext(
    currentItem && reviewSession
      ? {
          surface: 'card_review_session',
          selection: reviewSession.selection,
          queueCardIds: queueItems.map((item) => item.cardId),
          currentCardId: currentItem.cardId,
          initialTotalCount,
          completedCount,
        }
      : null,
  );
  $: commandBar.setTargetHint(currentItem?.cardId ?? null, null);

  $: if (reviewSession !== previousReviewSession) {
    resetSessionState(reviewSession);
    previousReviewSession = reviewSession;
  }

  $: if ($cardReviewSessionActions && $cardReviewSessionActions.actionId !== lastHandledSessionActionId) {
    lastHandledSessionActionId = $cardReviewSessionActions.actionId;
    void handleRequestedSessionAction($cardReviewSessionActions);
  }

  function resetSessionState(session: ReviewSessionData | null) {
    queueItems = session ? structuredClone(session.items) : [];
    initialTotalCount = session?.totalCount ?? 0;
    sessionAvailableGroups = session ? structuredClone(session.availableGroups) : [];
    ratingCounts = {
      easy: 0,
      medium: 0,
      hard: 0,
    };
    secondaryActionCounts = {
      pin: 0,
      snooze: 0,
      disable: 0,
    };
    startedAtMs = Date.now();
    completionAtMs = null;
    endedEarly = false;
    actionPending = false;
    actionError = null;
    actionMessage = '';
    drawerCardId = null;
    endSessionOpen = false;
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

  function formatCardLabel(count: number, noun = 'card'): string {
    return `${count} ${noun}${count === 1 ? '' : 's'}`;
  }

  function formatShortDate(value: string | null): string {
    return value ? shortDateFormatter.format(new Date(value)) : 'Due now';
  }

  function formatDuration(durationMs: number): string {
    const totalSeconds = Math.max(0, Math.round(durationMs / 1_000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes === 0) {
      return `${seconds}s`;
    }

    return `${minutes}m ${seconds}s`;
  }

  function toDrawerCard(item: SessionItem): CardLibraryCardDetailData {
    return {
      cardId: item.cardId,
      content: item.content,
      meaning: item.meaning,
      cardType: item.cardType,
      examples: item.examples,
      mnemonics: item.mnemonics,
      llmInstructions: item.llmInstructions,
      updatedAtIso: item.updatedAtIso,
      groups: item.groups,
    };
  }

  function updateCounts(action: 'rate' | 'pin' | 'snooze' | 'disable', rating: 'easy' | 'medium' | 'hard' | null) {
    if (action === 'rate' && rating) {
      ratingCounts = {
        ...ratingCounts,
        [rating]: ratingCounts[rating] + 1,
      };
      return;
    }

    if (action === 'pin') {
      secondaryActionCounts = {
        ...secondaryActionCounts,
        pin: secondaryActionCounts.pin + 1,
      };
      return;
    }

    if (action === 'snooze') {
      secondaryActionCounts = {
        ...secondaryActionCounts,
        snooze: secondaryActionCounts.snooze + 1,
      };
      return;
    }

    secondaryActionCounts = {
      ...secondaryActionCounts,
      disable: secondaryActionCounts.disable + 1,
    };
  }

  function updateDrawerAfterRemoval(cardId: string) {
    if (!drawerCardId) {
      return;
    }

    if (drawerCardId !== cardId) {
      return;
    }

    const nextQueue = queueItems.filter((item) => item.cardId !== cardId);
    const nextIndex = Math.min(drawerIndex, nextQueue.length - 1);
    drawerCardId = nextIndex >= 0 ? nextQueue[nextIndex]?.cardId ?? null : null;
  }

  function removeCardFromQueue(cardId: string) {
    updateDrawerAfterRemoval(cardId);
    queueItems = queueItems.filter((item) => item.cardId !== cardId);

    if (queueItems.length === 0) {
      completionAtMs = Date.now();
      void tick().then(() => sessionOutcomeHeading?.focus());
    }
  }

  function openDrawer(cardId: string) {
    drawerCardId = cardId;
    actionError = null;
  }

  function advanceToNextCard(cardId: string) {
    const currentIndex = queueItems.findIndex((item) => item.cardId === cardId);

    if (currentIndex <= 0) {
      if (queueItems.length <= 1) {
        return 'There is no next card in this session.';
      }

      const [firstItem, ...remainingItems] = queueItems;

      if (!firstItem) {
        return 'There is no next card in this session.';
      }

      queueItems = [...remainingItems, firstItem];

      if (drawerCardId === cardId) {
        drawerCardId = queueItems[0]?.cardId ?? null;
      }

      actionError = null;
      actionMessage = 'Moved to the next card.';
      return actionMessage;
    }

    const [selectedItem] = queueItems.splice(currentIndex, 1);

    if (!selectedItem) {
      return 'There is no next card in this session.';
    }

    queueItems = [selectedItem, ...queueItems];
    drawerCardId = selectedItem.cardId;
    actionError = null;
    actionMessage = 'Moved to the next card.';
    return actionMessage;
  }

  function handleDrawerUpdated(event: CustomEvent<{ card: CardLibraryCardDetailData; availableGroups: CardLibraryGroupData[] }>) {
    sessionAvailableGroups = event.detail.availableGroups;
    queueItems = queueItems.map((item) => item.cardId === event.detail.card.cardId
      ? {
        ...item,
        content: event.detail.card.content,
        meaning: event.detail.card.meaning,
        cardType: event.detail.card.cardType,
        examples: event.detail.card.examples,
        mnemonics: event.detail.card.mnemonics,
        llmInstructions: event.detail.card.llmInstructions,
        updatedAtIso: event.detail.card.updatedAtIso,
        groups: event.detail.card.groups,
      }
      : item);
  }

  function handleDrawerDeleted(event: CustomEvent<{ cardId: string }>) {
    removeCardFromQueue(event.detail.cardId);
    actionMessage = 'Card deleted.';
    actionError = null;
  }

  function navigateDrawer(direction: 'previous' | 'next') {
    if (!drawerCardId || drawerIndex < 0) {
      return;
    }

    const nextIndex = direction === 'previous' ? drawerIndex - 1 : drawerIndex + 1;
    drawerCardId = queueItems[nextIndex]?.cardId ?? drawerCardId;
  }

  async function postAction(body: Record<string, unknown>): Promise<SessionActionResult> {
    const response = await fetch(`/${currentLanguage}/card-review/session/actions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const payload = (await response.json().catch(() => null)) as SessionActionResponse | null;

    if (!response.ok || !payload?.cardId || !payload.action || typeof payload.message !== 'string') {
      throw new Error(payload?.message ?? 'The review action could not be completed right now.');
    }

    return {
      action: payload.action,
      cardId: payload.cardId,
      rating: payload.rating ?? null,
      message: payload.message,
    };
  }

  async function applySessionAction(
    body: { action: 'rate'; cardId: string; rating: 'easy' | 'medium' | 'hard' } | { action: 'pin' | 'snooze' | 'disable'; cardId: string },
  ): Promise<string> {
    if (!currentItem || actionPending) {
      throw new Error('The review action could not be completed right now.');
    }

    actionPending = true;
    actionError = null;
    actionMessage = '';
    endSessionOpen = false;

    try {
      const result = await postAction(body);
      updateCounts(result.action, result.rating ?? null);
      removeCardFromQueue(result.cardId);
      actionMessage = result.message ?? 'Review action saved.';
      actionError = null;
      return actionMessage;
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'The review action could not be completed right now.';
      throw error instanceof Error ? error : new Error(actionError);
    } finally {
      actionPending = false;
    }
  }

  async function handleRequestedSessionAction(actionRequest: CardReviewSessionActionRequest) {
    try {
      if (actionRequest.action === 'next') {
        actionRequest.resolve(advanceToNextCard(actionRequest.cardId));
        return;
      }

      const message = await applySessionAction({
        action: actionRequest.action,
        cardId: actionRequest.cardId,
      });
      actionRequest.resolve(message);
    } catch (error) {
      const requestError = error instanceof Error ? error : new Error('The review action could not be completed right now.');
      actionRequest.reject(requestError);
      commandBar.pushAssistantMessage(requestError.message);
    }
  }

  function getFocusableElements(container: HTMLElement | null) {
    return container
      ? Array.from(
        container.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled])'),
      )
      : [];
  }

  async function openEndSessionDialog() {
    if (!currentItem || actionPending) {
      return;
    }

    endSessionOpen = true;
    await tick();
    getFocusableElements(endSessionDialog)[0]?.focus();
  }

  function closeEndSessionDialog() {
    endSessionOpen = false;
    void tick().then(() => endSessionButton?.focus());
  }

  function completeSessionEarly() {
    endSessionOpen = false;
    endedEarly = true;
    completionAtMs = Date.now();
    drawerCardId = null;
    void tick().then(() => sessionOutcomeHeading?.focus());
  }

  function handleEndSessionDialogKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !endSessionOpen) {
      return;
    }

    const focusableElements = getFocusableElements(endSessionDialog);

    if (focusableElements.length === 0) {
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement?.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement?.focus();
    }
  }

  function isTypingTarget(target: EventTarget | null) {
    return target instanceof HTMLElement && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.defaultPrevented) {
      return;
    }

    if (event.key === 'Escape') {
      if (endSessionOpen) {
        event.preventDefault();
        closeEndSessionDialog();
      }

      return;
    }

    if (!currentItem || actionPending || sessionComplete || drawerCardId || isTypingTarget(event.target)) {
      return;
    }

    if (event.key === '1') {
      event.preventDefault();
      void applySessionAction({ action: 'rate', cardId: currentItem.cardId, rating: 'easy' });
      return;
    }

    if (event.key === '2') {
      event.preventDefault();
      void applySessionAction({ action: 'rate', cardId: currentItem.cardId, rating: 'medium' });
      return;
    }

    if (event.key === '3') {
      event.preventDefault();
      void applySessionAction({ action: 'rate', cardId: currentItem.cardId, rating: 'hard' });
      return;
    }

    if (event.key === 'p' || event.key === 'P') {
      event.preventDefault();
      void applySessionAction({ action: 'pin', cardId: currentItem.cardId });
      return;
    }

    if (event.key === 's' || event.key === 'S') {
      event.preventDefault();
      void applySessionAction({ action: 'snooze', cardId: currentItem.cardId });
      return;
    }

    if (event.key === 'd' || event.key === 'D') {
      event.preventDefault();
      void applySessionAction({ action: 'disable', cardId: currentItem.cardId });
    }
  }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

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
    {#if initialTotalCount === 0}
      <header class="review-session__header stack" style="--stack-space: var(--space-2)">
        <p class="review-session__eyebrow">Session</p>
        <div class="review-session__title cluster">
          <h1>Card Review</h1>
          <a class="review-session__back-link" href={homeHref}>Back to setup</a>
        </div>
        <p class="review-session__copy">No due cards were loaded for this selection.</p>
      </header>

      <section class="review-state review-state--empty stack" style="--stack-space: var(--space-2)">
        <h2>Nothing due right now</h2>
        <p>Return to setup and adjust the selected groups, or come back when more cards are due.</p>
      </section>
    {:else if sessionComplete}
      <header class="review-session__header stack" style="--stack-space: var(--space-2)">
        <p class="review-session__eyebrow">Session</p>
        <h1 bind:this={sessionOutcomeHeading} tabindex="-1">{endedEarly ? 'Session ended' : 'Session complete'}</h1>
        <p class="review-session__copy">
          {#if endedEarly}
            You stopped with {formatCardLabel(queueItems.length)} remaining.
          {:else}
            You made it through every card in this review queue.
          {/if}
        </p>
      </header>

      <section class="review-complete stack" style="--stack-space: var(--space-4)">
        <div class="review-complete__stats cluster" aria-label="Session summary">
          <div class="review-complete__stat stack" style="--stack-space: var(--space-1)">
            <span class="review-complete__label">Cards reviewed</span>
            <span class="review-complete__value">{reviewedCount}</span>
          </div>
          <div class="review-complete__stat stack" style="--stack-space: var(--space-1)">
            <span class="review-complete__label">Time taken</span>
            <span class="review-complete__value">{completionDurationLabel}</span>
          </div>
          <div class="review-complete__stat stack" style="--stack-space: var(--space-1)">
            <span class="review-complete__label">Actions</span>
            <span class="review-complete__value">{completedCount}</span>
          </div>
        </div>

        <div class="review-complete__breakdown cluster" aria-label="Rating breakdown">
          <span class="review-complete__pill review-complete__pill--easy">Easy {ratingCounts.easy}</span>
          <span class="review-complete__pill review-complete__pill--medium">Medium {ratingCounts.medium}</span>
          <span class="review-complete__pill review-complete__pill--hard">Hard {ratingCounts.hard}</span>
        </div>

        {#if secondaryActionCounts.pin > 0 || secondaryActionCounts.snooze > 0 || secondaryActionCounts.disable > 0}
          <p class="review-complete__meta">
            Pinned {secondaryActionCounts.pin} • Snoozed {secondaryActionCounts.snooze} • Disabled {secondaryActionCounts.disable}
          </p>
        {/if}

        <div class="review-complete__actions stack" style="--stack-space: var(--space-3)">
          <a class="review-action-button review-action-button--outline" href={homeHref}>Review more</a>
          <a
            class={`review-action-button ${hasPinnedCards ? 'review-action-button--primary' : 'review-action-button--outline'}`}
            href={translationDrillsHref}
          >
            Go to Translation Drills →
          </a>
          <a class="review-complete__home-link" href={rootHomeHref}>Back to home</a>
        </div>
      </section>
    {:else if currentItem}
      <header class="review-session__header stack" style="--stack-space: var(--space-2)">
        <p class="review-session__eyebrow">Session</p>
        <div class="review-session__title cluster">
          <h1>Card Review</h1>
          <div class="review-session__header-actions cluster">
            <p class="review-session__counter">Card {currentCardNumber} of {initialTotalCount}</p>
            <button
              bind:this={endSessionButton}
              type="button"
              class="review-session__end-button"
              on:click={() => void openEndSessionDialog()}
            >
              End session
            </button>
          </div>
        </div>
        <p class="review-session__copy">
          Reviewing {formatCardLabel(reviewSession.selection.groupIds.length, 'group')}.
          {#if reviewSession.selection.limit === null}
            All due cards are included.
          {:else}
            Session limit: {reviewSession.selection.limit}.
          {/if}
        </p>
      </header>

      <section class="review-session__summary cluster" aria-label="Session progress">
        <div class="review-session__summary-item stack" style="--stack-space: var(--space-1)">
          <span class="review-session__summary-label">Completed</span>
          <span class="review-session__summary-value">{completedCount}</span>
        </div>
        <div class="review-session__summary-item stack" style="--stack-space: var(--space-1)">
          <span class="review-session__summary-label">Remaining</span>
          <span class="review-session__summary-value">{queueItems.length}</span>
        </div>
        <div class="review-session__summary-item stack" style="--stack-space: var(--space-1)">
          <span class="review-session__summary-label">Reviewed</span>
          <span class="review-session__summary-value">{reviewedCount}</span>
        </div>
      </section>

      {#if actionError || actionMessage}
        <p class={`review-session__status ${actionError ? 'review-session__status--error' : ''}`} aria-live="polite">
          {actionError ?? actionMessage}
        </p>
      {/if}

      <article class="review-card stack" style="--stack-space: var(--space-4)">
        <div class="review-card__header cluster">
          <div class="stack" style="--stack-space: var(--space-1)">
            <p class="review-card__eyebrow">Current card</p>
            <h2>{currentItem.content}</h2>
            <p class="review-card__due">Due {formatShortDate(currentItem.nextDueAtIso)}</p>
          </div>
          <button type="button" class="review-card__details-button" on:click={() => openDrawer(currentItem.cardId)}>
            Card details
          </button>
        </div>

        {#if currentItem.meaning}
          <p class="review-card__meaning">{currentItem.meaning}</p>
        {/if}

        {#if currentItem.groups.length > 0}
          <div class="review-card__groups cluster" aria-label="Card groups">
            {#each currentItem.groups as group}
              <span class="review-card__group-chip">{group.groupName}</span>
            {/each}
          </div>
        {/if}

        {#if currentItem.examples.length > 0}
          <div class="stack" style="--stack-space: var(--space-2)">
            <p class="review-card__section-label">Examples</p>
            <ol class="review-card__examples stack" style="--stack-space: var(--space-2)">
              {#each currentItem.examples as example}
                <li>{example}</li>
              {/each}
            </ol>
          </div>
        {/if}

        {#if currentItem.mnemonics.length > 0}
          <div class="review-card__callout review-card__callout--warning stack" style="--stack-space: var(--space-2)">
            <p class="review-card__section-label">Mnemonic</p>
            {#each currentItem.mnemonics as mnemonic}
              <p>{mnemonic}</p>
            {/each}
          </div>
        {/if}

        {#if currentItem.llmInstructions}
          <div class="review-card__callout stack" style="--stack-space: var(--space-2)">
            <p class="review-card__section-label">LLM instructions</p>
            <p>{currentItem.llmInstructions}</p>
          </div>
        {/if}
      </article>

      <section class="review-actions stack" style="--stack-space: var(--space-3)" aria-label="Review actions">
        <div class="review-actions__ratings cluster">
          <button
            type="button"
            class="review-action-button review-action-button--easy"
            disabled={actionPending}
            on:click={() => void applySessionAction({ action: 'rate', cardId: currentItem.cardId, rating: 'easy' })}
          >
            <span>Easy</span>
            <small>1</small>
          </button>
          <button
            type="button"
            class="review-action-button review-action-button--medium"
            disabled={actionPending}
            on:click={() => void applySessionAction({ action: 'rate', cardId: currentItem.cardId, rating: 'medium' })}
          >
            <span>Medium</span>
            <small>2</small>
          </button>
          <button
            type="button"
            class="review-action-button review-action-button--hard"
            disabled={actionPending}
            on:click={() => void applySessionAction({ action: 'rate', cardId: currentItem.cardId, rating: 'hard' })}
          >
            <span>Hard</span>
            <small>3</small>
          </button>
        </div>

        <div class="review-actions__secondary cluster">
          <button
            type="button"
            class="review-action-button review-action-button--outline"
            disabled={actionPending}
            on:click={() => void applySessionAction({ action: 'pin', cardId: currentItem.cardId })}
          >
            📌 Pin to Drills
          </button>
          <button
            type="button"
            class="review-action-button review-action-button--outline"
            disabled={actionPending}
            on:click={() => void applySessionAction({ action: 'snooze', cardId: currentItem.cardId })}
          >
            💤 Snooze
          </button>
          <button
            type="button"
            class="review-action-button review-action-button--outline review-action-button--danger"
            disabled={actionPending}
            on:click={() => void applySessionAction({ action: 'disable', cardId: currentItem.cardId })}
          >
            🚫 Disable
          </button>
        </div>
      </section>

      <section class="review-queue stack" style="--stack-space: var(--space-3)" aria-labelledby="queue-preview-title">
        <div class="stack" style="--stack-space: var(--space-1)">
          <h2 id="queue-preview-title">Up next</h2>
          <p class="review-queue__copy">
            {#if queuePreview.length > 0}
              Preview the next few cards without leaving the session flow.
            {:else}
              Rate this card to finish the current queue.
            {/if}
          </p>
        </div>

        {#if queuePreview.length > 0}
          <ol class="review-queue__list stack" style="--stack-space: var(--space-2)">
            {#each queuePreview as item}
              <li class="review-queue__item">
                <div class="stack" style="--stack-space: var(--space-1)">
                  <span class="review-queue__content">{item.content}</span>
                  {#if item.meaning}
                    <span class="review-queue__meaning">{item.meaning}</span>
                  {/if}
                </div>
                <div class="review-queue__meta stack" style="--stack-space: var(--space-2)">
                  <span>{formatShortDate(item.nextDueAtIso)}</span>
                  <button type="button" class="review-queue__details" on:click={() => openDrawer(item.cardId)}>
                    Details
                  </button>
                </div>
              </li>
            {/each}
          </ol>

          {#if queueItems.length > queuePreview.length + 1}
            <p class="review-queue__remaining">
              +{queueItems.length - queuePreview.length - 1} more queued
            </p>
          {/if}
        {/if}
      </section>
    {/if}
  </section>

  {#if drawerCard}
    <ActiveCardDrawer
      lang={currentLanguage}
      card={drawerCard}
      availableGroups={sessionAvailableGroups}
      selectedIndex={drawerIndex}
      totalCount={queueItems.length}
      hasPrevious={drawerIndex > 0}
      hasNext={drawerIndex >= 0 && drawerIndex < queueItems.length - 1}
      allowDelete={false}
      on:close={() => {
        drawerCardId = null;
      }}
      on:updated={handleDrawerUpdated}
      on:deleted={handleDrawerDeleted}
      on:previous={() => navigateDrawer('previous')}
      on:next={() => navigateDrawer('next')}
    />
  {/if}

  {#if endSessionOpen}
    <button
      type="button"
      class="review-dialog__backdrop"
      aria-label="Dismiss end session dialog"
      on:click={closeEndSessionDialog}
    ></button>

    <div
      bind:this={endSessionDialog}
      class="review-dialog stack"
      style="--stack-space: var(--space-3)"
      role="alertdialog"
      tabindex="-1"
      aria-modal="true"
      aria-labelledby="end-session-title"
      aria-describedby="end-session-description"
      on:keydown={handleEndSessionDialogKeydown}
    >
      <h2 id="end-session-title">End session?</h2>
      <p id="end-session-description">{formatCardLabel(queueItems.length)} remain in this queue.</p>
      <div class="review-dialog__actions cluster">
        <button type="button" class="review-action-button review-action-button--outline" on:click={closeEndSessionDialog}>
          Keep reviewing
        </button>
        <button type="button" class="review-action-button review-action-button--danger-fill" on:click={completeSessionEarly}>
          End session
        </button>
      </div>
    </div>
  {/if}
{/if}

<style>
  .review-session {
    padding: calc(var(--shell-header-height) + var(--space-5)) var(--space-4) calc(var(--space-7) + 4.5rem);
  }

  .review-session__eyebrow,
  .review-session__summary-label,
  .review-card__eyebrow,
  .review-card__section-label,
  .review-card__due,
  .review-queue__copy,
  .review-queue__meaning,
  .review-queue__remaining,
  .review-complete__label,
  .review-complete__meta,
  .review-session__counter,
  .review-session__status {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  .review-session__eyebrow,
  .review-session__summary-label,
  .review-card__eyebrow,
  .review-card__section-label,
  .review-complete__label {
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .review-session__title,
  .review-session__header-actions,
  .review-card__header,
  .review-session__summary,
  .review-actions__ratings,
  .review-actions__secondary,
  .review-complete__stats,
  .review-complete__breakdown,
  .review-dialog__actions {
    gap: var(--space-3);
    justify-content: space-between;
  }

  .review-session__header h1,
  .review-session__copy,
  .review-session__summary-value,
  .review-state h2,
  .review-state p,
  .review-card__header h2,
  .review-card__meaning,
  .review-card__callout p,
  .review-queue__content,
  .review-complete__value,
  .review-complete__meta,
  .review-session__counter,
  .review-session__status,
  .review-dialog h2,
  .review-dialog p {
    margin: 0;
  }

  .review-session__back-link,
  .review-complete__home-link {
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    text-decoration: none;
  }

  .review-session__header-actions {
    align-items: center;
  }

  .review-session__counter {
    min-inline-size: max-content;
  }

  .review-session__end-button {
    border: 0;
    background: transparent;
    color: var(--color-text-secondary);
    cursor: pointer;
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    text-decoration: underline;
    text-underline-offset: 0.15em;
  }

  .review-session__summary-item,
  .review-card,
  .review-queue,
  .review-state,
  .review-complete {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .review-session__summary-item,
  .review-complete__stat {
    flex: 1 1 10rem;
    min-inline-size: min(100%, 10rem);
    padding: var(--space-3) var(--space-4);
  }

  .review-session__summary-value,
  .review-complete__value,
  .review-queue__content {
    font-family: var(--font-ui);
    font-weight: 600;
  }

  .review-card,
  .review-queue,
  .review-state,
  .review-complete {
    padding: var(--space-4);
  }

  .review-card {
    background: color-mix(in srgb, var(--color-info-bg) 24%, var(--color-surface));
    border-color: var(--color-info-border);
  }

  .review-card__header {
    align-items: flex-start;
  }

  .review-card__header h2 {
    font-size: clamp(2rem, 8vw, 3rem);
    line-height: var(--leading-tight);
    font-family: "Noto Sans CJK SC", "PingFang SC", "Hiragino Sans", "Malgun Gothic", system-ui;
  }

  .review-card__meaning {
    font-size: var(--font-size-h4);
  }

  .review-card__details-button,
  .review-queue__details,
  .review-action-button {
    min-block-size: 2.75rem;
    border-radius: var(--radius-md);
    font-family: var(--font-ui);
  }

  .review-card__details-button,
  .review-queue__details {
    padding: 0.55rem 0.9rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    cursor: pointer;
  }

  .review-card__groups,
  .review-complete__breakdown {
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .review-card__group-chip,
  .review-complete__pill {
    display: inline-flex;
    align-items: center;
    min-block-size: 1.875rem;
    padding-inline: var(--space-3);
    border-radius: var(--radius-pill, 999px);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
  }

  .review-card__group-chip {
    background: var(--color-surface-raised);
    color: var(--color-text-secondary);
  }

  .review-card__examples {
    margin: 0;
    padding-inline-start: 1.25rem;
  }

  .review-card__callout {
    padding: var(--space-3);
    border-radius: var(--radius-md);
    border: 1px solid var(--color-border-subtle);
    background: var(--color-surface-subtle);
  }

  .review-card__callout--warning {
    background: var(--color-warning-bg);
    border-color: var(--color-warning-border);
  }

  .review-action-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: var(--space-2);
    padding: 0.75rem 1rem;
    border: 1px solid transparent;
    cursor: pointer;
    font-weight: 600;
    text-decoration: none;
  }

  .review-action-button small {
    color: inherit;
    font-size: var(--font-size-caption);
    opacity: 0.8;
  }

  .review-action-button--easy {
    background: var(--color-success-bg);
    border-color: var(--color-success-border);
    color: var(--color-success-text);
  }

  .review-action-button--medium {
    background: var(--color-info-bg);
    border-color: var(--color-info-border);
    color: var(--color-info-text);
  }

  .review-action-button--hard {
    background: var(--color-warning-bg);
    border-color: var(--color-warning-border);
    color: var(--color-warning-text);
  }

  .review-action-button--outline {
    background: var(--color-surface);
    border-color: var(--color-border);
    color: var(--color-text-primary);
  }

  .review-action-button--primary {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: var(--color-primary-contrast);
  }

  .review-action-button--danger,
  .review-session__status--error {
    color: var(--color-danger-text);
  }

  .review-action-button--danger-fill {
    background: var(--color-danger-bg);
    border-color: var(--color-danger-border);
    color: var(--color-danger-text);
  }

  .review-action-button:disabled,
  .review-card__details-button:disabled,
  .review-queue__details:disabled {
    cursor: wait;
    opacity: 0.65;
  }

  .review-queue__list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .review-queue__item {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-3);
    align-items: center;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
  }

  .review-queue__meta {
    align-items: flex-end;
  }

  .review-complete__pill--easy {
    background: var(--color-success-bg);
    color: var(--color-success-text);
  }

  .review-complete__pill--medium {
    background: var(--color-info-bg);
    color: var(--color-info-text);
  }

  .review-complete__pill--hard {
    background: var(--color-warning-bg);
    color: var(--color-warning-text);
  }

  .review-complete__actions {
    align-items: stretch;
  }

  .review-complete__home-link {
    align-self: center;
  }

  .review-dialog__backdrop {
    position: fixed;
    inset: 0;
    z-index: 54;
    border: 0;
    background: color-mix(in srgb, var(--neutral-900) 22%, transparent);
  }

  .review-dialog {
    position: fixed;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    z-index: 55;
    inline-size: min(28rem, calc(100vw - 2rem));
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-lg);
    transform: translate(-50%, -50%);
  }

  @media (max-width: 48rem) {
    .review-session__title,
    .review-session__header-actions,
    .review-card__header,
    .review-actions__ratings,
    .review-actions__secondary,
    .review-complete__stats,
    .review-dialog__actions {
      flex-direction: column;
      align-items: stretch;
    }

    .review-queue__item {
      grid-template-columns: 1fr;
    }

    .review-queue__meta {
      align-items: flex-start;
    }
  }
</style>
