<svelte:head>
  <title>Card Review – StudyPuck</title>
</svelte:head>

<section class="center stack app-screen" style="--stack-space: var(--space-5)">
  <header class="stack" style="--stack-space: var(--space-2)">
    <p class="screen-eyebrow text-muted">Mini-app</p>
    <h1>Card Review</h1>
    <p>This placeholder route gives the global shell a real review destination and active state.</p>
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
