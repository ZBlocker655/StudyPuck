<script lang="ts">
  import AppNav from '$lib/components/AppNav.svelte';
  import { getLanguageByCode } from '$lib/config/languages.js';
  import { theme } from '$lib/stores/theme.js';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  type ShellSession = {
    user?: {
      id?: string | null;
      email?: string | null;
      name?: string | null;
      image?: string | null;
    } | null;
  } | null;

  let { children, session } = $props<{ children: import('svelte').Snippet; session: ShellSession }>();

  const currentLanguage = $derived(getLanguageByCode($page.params.lang));

  onMount(() => {
    theme.init();
  });
</script>

{#if currentLanguage && session?.user}
  <div class="app-shell">
    <AppNav {session} {currentLanguage} />

    <main id="main-content" class="app-main">
      {@render children()}
    </main>
  </div>
{:else}
  {@render children()}
{/if}

<style>
  .app-shell {
    --shell-header-height: 3.75rem;
    --shell-sidebar-width: 12.5rem;
    --shell-mobile-nav-height: 4.5rem;
  }

  .app-main {
    min-block-size: 100vh;
    padding-block-start: calc(var(--shell-header-height) + var(--space-6));
    padding-block-end: calc(var(--shell-mobile-nav-height) + var(--space-6) + env(safe-area-inset-bottom));
  }

  @media (min-width: 64rem) {
    .app-main {
      padding-inline-start: calc(var(--shell-sidebar-width) + var(--space-4));
      padding-block-end: var(--space-6);
    }
  }
</style>
