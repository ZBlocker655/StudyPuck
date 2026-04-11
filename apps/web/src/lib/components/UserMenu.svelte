<script lang="ts">
  import { theme } from '$lib/stores/theme.js';
  import type { SupportedLanguage } from '$lib/config/languages.js';

  export let session: {
    user: {
      id?: string | null;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  };
  export let currentLanguage: SupportedLanguage;
  export let mode: 'dropdown' | 'sheet' = 'dropdown';

  let isOpen = false;

  function closeMenu() {
    isOpen = false;
  }

  function getInitials() {
    const source = session.user.name ?? session.user.email ?? 'StudyPuck';
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeMenu();
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if mode === 'sheet'}
  <section class="user-sheet stack" style="--stack-space: var(--space-4)">
    <div class="cluster user-sheet__header">
      <div class="avatar-badge" aria-hidden="true">
        {#if session.user.image}
          <img src={session.user.image} alt="" class="avatar-image" />
        {:else}
          <span>{getInitials()}</span>
        {/if}
      </div>

      <div class="stack" style="--stack-space: var(--space-1)">
        <strong>{session.user.name ?? session.user.email}</strong>
        <small class="text-muted">{session.user.email}</small>
      </div>
    </div>

    <a href={`/${currentLanguage.code}/settings/account`} class="menu-link">Profile</a>

    <button
      type="button"
      class="theme-toggle"
      role="switch"
      aria-checked={$theme === 'dark'}
      on:click={() => theme.toggle()}
    >
      <span>{$theme === 'dark' ? '☾' : '☀'}</span>
      <span>Dark Mode</span>
      <span class="theme-toggle__state">{$theme === 'dark' ? 'On' : 'Off'}</span>
    </button>

    <form action="/auth/logout" method="POST">
      <button type="submit" class="menu-link menu-link--button">Sign Out</button>
    </form>
  </section>
{:else}
  <div class="user-menu">
    <button
      type="button"
      class="user-trigger"
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-controls="user-menu-panel"
      on:click={() => (isOpen = !isOpen)}
    >
      <span class="avatar-badge">
        {#if session.user.image}
          <img src={session.user.image} alt="" class="avatar-image" />
        {:else}
          <span>{getInitials()}</span>
        {/if}
      </span>
      <span class="visually-hidden">Open user menu</span>
    </button>

    {#if isOpen}
      <button
        type="button"
        class="user-backdrop"
        aria-label="Close user menu"
        on:click={closeMenu}
      ></button>

      <div id="user-menu-panel" class="user-panel stack" role="menu" style="--stack-space: var(--space-4)">
        <div class="stack" style="--stack-space: var(--space-1)">
          <strong>{session.user.name ?? session.user.email}</strong>
          <small class="text-muted">{session.user.email}</small>
        </div>

        <a
          href={`/${currentLanguage.code}/settings/account`}
          class="menu-link"
          role="menuitem"
          on:click={closeMenu}
        >
          Profile
        </a>

        <button
          type="button"
          class="theme-toggle"
          role="switch"
          aria-checked={$theme === 'dark'}
          on:click={() => theme.toggle()}
        >
          <span>{$theme === 'dark' ? '☾' : '☀'}</span>
          <span>Dark Mode</span>
          <span class="theme-toggle__state">{$theme === 'dark' ? 'On' : 'Off'}</span>
        </button>

        <form action="/auth/logout" method="POST">
          <button type="submit" class="menu-link menu-link--button">Sign Out</button>
        </form>
      </div>
    {/if}
  </div>
{/if}

<style>
  .user-menu {
    position: relative;
  }

  .user-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 2.75rem;
    block-size: 2.75rem;
    padding: 0;
    border: 1px solid var(--color-border);
    border-radius: 50%;
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .avatar-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 2.25rem;
    block-size: 2.25rem;
    overflow: hidden;
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--color-text-inverse);
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    font-weight: 700;
  }

  .avatar-image {
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }

  .user-backdrop {
    position: fixed;
    inset: 0;
    border: 0;
    background: transparent;
  }

  .user-panel,
  .user-sheet {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-md);
  }

  .user-panel {
    position: absolute;
    inset-block-start: calc(100% + var(--space-2));
    inset-inline-end: 0;
    z-index: 30;
    inline-size: min(18rem, calc(100vw - (var(--space-4) * 2)));
    padding: var(--space-4);
  }

  .user-sheet {
    padding: var(--space-4);
  }

  .user-sheet__header {
    --cluster-space: var(--space-3);
    align-items: center;
  }

  .menu-link,
  .menu-link--button,
  .theme-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    inline-size: 100%;
    min-block-size: 2.75rem;
    padding-block: var(--space-2);
    padding-inline: var(--space-3);
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    text-decoration: none;
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
  }

  .menu-link--button {
    cursor: pointer;
  }

  .theme-toggle__state {
    color: var(--color-text-secondary);
    font-size: var(--font-size-small);
  }

  .user-trigger:focus-visible,
  .menu-link:focus-visible,
  .menu-link--button:focus-visible,
  .theme-toggle:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
