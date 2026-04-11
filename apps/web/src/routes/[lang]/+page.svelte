<script lang="ts">
  import { page } from '$app/stores';
  import type { PageData } from './$types.js';
  import { getLanguageByCode } from '$lib/config/languages.js';

  export let data: PageData;

  $: currentLanguage = getLanguageByCode($page.params.lang);
</script>

<svelte:head>
  <title>{currentLanguage?.label ?? 'StudyPuck'} – Dashboard</title>
</svelte:head>

<section class="center stack dashboard-page" style="--stack-space: var(--space-6)">
  <header class="stack" style="--stack-space: var(--space-2)">
    <p class="dashboard-eyebrow text-muted">Active language</p>
    <h1>{currentLanguage?.label ?? 'StudyPuck'}</h1>
    <p>
      Welcome back, {data.session?.user?.name || data.session?.user?.email}. Your dashboard now
      lives inside the global navigation shell.
    </p>
  </header>

  <div class="grid" style="--grid-gap: var(--space-5); --grid-min-size: 16rem">
    <a class="dashboard-card stack" href={`/${$page.params.lang}/card-entry`} style="--stack-space: var(--space-2)">
      <h2>Card Entry</h2>
      <p>Capture notes and turn them into cards for your active language.</p>
    </a>

    <a class="dashboard-card stack" href={`/${$page.params.lang}/card-review`} style="--stack-space: var(--space-2)">
      <h2>Card Review</h2>
      <p>Run focused review sessions with your spaced-repetition queue.</p>
    </a>

    <a class="dashboard-card stack" href={`/${$page.params.lang}/translation-drills`} style="--stack-space: var(--space-2)">
      <h2>Translation Drills</h2>
      <p>Practice active recall in conversational translation exercises.</p>
    </a>
  </div>
</section>

<style>
  .dashboard-page {
    --center-max: 70rem;
    padding-inline: var(--space-5);
  }

  .dashboard-eyebrow {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .dashboard-card {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    color: inherit;
    text-decoration: none;
  }

  .dashboard-card:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
