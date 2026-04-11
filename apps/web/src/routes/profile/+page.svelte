<script lang="ts">
  import type { PageData } from './$types.js';

  export let data: PageData;

  const { session, dbProfile } = data;

  function formatDate(date: Date | string | null | undefined): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString();
  }
</script>

<svelte:head>
  <title>Profile – StudyPuck</title>
</svelte:head>

<main class="center stack profile-page">
  <h1>Profile</h1>

  <a href="/">← Back to home</a>

  {#if dbProfile}
    <section class="stack profile-card">
      {#if session?.user?.image}
        <img src={session.user.image} alt="Avatar" width="64" height="64" class="profile-avatar" />
      {/if}

      <dl class="flow">
        <dt>Name</dt>
        <dd>{dbProfile.name ?? session?.user?.name ?? '—'}</dd>

        <dt>Email</dt>
        <dd>{dbProfile.email}</dd>

        <dt>Member since</dt>
        <dd>{formatDate(dbProfile.createdAt)}</dd>

        <dt>Last login</dt>
        <dd>{formatDate(dbProfile.lastLoginAt)}</dd>
      </dl>
    </section>
  {:else}
    <p>Profile data unavailable — database may be unreachable.</p>
  {/if}
</main>

<style>
  .profile-page {
    padding-block: var(--space-6);
    --center-max: 48rem;
    --stack-space: var(--space-4);
  }

  .profile-card {
    background: var(--color-surface-subtle);
    padding: var(--space-6);
    border-radius: var(--radius-lg);
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
