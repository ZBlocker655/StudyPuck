<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  let errorMessage = 'An unknown error occurred during authentication.';
  const commonErrors = {
    'access_denied': 'You have declined to grant the application access. If this was a mistake, you can try signing in again.',
    'configuration_error': 'There is a server-side configuration error with the authentication provider.',
    'invalid_request': 'The request to the authentication provider was invalid. Please try again.',
  };

  onMount(() => {
    const urlParams = $page.url.searchParams;
    const error = urlParams.get('error');
    if (error && commonErrors[error as keyof typeof commonErrors]) {
      errorMessage = commonErrors[error as keyof typeof commonErrors];
    }
  });
</script>

<svelte:head>
  <title>Authentication Error</title>
</svelte:head>

<main>
  <div class="error-container">
    <h1>Authentication Error</h1>
    <p>{errorMessage}</p>
    <a href="/" class="home-link">Go to Homepage</a>
  </div>
</main>

<style>
  .error-container {
    max-width: 600px;
    margin: 4rem auto;
    padding: 2rem;
    text-align: center;
    background-color: #fff3f3;
    border: 1px solid #ffcccc;
    border-radius: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
  
  h1 {
    color: #cc0000;
    font-size: 2rem;
    margin-bottom: 1rem;
  }
  
  p {
    color: #333;
    font-size: 1.1rem;
    margin-bottom: 2rem;
  }
  
  .home-link {
    display: inline-block;
    padding: 0.75rem 1.5rem;
    background-color: #0066cc;
    color: white;
    text-decoration: none;
    border-radius: 5px;
    font-weight: 500;
    transition: background-color 0.2s;
  }
  
  .home-link:hover {
    background-color: #0056b3;
  }
</style>
