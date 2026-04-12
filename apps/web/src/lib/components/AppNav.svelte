<script lang="ts">
  import BrandLockup from '$lib/components/BrandLockup.svelte';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
  import UserMenu from '$lib/components/UserMenu.svelte';
  import { getLanguageHomeHref, type SupportedLanguage } from '$lib/config/languages.js';
  import { page } from '$app/stores';

  type NavItem = {
    label: string;
    href: string;
    icon: string;
    match: 'exact' | 'prefix';
  };

  export let session: {
    user: {
      id?: string | null;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    };
  };
  export let currentLanguage: SupportedLanguage;

  let moreSheetOpen = false;

  $: availableLanguages =
    (($page.data as { availableLanguages?: SupportedLanguage[] }).availableLanguages ?? []).length > 0
      ? (($page.data as { availableLanguages?: SupportedLanguage[] }).availableLanguages ?? [])
      : [currentLanguage];

  $: navItems = [
    { label: 'Home', href: getLanguageHomeHref(currentLanguage.code), icon: '⌂', match: 'exact' },
    {
      label: 'Card Entry',
      href: `/${currentLanguage.code}/card-entry`,
      icon: '↧',
      match: 'prefix',
    },
    {
      label: 'Card Review',
      href: `/${currentLanguage.code}/card-review`,
      icon: '▤',
      match: 'prefix',
    },
    {
      label: 'Translation Drills',
      href: `/${currentLanguage.code}/translation-drills`,
      icon: '◌',
      match: 'prefix',
    },
    { label: 'Cards', href: `/${currentLanguage.code}/cards`, icon: '☰', match: 'prefix' },
    { label: 'Statistics', href: `/${currentLanguage.code}/stats`, icon: '◷', match: 'prefix' },
  ] satisfies NavItem[];

  $: settingsItem = {
    label: 'Settings',
    href: `/${currentLanguage.code}/settings`,
    icon: '⚙',
    match: 'prefix',
  } satisfies NavItem;

  $: mobilePrimaryItems = navItems.slice(0, 4);

  function normalisePath(pathname: string) {
    return pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;
  }

  function isActive(item: NavItem) {
    const current = normalisePath($page.url.pathname);
    const target = normalisePath(item.href);

    if (item.match === 'exact') {
      return current === target;
    }

    return current === target || current.startsWith(`${target}/`);
  }

  function isMoreActive() {
    return [navItems[4], navItems[5], settingsItem].some((item) => isActive(item));
  }

  function closeMoreSheet() {
    moreSheetOpen = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      closeMoreSheet();
    }
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<header class="app-header">
  <div class="app-header__inner center cluster">
    <BrandLockup href={getLanguageHomeHref(currentLanguage.code)} />

    <div class="app-header__controls cluster">
      <LanguageSwitcher currentLanguage={currentLanguage} availableLanguages={availableLanguages} />
      <div class="app-header__user">
        <UserMenu {session} {currentLanguage} />
      </div>
    </div>
  </div>
</header>

<aside class="app-sidebar" aria-label="Primary navigation">
  <nav class="app-sidebar__nav stack" style="--stack-space: var(--space-2)">
    {#each navItems as item}
      <a
        href={item.href}
        class:nav-link--active={isActive(item)}
        class="nav-link cluster"
        aria-current={isActive(item) ? 'page' : undefined}
      >
        <span aria-hidden="true">{item.icon}</span>
        <span>{item.label}</span>
      </a>
    {/each}

    <div class="sidebar-divider" aria-hidden="true"></div>

    <button type="button" class="quick-add" disabled aria-label="Add new note">
      <span aria-hidden="true">+</span>
      <span>Quick Add</span>
    </button>

    <div class="sidebar-divider" aria-hidden="true"></div>

    <a
      href={settingsItem.href}
      class:nav-link--active={isActive(settingsItem)}
      class="nav-link cluster"
      aria-current={isActive(settingsItem) ? 'page' : undefined}
    >
      <span aria-hidden="true">{settingsItem.icon}</span>
      <span>{settingsItem.label}</span>
    </a>
  </nav>
</aside>

<nav class="mobile-tabbar" aria-label="Primary navigation">
  {#each mobilePrimaryItems as item}
    <a
      href={item.href}
      class:mobile-tab--active={isActive(item)}
      class="mobile-tab stack text-center"
      aria-current={isActive(item) ? 'page' : undefined}
      style="--stack-space: var(--space-1)"
    >
      <span aria-hidden="true">{item.icon}</span>
      <span>{item.label}</span>
    </a>
  {/each}

  <button
    type="button"
    class:mobile-tab--active={isMoreActive()}
    class="mobile-tab stack text-center"
    style="--stack-space: var(--space-1)"
    aria-haspopup="dialog"
    aria-expanded={moreSheetOpen}
    onclick={() => (moreSheetOpen = true)}
  >
    <span aria-hidden="true">⋯</span>
    <span>More</span>
  </button>
</nav>

<button type="button" class="mobile-fab" disabled aria-label="Add new note">
  <span aria-hidden="true">+</span>
</button>

{#if moreSheetOpen}
  <button type="button" class="sheet-backdrop" aria-label="Close more menu" onclick={closeMoreSheet}></button>

  <section class="more-sheet stack" style="--stack-space: var(--space-4)" aria-label="More navigation">
    <div class="more-sheet__handle" aria-hidden="true"></div>

    <a href={navItems[4].href} class="menu-link" onclick={closeMoreSheet}>Cards</a>
    <a href={navItems[5].href} class="menu-link" onclick={closeMoreSheet}>Statistics</a>
    <a href={settingsItem.href} class="menu-link" onclick={closeMoreSheet}>Settings</a>

    <div class="sidebar-divider" aria-hidden="true"></div>

    <UserMenu {session} {currentLanguage} mode="sheet" />
  </section>
{/if}

<style>
  .app-header {
    position: fixed;
    inset-block-start: 0;
    inset-inline: 0;
    z-index: 40;
    block-size: var(--shell-header-height);
    border-block-end: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-background) 88%, transparent);
    backdrop-filter: blur(10px);
  }

  .app-header__inner {
    justify-content: space-between;
    block-size: 100%;
    --center-max: 100%;
    --cluster-space: var(--space-4);
  }

  .app-header__controls {
    text-decoration: none;
    color: var(--color-text-primary);
    --cluster-space: var(--space-3);
  }

  .app-header__user {
    display: none;
  }

  .app-sidebar {
    display: none;
  }

  .app-sidebar__nav {
    block-size: 100%;
  }

  .nav-link,
  .menu-link,
  .quick-add {
    align-items: center;
    min-block-size: 2.75rem;
    padding-block: var(--space-2);
    padding-inline: var(--space-3);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    text-decoration: none;
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
  }

  .nav-link--active,
  .mobile-tab--active {
    background: var(--color-primary-subtle);
    color: var(--color-primary-text);
    font-weight: 700;
  }

  .sidebar-divider {
    block-size: 1px;
    background: var(--color-border);
    margin-block: var(--space-2);
  }

  .quick-add {
    display: inline-flex;
    justify-content: center;
    gap: var(--space-2);
    border-color: var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-secondary);
  }

  .quick-add:disabled {
    cursor: not-allowed;
  }

  .mobile-tabbar {
    position: fixed;
    inset-inline: 0;
    inset-block-end: 0;
    z-index: 35;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3) calc(var(--space-2) + env(safe-area-inset-bottom));
    border-block-start: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-background) 90%, transparent);
    backdrop-filter: blur(10px);
  }

  .mobile-tab {
    align-items: center;
    min-block-size: 3rem;
    padding-block: var(--space-2);
    padding-inline: var(--space-2);
    border: 1px solid transparent;
    border-radius: var(--radius-md);
    color: var(--color-text-secondary);
    text-decoration: none;
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    background: transparent;
  }

  .mobile-fab {
    position: fixed;
    inset-inline-end: var(--space-4);
    inset-block-end: calc(var(--shell-mobile-nav-height) + var(--space-4) + env(safe-area-inset-bottom));
    z-index: 36;
    inline-size: 3.5rem;
    block-size: 3.5rem;
    border: 0;
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--color-text-inverse);
    box-shadow: var(--shadow-md);
    font-size: var(--font-size-h2);
  }

  .mobile-fab:disabled {
    cursor: not-allowed;
    opacity: 0.8;
  }

  .sheet-backdrop {
    position: fixed;
    inset: 0;
    z-index: 45;
    border: 0;
    background: color-mix(in srgb, var(--neutral-900) 12%, transparent);
  }

  .more-sheet {
    position: fixed;
    inset-inline: var(--space-4);
    inset-block-end: calc(var(--space-4) + env(safe-area-inset-bottom));
    z-index: 50;
    max-block-size: min(70vh, 32rem);
    overflow: auto;
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-lg);
  }

  .more-sheet__handle {
    inline-size: 3rem;
    block-size: 0.25rem;
    margin-inline: auto;
    border-radius: var(--radius-lg);
    background: var(--color-border);
  }

  .nav-link:focus-visible,
  .menu-link:focus-visible,
  .mobile-tab:focus-visible,
  .quick-add:focus-visible,
  .mobile-fab:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (min-width: 64rem) {
    .app-header__user {
      display: block;
    }

    .app-sidebar {
      position: fixed;
      inset-block-start: var(--shell-header-height);
      inset-inline-start: 0;
      z-index: 30;
      display: block;
      inline-size: var(--shell-sidebar-width);
      block-size: calc(100vh - var(--shell-header-height));
      padding: var(--space-4);
      border-inline-end: 1px solid var(--color-border);
      background: var(--color-surface-subtle);
    }

    .mobile-tabbar,
    .mobile-fab {
      display: none;
    }
  }
</style>
