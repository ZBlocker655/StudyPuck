<script lang="ts">
  import { page } from '$app/stores';
  import TranslationDrillsHome from '$lib/components/translation-drills/TranslationDrillsHome.svelte';
  import { commandBar } from '$lib/stores/commandBar.js';
  import type { PageData } from './$types.js';

  export let data: PageData;

  $: currentLanguage = $page.params.lang ?? '';
  $: commandBar.setWorkspaceContext(currentLanguage || null, null);
</script>

<svelte:head>
  <title>Translation Drills – StudyPuck</title>
</svelte:head>

<TranslationDrillsHome
  lang={currentLanguage}
  home={data.home}
  loadError={data.loadError}
/>
