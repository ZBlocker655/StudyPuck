<script lang="ts">
  import { browser } from '$app/environment';
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { onMount, tick } from 'svelte';
  import { createInboxNoteRequest } from '$lib/card-entry/client.js';
  import { resolveCardEntryCommandResponse } from '$lib/command-bar/card-entry.js';
  import { cardEntryShellCounts } from '$lib/stores/cardEntryShell.js';
  import { cardEntryUi } from '$lib/stores/cardEntryUi.js';
  import {
    commandBar,
    getFilteredCommandGroups,
    type CommandDefinition,
  } from '$lib/stores/commandBar.js';

  let { children } = $props<{ children: import('svelte').Snippet }>();

  let inputElement: HTMLTextAreaElement | null = null;
  let desktopTrackElement: HTMLDivElement | null = null;
  let isDesktop = false;
  let isPointerDragging = false;
  let pointerStartX = 0;
  let pointerStartWidth = 62;

  const desktopQuery = '(min-width: 64rem)';
  let mediaQueryList: MediaQueryList | null = null;

  $effect(() => {
    commandBar.setPathname($page.url.pathname);
  });

  const commandGroups = $derived(
    getFilteredCommandGroups($commandBar.routeContext.commandContext, $commandBar.input),
  );
  const visibleCommands = $derived(commandGroups.flatMap((group) => group.commands));
  const autocompleteVisible = $derived($commandBar.autocompleteOpen && visibleCommands.length > 0);
  const safeHighlightedIndex = $derived(
    visibleCommands.length ? Math.min($commandBar.highlightedIndex, visibleCommands.length - 1) : 0,
  );
  const highlightedCommand = $derived(visibleCommands[safeHighlightedIndex] ?? null);
  const showDesktopConversation = $derived(!$commandBar.desktopConversationCollapsed);
  const showMobileConversation = $derived(
    !isDesktop && $commandBar.mobileSheetOpen && ($commandBar.messages.length > 0 || $commandBar.isWaiting),
  );

  function updateDesktopMode() {
    isDesktop = mediaQueryList?.matches ?? false;
  }

  function resizeInput() {
    if (!inputElement) {
      return;
    }

    inputElement.style.height = 'auto';
    inputElement.style.height = `${Math.min(inputElement.scrollHeight, 112)}px`;
  }

  function focusInput(moveCursorToEnd = false) {
    if (!inputElement) {
      return;
    }

    inputElement.focus();

    if (moveCursorToEnd) {
      const length = inputElement.value.length;
      inputElement.setSelectionRange(length, length);
    }
  }

  function isEditableElement(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return (
      target instanceof HTMLInputElement ||
      target instanceof HTMLTextAreaElement ||
      target.isContentEditable ||
      Boolean(target.closest('[contenteditable="true"]'))
    );
  }

  async function handleGlobalKeydown(event: KeyboardEvent) {
    if (
      event.key !== '/' ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      isEditableElement(event.target)
    ) {
      return;
    }

    event.preventDefault();
    commandBar.setFocused(true);
    commandBar.setInput('/');
    await tick();
    resizeInput();
    focusInput(true);
  }

  function handleInput(event: Event) {
    const target = event.currentTarget as HTMLTextAreaElement;
    commandBar.setInput(target.value);
    resizeInput();
  }

  function handleFocus() {
    commandBar.setFocused(true);
    resizeInput();
  }

  function handleBlur() {
    commandBar.setFocused(false);
  }

  function selectCommand(command: CommandDefinition) {
    commandBar.selectCommand(command);

    tick().then(() => {
      resizeInput();
      focusInput(true);
    });
  }

  function shouldSelectAutocompleteOnEnter() {
    if (!autocompleteVisible || !highlightedCommand) {
      return false;
    }

    const trimmedInput = $commandBar.input.trim();

    if (
      trimmedInput === highlightedCommand.command ||
      trimmedInput.startsWith(`${highlightedCommand.command} `)
    ) {
      return false;
    }

    return true;
  }

  function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    if (shouldSelectAutocompleteOnEnter() && highlightedCommand) {
      selectCommand(highlightedCommand);
      return;
    }

    submitCommandBar();

    tick().then(() => {
      resizeInput();
      focusInput();
    });
  }

  function submitCommandBar() {
    if (inputElement) {
      commandBar.setInput(inputElement.value);
    }

    commandBar.submit((input) =>
      resolveCardEntryCommandResponse({
        input,
        activeLanguageCode: $page.params.lang,
        createNote: createInboxNoteRequest,
        openQuickAdd: (request) => cardEntryUi.openQuickAdd(request),
        onNoteCreated: async () => {
          cardEntryShellCounts.adjustCount($page.params.lang, 1);
          await invalidateAll();
        },
      })
    );
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && autocompleteVisible) {
      event.preventDefault();
      commandBar.closeAutocomplete();
      return;
    }

    if (!autocompleteVisible) {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        submitCommandBar();
        return;
      }

      if (event.key === 'Escape' && !isDesktop) {
        commandBar.closeMobileSheet();
      }

      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      commandBar.moveSelection(visibleCommands.length, 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      commandBar.moveSelection(visibleCommands.length, -1);
      return;
    }

    if (event.key === 'Tab' && highlightedCommand) {
      event.preventDefault();
      selectCommand(highlightedCommand);
      return;
    }

    if (event.key === 'Enter' && shouldSelectAutocompleteOnEnter() && highlightedCommand) {
      event.preventDefault();
      selectCommand(highlightedCommand);
      return;
    }

    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitCommandBar();
    }
  }

  function beginPointerResize(event: PointerEvent) {
    if (!isDesktop || !desktopTrackElement) {
      return;
    }

    isPointerDragging = true;
    pointerStartX = event.clientX;
    pointerStartWidth = $commandBar.desktopContextWidth;
  }

  function handlePointerMove(event: PointerEvent) {
    if (!isPointerDragging || !desktopTrackElement) {
      return;
    }

    const bounds = desktopTrackElement.getBoundingClientRect();
    const deltaPercent = ((event.clientX - pointerStartX) / bounds.width) * 100;
    commandBar.setDesktopContextWidth(pointerStartWidth + deltaPercent);
  }

  function handlePointerUp() {
    if (!isPointerDragging) {
      return;
    }

    isPointerDragging = false;
  }

  function handleAutocompleteMouseDown(event: MouseEvent) {
    event.preventDefault();
  }

  onMount(() => {
    if (!browser) {
      return;
    }

    mediaQueryList = window.matchMedia(desktopQuery);
    updateDesktopMode();
    mediaQueryList.addEventListener('change', updateDesktopMode);
    document.addEventListener('keydown', handleGlobalKeydown);
    resizeInput();

    return () => {
      mediaQueryList?.removeEventListener('change', updateDesktopMode);
      document.removeEventListener('keydown', handleGlobalKeydown);
    };
  });
</script>

<div class="workspace-shell">
  <div
    class="workspace-shell__desktop"
    class:workspace-shell__desktop--collapsed={!showDesktopConversation}
    bind:this={desktopTrackElement}
    style={`--workspace-context-width: ${$commandBar.desktopContextWidth}%;`}
    onpointermove={handlePointerMove}
    onpointerup={handlePointerUp}
    onpointercancel={handlePointerUp}
    onpointerleave={handlePointerUp}
  >
    <main id="main-content" class="workspace-pane workspace-pane--context" aria-label="Context view">
      <div class="workspace-pane__inner">
        {@render children()}
      </div>
    </main>

    <div
      class="workspace-divider"
      hidden={!showDesktopConversation}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize conversation and context views"
    >
      <button
        type="button"
        class="workspace-divider__swap"
        aria-label="Swap conversation and context view"
        onclick={() => commandBar.togglePaneDominance()}
      >
        ⇄
      </button>

      <button
        type="button"
        class="workspace-divider__rail"
        aria-label="Resize conversation and context view"
        onpointerdown={beginPointerResize}
      ></button>
    </div>

    {#if showDesktopConversation}
      <aside class="workspace-pane workspace-pane--conversation" aria-label="Conversation view">
        <header class="conversation-header cluster">
          <div class="stack conversation-header__copy" style="--stack-space: var(--space-1)">
            <p class="conversation-header__eyebrow">Conversation</p>
            <h2>{$commandBar.routeContext.label}</h2>
          </div>

          <div class="cluster conversation-header__actions">
            <button
              type="button"
              class="conversation-header__button"
              aria-label="Swap conversation and context view"
              onclick={() => commandBar.togglePaneDominance()}
            >
              ⇄
            </button>
            <button
              type="button"
              class="conversation-header__button"
              aria-label="Collapse conversation view"
              onclick={() => commandBar.collapseConversation()}
            >
              Collapse
            </button>
          </div>
        </header>

        <div class="conversation-thread" aria-live="polite" aria-atomic="false">
          {#if $commandBar.messages.length === 0 && !$commandBar.isWaiting}
            <div class="conversation-empty stack" style="--stack-space: var(--space-2)">
              <p class="conversation-empty__title">No conversation yet</p>
              <p class="text-muted">Responses will appear here after you send a message or run a conversational command.</p>
            </div>
          {/if}

          {#each $commandBar.messages as message}
            <article
              class="message"
              class:message--user={message.role === 'user'}
              class:message--assistant={message.role !== 'user'}
            >
              <p class="message__label">{message.role === 'user' ? 'You' : 'StudyPuck'}</p>
              <p>{message.content}</p>
            </article>
          {/each}

          {#if $commandBar.isWaiting}
            <article class="message message--assistant">
              <p class="message__label">StudyPuck</p>
              <p class="message__thinking"><span class="message__spinner" aria-hidden="true"></span>Thinking...</p>
            </article>
          {/if}
        </div>
      </aside>
    {:else}
      <button
        type="button"
        class="conversation-strip"
        aria-label="Open conversation view"
        onclick={() => commandBar.openConversation()}
      >
        <span aria-hidden="true">💬</span>
        {#if $commandBar.unreadCount > 0}
          <span class="conversation-strip__badge">{$commandBar.unreadCount}</span>
        {/if}
      </button>
    {/if}
  </div>

  {#if showMobileConversation}
    <button
      type="button"
      class="conversation-backdrop"
      aria-label="Dismiss conversation sheet"
      onclick={() => commandBar.closeMobileSheet()}
    ></button>

    <section class="conversation-sheet stack" style="--stack-space: var(--space-3)" aria-label="Conversation sheet">
      <button
        type="button"
        class="conversation-sheet__handle"
        aria-label="Dismiss conversation sheet"
        onclick={() => commandBar.closeMobileSheet()}
      >
        <span aria-hidden="true"></span>
      </button>

      <div class="conversation-sheet__thread" aria-live="polite" aria-atomic="false">
        {#each $commandBar.messages as message}
          <article
            class="message"
            class:message--user={message.role === 'user'}
            class:message--assistant={message.role !== 'user'}
          >
            <p class="message__label">{message.role === 'user' ? 'You' : 'StudyPuck'}</p>
            <p>{message.content}</p>
          </article>
        {/each}

        {#if $commandBar.isWaiting}
          <article class="message message--assistant">
            <p class="message__label">StudyPuck</p>
            <p class="message__thinking"><span class="message__spinner" aria-hidden="true"></span>Thinking...</p>
          </article>
        {/if}
      </div>
    </section>
  {/if}

  <div class="command-bar-wrap">
    {#if autocompleteVisible}
      <section class="autocomplete-panel stack" style="--stack-space: var(--space-3)" aria-label="Command autocomplete">
        {#each commandGroups as group}
          <div class="stack autocomplete-group" style="--stack-space: var(--space-2)">
            {#if group.label === 'Global' && commandGroups.length > 1}
              <p class="autocomplete-group__label">{group.label}</p>
            {/if}

            <div class="stack" style="--stack-space: var(--space-1)">
              {#each group.commands as command}
                <button
                  type="button"
                  class="autocomplete-item"
                  class:autocomplete-item--active={highlightedCommand?.command === command.command && highlightedCommand?.description === command.description}
                  onmousedown={handleAutocompleteMouseDown}
                  onclick={() => selectCommand(command)}
                >
                  <span class="autocomplete-item__command">{command.command}</span>
                  <span class="autocomplete-item__description">{command.description}</span>
                </button>
              {/each}
            </div>
          </div>
        {/each}
      </section>
    {/if}

    <form class="command-bar" onsubmit={handleSubmit}>
      <div class="command-bar__context">
        <span class="command-bar__context-label">Context</span>
        <span class="command-bar__context-value">{$commandBar.routeContext.label}</span>
      </div>

      <label class="command-bar__field">
        <span class="visually-hidden">Command bar</span>
        <textarea
          bind:this={inputElement}
          class="command-bar__input"
          value={$commandBar.input}
          rows="1"
          placeholder="Ask anything, or type / for commands..."
          disabled={$commandBar.isWaiting}
          oninput={handleInput}
          onfocus={handleFocus}
          onblur={handleBlur}
          onkeydown={handleKeydown}
        ></textarea>
      </label>

      {#if $commandBar.isWaiting}
        <button type="button" class="command-bar__submit command-bar__submit--cancel" onclick={() => commandBar.cancelPending()}>
          Cancel
        </button>
      {:else}
        <button type="submit" class="command-bar__submit" aria-label="Submit command">
          ↵
        </button>
      {/if}
    </form>
  </div>
</div>

<style>
  .workspace-shell {
    position: relative;
  }

  .workspace-shell__desktop {
    min-block-size: 100vh;
  }

  .workspace-pane--context {
    min-inline-size: 0;
  }

  .workspace-pane__inner {
    min-block-size: 100%;
  }

  .conversation-strip {
    display: none;
  }

  .conversation-backdrop,
  .conversation-sheet {
    display: none;
  }

  .command-bar-wrap {
    position: fixed;
    inset-inline: 0;
    inset-block-end: calc(var(--shell-mobile-nav-height) + env(safe-area-inset-bottom));
    z-index: 34;
    padding: var(--space-3);
  }

  .autocomplete-panel {
    margin-block-end: var(--space-2);
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-md);
  }

  .autocomplete-group__label {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .autocomplete-item {
    display: grid;
    grid-template-columns: minmax(5rem, 6rem) 1fr;
    gap: var(--space-2);
    align-items: start;
    inline-size: 100%;
    min-block-size: 2.75rem;
    padding: var(--space-2) var(--space-3);
    border: 0;
    border-radius: var(--radius-md);
    background: transparent;
    color: var(--color-text-primary);
    text-align: start;
  }

  .autocomplete-item--active {
    background: var(--color-primary-subtle);
    color: var(--color-primary-text);
  }

  .autocomplete-item__command {
    font-family: var(--font-ui);
    font-weight: 600;
  }

  .autocomplete-item__description {
    color: var(--color-text-secondary);
    font-size: var(--font-size-ui);
  }

  .command-bar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: var(--space-3);
    align-items: end;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--color-background) 92%, transparent);
    box-shadow: var(--shadow-md);
    backdrop-filter: blur(12px);
  }

  .command-bar__context {
    display: none;
  }

  .command-bar__context-label,
  .command-bar__context-value {
    display: block;
  }

  .command-bar__context-label {
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .command-bar__context-value {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .command-bar__field {
    display: block;
    min-inline-size: 0;
  }

  .command-bar__input {
    inline-size: 100%;
    min-block-size: 2.75rem;
    max-block-size: 7rem;
    resize: none;
    overflow: auto;
    padding: var(--space-3) 0;
    border: 0;
    background: transparent;
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    line-height: 1.4;
  }

  .command-bar__input::placeholder {
    color: var(--color-text-muted);
  }

  .command-bar__input:focus {
    outline: 0;
  }

  .command-bar:focus-within {
    border-color: var(--color-primary);
    box-shadow:
      0 0 0 2px color-mix(in srgb, var(--color-primary) 18%, transparent),
      var(--shadow-md);
  }

  .command-bar__submit {
    inline-size: 2.75rem;
    min-block-size: 2.75rem;
    border: 0;
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: var(--color-text-inverse);
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    font-weight: 600;
  }

  .command-bar__submit--cancel {
    inline-size: auto;
    padding-inline: var(--space-3);
    background: var(--color-surface);
    color: var(--color-text-primary);
    border: 1px solid var(--color-border);
  }

  .message {
    max-inline-size: min(32rem, 100%);
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .message--user {
    margin-inline-start: auto;
    background: var(--color-primary-subtle);
    border-color: color-mix(in srgb, var(--color-primary) 20%, var(--color-border));
  }

  .message__label {
    margin: 0 0 var(--space-1) 0;
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .message p:last-child {
    margin-block-end: 0;
  }

  .message__thinking {
    display: inline-flex;
    gap: var(--space-2);
    align-items: center;
  }

  .message__spinner {
    inline-size: 0.75rem;
    block-size: 0.75rem;
    border: 2px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: command-bar-spin 800ms linear infinite;
  }

  .conversation-header {
    justify-content: space-between;
    margin-block-end: var(--space-4);
  }

  .conversation-header__copy h2,
  .conversation-header__copy p {
    margin: 0;
  }

  .conversation-header__eyebrow {
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .conversation-header__actions {
    --cluster-space: var(--space-2);
  }

  .conversation-header__button {
    min-block-size: 2.25rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
  }

  .conversation-thread,
  .conversation-sheet__thread {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    min-block-size: 0;
    overflow: auto;
  }

  .conversation-empty {
    justify-content: center;
    min-block-size: 100%;
    padding: var(--space-6);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--color-surface) 80%, transparent);
  }

  .conversation-empty__title {
    margin: 0;
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    font-weight: 600;
  }

  @media (prefers-reduced-motion: reduce) {
    .message__spinner {
      animation: none;
    }
  }

  @media (min-width: 64rem) {
    .workspace-shell__desktop {
      display: grid;
      grid-template-columns:
        minmax(0, var(--workspace-context-width))
        auto
        minmax(18rem, calc(100% - var(--workspace-context-width)));
      min-block-size: 100vh;
      padding-block-start: calc(var(--shell-header-height) + var(--space-4));
      padding-inline-start: calc(var(--shell-sidebar-width) + var(--space-4));
      padding-inline-end: var(--space-4);
      padding-block-end: calc(6.5rem + var(--space-4));
    }

    .workspace-shell__desktop--collapsed {
      grid-template-columns: minmax(0, 1fr) 0 2.75rem;
    }

    .workspace-pane--context,
    .workspace-pane--conversation {
      min-block-size: calc(100vh - var(--shell-header-height) - 6.5rem - var(--space-8));
      overflow: auto;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-subtle);
    }

    .workspace-pane--conversation {
      padding: var(--space-4);
      background: var(--color-surface);
    }

    .workspace-divider {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: var(--space-3);
      padding-inline: var(--space-2);
    }

    .workspace-divider__swap {
      inline-size: 2rem;
      block-size: 2rem;
      border: 1px solid var(--color-border);
      border-radius: 999px;
      background: var(--color-surface);
      color: var(--color-text-secondary);
      font-family: var(--font-ui);
      font-size: var(--font-size-caption);
    }

    .workspace-divider__rail {
      inline-size: 0.5rem;
      block-size: 6rem;
      border: 0;
      border-radius: 999px;
      background: color-mix(in srgb, var(--color-border) 75%, transparent);
      cursor: col-resize;
    }

    .conversation-strip {
      display: grid;
      place-items: center;
      gap: var(--space-2);
      block-size: calc(100vh - var(--shell-header-height) - 8rem);
      margin-block-start: calc(var(--shell-header-height) + var(--space-4));
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface);
      color: var(--color-text-primary);
      box-shadow: var(--shadow-sm);
    }

    .conversation-strip__badge {
      display: inline-grid;
      place-items: center;
      min-inline-size: 1.25rem;
      min-block-size: 1.25rem;
      padding-inline: 0.25rem;
      border-radius: 999px;
      background: var(--color-primary);
      color: var(--color-text-inverse);
      font-family: var(--font-ui);
      font-size: var(--font-size-caption);
    }

    .command-bar-wrap {
      inset-inline-start: calc(var(--shell-sidebar-width) + var(--space-4));
      inset-inline-end: var(--space-4);
      inset-block-end: var(--space-4);
      padding: 0;
    }

    .command-bar {
      grid-template-columns: auto 1fr auto;
      min-block-size: 4.25rem;
    }

    .command-bar__context {
      display: block;
      min-inline-size: 9rem;
      padding-inline-end: var(--space-3);
      border-inline-end: 1px solid var(--color-border);
    }

    .command-bar__submit {
      display: none;
    }
  }

  @media (max-width: 63.999rem) {
    .workspace-divider,
    .workspace-pane--conversation,
    .conversation-strip {
      display: none !important;
    }

    .workspace-shell__desktop {
      padding-block-start: calc(var(--shell-header-height) + var(--space-4));
      padding-block-end: calc(var(--shell-mobile-nav-height) + 6rem + env(safe-area-inset-bottom));
    }

    .command-bar {
      min-block-size: 3.75rem;
    }

    .conversation-backdrop {
      position: fixed;
      inset: 0;
      z-index: 36;
      display: block;
      border: 0;
      background: color-mix(in srgb, var(--neutral-900) 20%, transparent);
    }

    .conversation-sheet {
      position: fixed;
      inset-inline: var(--space-3);
      inset-block-end: calc(var(--shell-mobile-nav-height) + 5.5rem + env(safe-area-inset-bottom));
      z-index: 37;
      display: flex;
      max-block-size: min(60vh, 32rem);
      padding: var(--space-3);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-surface-raised);
      box-shadow: var(--shadow-lg);
    }

    .conversation-sheet__handle {
      align-self: center;
      inline-size: 100%;
      block-size: 1.25rem;
      border: 0;
      background: transparent;
    }

    .conversation-sheet__handle span {
      display: block;
      inline-size: 3rem;
      block-size: 0.25rem;
      margin-inline: auto;
      border-radius: 999px;
      background: var(--color-border);
    }
  }

  @keyframes command-bar-spin {
    to {
      transform: rotate(1turn);
    }
  }
</style>
