<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
  import { afterNavigate, invalidateAll } from '$app/navigation';

	let { children } = $props();

  afterNavigate(() => {
    invalidateAll();
  });
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
