<script lang="ts">
  import type { PageData } from './$types.js';

  export let data: PageData;

  function formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }
</script>

<svelte:head>
  <title>Account – StudyPuck</title>
</svelte:head>

<section class="center stack account-page" style="--stack-space: var(--space-5)">
  <header class="stack" style="--stack-space: var(--space-2)">
    <p class="screen-eyebrow text-muted">Settings</p>
    <h1>Account</h1>
  </header>

  {#if data.dbProfile}
    <section class="stack account-card" style="--stack-space: var(--space-4)">
      {#if data.session?.user?.image}
        <img src={data.session.user.image} alt="Avatar" width="64" height="64" class="profile-avatar" />
      {/if}

      <dl class="flow">
        <dt>Name</dt>
        <dd>{data.dbProfile.name ?? data.session?.user?.name ?? '—'}</dd>

        <dt>Email</dt>
        <dd>{data.dbProfile.email}</dd>

        <dt>Member since</dt>
        <dd>{formatDate(data.dbProfile.createdAt)}</dd>

        <dt>Last login</dt>
        <dd>{formatDate(data.dbProfile.lastLoginAt)}</dd>
      </dl>
    </section>
  {:else}
    <p>Profile data unavailable — database may be unreachable.</p>
  {/if}
</section>

<style>
  .account-page {
    --center-max: 48rem;
    padding-inline: var(--space-5);
  }

  .screen-eyebrow {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .account-card {
    padding: var(--space-6);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
  }

  .profile-avatar {
    border-radius: 50%;
  }

  dt {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    color: var(--color-text-secondary);
  }

  dd {
    margin-inline-start: 0;
  }
</style>
