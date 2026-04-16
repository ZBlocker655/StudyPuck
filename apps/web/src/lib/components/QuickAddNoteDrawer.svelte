<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { page } from '$app/stores';
  import { tick } from 'svelte';
  import { createInboxNoteRequest } from '$lib/card-entry/client.js';
  import { getLanguageByCode, type SupportedLanguage } from '$lib/config/languages.js';
  import { cardEntryShellCounts } from '$lib/stores/cardEntryShell.js';
  import { cardEntryUi } from '$lib/stores/cardEntryUi.js';

  let drawerElement: HTMLElement | null = null;
  let noteField: HTMLTextAreaElement | null = null;
  let initializedRequestId = 0;
  let noteContent = '';
  let selectedLanguageCode = '';
  let errorMessage = '';
  let isSubmitting = false;

  $: availableLanguages =
    (($page.data as { availableLanguages?: SupportedLanguage[] }).availableLanguages ?? []).length > 0
      ? (($page.data as { availableLanguages?: SupportedLanguage[] }).availableLanguages ?? [])
      : [getLanguageByCode($page.params.lang)].filter(
          (language): language is SupportedLanguage => Boolean(language)
        );

  $: if ($cardEntryUi.quickAddOpen && initializedRequestId !== $cardEntryUi.requestId) {
    initializedRequestId = $cardEntryUi.requestId;
    selectedLanguageCode = $cardEntryUi.languageCode ?? availableLanguages[0]?.code ?? $page.params.lang;
    noteContent = $cardEntryUi.initialContent;
    errorMessage = '';
    isSubmitting = false;

    tick().then(() => {
      noteField?.focus();
    });
  }

  function closeDrawer() {
    if (isSubmitting) {
      return;
    }

    errorMessage = '';
    cardEntryUi.closeQuickAdd();
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    if ($cardEntryUi.quickAddOpen && event.key === 'Escape') {
      event.preventDefault();
      closeDrawer();
    }
  }

  function handleDrawerKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !drawerElement) {
      return;
    }

    const focusableElements = Array.from(
      drawerElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], textarea:not([disabled]), select:not([disabled]), input:not([disabled])'
      )
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

  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    isSubmitting = true;
    errorMessage = '';

    try {
      const targetLanguageCode = selectedLanguageCode || $page.params.lang || availableLanguages[0]?.code;

      if (!targetLanguageCode) {
        throw new Error('A language must be selected before adding a note.');
      }

      await createInboxNoteRequest({
        languageId: targetLanguageCode,
        content: noteContent,
      });

      cardEntryShellCounts.adjustCount(targetLanguageCode, 1);
      cardEntryUi.closeQuickAdd();
      noteContent = '';
      await invalidateAll();
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'The note could not be added right now.';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:window onkeydown={handleWindowKeydown} />

{#if $cardEntryUi.quickAddOpen}
  <button
    type="button"
    class="quick-add-backdrop"
    aria-label="Close quick add note drawer"
    onclick={closeDrawer}
  ></button>

  <div
    bind:this={drawerElement}
    class="quick-add-drawer stack"
    style="--stack-space: var(--space-4)"
    role="dialog"
    tabindex="-1"
    aria-modal="true"
    aria-labelledby="quick-add-title"
    onkeydown={handleDrawerKeydown}
  >
    <div class="quick-add-drawer__handle" aria-hidden="true"></div>

    <header class="quick-add-drawer__header cluster">
      <h2 id="quick-add-title">Add Note</h2>
      <button
        type="button"
        class="quick-add-drawer__close"
        aria-label="Close drawer"
        onclick={closeDrawer}
      >
        ✕
      </button>
    </header>

    {#if availableLanguages.length > 1}
      <label class="field stack" style="--stack-space: var(--space-2)">
        <span class="field__label">Language</span>
        <select bind:value={selectedLanguageCode} class="field__control" disabled={isSubmitting}>
          {#each availableLanguages as language}
            <option value={language.code}>{language.label}</option>
          {/each}
        </select>
      </label>
    {/if}

    <form method="POST" class="stack" style="--stack-space: var(--space-4)" onsubmit={handleSubmit}>
      <label class="field stack" style="--stack-space: var(--space-2)">
        <span class="field__label">Note</span>
        <textarea
          bind:this={noteField}
          bind:value={noteContent}
          class="field__control field__control--textarea"
          name="content"
          rows="5"
          placeholder="Type or paste your note..."
          disabled={isSubmitting}
        ></textarea>
      </label>

      {#if errorMessage}
        <p class="field__error" role="alert">{errorMessage}</p>
      {/if}

      <div class="quick-add-drawer__actions cluster">
        <button
          type="submit"
          class="quick-add-drawer__submit"
          disabled={isSubmitting || noteContent.trim().length === 0}
        >
          {isSubmitting ? 'Adding...' : 'Add to Inbox'}
        </button>
        <button type="button" class="quick-add-drawer__cancel" onclick={closeDrawer} disabled={isSubmitting}>
          Cancel
        </button>
      </div>
    </form>
  </div>
{/if}

<style>
  .quick-add-backdrop {
    position: fixed;
    inset: 0;
    z-index: 52;
    border: 0;
    background: color-mix(in srgb, var(--neutral-900) 14%, transparent);
  }

  .quick-add-drawer {
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

  .quick-add-drawer__handle {
    display: none;
  }

  .quick-add-drawer__header,
  .quick-add-drawer__actions {
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .quick-add-drawer__header {
    position: sticky;
    inset-block-start: 0;
    padding-block-end: var(--space-2);
    border-block-end: 1px solid var(--color-border);
    background: var(--color-surface-raised);
  }

  .quick-add-drawer__header h2 {
    margin: 0;
    font-size: var(--font-size-h3);
  }

  .quick-add-drawer__close,
  .quick-add-drawer__cancel,
  .quick-add-drawer__submit,
  .field__control {
    font-family: var(--font-ui);
  }

  .quick-add-drawer__close {
    border: 0;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: var(--font-size-h4);
  }

  .quick-add-drawer__submit,
  .quick-add-drawer__cancel {
    min-block-size: 2.75rem;
    padding-inline: var(--space-4);
    border-radius: var(--radius-md);
  }

  .quick-add-drawer__submit {
    border: 1px solid var(--color-primary);
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .quick-add-drawer__cancel {
    border: 1px solid transparent;
    background: transparent;
    color: var(--color-text-secondary);
  }

  .field__label {
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .field__control {
    inline-size: 100%;
    min-block-size: 2.75rem;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .field__control--textarea {
    resize: vertical;
  }

  .field__error {
    margin: 0;
    color: var(--color-danger-text, #8b1a1a);
    font-family: var(--font-ui);
  }

  .quick-add-drawer__close:focus-visible,
  .quick-add-drawer__cancel:focus-visible,
  .quick-add-drawer__submit:focus-visible,
  .field__control:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (max-width: 63.99rem) {
    .quick-add-drawer {
      inline-size: 100vw;
      padding-block-end: calc(var(--space-5) + env(safe-area-inset-bottom));
      border-inline-start: 0;
    }

    .quick-add-drawer__handle {
      display: block;
      inline-size: 3rem;
      block-size: 0.25rem;
      margin-inline: auto;
      border-radius: var(--radius-lg);
      background: var(--color-border);
    }

    .quick-add-drawer__actions {
      align-items: stretch;
      flex-direction: column;
    }

    .quick-add-drawer__submit,
    .quick-add-drawer__cancel {
      inline-size: 100%;
    }
  }
</style>
