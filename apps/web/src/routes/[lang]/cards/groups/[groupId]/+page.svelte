<svelte:head>
  <title>Group Detail – StudyPuck</title>
</svelte:head>

<section class="center stack app-screen" style="--stack-space: var(--space-5)">
  <header class="stack" style="--stack-space: var(--space-2)">
    <p class="screen-eyebrow text-muted">Cards</p>
    <h1>{data.groupDetail.group.groupName}</h1>
    <p>This placeholder route keeps the future Group Detail loader wired while the full surface is built.</p>
  </header>
</section>

<script lang="ts">
  import type { PageData } from './$types.js';

  let { data }: { data: PageData } = $props();
</script>

<style>
  .app-screen {
    --center-max: 60rem;
    padding-inline: var(--space-5);
  }

  .screen-eyebrow {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }
</style>
