<script lang="ts">
  export let lang: string;
  export let activeSection: 'cards' | 'groups';

  let navItems: ReadonlyArray<{
    id: 'cards' | 'groups';
    label: 'Cards' | 'Groups';
    href: string;
  }> = [];

  $: navItems = [
    { id: 'cards', label: 'Cards', href: `/${lang}/cards` },
    { id: 'groups', label: 'Groups', href: `/${lang}/cards/groups` },
  ] as const;
</script>

<nav class="cards-subnav cluster" aria-label="Cards navigation">
  {#each navItems as item}
    <a
      href={item.href}
      class:cards-subnav__link--active={item.id === activeSection}
      class="cards-subnav__link"
      aria-current={item.id === activeSection ? 'page' : undefined}
    >
      {item.label}
    </a>
  {/each}
</nav>

<style>
  .cards-subnav {
    --cluster-space: var(--space-2);
    align-items: center;
    flex-wrap: wrap;
  }

  .cards-subnav__link {
    display: inline-flex;
    align-items: center;
    min-block-size: 2.25rem;
    padding: 0 var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-pill);
    background: var(--color-surface);
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    font-weight: var(--font-weight-medium);
    text-decoration: none;
    transition:
      border-color 120ms ease,
      background-color 120ms ease,
      color 120ms ease;
  }

  .cards-subnav__link:hover {
    border-color: var(--color-border-strong);
    color: var(--color-text-primary);
  }

  .cards-subnav__link--active {
    border-color: color-mix(in srgb, var(--color-link) 35%, var(--color-border));
    background: color-mix(in srgb, var(--color-link) 12%, var(--color-surface));
    color: var(--color-link);
  }

  .cards-subnav__link:focus-visible {
    outline: 2px solid var(--color-focus-ring);
    outline-offset: 2px;
  }
</style>
