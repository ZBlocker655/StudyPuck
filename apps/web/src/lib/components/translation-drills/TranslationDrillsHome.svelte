<script lang="ts">
  import { get } from 'svelte/store';
  import { getLanguageByCode } from '$lib/config/languages.js';
  import ActiveCardDrawer from '$lib/components/cards/ActiveCardDrawer.svelte';
  import type { CardLibraryCardDetailData } from '$lib/server/cards.js';
  import type {
    TranslationDrillContextCardData,
    TranslationDrillHomeData,
    TranslationDrillActionResult,
  } from '$lib/server/translation-drills.js';
  import { translationDrillSession } from '$lib/stores/translationDrillSession.js';
  import {
    translationDrillSessionActions,
    type TranslationDrillLocalResponse,
  } from '$lib/stores/translationDrillSessionActions.js';

  export let lang: string;
  export let home: TranslationDrillHomeData | null;
  export let loadError: string | null = null;

  type HomeState = NonNullable<typeof home>;
  type CardLocation =
    | { collection: 'group-active'; groupId: string; index: number }
    | { collection: 'group-snoozed'; groupId: string; index: number }
    | { collection: 'ungrouped'; index: number };

  type TranslationDrillActionResponse =
    | {
        action: 'draw';
        card: TranslationDrillContextCardData;
        message: string;
      }
    | {
        action: 'snooze' | 'disable' | 'dismiss';
        cardId: string;
        state: 'active' | 'snoozed' | 'dismissed' | 'disabled';
        stateUntilIso: string | null;
        nextDueAtIso: string | null;
        intervalDays: number | null;
        usageCount: number;
        performanceScore: number | null;
        message: string;
      }
    | Extract<TranslationDrillActionResult, { action: 'challenge-start' | 'challenge-clear' }>;

  const DRAW_PILE_STACK_LAYERS = [0, 1, 2];
  const defaultLanguageLabel = 'your target language';

  let homeState: HomeState | null = home ? structuredClone(home) : null;
  let previousHome = home;
  let actionMessage = '';
  let actionError: string | null = null;
  let pendingActionKey: string | null = null;
  let openMenuCardId: string | null = null;
  let dismissCardId: string | null = null;
  let dismissReturnInDays = 1;
  let learnMoreExpanded = false;
  let dismissCard: TranslationDrillContextCardData | null = null;
  let dismissOptions: number[] = [1];
  let activeChallenge: Extract<TranslationDrillActionResult, { action: 'challenge-start' }>['challenge'] | null = null;
  let focusedCardId: string | null = null;
  let drawerCardId: string | null = null;
  let drawerCard: TranslationDrillContextCardData | null = null;
  let drawerCardDetail: CardLibraryCardDetailData | null = null;
  let availableDrawerGroups: Array<{ groupId: string; groupName: string }> = [];
  let lastHandledSessionActionId = get(translationDrillSessionActions)?.actionId ?? 0;

  $: if (home !== previousHome) {
    homeState = home ? structuredClone(home) : null;
    previousHome = home;
    actionMessage = '';
    actionError = null;
    pendingActionKey = null;
    openMenuCardId = null;
    dismissCardId = null;
    dismissReturnInDays = 1;
    learnMoreExpanded = false;
    activeChallenge = home?.challenge.activeChallenge ?? null;
    focusedCardId = null;
    drawerCardId = null;
    if (homeState) {
      syncGenerationInput();
    }
  }

  $: dismissCard = dismissCardId ? findCard(dismissCardId)?.card ?? null : null;
  $: dismissOptions = dismissCard?.dismissSchedule?.optionDays ?? [1];
  $: drawerCard = drawerCardId ? findCard(drawerCardId)?.card ?? null : null;
  $: drawerCardDetail = drawerCard ? toDrawerCard(drawerCard) : null;
  $: availableDrawerGroups = homeState?.availableGroups ?? [];
  $: translationDrillSession.sync({
    lang,
    home: homeState,
    activeChallenge,
    focusedCardId,
  });
  $: if ($translationDrillSessionActions && $translationDrillSessionActions.actionId !== lastHandledSessionActionId) {
    lastHandledSessionActionId = $translationDrillSessionActions.actionId;
    void handleRequestedSessionAction($translationDrillSessionActions);
  }

  function getActiveContextCards() {
    if (!homeState) {
      return [];
    }

    return [
      ...homeState.configuredGroups.flatMap((group) => group.activeCards),
      ...homeState.ungroupedContextCards.filter((card) => card.state === 'active'),
    ];
  }

  function syncGenerationInput() {
    if (!homeState) {
      return;
    }

    const activeCards = getActiveContextCards();

    homeState = {
      ...homeState,
      challenge: {
        ...homeState.challenge,
        generationInput: {
          ...homeState.challenge.generationInput,
          activeCardCount: activeCards.length,
          cards: activeCards,
          suggestedSourceCardIds: activeCards.slice(0, 2).map((card) => card.cardId),
        },
      },
    };
  }

  function recalculateSummary() {
    if (!homeState) {
      return;
    }

    const activeCardCount =
      homeState.ungroupedContextCards.filter((card) => card.state === 'active').length +
      homeState.configuredGroups.reduce((count, group) => count + group.activeCards.length, 0);
    const snoozedCardCount =
      homeState.ungroupedContextCards.filter((card) => card.state === 'snoozed').length +
      homeState.configuredGroups.reduce((count, group) => count + group.snoozedCards.length, 0);
    const remainingDrawCount = homeState.configuredGroups.reduce((count, group) => count + group.remainingCardCount, 0);

    homeState = {
      ...homeState,
      summary: {
        ...homeState.summary,
        configuredGroupCount: homeState.configuredGroups.length,
        activeCardCount,
        snoozedCardCount,
        remainingDrawCount,
        hasConfiguredDrawPiles: homeState.configuredGroups.length > 0,
        hasVisibleContext: activeCardCount + snoozedCardCount > 0,
      },
    };
    syncGenerationInput();
  }

  function shouldShowEmptyOverlay() {
    if (!homeState) {
      return false;
    }

    return !homeState.summary.hasConfiguredDrawPiles || (
      !homeState.summary.hasVisibleContext &&
      homeState.summary.remainingDrawCount === 0
    );
  }

  function findCard(cardId: string): { card: TranslationDrillContextCardData; location: CardLocation } | null {
    if (!homeState) {
      return null;
    }

    for (const group of homeState.configuredGroups) {
      const activeIndex = group.activeCards.findIndex((card) => card.cardId === cardId);

      if (activeIndex >= 0) {
        return {
          card: group.activeCards[activeIndex],
          location: { collection: 'group-active', groupId: group.groupId, index: activeIndex },
        };
      }

      const snoozedIndex = group.snoozedCards.findIndex((card) => card.cardId === cardId);

      if (snoozedIndex >= 0) {
        return {
          card: group.snoozedCards[snoozedIndex],
          location: { collection: 'group-snoozed', groupId: group.groupId, index: snoozedIndex },
        };
      }
    }

    const ungroupedIndex = homeState.ungroupedContextCards.findIndex((card) => card.cardId === cardId);

    if (ungroupedIndex >= 0) {
      return {
        card: homeState.ungroupedContextCards[ungroupedIndex],
        location: { collection: 'ungrouped', index: ungroupedIndex },
      };
    }

    return null;
  }

  function removeCard(cardId: string) {
    if (!homeState) {
      return null;
    }

    const match = findCard(cardId);

    if (!match) {
      return null;
    }

    const location = match.location;

    if (location.collection === 'ungrouped') {
      homeState.ungroupedContextCards.splice(location.index, 1);
      return match;
    }

    const group = homeState.configuredGroups.find((entry) => entry.groupId === location.groupId);

    if (!group) {
      return null;
    }

    if (location.collection === 'group-active') {
      group.activeCards.splice(location.index, 1);
    } else {
      group.snoozedCards.splice(location.index, 1);
    }

    return match;
  }

  function insertCard(card: TranslationDrillContextCardData, location: CardLocation, nextState: 'active' | 'snoozed') {
    if (!homeState) {
      return;
    }

    const nextCard = {
      ...card,
      state: nextState,
    } satisfies TranslationDrillContextCardData;

    if (location.collection === 'ungrouped' || !('groupId' in location) || !location.groupId) {
      homeState.ungroupedContextCards = [...homeState.ungroupedContextCards, nextCard];
      return;
    }

    const group = homeState.configuredGroups.find((entry) => entry.groupId === location.groupId);

    if (!group) {
      return;
    }

    if (nextState === 'active') {
      group.activeCards = [...group.activeCards, nextCard];
      return;
    }

    group.snoozedCards = [...group.snoozedCards, nextCard];
  }

  function applyDrawCard(card: TranslationDrillContextCardData) {
    if (!homeState) {
      return;
    }

    const groupId = card.sourceGroup?.groupId;

    if (!groupId) {
      homeState.ungroupedContextCards = [...homeState.ungroupedContextCards, card];
      recalculateSummary();
      return;
    }

    const group = homeState.configuredGroups.find((entry) => entry.groupId === groupId);

    if (!group) {
      homeState.ungroupedContextCards = [...homeState.ungroupedContextCards, card];
      recalculateSummary();
      return;
    }

    group.activeCards = [...group.activeCards, card];
    group.remainingCardCount = Math.max(0, group.remainingCardCount - 1);
    recalculateSummary();
  }

  function applyStateChange(
    cardId: string,
    nextState: 'snoozed' | 'dismissed' | 'disabled',
    updates: Partial<TranslationDrillContextCardData>,
  ) {
    if (!homeState) {
      return null;
    }

    const removed = removeCard(cardId);

    if (!removed) {
      return null;
    }

    const nextCard = {
      ...removed.card,
      ...updates,
      state: nextState,
    } satisfies TranslationDrillContextCardData;

    if (nextState === 'snoozed') {
      insertCard(nextCard, removed.location, 'snoozed');
    } else if (nextState === 'dismissed') {
      homeState.summary.dismissedCardCount += 1;
    } else {
      homeState.summary.disabledCardCount += 1;
    }

    recalculateSummary();
    return nextCard;
  }

  function setPendingAction(key: string | null) {
    pendingActionKey = key;
    if (key) {
      actionMessage = '';
      actionError = null;
    }
  }

  function setFocusedCard(cardId: string | null) {
    focusedCardId = cardId;
  }

  async function postAction(payload: Record<string, unknown>): Promise<TranslationDrillActionResponse> {
    const response = await fetch(`/${lang}/translation-drills/actions`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => null) as
      | TranslationDrillActionResponse
      | {
          message?: string;
        }
      | null;

    if (!response.ok) {
      throw new Error(data?.message ?? 'The Translation Drills action could not be completed right now.');
    }

    if (!data || !('action' in data)) {
      throw new Error('The Translation Drills action returned an invalid response.');
    }

    return data;
  }

  async function handleDraw(groupId: string) {
    setFocusedCard(null);
    setPendingAction(`draw:${groupId}`);
    openMenuCardId = null;

    try {
      const result = await postAction({
        action: 'draw',
        groupId,
      });

      if (result.action !== 'draw') {
        throw new Error('Unexpected response while drawing a Translation Drills card.');
      }

      applyDrawCard(result.card);
      actionMessage = `${result.card.content} drawn into context.`;
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'The card could not be drawn right now.';
    } finally {
      setPendingAction(null);
    }
  }

  async function handleSnooze(cardId: string) {
    const existing = findCard(cardId)?.card;

    if (!existing) {
      return;
    }

    setFocusedCard(cardId);
    setPendingAction(`card:${cardId}:snooze`);
    openMenuCardId = null;

    try {
      const result = await postAction({
        action: 'snooze',
        cardId,
      });

      if (result.action !== 'snooze') {
        throw new Error('Unexpected response while snoozing the card.');
      }

      applyStateChange(cardId, 'snoozed', {
        stateUntilIso: result.stateUntilIso,
        nextDueAtIso: result.nextDueAtIso,
        intervalDays: result.intervalDays,
        usageCount: result.usageCount,
        performanceScore: result.performanceScore,
      });
      actionMessage = `${existing.content} snoozed.`;
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'The card could not be snoozed right now.';
    } finally {
      setPendingAction(null);
    }
  }

  function openDismissDialog(cardId: string) {
    const card = findCard(cardId)?.card;

    if (!card) {
      return;
    }

    setFocusedCard(cardId);
    dismissCardId = cardId;
    dismissReturnInDays = card.dismissSchedule?.recommendedDays ?? card.dismissSchedule?.optionDays[0] ?? 1;
    openMenuCardId = null;
    actionError = null;
  }

  function closeDismissDialog() {
    dismissCardId = null;
    dismissReturnInDays = 1;
  }

  async function confirmDismiss() {
    if (!dismissCardId) {
      return;
    }

    const existing = findCard(dismissCardId)?.card;

    if (!existing) {
      closeDismissDialog();
      return;
    }

    setPendingAction(`card:${dismissCardId}:dismiss`);

    try {
      const result = await postAction({
        action: 'dismiss',
        cardId: dismissCardId,
        returnInDays: dismissReturnInDays,
      });

      if (result.action !== 'dismiss') {
        throw new Error('Unexpected response while dismissing the card.');
      }

      applyStateChange(dismissCardId, 'dismissed', {
        stateUntilIso: result.stateUntilIso,
        nextDueAtIso: result.nextDueAtIso,
        intervalDays: result.intervalDays,
        usageCount: result.usageCount,
        performanceScore: result.performanceScore,
      });
      actionMessage = `${existing.content} dismissed — returns ${formatDismissLabel(result.intervalDays ?? dismissReturnInDays, true)}.`;
      closeDismissDialog();
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'The card could not be dismissed right now.';
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDisable(cardId: string) {
    const existing = findCard(cardId)?.card;

    if (!existing) {
      return;
    }

    setFocusedCard(cardId);
    setPendingAction(`card:${cardId}:disable`);
    openMenuCardId = null;

    try {
      const result = await postAction({
        action: 'disable',
        cardId,
      });

      if (result.action !== 'disable') {
        throw new Error('Unexpected response while disabling the card.');
      }

      applyStateChange(cardId, 'disabled', {
        stateUntilIso: result.stateUntilIso,
        nextDueAtIso: result.nextDueAtIso,
        intervalDays: result.intervalDays,
        usageCount: result.usageCount,
        performanceScore: result.performanceScore,
      });
      actionMessage = `${existing.content} removed from this drill context.`;
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'The card could not be disabled right now.';
    } finally {
      setPendingAction(null);
    }
  }

  function formatDismissLabel(days: number, omitPrefix = false) {
    if (days === 1) {
      return omitPrefix ? 'tomorrow' : 'Tomorrow';
    }

    if (days % 30 === 0) {
      const months = days / 30;
      const label = `${months} month${months === 1 ? '' : 's'}`;
      return omitPrefix ? `in ${label}` : `In ${label}`;
    }

    if (days % 7 === 0) {
      const weeks = days / 7;
      const label = `${weeks} week${weeks === 1 ? '' : 's'}`;
      return omitPrefix ? `in ${label}` : `In ${label}`;
    }

    return omitPrefix ? `in ${days} days` : `In ${days} days`;
  }

  function formatDrawPileLabel(count: number) {
    if (count === 0) {
      return 'Pile empty';
    }

    return `${count} card${count === 1 ? '' : 's'} remaining`;
  }

  function getDrawPileVariant(count: number) {
    if (count === 0) {
      return 'empty';
    }

    return count >= 3 ? 'full' : 'small';
  }

  function isActionPending(key: string) {
    return pendingActionKey === key;
  }

  async function startChallenge(): Promise<TranslationDrillLocalResponse> {
    if (!homeState) {
      throw new Error('Translation Drills is not available right now.');
    }

    const languageLabel = getLanguageByCode(lang)?.label ?? defaultLanguageLabel;
    setPendingAction('challenge:next');

    try {
      const result = await postAction({
        action: 'challenge-start',
        previousSourceCardIds: activeChallenge?.sourceCardIds,
      });

      if (result.action !== 'challenge-start') {
        throw new Error('Unexpected response while starting a Translation Drills challenge.');
      }

      activeChallenge = result.challenge;
      actionMessage = result.message;
      return {
        message: `${result.message} Translate to ${languageLabel}: "${result.challenge.prompt}"`,
        conversationReset: true,
      };
    } catch (error) {
      actionError = error instanceof Error ? error.message : 'The challenge could not be created right now.';
      throw error instanceof Error ? error : new Error(actionError);
    } finally {
      setPendingAction(null);
    }
  }

  function toDrawerCard(card: TranslationDrillContextCardData): CardLibraryCardDetailData {
    return {
      cardId: card.cardId,
      content: card.content,
      meaning: card.meaning,
      cardType: card.cardType,
      examples: card.examples,
      mnemonics: card.mnemonics,
      llmInstructions: card.llmInstructions,
      updatedAtIso: card.updatedAtIso,
      groups: card.sourceGroup ? [card.sourceGroup] : [],
    };
  }

  function openDrawer(cardId: string) {
    setFocusedCard(cardId);
    drawerCardId = cardId;
    openMenuCardId = null;
  }

  function closeDrawer() {
    drawerCardId = null;
  }

  async function handleRequestedSessionAction(
    actionRequest: import('$lib/stores/translationDrillSessionActions.js').TranslationDrillSessionActionRequest,
  ) {
    try {
      if (actionRequest.action === 'next') {
        actionRequest.resolve(await startChallenge());
        return;
      }

      if (actionRequest.action === 'draw') {
        await handleDraw(actionRequest.groupId);
        actionRequest.resolve({
          message: actionMessage || 'Card drawn into Translation Drills.',
        });
        return;
      }

      if (actionRequest.action === 'snooze') {
        await handleSnooze(actionRequest.cardId);
        actionRequest.resolve({
          message: actionMessage || 'Card snoozed.',
        });
        return;
      }

      openDismissDialog(actionRequest.cardId);
      actionRequest.resolve({
        message: 'Choose when the card should return in the dismiss dialog.',
      });
    } catch (error) {
      actionRequest.reject(error instanceof Error ? error : new Error('The Translation Drills action could not be completed right now.'));
    }
  }
</script>

{#if loadError}
  <section class="translation-drills-status translation-drills-status--error stack" style="--stack-space: var(--space-2)" role="alert">
    <p class="translation-drills-status__eyebrow">Translation Drills</p>
    <h1>Translation Drills is unavailable</h1>
    <p>{loadError}</p>
  </section>
{:else if homeState}
  <div class="translation-drills stack" style="--stack-space: var(--space-5)">
    <header class="translation-drills__hero cluster">
      <div class="translation-drills__hero-copy stack" style="--stack-space: var(--space-2)">
        <p class="translation-drills__eyebrow">Translation Drills</p>
        <h1>Context overview</h1>
        <p class="translation-drills__lede">
          Draw cards into view, snooze the ones you want to hide for now, and keep each drill pile balanced for cleaner practice.
        </p>
      </div>

      <dl class="translation-drills__stats">
        <div>
          <dt>Active</dt>
          <dd>{homeState.summary.activeCardCount}</dd>
        </div>
        <div>
          <dt>Snoozed</dt>
          <dd>{homeState.summary.snoozedCardCount}</dd>
        </div>
        <div>
          <dt>Remaining</dt>
          <dd>{homeState.summary.remainingDrawCount}</dd>
        </div>
      </dl>
    </header>

    {#if actionError || actionMessage}
      <p
        class="translation-drills-status"
        class:translation-drills-status--error={Boolean(actionError)}
        role={actionError ? 'alert' : 'status'}
      >
        {actionError ?? actionMessage}
      </p>
    {/if}

    {#if homeState.summary.activeCardCount + homeState.summary.snoozedCardCount > 10}
      <aside class="translation-drills__guidance">
        Large contexts can dilute drill focus. Consider dismissing cards you have already mastered.
      </aside>
    {/if}

    <div class="translation-drills__sections stack" style="--stack-space: var(--space-4)">
      {#each homeState.configuredGroups as group (group.groupId)}
        <section class="drill-group stack" style="--stack-space: var(--space-3)" aria-labelledby={`group-${group.groupId}`}>
          <header class="drill-group__header cluster">
            <div class="stack" style="--stack-space: var(--space-1)">
              <h2 id={`group-${group.groupId}`}>{group.groupName}</h2>
              <p>{group.drawPileName ?? `${group.groupName} draw pile`}</p>
            </div>

            <span class="drill-group__count">{formatDrawPileLabel(group.remainingCardCount)}</span>
          </header>

          {#if group.activeCards.length === 0 && group.snoozedCards.length === 0}
            <p class="drill-group__empty">No cards drawn yet.</p>
          {/if}

          <div class="stack" style="--stack-space: var(--space-2)">
            {#each group.activeCards as card (card.cardId)}
              <article class="card-row" aria-label={card.content}>
                <div class="card-row__body">
                  <p>{card.content}</p>
                </div>

                <div class="card-row__actions cluster" style="--cluster-space: var(--space-2)">
                  <button
                    type="button"
                    class="card-row__action"
                    disabled={isActionPending(`card:${card.cardId}:snooze`)}
                    onclick={() => void handleSnooze(card.cardId)}
                  >
                    💤 Snooze
                  </button>
                  <button
                    type="button"
                    class="card-row__action"
                    disabled={isActionPending(`card:${card.cardId}:dismiss`)}
                    onclick={() => openDismissDialog(card.cardId)}
                  >
                    ✕ Dismiss
                  </button>

                  <div class="card-row__menu-wrap">
                    <button
                      type="button"
                      class="card-row__action"
                      aria-expanded={openMenuCardId === card.cardId}
                      aria-haspopup="menu"
                      onclick={() => openMenuCardId = openMenuCardId === card.cardId ? null : card.cardId}
                    >
                      ···
                    </button>

                    {#if openMenuCardId === card.cardId}
                      <div class="card-row__menu stack" style="--stack-space: var(--space-1)" role="menu">
                        <button
                          type="button"
                          class="card-row__menu-button"
                          onclick={() => openDrawer(card.cardId)}
                        >
                          View card detail
                        </button>
                        <button
                          type="button"
                          class="card-row__menu-button"
                          disabled={isActionPending(`card:${card.cardId}:disable`)}
                          onclick={() => void handleDisable(card.cardId)}
                        >
                          Disable card
                        </button>
                        <button
                          type="button"
                          class="card-row__menu-button"
                          onclick={() => openMenuCardId = null}
                        >
                          Cancel
                        </button>
                      </div>
                    {/if}
                  </div>
                </div>
              </article>
            {/each}

            {#each group.snoozedCards as card (card.cardId)}
              <article class="card-row card-row--snoozed" aria-label={`${card.content}, snoozed`}>
                <div class="card-row__body">
                  <p><span aria-hidden="true">🕐 </span>{card.content}</p>
                </div>

                <div class="card-row__actions cluster" style="--cluster-space: var(--space-2)">
                  <button
                    type="button"
                    class="card-row__action"
                    disabled={isActionPending(`card:${card.cardId}:dismiss`)}
                    onclick={() => openDismissDialog(card.cardId)}
                  >
                    ✕ Dismiss
                  </button>

                  <div class="card-row__menu-wrap">
                    <button
                      type="button"
                      class="card-row__action"
                      aria-expanded={openMenuCardId === card.cardId}
                      aria-haspopup="menu"
                      onclick={() => openMenuCardId = openMenuCardId === card.cardId ? null : card.cardId}
                    >
                      ···
                    </button>

                    {#if openMenuCardId === card.cardId}
                      <div class="card-row__menu stack" style="--stack-space: var(--space-1)" role="menu">
                        <button
                          type="button"
                          class="card-row__menu-button"
                          onclick={() => openDrawer(card.cardId)}
                        >
                          View card detail
                        </button>
                        <button
                          type="button"
                          class="card-row__menu-button"
                          disabled={isActionPending(`card:${card.cardId}:disable`)}
                          onclick={() => void handleDisable(card.cardId)}
                        >
                          Disable card
                        </button>
                        <button
                          type="button"
                          class="card-row__menu-button"
                          onclick={() => openMenuCardId = null}
                        >
                          Cancel
                        </button>
                      </div>
                    {/if}
                  </div>
                </div>
              </article>
            {/each}
          </div>

          <div class="stack" style="--stack-space: var(--space-2)">
            <button
              type="button"
              class={`draw-pile draw-pile--${getDrawPileVariant(group.remainingCardCount)}`}
              disabled={group.remainingCardCount === 0 || isActionPending(`draw:${group.groupId}`)}
              aria-label={`${group.groupName} draw pile — ${formatDrawPileLabel(group.remainingCardCount)}`}
              onclick={() => void handleDraw(group.groupId)}
            >
              {#each DRAW_PILE_STACK_LAYERS as layer}
                <span class="draw-pile__card" style={`--draw-pile-layer: ${layer};`}></span>
              {/each}
            </button>
            <p class="draw-pile__caption">{group.groupName} draw pile</p>
          </div>
        </section>
      {/each}

      {#if homeState.ungroupedContextCards.length > 0}
        <section class="drill-group stack" style="--stack-space: var(--space-3)" aria-labelledby="translation-drills-ungrouped">
          <header class="drill-group__header cluster">
            <div class="stack" style="--stack-space: var(--space-1)">
              <h2 id="translation-drills-ungrouped">Pinned cards</h2>
              <p>Cards kept in context outside a draw pile.</p>
            </div>

            <span class="drill-group__count">{homeState.ungroupedContextCards.length} card{homeState.ungroupedContextCards.length === 1 ? '' : 's'}</span>
          </header>

          <div class="stack" style="--stack-space: var(--space-2)">
            {#each homeState.ungroupedContextCards as card (card.cardId)}
              <article class="card-row" class:card-row--snoozed={card.state === 'snoozed'} aria-label={card.state === 'snoozed' ? `${card.content}, snoozed` : card.content}>
                <div class="card-row__body">
                  <p>{card.state === 'snoozed' ? `🕐 ${card.content}` : card.content}</p>
                </div>

                <div class="card-row__actions cluster" style="--cluster-space: var(--space-2)">
                  {#if card.state === 'active'}
                    <button
                      type="button"
                      class="card-row__action"
                      disabled={isActionPending(`card:${card.cardId}:snooze`)}
                      onclick={() => void handleSnooze(card.cardId)}
                    >
                      💤 Snooze
                    </button>
                  {/if}
                  <button
                    type="button"
                    class="card-row__action"
                    disabled={isActionPending(`card:${card.cardId}:dismiss`)}
                    onclick={() => openDismissDialog(card.cardId)}
                  >
                    ✕ Dismiss
                  </button>
                </div>
              </article>
            {/each}
          </div>
        </section>
      {/if}
    </div>

    {#if shouldShowEmptyOverlay()}
      <div class="translation-drills__overlay">
        <section class="translation-drills__overlay-card stack" style="--stack-space: var(--space-3)">
          <p class="translation-drills__overlay-icon" aria-hidden="true">📚</p>
          <h2>Add groups to start drilling</h2>
          <p>
            Translation Drills uses cards from your groups as practice material. Add one or more groups, then draw cards into your active context like a hand of cards.
          </p>
          <div class="translation-drills__overlay-actions cluster">
            <a class="translation-drills__button translation-drills__button--primary" href={`/${lang}/cards/groups`}>
              Go to Groups
            </a>
            <button
              type="button"
              class="translation-drills__button translation-drills__button--secondary"
              onclick={() => learnMoreExpanded = !learnMoreExpanded}
            >
              Learn more
            </button>
          </div>

          {#if learnMoreExpanded}
            <p class="translation-drills__overlay-detail">
              Add groups, mark them as Translation Drills piles, and draw from those piles whenever you want fresh vocabulary in view.
            </p>
          {/if}
        </section>
      </div>
    {/if}
  </div>

  {#if dismissCard}
    <button type="button" class="translation-drills__backdrop" aria-label="Close dismiss dialog" onclick={closeDismissDialog}></button>
    <div
      class="translation-drills__dialog stack"
      style="--stack-space: var(--space-3)"
      role="dialog"
      aria-modal="true"
      aria-labelledby="translation-drills-dismiss-title"
    >
      <header class="translation-drills__dialog-header cluster">
        <div class="stack" style="--stack-space: var(--space-1)">
          <p class="translation-drills__eyebrow">Dismiss card</p>
          <h2 id="translation-drills-dismiss-title">{dismissCard.content}</h2>
        </div>

        <button type="button" class="translation-drills__dialog-close" aria-label="Close dismiss dialog" onclick={closeDismissDialog}>
          ✕
        </button>
      </header>

      <p>This card will leave your active context and return after the interval you choose below.</p>

      <fieldset class="translation-drills__schedule stack" style="--stack-space: var(--space-2)">
        <legend>When should it return?</legend>

        {#each dismissOptions as optionDays}
          <label class="translation-drills__schedule-option">
            <input type="radio" name="dismiss-return-days" bind:group={dismissReturnInDays} value={optionDays} />
            <span>{formatDismissLabel(optionDays)}</span>
            {#if optionDays === dismissCard.dismissSchedule?.recommendedDays}
              <strong>Recommended</strong>
            {/if}
          </label>
        {/each}
      </fieldset>

      <div class="translation-drills__dialog-actions cluster">
        <button type="button" class="translation-drills__button translation-drills__button--secondary" onclick={closeDismissDialog}>
          Cancel
        </button>
        <button
          type="button"
          class="translation-drills__button translation-drills__button--primary"
          disabled={isActionPending(`card:${dismissCard.cardId}:dismiss`)}
          onclick={() => void confirmDismiss()}
        >
          Dismiss
        </button>
      </div>
    </div>
  {/if}

  {#if drawerCardDetail}
    <ActiveCardDrawer
      lang={lang}
      card={drawerCardDetail}
      availableGroups={availableDrawerGroups}
      selectedIndex={0}
      totalCount={1}
      disabled={true}
      allowDelete={false}
      on:close={closeDrawer}
    />
  {/if}
{/if}

<style>
  .translation-drills {
    position: relative;
    min-block-size: 100%;
    padding: var(--space-4);
  }

  .translation-drills__hero {
    align-items: start;
    justify-content: space-between;
    gap: var(--space-4);
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: linear-gradient(
      135deg,
      color-mix(in srgb, var(--color-primary-subtle) 85%, var(--color-surface) 15%),
      var(--color-surface)
    );
  }

  .translation-drills__hero-copy {
    max-inline-size: var(--measure-body);
  }

  .translation-drills__eyebrow,
  .translation-drills-status__eyebrow,
  .drill-group__header p,
  .translation-drills__schedule legend {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  .translation-drills__hero h1,
  .translation-drills-status h1,
  .translation-drills__overlay-card h2,
  .translation-drills__dialog h2,
  .drill-group__header h2 {
    margin: 0;
  }

  .translation-drills__lede,
  .translation-drills-status p,
  .translation-drills__overlay-card p,
  .translation-drills__dialog p,
  .drill-group__empty {
    margin: 0;
    color: var(--color-text-secondary);
  }

  .translation-drills__stats {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: var(--space-3);
    min-inline-size: min(22rem, 100%);
    margin: 0;
  }

  .translation-drills__stats div {
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  }

  .translation-drills__stats dt {
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
    color: var(--color-text-muted);
  }

  .translation-drills__stats dd {
    margin: var(--space-2) 0 0;
    font-size: var(--font-size-h3);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .translation-drills-status,
  .translation-drills__guidance {
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
  }

  .translation-drills-status--error {
    border-color: var(--color-error-border);
    background: var(--color-error-bg);
    color: var(--color-error-text);
  }

  .translation-drills__guidance {
    color: var(--color-text-secondary);
    background: var(--color-warning-bg);
    border-color: var(--color-warning-border);
  }

  .drill-group {
    padding-block-end: var(--space-4);
    border-block-end: 1px solid var(--color-border-subtle);
  }

  .drill-group:last-child {
    border-block-end: 0;
    padding-block-end: 0;
  }

  .drill-group__header {
    align-items: end;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .drill-group__count,
  .draw-pile__caption {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    color: var(--color-text-muted);
  }

  .card-row {
    position: relative;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .card-row--snoozed {
    color: var(--color-text-muted);
    background: color-mix(in srgb, var(--color-surface-subtle) 85%, var(--color-surface) 15%);
  }

  .card-row__body p {
    margin: 0;
    font-size: var(--font-size-body);
  }

  .card-row__actions {
    align-items: center;
    margin-block-start: var(--space-2);
    flex-wrap: wrap;
  }

  .card-row__action,
  .card-row__menu-button,
  .card-row__menu-link,
  .translation-drills__button,
  .translation-drills__dialog-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: 2.75rem;
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    text-decoration: none;
    cursor: pointer;
  }

  .card-row__action:disabled,
  .card-row__menu-button:disabled,
  .translation-drills__button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .card-row__menu-wrap {
    position: relative;
  }

  .card-row__menu {
    position: absolute;
    inset-inline-end: 0;
    inset-block-start: calc(100% + var(--space-2));
    z-index: 2;
    min-inline-size: 12rem;
    padding: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-md);
  }

  .card-row__menu-button,
  .card-row__menu-link {
    justify-content: flex-start;
    inline-size: 100%;
  }

  .draw-pile {
    position: relative;
    inline-size: min(16rem, 100%);
    block-size: 4.75rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--color-primary-subtle) 70%, var(--color-surface) 30%);
    box-shadow: var(--shadow-sm);
    cursor: pointer;
  }

  .draw-pile__card {
    position: absolute;
    inset-inline: var(--space-4);
    block-size: 2.4rem;
    border: 1px solid color-mix(in srgb, var(--color-primary) 25%, var(--color-border) 75%);
    border-radius: var(--radius-sm);
    background:
      repeating-linear-gradient(
        135deg,
        color-mix(in srgb, var(--color-primary) 16%, var(--color-surface) 84%),
        color-mix(in srgb, var(--color-primary) 16%, var(--color-surface) 84%) 0.35rem,
        color-mix(in srgb, var(--color-primary) 7%, var(--color-surface) 93%) 0.35rem,
        color-mix(in srgb, var(--color-primary) 7%, var(--color-surface) 93%) 0.7rem
      );
    inset-block-start: calc(var(--space-2) + (var(--draw-pile-layer) * 0.55rem));
    transform: translateX(calc(var(--draw-pile-layer) * 0.2rem));
  }

  .draw-pile--small {
    block-size: 3.5rem;
  }

  .draw-pile--small .draw-pile__card:last-child {
    display: none;
  }

  .draw-pile--empty {
    border-style: dashed;
    background: transparent;
    cursor: not-allowed;
  }

  .draw-pile--empty .draw-pile__card {
    display: none;
  }

  .translation-drills__overlay {
    position: absolute;
    inset: 0;
    z-index: 3;
    display: grid;
    place-items: center;
    padding: var(--space-5);
    background: color-mix(in srgb, var(--color-background) 92%, transparent);
    backdrop-filter: blur(4px);
  }

  .translation-drills__overlay-card {
    max-inline-size: 34rem;
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    text-align: center;
    box-shadow: var(--shadow-md);
  }

  .translation-drills__overlay-icon {
    font-size: 2.5rem;
  }

  .translation-drills__overlay-actions {
    justify-content: center;
    gap: var(--space-3);
  }

  .translation-drills__button--primary {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .translation-drills__button--secondary {
    background: var(--color-surface);
  }

  .translation-drills__overlay-detail {
    padding: var(--space-3);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
  }

  .translation-drills__backdrop {
    position: fixed;
    inset: 0;
    z-index: 39;
    background: color-mix(in srgb, var(--neutral-900) 26%, transparent);
    border: 0;
  }

  .translation-drills__dialog {
    position: fixed;
    inset-inline: max(var(--space-4), calc(50% - 16rem));
    inset-block-start: max(var(--space-6), calc(var(--shell-header-height) + var(--space-4)));
    z-index: 40;
    max-inline-size: 32rem;
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-md);
  }

  .translation-drills__dialog-header,
  .translation-drills__dialog-actions,
  .translation-drills__schedule-option {
    justify-content: space-between;
    gap: var(--space-3);
  }

  .translation-drills__dialog-close {
    min-inline-size: 2.75rem;
    padding: 0;
  }

  .translation-drills__schedule {
    margin: 0;
    padding: 0;
    border: 0;
  }

  .translation-drills__schedule-option {
    display: flex;
    align-items: center;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
  }

  .translation-drills__schedule-option span {
    flex: 1;
  }

  .translation-drills__schedule-option strong {
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    color: var(--color-text-accent);
    text-transform: uppercase;
    letter-spacing: var(--tracking-caps);
  }

  @media (hover: hover) and (pointer: fine) {
    .card-row__actions {
      opacity: 0;
      pointer-events: none;
      transition: opacity 160ms ease;
    }

    .card-row:hover .card-row__actions,
    .card-row:focus-within .card-row__actions {
      opacity: 1;
      pointer-events: auto;
    }

    .card-row:hover,
    .card-row:focus-within {
      border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border) 65%);
    }
  }

  @media (max-width: 48rem) {
    .translation-drills {
      padding: var(--space-3);
    }

    .translation-drills__hero,
    .translation-drills__stats {
      grid-template-columns: 1fr;
    }

    .translation-drills__hero {
      display: block;
    }

    .translation-drills__stats {
      margin-block-start: var(--space-4);
    }

    .translation-drills__overlay-actions,
    .translation-drills__dialog-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .translation-drills__dialog {
      inset-inline: var(--space-3);
    }
  }
</style>
