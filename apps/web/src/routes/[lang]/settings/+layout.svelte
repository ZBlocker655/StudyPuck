<script lang="ts">
  import { page } from '$app/stores';

  let { children } = $props();

  const tabs = $derived([
    { label: 'Account', href: `/${$page.params.lang}/settings/account` },
    { label: 'Languages', href: `/${$page.params.lang}/settings/languages` },
    { label: 'Preferences', href: `/${$page.params.lang}/settings/preferences` },
  ]);

  function isActive(href: string) {
    const currentPath = $page.url.pathname.replace(/\/$/, '');
    const targetPath = href.replace(/\/$/, '');
    return currentPath === targetPath;
  }
</script>

<section class="center settings-shell stack">
  <header class="stack settings-shell__header">
    <p class="settings-shell__eyebrow text-muted">Settings</p>
    <h1>Settings</h1>
  </header>

  <nav class="settings-tabs" aria-label="Settings sections">
    {#each tabs as tab}
      <a
        href={tab.href}
        class:settings-tab--active={isActive(tab.href)}
        class="settings-tab"
        aria-current={isActive(tab.href) ? 'page' : undefined}
      >
        {tab.label}
      </a>
    {/each}
  </nav>

  {@render children()}
</section>

<style>
  .settings-shell {
    --center-max: 60rem;
    padding-block: var(--space-5);
    padding-inline: var(--space-5);
    --stack-space: var(--space-5);
  }

  .settings-shell__header {
    --stack-space: var(--space-2);
  }

  .settings-shell__header h1,
  .settings-shell__eyebrow {
    margin: 0;
  }

  .settings-shell__eyebrow {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .settings-tabs {
    display: flex;
    gap: var(--space-2);
    overflow-x: auto;
    padding-block-end: var(--space-1);
    border-block-end: 1px solid var(--color-border);
  }

  .settings-tab {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-block-size: 2.75rem;
    padding-inline: var(--space-4);
    border-block-end: 2px solid transparent;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    font-weight: 500;
    text-decoration: none;
    white-space: nowrap;
  }

  .settings-tab--active {
    border-color: var(--color-primary);
    color: var(--color-text-primary);
    font-weight: 700;
  }

  .settings-tab:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
    border-radius: var(--radius-md);
  }

  @media (max-width: 48rem) {
    .settings-shell {
      padding-inline: var(--space-4);
      padding-block-end: calc(var(--space-7) + env(safe-area-inset-bottom));
    }
  }
</style>
