<script lang="ts">
  import '$lib/styles/app.css';
  import AppShell from '$lib/components/AppShell.svelte';
  import { afterNavigate, invalidateAll } from '$app/navigation';

	let { children, data } = $props();

  afterNavigate(() => {
    if (data.isE2ETestMode) {
      return;
    }

    invalidateAll();
  });
</script>

<AppShell session={data.session}>
  {@render children()}
</AppShell>
