<script lang="ts">
  import { page } from '$app/stores';
  import TranslationDrillsHome from '$lib/components/translation-drills/TranslationDrillsHome.svelte';
  import { commandBar } from '$lib/stores/commandBar.js';
  import { translationDrillSession } from '$lib/stores/translationDrillSession.js';
  import type { PageData } from './$types.js';

  export let data: PageData;

  $: currentLanguage = $page.params.lang ?? '';
  $: commandBar.setWorkspaceContext(currentLanguage || null, null);
  $: commandBar.setSurfaceContext(currentLanguage
    ? {
        surface: 'translation_drills',
        activeChallenge: $translationDrillSession.activeChallenge,
        focusedCardId: $translationDrillSession.focusedCardId,
      }
    : null);
</script>

<svelte:head>
  <title>Translation Drills – StudyPuck</title>
</svelte:head>

<TranslationDrillsHome
  lang={currentLanguage}
  home={data.home}
  loadError={data.loadError}
/>
