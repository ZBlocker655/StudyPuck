<script lang="ts">
  import { signIn } from '@auth/sveltekit/client';
  import type { Session } from '$lib/schemas/auth.js';

  export let session: Session | null;

  function handleSignOut() {
    window.location.href = '/auth/logout';
  }
</script>

{#if session?.user}
  <!-- User is authenticated -->
  <div class="auth-container">
    <div class="user-info">
      {#if session.user.image}
        <img
          src={session.user.image}
          alt="Profile"
          class="avatar"
        />
      {/if}
      <span class="user-name">
        {session.user.name || session.user.email}
      </span>
    </div>

    <form action="/auth/logout" method="POST">
      <button type="submit" class="auth-button signout-button">
        Sign Out
      </button>
    </form>
  </div>
{:else}
  <!-- User is not authenticated -->
  <div class="auth-container">
    <button 
      on:click={() => signIn('auth0')} 
      class="auth-button signin-button"
    >
      Sign In
    </button>
  </div>
{/if}

<style>
  .auth-container {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .user-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
  }

  .user-name {
    font-size: 0.9rem;
    color: var(--color-text, #333);
  }

  .auth-button {
    padding: 0.5rem 1rem;
    border: none;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .signin-button {
    background-color: #0066cc;
    color: white;
  }

  .signin-button:hover {
    background-color: #0056b3;
  }

  .signout-button {
    background-color: #6b7280;
    color: white;
  }

  .signout-button:hover {
    background-color: #4b5563;
  }

  .auth-button:focus {
    outline: 2px solid #3b82f6;
    outline-offset: 2px;
  }
</style>