<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount, tick } from 'svelte';
  import { buildDeleteGroupMessage, sortCardLibraryGroupItems } from '$lib/cards/groups.js';
  import type { CardLibraryGroupListItemData, CardLibraryGroupsData } from '$lib/server/cards.js';
  import type { PageData } from './$types.js';

  export let data: PageData;

  type Feedback = {
    title: string;
    message: string;
  };

  let groups: CardLibraryGroupsData = data.groups;
  let previousGroups = data.groups;
  let createDrawerOpen = false;
  let drawerElement: HTMLElement | null = null;
  let groupNameInput: HTMLInputElement | null = null;
  let groupName = '';
  let groupDescription = '';
  let createErrorMessage = '';
  let createPending = false;
  let deletePendingGroupId: string | null = null;
  let deleteTarget: CardLibraryGroupListItemData | null = null;
  let feedback: Feedback | null = null;
  let isMobileViewport = false;
  let viewportMediaQuery: MediaQueryList | null = null;
  let touchStartX = 0;
  let swipedGroupId: string | null = null;

  onMount(() => {
    viewportMediaQuery = window.matchMedia('(max-width: 900px)');
    const syncViewportMode = () => {
      isMobileViewport = viewportMediaQuery?.matches ?? false;

      if (!isMobileViewport) {
        swipedGroupId = null;
      }
    };

    syncViewportMode();
    viewportMediaQuery.addEventListener('change', syncViewportMode);

    return () => {
      viewportMediaQuery?.removeEventListener('change', syncViewportMode);
    };
  });

  $: currentLang = $page.params.lang ?? '';

  $: if (data.groups !== previousGroups) {
    groups = data.groups;
    previousGroups = data.groups;
  }

  function openCreateDrawer() {
    createDrawerOpen = true;
    createErrorMessage = '';
    groupName = '';
    groupDescription = '';
    tick().then(() => {
      groupNameInput?.focus();
    });
  }

  function closeCreateDrawer() {
    if (createPending) {
      return;
    }

    createDrawerOpen = false;
    createErrorMessage = '';
    groupName = '';
    groupDescription = '';
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (deleteTarget) {
        deleteTarget = null;
        return;
      }

      if (createDrawerOpen) {
        event.preventDefault();
        closeCreateDrawer();
      }
    }
  }

  function handleDrawerKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !drawerElement) {
      return;
    }

    const focusableElements = Array.from(
      drawerElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], textarea:not([disabled]), input:not([disabled])',
      ),
    );

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

  async function handleCreateGroup(event: SubmitEvent) {
    event.preventDefault();

    if (createPending || !currentLang) {
      return;
    }

    createPending = true;
    createErrorMessage = '';
    feedback = null;

    try {
      const response = await fetch(`/${currentLang}/cards/groups/actions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'create',
          groupName,
          description: groupDescription,
        }),
      });

      const responseBody = (await response.json().catch(() => null)) as
        | {
            group?: CardLibraryGroupListItemData;
            message?: string;
          }
        | null;

      if (!response.ok || !responseBody?.group) {
        throw new Error(responseBody?.message ?? 'The group could not be created right now.');
      }

      const nextItems = sortCardLibraryGroupItems([...groups.items, responseBody.group]);
      groups = {
        items: nextItems,
        totalCount: nextItems.length,
      };
      closeCreateDrawer();
    } catch (error) {
      createErrorMessage = error instanceof Error ? error.message : 'The group could not be created right now.';
    } finally {
      createPending = false;
    }
  }

  function requestDelete(group: CardLibraryGroupListItemData) {
    deleteTarget = group;
    feedback = null;
  }

  async function confirmDelete() {
    if (!deleteTarget || !currentLang || deletePendingGroupId) {
      return;
    }

    deletePendingGroupId = deleteTarget.groupId;
    feedback = null;

    try {
      const response = await fetch(`/${currentLang}/cards/groups/actions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          action: 'delete',
          groupId: deleteTarget.groupId,
        }),
      });

      const responseBody = (await response.json().catch(() => null)) as
        | {
            deleted?: {
              groupId: string;
            };
            message?: string;
          }
        | null;

      if (!response.ok || !responseBody?.deleted) {
        throw new Error(responseBody?.message ?? 'The group could not be deleted right now.');
      }

      const nextItems = groups.items.filter((group) => group.groupId !== responseBody.deleted?.groupId);
      groups = {
        items: nextItems,
        totalCount: nextItems.length,
      };
      deleteTarget = null;
      swipedGroupId = null;
    } catch (error) {
      feedback = {
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'The group could not be deleted right now.',
      };
    } finally {
      deletePendingGroupId = null;
    }
  }

  function handleRowClick(groupId: string) {
    if (isMobileViewport && swipedGroupId === groupId) {
      swipedGroupId = null;
      return;
    }

    void goto(`/${currentLang}/cards/groups/${groupId}`);
  }

  function handleTouchStart(event: TouchEvent) {
    touchStartX = event.touches[0]?.clientX ?? 0;
  }

  function handleTouchEnd(event: TouchEvent, groupId: string) {
    if (!isMobileViewport) {
      return;
    }

    const endX = event.changedTouches[0]?.clientX ?? touchStartX;
    const deltaX = endX - touchStartX;

    if (deltaX <= -40) {
      swipedGroupId = groupId;
      return;
    }

    if (deltaX >= 40 || Math.abs(deltaX) < 10) {
      swipedGroupId = null;
    }
  }
</script>

<svelte:window on:keydown={handleWindowKeydown} />

<svelte:head>
  <title>Groups - StudyPuck</title>
</svelte:head>

<section class="groups-page stack" style="--stack-space: var(--space-5)">
  <header class="groups-page__header cluster">
    <div class="stack" style="--stack-space: var(--space-2)">
      <p class="groups-page__eyebrow">Cards</p>
      <h1>Groups</h1>
    </div>

    <button type="button" class="groups-page__new-button" on:click={openCreateDrawer}>
      {isMobileViewport ? '+ New' : '+ New Group'}
    </button>
  </header>

  {#if feedback}
    <section class="groups-page__feedback" role="status" aria-live="polite">
      <div class="stack" style="--stack-space: var(--space-1)">
        <p class="groups-page__feedback-title">{feedback.title}</p>
        <p>{feedback.message}</p>
      </div>
    </section>
  {/if}

  {#if groups.items.length === 0}
    <section class="groups-page__state">
      <div class="groups-page__state-icon" aria-hidden="true">[ ]</div>
      <h2>No groups yet</h2>
      <p>Groups let you organize your cards by topic, category, or any system that works for you.</p>
      <button type="button" class="groups-page__state-cta" on:click={openCreateDrawer}>
        + Create your first group
      </button>
    </section>
  {:else}
    <section class="groups-page__list stack" style="--stack-space: var(--space-2)">
      <div class="groups-page__columns" aria-hidden="true">
        <span>Name</span>
        <span>Description</span>
        <span>Cards</span>
      </div>

      {#each groups.items as group (group.groupId)}
        <div class:groups-page__row-shell--swiped={swipedGroupId === group.groupId} class="groups-page__row-shell">
          <button
            type="button"
            class="groups-page__row"
            on:click={() => handleRowClick(group.groupId)}
            on:touchstart={handleTouchStart}
            on:touchend={(event) => handleTouchEnd(event, group.groupId)}
          >
            <div class="groups-page__name stack" style="--stack-space: var(--space-1)">
              <h2>{group.groupName}</h2>
              <p class="groups-page__mobile-count">{group.activeCardCount}</p>
            </div>
            <p class="groups-page__description">{group.description ?? 'No description yet.'}</p>
            <p class="groups-page__count">{group.activeCardCount}</p>
          </button>

          <button
            type="button"
            class="groups-page__delete"
            aria-label={`Delete ${group.groupName}`}
            on:click={() => requestDelete(group)}
          >
            {isMobileViewport ? 'Delete' : 'Delete'}
          </button>
        </div>
      {/each}
    </section>
  {/if}
</section>

{#if createDrawerOpen}
  <button
    type="button"
    class="groups-page__backdrop"
    aria-label="Close new group drawer"
    on:click={closeCreateDrawer}
  ></button>

  <div
    bind:this={drawerElement}
    class="groups-page__drawer stack"
    style="--stack-space: var(--space-4)"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="new-group-title"
    on:keydown={handleDrawerKeydown}
  >
    <header class="groups-page__drawer-header cluster">
      <h2 id="new-group-title">New Group</h2>
      <button type="button" class="groups-page__drawer-close" aria-label="Close drawer" on:click={closeCreateDrawer}>
        x
      </button>
    </header>

    <form class="stack" style="--stack-space: var(--space-4)" on:submit={handleCreateGroup}>
      <label class="groups-page__field stack" style="--stack-space: var(--space-2)">
        <span class="groups-page__label">Group name *</span>
        <input
          bind:this={groupNameInput}
          bind:value={groupName}
          class="groups-page__control"
          type="text"
          placeholder='e.g. "Daily Conversations"'
          disabled={createPending}
        />
      </label>

      <label class="groups-page__field stack" style="--stack-space: var(--space-2)">
        <span class="groups-page__label">Description (optional)</span>
        <textarea
          bind:value={groupDescription}
          class="groups-page__control groups-page__control--textarea"
          rows="4"
          placeholder="Optional description..."
          disabled={createPending}
        ></textarea>
      </label>

      {#if createErrorMessage}
        <p class="groups-page__error" role="alert">{createErrorMessage}</p>
      {/if}

      <button
        type="submit"
        class="groups-page__submit"
        disabled={createPending || groupName.trim().length === 0}
      >
        {createPending ? 'Creating...' : 'Create Group'}
      </button>
    </form>
  </div>
{/if}

{#if deleteTarget}
  <div class="groups-page__dialog-backdrop">
    <section class="groups-page__dialog stack" style="--stack-space: var(--space-3)" role="alertdialog" aria-modal="true">
      <h2>Delete "{deleteTarget.groupName}"?</h2>
      <p>{buildDeleteGroupMessage(deleteTarget)}</p>
      <div class="groups-page__dialog-actions cluster">
        <button
          type="button"
          class="groups-page__dialog-button"
          disabled={deletePendingGroupId !== null}
          on:click={() => {
            deleteTarget = null;
          }}
        >
          Cancel
        </button>
        <button
          type="button"
          class="groups-page__dialog-button groups-page__dialog-button--danger"
          disabled={deletePendingGroupId !== null}
          on:click={confirmDelete}
        >
          {deletePendingGroupId === deleteTarget.groupId ? 'Deleting...' : 'Delete Group'}
        </button>
      </div>
    </section>
  </div>
{/if}

<style>
  .groups-page {
    padding: calc(var(--shell-header-height) + var(--space-5)) var(--space-4) calc(var(--space-7) + 4.5rem);
  }

  .groups-page__header,
  .groups-page__drawer-header,
  .groups-page__dialog-actions {
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .groups-page__eyebrow,
  .groups-page__description,
  .groups-page__count,
  .groups-page__mobile-count,
  .groups-page__feedback-title {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
  }

  .groups-page__eyebrow {
    margin: 0;
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .groups-page h1,
  .groups-page h2,
  .groups-page p {
    margin: 0;
  }

  .groups-page__new-button,
  .groups-page__state-cta,
  .groups-page__submit,
  .groups-page__dialog-button {
    min-block-size: 2.75rem;
    padding-inline: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
  }

  .groups-page__new-button,
  .groups-page__submit {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .groups-page__columns {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 2.2fr) auto;
    gap: var(--space-3);
    padding: 0 var(--space-4) var(--space-2);
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .groups-page__row-shell {
    position: relative;
    overflow: hidden;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    transition:
      border-color var(--duration-fast) var(--ease-standard),
      background var(--duration-fast) var(--ease-standard);
  }

  .groups-page__row-shell:hover,
  .groups-page__row-shell:focus-within {
    border-color: var(--color-border);
    background: color-mix(in srgb, var(--color-surface-raised) 45%, var(--color-surface));
  }

  .groups-page__row {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 2.2fr) auto;
    gap: var(--space-3);
    align-items: center;
    inline-size: 100%;
    padding: var(--space-4);
    border: 0;
    background: transparent;
    color: inherit;
    text-align: start;
  }

  .groups-page__name h2 {
    font-size: var(--font-size-h4);
  }

  .groups-page__description {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
    line-clamp: 1;
  }

  .groups-page__count {
    justify-self: end;
  }

  .groups-page__mobile-count {
    display: none;
  }

  .groups-page__delete {
    position: absolute;
    inset-block: 0;
    inset-inline-end: 0;
    inline-size: 5rem;
    border: 0;
    background: color-mix(in srgb, var(--color-danger-text) 12%, var(--color-surface));
    color: var(--color-danger-text);
    font-family: var(--font-ui);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--duration-fast) var(--ease-standard);
  }

  .groups-page__row-shell:hover .groups-page__delete,
  .groups-page__row-shell:focus-within .groups-page__delete {
    opacity: 1;
    pointer-events: auto;
  }

  .groups-page__state,
  .groups-page__feedback,
  .groups-page__dialog {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .groups-page__state,
  .groups-page__dialog {
    text-align: center;
  }

  .groups-page__feedback-title {
    color: var(--color-error-text);
    font-size: var(--font-size-small);
    font-weight: 600;
  }

  .groups-page__backdrop {
    position: fixed;
    inset: 0;
    z-index: 52;
    border: 0;
    background: color-mix(in srgb, var(--neutral-900) 14%, transparent);
  }

  .groups-page__drawer {
    position: fixed;
    inset-block: 0;
    inset-inline-end: 0;
    z-index: 53;
    inline-size: min(30rem, 100vw);
    padding: var(--space-4);
    border-inline-start: 1px solid var(--color-border);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-lg);
  }

  .groups-page__drawer-header {
    position: sticky;
    inset-block-start: 0;
    padding-block-end: var(--space-2);
    border-block-end: 1px solid var(--color-border);
    background: var(--color-surface-raised);
  }

  .groups-page__drawer-close {
    border: 0;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: var(--font-size-h4);
  }

  .groups-page__label {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .groups-page__control {
    inline-size: 100%;
    min-block-size: 2.75rem;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
  }

  .groups-page__control--textarea {
    resize: vertical;
  }

  .groups-page__error {
    color: var(--color-danger-text);
    font-family: var(--font-ui);
  }

  .groups-page__dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 54;
    display: grid;
    place-items: center;
    padding: var(--space-4);
    background: color-mix(in srgb, var(--neutral-900) 28%, transparent);
  }

  .groups-page__dialog {
    inline-size: min(100%, 24rem);
  }

  .groups-page__dialog-button--danger {
    border-color: var(--color-danger-text);
    background: color-mix(in srgb, var(--color-danger-text) 10%, var(--color-surface));
    color: var(--color-danger-text);
  }

  .groups-page__new-button:focus-visible,
  .groups-page__state-cta:focus-visible,
  .groups-page__submit:focus-visible,
  .groups-page__dialog-button:focus-visible,
  .groups-page__row:focus-visible,
  .groups-page__delete:focus-visible,
  .groups-page__drawer-close:focus-visible,
  .groups-page__control:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (max-width: 900px) {
    .groups-page {
      padding-inline: var(--space-3);
    }

    .groups-page__columns {
      display: none;
    }

    .groups-page__row-shell--swiped .groups-page__row {
      transform: translateX(-5rem);
    }

    .groups-page__row {
      grid-template-columns: 1fr;
      align-items: start;
      transition: transform var(--duration-fast) var(--ease-standard);
    }

    .groups-page__name {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-3);
    }

    .groups-page__count {
      display: none;
    }

    .groups-page__mobile-count {
      display: inline;
    }

    .groups-page__delete {
      opacity: 1;
      pointer-events: auto;
    }

    .groups-page__drawer {
      inline-size: 100vw;
      border-inline-start: 0;
      padding-block-end: calc(var(--space-5) + env(safe-area-inset-bottom));
    }
  }
</style>
