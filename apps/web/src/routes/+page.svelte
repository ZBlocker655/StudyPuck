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
				<div class="header-actions">
					{#if data.session?.user}
						<a href="/profile">Profile</a>
					{/if}
					<AuthButton session={typedSession} />
				</div>
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
		<p>Milestone 1.3: Database Setup 🗄️</p>
		<p><small>Neon Postgres + Drizzle ORM + User Profiles - Mar 2026</small></p>
	</footer>
</main>

<style>
	main {
		max-width: 1000px;
		margin: 0 auto;
		padding: var(--space-6);
	}
	
	header {
		margin-bottom: var(--space-7);
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-6);
	}

	.title-area {
		flex: 1;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}
	
	h1 {
		font-size: var(--font-size-display);
		margin: 0;
	}
	
	header p {
		color: var(--color-text-secondary);
		font-size: var(--font-size-h4);
		margin: var(--space-2) 0 0 0;
	}
	
	section {
		background: var(--color-surface-subtle);
		padding: var(--space-6);
		border-radius: var(--radius-lg);
		margin-bottom: var(--space-6);
	}

	.hero h2, .welcome-back h2 {
		margin-bottom: var(--space-4);
	}

	.features, .dashboard {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: var(--space-5);
		margin: var(--space-6) 0;
	}

	.feature, .feature-card {
		background: var(--color-surface);
		padding: var(--space-5);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.feature h3, .feature-card h3 {
		margin: 0 0 var(--space-2) 0;
	}

	.feature p, .feature-card p {
		margin: 0 0 var(--space-4) 0;
	}

	.feature-button {
		background: var(--color-surface-subtle);
		color: var(--color-text-muted);
		border: 1px solid var(--color-border);
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-md);
		cursor: not-allowed;
	}

	.cta {
		text-align: center;
		padding: var(--space-4);
		background: var(--color-surface);
		border-radius: var(--radius-lg);
		margin-top: var(--space-6);
	}

	.cta p {
		font-weight: 500;
		margin: 0;
	}
	
	footer {
		text-align: center;
		color: var(--color-text-muted);
		font-size: var(--font-size-small);
		border-top: 1px solid var(--color-border);
		padding-top: var(--space-4);
		margin-top: var(--space-6);
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
			font-size: var(--font-size-h2);
		}
	}
	/* Auth error styling */
	.auth-error {
		background: var(--color-error-bg);
		border: 1px solid var(--color-error-border);
		color: var(--color-error-text);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-weight: 500;
	}
</style>
