<script lang="ts">
  import AppNav from '$lib/components/AppNav.svelte';
  import CommandBar from '$lib/components/CommandBar.svelte';
  import QuickAddNoteDrawer from '$lib/components/QuickAddNoteDrawer.svelte';
  import { getLanguageByCode } from '$lib/config/languages.js';
  import { cardEntryShellCounts } from '$lib/stores/cardEntryShell.js';
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
  const currentLanguageCode = $derived($page.params.lang);
  const serverCardEntryUnprocessedCount = $derived(
    (($page.data as { inbox?: { unprocessedNoteCount?: number } }).inbox?.unprocessedNoteCount ??
      (($page.data as { cardEntryShell?: { unprocessedNoteCount: number } }).cardEntryShell?.unprocessedNoteCount ??
        0))
  );
  const cardEntryUnprocessedCount = $derived(
    (currentLanguageCode ? $cardEntryShellCounts[currentLanguageCode] : undefined) ??
      serverCardEntryUnprocessedCount ??
      0
  );

  $effect(() => {
    if (!currentLanguageCode) {
      return;
    }

    cardEntryShellCounts.setCount(currentLanguageCode, serverCardEntryUnprocessedCount);
  });

  onMount(() => {
    theme.init();
  });
</script>

{#if currentLanguage && session?.user}
  <div class="app-shell">
    <AppNav {session} {currentLanguage} cardEntryUnprocessedCount={cardEntryUnprocessedCount} />

    <CommandBar>
      {@render children()}
    </CommandBar>

    <QuickAddNoteDrawer />
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
</style>
