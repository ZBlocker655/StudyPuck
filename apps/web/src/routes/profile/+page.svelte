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

<main>
  <h1>Profile</h1>

  <a href="/">← Back to home</a>

  {#if dbProfile}
    <section>
      {#if session?.user?.image}
        <img src={session.user.image} alt="Avatar" width="64" height="64" style="border-radius:50%" />
      {/if}

      <dl>
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
