<script lang="ts">
  import '$lib/styles/app.css';
  import AppShell from '$lib/components/AppShell.svelte';
  import { afterNavigate, invalidateAll } from '$app/navigation';

	let { children, data } = $props();

  afterNavigate(() => {
    invalidateAll();
  });
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

<AppShell session={data.session}>
  {@render children()}
</AppShell>
