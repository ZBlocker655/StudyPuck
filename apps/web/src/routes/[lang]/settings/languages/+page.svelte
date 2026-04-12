<script lang="ts">
  import type { ActionData, PageData } from './$types.js';
  import { page } from '$app/stores';
  import { SUPPORTED_LANGUAGES } from '$lib/config/languages.js';

  let { data, form } = $props<{ data: PageData; form?: ActionData }>();
  type LanguageSummary = PageData['languageSummaries'][number];

  const existingLanguageCodes = $derived(
    new Set(data.languageSummaries.map((language: LanguageSummary) => language.languageId))
  );

  let addLanguageOpen = $state(false);
  let removeLanguageOpen = $state(false);
  let selectedLanguageCode = $state(form?.selectedLanguageCode ?? '');
  let pendingRemovalLanguageId = $state<string | null>(null);
  let removeConfirmation = $state('');
  let removeNotice = $state('');

  const pendingRemovalLanguage = $derived(
    data.languageSummaries.find((language: LanguageSummary) => language.languageId === pendingRemovalLanguageId) ?? null
  );

  $effect(() => {
    if (form?.addLanguageError) {
      addLanguageOpen = true;
    }

    if (form?.selectedLanguageCode) {
      selectedLanguageCode = form.selectedLanguageCode;
    }
  });

  function openRemoveDialog(languageId: string) {
    pendingRemovalLanguageId = languageId;
    removeConfirmation = '';
    removeLanguageOpen = true;
  }

  function closeRemoveDialog() {
    removeLanguageOpen = false;
    pendingRemovalLanguageId = null;
    removeConfirmation = '';
  }

  function closeAddDialog() {
    addLanguageOpen = false;
    selectedLanguageCode = form?.selectedLanguageCode ?? '';
  }

  function getLanguageMark(languageCode: string) {
    switch (languageCode) {
      case 'zh':
        return '🇨🇳';
      case 'es':
        return '🇪🇸';
      case 'nl':
        return '🇳🇱';
      default:
        return '🌐';
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      if (addLanguageOpen) {
        closeAddDialog();
      }

      if (removeLanguageOpen) {
        closeRemoveDialog();
      }
    }
  }

  function handleRemovePlaceholder() {
    removeNotice = 'Language removal will be connected in a future milestone.';
    closeRemoveDialog();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
  <title>Settings – Languages – StudyPuck</title>
</svelte:head>

<section class="settings-screen stack">
  <header class="settings-section__header cluster">
    <div class="stack settings-section__copy">
      <h2>Your Languages</h2>
      <p class="text-muted">Manage the languages currently configured for your study workspace.</p>
    </div>

    <button type="button" class="secondary-button" onclick={() => (addLanguageOpen = true)}>
      + Add Language
    </button>
  </header>

  {#if form?.addLanguageError}
    <p class="status-message status-message--warning" role="alert">{form.addLanguageError}</p>
  {/if}

  {#if removeNotice}
    <p class="status-message">{removeNotice}</p>
  {/if}

  <div class="stack language-list">
    {#each data.languageSummaries as language}
      <article
        class:language-card--active={language.isActive}
        class="language-card stack"
      >
        <div class="cluster language-card__header">
          <div class="cluster language-card__title">
            <span class="language-card__mark" aria-hidden="true">{getLanguageMark(language.languageId)}</span>

            <div class="stack language-card__copy">
              <h3>{language.languageName}</h3>
              {#if language.isActive}
                <p class="language-card__active-label">← Active</p>
              {/if}
            </div>
          </div>
        </div>

        <p class="language-card__meta">
          {language.cardCount} {language.cardCount === 1 ? 'card' : 'cards'} • Last studied: {language.lastStudiedLabel}
        </p>

        <div class="cluster language-card__actions">
          {#if !language.isActive}
            <a class="secondary-button secondary-button--link" href={`/${language.languageId}/settings/languages`}>
              Set Active
            </a>
          {/if}

          <button type="button" class="danger-button" onclick={() => openRemoveDialog(language.languageId)}>
            Remove
          </button>
        </div>
      </article>
    {/each}
  </div>
</section>

{#if addLanguageOpen}
  <button type="button" class="dialog-backdrop" aria-label="Close add language dialog" onclick={closeAddDialog}></button>

  <div class="dialog stack" role="dialog" aria-modal="true" aria-labelledby="add-language-title">
    <div class="cluster dialog__header">
      <div class="stack dialog__copy">
        <h2 id="add-language-title">Add a Language</h2>
        <p class="text-muted">Choose another language to study.</p>
      </div>

      <button type="button" class="dialog__close" aria-label="Close add language dialog" onclick={closeAddDialog}>
        ✕
      </button>
    </div>

    <form method="POST" action="?/addLanguage" class="stack">
      <div class="language-picker">
        {#each SUPPORTED_LANGUAGES as language}
          {@const alreadyAdded = existingLanguageCodes.has(language.code)}
          <label class="language-picker__tile">
            <input
              bind:group={selectedLanguageCode}
              class="visually-hidden language-picker__input"
              type="radio"
              name="languageId"
              value={language.code}
              disabled={alreadyAdded}
            />

            <span
              class:language-picker__surface--disabled={alreadyAdded}
              class="language-picker__surface"
              aria-disabled={alreadyAdded}
            >
              <span class="language-picker__mark" aria-hidden="true">{getLanguageMark(language.code)}</span>
              <span class="language-picker__label">{language.label}</span>
              {#if language.nativeLabel}
                <span class="language-picker__native">{language.nativeLabel}</span>
              {/if}
              {#if alreadyAdded}
                <span class="language-picker__state">Already added ✓</span>
              {/if}
            </span>
          </label>
        {/each}
      </div>

      <div class="cluster dialog__actions">
        <button type="button" class="secondary-button" onclick={closeAddDialog}>Cancel</button>
        <button type="submit" class="primary-button" disabled={!selectedLanguageCode}>Add Language →</button>
      </div>
    </form>
  </div>
{/if}

{#if removeLanguageOpen && pendingRemovalLanguage}
  <button type="button" class="dialog-backdrop" aria-label="Close remove language dialog" onclick={closeRemoveDialog}></button>

  <div class="dialog stack" role="dialog" aria-modal="true" aria-labelledby="remove-language-title">
    <div class="stack dialog__copy">
      <h2 id="remove-language-title">Remove {pendingRemovalLanguage.languageName}?</h2>
      <p>
        This will eventually permanently delete:
      </p>
      <ul class="flow">
        <li>{pendingRemovalLanguage.cardCount} {pendingRemovalLanguage.cardCount === 1 ? 'flashcard' : 'flashcards'}</li>
        <li>All review history and SRS data</li>
        <li>All Translation Drill sessions</li>
      </ul>
      <p>To confirm the placeholder flow, type REMOVE below.</p>
    </div>

    <label class="stack dialog__field">
      <span class="dialog__field-label">Confirmation</span>
      <input bind:value={removeConfirmation} class="dialog__input" type="text" autocomplete="off" />
    </label>

    <div class="cluster dialog__actions">
      <button type="button" class="secondary-button" onclick={closeRemoveDialog}>Cancel</button>
      <button
        type="button"
        class="danger-button danger-button--solid"
        disabled={removeConfirmation.trim().toUpperCase() !== 'REMOVE'}
        onclick={handleRemovePlaceholder}
      >
        Remove Language
      </button>
    </div>
  </div>
{/if}

<style>
  .settings-screen,
  .settings-section__copy,
  .language-list,
  .language-card,
  .dialog,
  .dialog__copy,
  .dialog__field {
    --stack-space: var(--space-4);
  }

  .settings-section__header {
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .settings-section__copy h2,
  .settings-section__copy p,
  .language-card h3,
  .language-card__meta {
    margin: 0;
  }

  .language-card {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .language-card--active {
    border-color: var(--color-primary);
    background: var(--color-primary-subtle);
  }

  .language-card__header,
  .language-card__title,
  .language-card__actions,
  .dialog__actions {
    align-items: center;
    gap: var(--space-3);
  }

  .language-card__copy {
    --stack-space: var(--space-1);
  }

  .language-card__mark,
  .language-picker__mark {
    font-size: 2rem;
  }

  .language-card__active-label {
    margin: 0;
    color: var(--color-text-accent);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    font-weight: 700;
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .language-card__meta {
    color: var(--color-text-secondary);
  }

  .secondary-button,
  .secondary-button--link,
  .primary-button,
  .danger-button,
  .danger-button--solid,
  .dialog__close,
  .dialog__input {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
  }

  .secondary-button,
  .secondary-button--link,
  .primary-button,
  .danger-button,
  .danger-button--solid {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: 2.75rem;
    padding-inline: var(--space-4);
    padding-block: var(--space-3);
    border-radius: var(--radius-md);
    text-decoration: none;
  }

  .secondary-button,
  .secondary-button--link {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .primary-button {
    border: 1px solid var(--color-primary);
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .danger-button {
    border: 1px solid var(--color-error-border);
    background: var(--color-surface);
    color: var(--color-error-text);
  }

  .danger-button--solid {
    border: 1px solid var(--color-error-text);
    background: var(--color-error-text);
    color: var(--color-text-inverse);
  }

  .status-message {
    margin: 0;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-success-border);
    border-radius: var(--radius-md);
    background: var(--color-success-bg);
    color: var(--color-success-text);
  }

  .status-message--warning {
    border-color: var(--color-warning-border);
    background: var(--color-warning-bg);
    color: var(--color-warning-text);
  }

  .dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 49;
    border: 0;
    background: color-mix(in srgb, var(--color-background) 55%, transparent);
  }

  .dialog {
    position: fixed;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    z-index: 50;
    inline-size: min(100% - (var(--space-4) * 2), 42rem);
    max-block-size: min(80vh, 44rem);
    overflow: auto;
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-lg);
    transform: translate(-50%, -50%);
  }

  .dialog__header {
    align-items: flex-start;
    justify-content: space-between;
  }

  .dialog__close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 2.5rem;
    block-size: 2.5rem;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .dialog__field-label {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    color: var(--color-text-secondary);
  }

  .dialog__input {
    min-block-size: 2.75rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .language-picker {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: var(--space-3);
  }

  .language-picker__surface {
    display: grid;
    gap: var(--space-2);
    min-block-size: 11rem;
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    place-items: center;
    text-align: center;
  }

  .language-picker__input:checked + .language-picker__surface {
    border-color: var(--color-primary);
    background: var(--color-primary-subtle);
    color: var(--color-primary-text);
  }

  .language-picker__input:focus-visible + .language-picker__surface,
  .secondary-button:focus-visible,
  .secondary-button--link:focus-visible,
  .primary-button:focus-visible,
  .danger-button:focus-visible,
  .danger-button--solid:focus-visible,
  .dialog__close:focus-visible,
  .dialog__input:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .language-picker__surface--disabled {
    opacity: 0.6;
  }

  .language-picker__label {
    font-family: var(--font-ui);
    font-weight: 600;
  }

  .language-picker__native,
  .language-picker__state {
    color: var(--color-text-secondary);
    font-size: var(--font-size-small);
  }

  @media (max-width: 48rem) {
    .settings-section__header {
      align-items: stretch;
      flex-direction: column;
    }

    .language-card__actions,
    .dialog__actions {
      align-items: stretch;
      flex-direction: column;
    }

    .secondary-button,
    .secondary-button--link,
    .primary-button,
    .danger-button,
    .danger-button--solid {
      inline-size: 100%;
    }
  }
</style>
