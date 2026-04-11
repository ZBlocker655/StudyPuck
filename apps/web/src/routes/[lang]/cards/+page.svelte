<svelte:head>
  <title>Cards – StudyPuck</title>
</svelte:head>

<section class="center stack app-screen" style="--stack-space: var(--space-5)">
  <header class="stack" style="--stack-space: var(--space-2)">
    <p class="screen-eyebrow text-muted">Library</p>
    <h1>Cards</h1>
    <p>This placeholder route keeps the desktop sidebar and mobile More sheet navigation functional.</p>
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
