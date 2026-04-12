<script lang="ts">
  import type { ActionData, PageData } from './$types.js';
  import { getUserInitials } from '$lib/utils/user.js';

  export let data: PageData;
  export let form: ActionData;

  let selectedLanguages = form?.selectedLanguages ?? [];

  $: if (form?.selectedLanguages) {
    selectedLanguages = form.selectedLanguages;
  }

</script>

<svelte:head>
  <title>Onboarding - StudyPuck</title>
</svelte:head>

<div class="onboarding-shell">
  <header class="onboarding-topbar">
    <div class="center onboarding-topbar__inner cluster">
      <a class="brand cluster" href="/" aria-label="StudyPuck home">
        <span class="brand__mark" aria-hidden="true">◉</span>
        <span class="brand__name">StudyPuck</span>
      </a>

      <div class="avatar-badge" aria-label="Signed in account">
        {#if data.session?.user?.image}
          <img src={data.session.user.image} alt="" class="avatar-image" />
        {:else}
          <span>{getUserInitials(data.session?.user)}</span>
        {/if}
      </div>
    </div>
  </header>

  <main class="center onboarding-page">
    <section class="onboarding-panel stack">
      <header class="stack onboarding-copy">
        <h1>Welcome to StudyPuck</h1>
        <p class="text-muted">Choose a language to get started</p>
      </header>

      {#if form?.error}
        <p class="onboarding-error" role="alert">{form.error}</p>
      {/if}

      <form method="POST" class="stack onboarding-form">
        <div class="language-grid" role="group" aria-labelledby="language-choice-heading">
          <span id="language-choice-heading" class="visually-hidden">Study languages</span>

          {#each data.supportedLanguages as language}
            <label class="language-tile">
              <input
                bind:group={selectedLanguages}
                class="visually-hidden language-tile__input"
                type="checkbox"
                name="languages"
                value={language.code}
              />

              <span class="language-tile__surface">
                <span class="language-tile__mark" aria-hidden="true">
                  {#if language.code === 'zh'}
                    🇨🇳
                  {:else if language.code === 'es'}
                    🇪🇸
                  {:else if language.code === 'nl'}
                    🇳🇱
                  {:else}
                    🌐
                  {/if}
                </span>
                <span class="language-tile__name">{language.label}</span>
                {#if language.nativeLabel}
                  <span class="language-tile__native">{language.nativeLabel}</span>
                {/if}
              </span>
            </label>
          {/each}
        </div>

        <button class="onboarding-cta" type="submit" disabled={selectedLanguages.length === 0}>
          Get Started <span aria-hidden="true">→</span>
        </button>
      </form>
    </section>
  </main>
</div>

<style>
  .onboarding-shell {
    min-block-size: 100vh;
  }

  .onboarding-topbar {
    border-block-end: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-background) 88%, transparent);
    backdrop-filter: blur(10px);
  }

  .onboarding-topbar__inner {
    justify-content: space-between;
    min-block-size: 3.75rem;
    --center-max: 72rem;
    --cluster-space: var(--space-4);
  }

  .brand {
    color: var(--color-text-primary);
    text-decoration: none;
    --cluster-space: var(--space-3);
  }

  .brand__name {
    font-family: var(--font-heading);
    font-size: var(--font-size-h4);
  }

  .avatar-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 2.75rem;
    block-size: 2.75rem;
    overflow: hidden;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    font-weight: 700;
  }

  .avatar-image {
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }

  .onboarding-page {
    display: grid;
    place-items: center;
    min-block-size: calc(100vh - 3.75rem);
    padding-block: var(--space-8);
    padding-inline: var(--space-5);
    --center-max: 72rem;
  }

  .onboarding-panel,
  .onboarding-copy,
  .onboarding-form {
    --stack-space: var(--space-5);
  }

  .onboarding-panel {
    inline-size: min(100%, 52rem);
    text-align: center;
  }

  .onboarding-copy h1,
  .onboarding-copy p {
    margin: 0;
  }

  .onboarding-copy p {
    font-size: var(--font-size-h4);
  }

  .onboarding-error {
    margin: 0;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-error-border);
    border-radius: var(--radius-md);
    background: var(--color-error-bg);
    color: var(--color-error-text);
    font-family: var(--font-ui);
    text-align: start;
  }

  .language-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: var(--space-4);
  }

  .language-tile {
    display: block;
  }

  .language-tile__surface {
    display: grid;
    gap: var(--space-2);
    min-block-size: 13rem;
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
    place-items: center;
    text-align: center;
    transition:
      border-color 160ms ease,
      background-color 160ms ease,
      transform 160ms ease,
      box-shadow 160ms ease;
  }

  .language-tile__input:focus-visible + .language-tile__surface {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  .language-tile__input:checked + .language-tile__surface {
    border-color: var(--color-primary);
    background: var(--color-primary-subtle);
    color: var(--color-primary-text);
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }

  .language-tile__mark {
    font-size: 2.5rem;
  }

  .language-tile__name {
    font-family: var(--font-ui);
    font-size: var(--font-size-h4);
    font-weight: 600;
  }

  .language-tile__native {
    color: var(--color-text-secondary);
    font-size: var(--font-size-small);
  }

  .language-tile__input:checked + .language-tile__surface .language-tile__native {
    color: currentColor;
  }

  .onboarding-cta {
    justify-self: center;
    min-inline-size: 12rem;
    min-block-size: 2.75rem;
    padding-block: var(--space-3);
    padding-inline: var(--space-5);
    border: 1px solid var(--color-primary);
    border-radius: var(--radius-md);
    background: var(--color-primary);
    color: var(--color-text-inverse);
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    font-weight: 600;
  }

  .onboarding-cta:disabled {
    border-color: var(--color-border);
    background: var(--color-surface-subtle);
    color: var(--color-text-disabled);
    cursor: not-allowed;
  }

  @media (max-width: 40rem) {
    .onboarding-page {
      padding-inline: var(--space-4);
    }

    .language-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .language-tile__surface {
      min-block-size: 11rem;
      padding: var(--space-4);
    }
  }
</style>
