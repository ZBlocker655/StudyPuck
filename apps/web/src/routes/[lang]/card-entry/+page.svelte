<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Card Entry – StudyPuck</title>
</svelte:head>

<section class="center stack app-screen" style="--stack-space: var(--space-5)">
  <header class="stack" style="--stack-space: var(--space-2)">
    <p class="screen-eyebrow text-muted">Mini-app</p>
    <h1>Card Entry</h1>
    <p>
      This placeholder inbox route establishes the permanent shell and URL structure for
      /{$page.params.lang}/card-entry.
    </p>
  </header>
</section>

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
