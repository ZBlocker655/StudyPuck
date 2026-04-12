<script lang="ts">
  import { page } from '$app/stores';
  import {
    replaceLanguageInPath,
    type SupportedLanguage,
  } from '$lib/config/languages.js';

  export let currentLanguage: SupportedLanguage;
  export let availableLanguages: SupportedLanguage[] = [currentLanguage];

  let isOpen = false;

  function closeMenu() {
    isOpen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeMenu();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="language-switcher">
  <button
    type="button"
    class="language-trigger"
    aria-haspopup="menu"
    aria-expanded={isOpen}
    aria-controls="language-switcher-menu"
    on:click={() => (isOpen = !isOpen)}
  >
    <span>{currentLanguage.label}</span>
    <span aria-hidden="true">▾</span>
  </button>

  {#if isOpen}
    <button
      type="button"
      class="language-backdrop"
      aria-label="Close language menu"
      on:click={closeMenu}
    ></button>

    <div id="language-switcher-menu" class="language-menu" role="menu">
      <div class="language-menu__sheet-handle" aria-hidden="true"></div>
      <div class="language-menu__header">
        <p class="language-menu__title">Study language</p>
      </div>

      <div class="language-menu__list stack" style="--stack-space: var(--space-2)">
        {#each availableLanguages as language}
          <a
            href={replaceLanguageInPath($page.url.pathname, language.code)}
            class:language-option--active={language.code === currentLanguage.code}
            class="language-option"
            role="menuitem"
            aria-current={language.code === currentLanguage.code ? 'true' : undefined}
            on:click={closeMenu}
          >
            <span>{language.label}</span>
            {#if language.nativeLabel}
              <small class="text-muted">{language.nativeLabel}</small>
            {/if}
          </a>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .language-switcher {
    position: relative;
  }

  .language-trigger {
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
    min-block-size: 2.75rem;
    padding-block: var(--space-2);
    padding-inline: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .language-trigger:focus-visible,
  .language-option:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .language-backdrop {
    position: fixed;
    inset: 0;
    border: 0;
    background: transparent;
  }

  .language-menu {
    position: absolute;
    inset-block-start: calc(100% + var(--space-2));
    inset-inline-end: 0;
    z-index: 30;
    inline-size: min(18rem, calc(100vw - (var(--space-4) * 2)));
    max-block-size: min(24rem, calc(100vh - 8rem));
    overflow: auto;
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-md);
  }

  .language-menu__sheet-handle {
    display: none;
    inline-size: 3rem;
    block-size: 0.25rem;
    margin-inline: auto;
    margin-block-end: var(--space-4);
    border-radius: var(--radius-lg);
    background: var(--color-border);
  }

  .language-menu__title {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    color: var(--color-text-secondary);
  }

  .language-option {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-block-size: 2.75rem;
    padding: var(--space-3);
    border-radius: var(--radius-md);
    text-decoration: none;
    color: var(--color-text-primary);
    background: transparent;
  }

  .language-option--active {
    background: var(--color-primary-subtle);
    color: var(--color-primary-text);
    font-weight: 700;
  }

  @media (max-width: 63.99rem) {
    .language-menu {
      position: fixed;
      inset-inline: var(--space-4);
      inset-block-end: calc(var(--space-4) + env(safe-area-inset-bottom));
      inset-block-start: auto;
      inline-size: auto;
      max-block-size: min(70vh, 28rem);
    }

    .language-menu__sheet-handle {
      display: block;
    }
  }
</style>
