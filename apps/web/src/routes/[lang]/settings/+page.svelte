<script lang="ts">
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Settings – StudyPuck</title>
</svelte:head>

<section class="center stack app-screen" style="--stack-space: var(--space-5)">
  <header class="stack" style="--stack-space: var(--space-2)">
    <p class="screen-eyebrow text-muted">Settings</p>
    <h1>Settings</h1>
    <p>This placeholder hub keeps the shell’s settings entry consistent with the approved IA.</p>
  </header>

  <div class="stack settings-list" style="--stack-space: var(--space-3)">
    <a href={`/${$page.params.lang}/settings/account`} class="settings-link">Account</a>
  </div>
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

  .settings-link {
    display: inline-flex;
    align-items: center;
    min-block-size: 2.75rem;
    padding-block: var(--space-3);
    padding-inline: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    text-decoration: none;
  }

  .settings-link:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
