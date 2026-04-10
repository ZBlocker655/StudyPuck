<script lang="ts">
  import { afterNavigate, invalidateAll } from '$app/navigation';

	let { children } = $props();

  afterNavigate(() => {
    invalidateAll();
  });
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

{@render children()}
