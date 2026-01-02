<script lang="ts">
  import AuthButton from '$lib/components/AuthButton.svelte';
  import type { PageData } from './$types.js';

  export let data: PageData;
  
  // Type assertion to handle Auth.js session type compatibility  
  $: typedSession = data.session as any;
  $: authError = (data as any).authError;
  
  // Monitor auth failures in production
  $: if (authError?.failed) {
    console.error('🚨 AUTH SYSTEM DOWN:', authError);
    // Could add user-visible error message here
  }
</script>

<svelte:head>
	<title>StudyPuck - AI-Powered Language Learning</title>
	<meta name="description" content="Learn languages with AI-powered translation drills and spaced repetition" />
</svelte:head>

<main>
	<header>
		<div class="header-content">
			<div class="title-area">
				<h1>🏒 StudyPuck</h1>
				<p>AI-Powered Language Learning</p>
			</div>
			
			<!-- Show auth error indicator if auth is failing -->
			{#if authError?.failed}
				<div class="auth-error">
					⚠️ Authentication temporarily unavailable
				</div>
			{:else}
				<AuthButton session={typedSession} />
			{/if}
		</div>
	</header>
	
	{#if data.session?.user}
		<section class="welcome-back">
			<h2>Welcome back, {data.session.user.name || data.session.user.email}!</h2>
			<p>Ready to continue your language learning journey?</p>

			<div class="dashboard">
				<div class="feature-card">
					<h3>📚 Card Review</h3>
					<p>Review your study cards with spaced repetition</p>
					<button class="feature-button" disabled>Coming Soon</button>
				</div>

				<div class="feature-card">
					<h3>🗣️ Translation Drills</h3>
					<p>Practice translations with AI-powered conversations</p>
					<button class="feature-button" disabled>Coming Soon</button>
				</div>
			</div>
		</section>
	{:else}
		<section class="hero">
			<h2>Master Languages with AI-Powered Learning</h2>
			<p>
				StudyPuck combines spaced repetition flashcards with interactive AI translation drills 
				to help you learn languages more effectively.
			</p>
			
			<div class="features">
				<div class="feature">
					<h3>📚 Smart Cards</h3>
					<p>Organize vocabulary with intelligent spaced repetition</p>
				</div>
				
				<div class="feature">
					<h3>🗣️ AI Conversations</h3>
					<p>Practice translations in natural conversation flows</p>
				</div>
				
				<div class="feature">
					<h3>🎯 Personalized Learning</h3>
					<p>Adaptive difficulty based on your progress</p>
				</div>
			</div>

			<div class="cta">
				<p>Sign in above to start your language learning journey!</p>
			</div>
		</section>
	{/if}

	<footer>
		<p>Milestone 1.2: Authentication Integration 🔄</p>
		<p><small>Auth0 + Auth.js + Zod validation - Dec 27, 2024</small></p>
	</footer>
</main>

<style>
	main {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}
	
	header {
		margin-bottom: 3rem;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 2rem;
	}

	.title-area {
		flex: 1;
	}
	
	h1 {
		color: #0066cc;
		font-size: 3rem;
		margin: 0;
	}
	
	header p {
		color: #666;
		font-size: 1.2rem;
		margin: 0.5rem 0 0 0;
	}
	
	section {
		background: #f8f9fa;
		padding: 2rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}

	.hero h2, .welcome-back h2 {
		color: #333;
		margin-bottom: 1rem;
	}

	.features, .dashboard {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1.5rem;
		margin: 2rem 0;
	}

	.feature, .feature-card {
		background: white;
		padding: 1.5rem;
		border-radius: 6px;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.feature h3, .feature-card h3 {
		color: #0066cc;
		margin: 0 0 0.5rem 0;
	}

	.feature p, .feature-card p {
		color: #666;
		margin: 0 0 1rem 0;
	}

	.feature-button {
		background: #e5e7eb;
		color: #6b7280;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: not-allowed;
		font-size: 0.875rem;
	}

	.cta {
		text-align: center;
		padding: 1rem;
		background: white;
		border-radius: 6px;
		margin-top: 2rem;
	}

	.cta p {
		color: #0066cc;
		font-weight: 500;
		margin: 0;
	}
	
	footer {
		text-align: center;
		color: #888;
		font-size: 0.9rem;
		border-top: 1px solid #eee;
		padding-top: 1rem;
		margin-top: 2rem;
	}

	@media (max-width: 768px) {
		.header-content {
			flex-direction: column;
			align-items: stretch;
			text-align: center;
		}

		.features, .dashboard {
			grid-template-columns: 1fr;
		}

		h1 {
			font-size: 2rem;
		}
	}
	/* Auth error styling */
	.auth-error {
		background: #fee2e2;
		border: 1px solid #fca5a5;
		color: #dc2626;
		padding: 0.5rem 0.75rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
	}
</style>
