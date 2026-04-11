<script lang="ts">
  import AuthButton from '$lib/components/AuthButton.svelte';
  import type { PageData } from './$types.js';

  export let data: PageData;

  $: typedSession = data.session as any;
  $: authError = (data as any).authError;
</script>

<svelte:head>
	<title>StudyPuck - AI-Powered Language Learning</title>
	<meta name="description" content="Learn languages with AI-powered translation drills and spaced repetition" />
</svelte:head>

<main class="center stack landing-page">
	<header class="stack landing-header">
		<div class="stack" style="--stack-space: var(--space-2)">
			<h1>🏒 StudyPuck</h1>
			<p class="text-muted">AI-Powered Language Learning</p>
		</div>

		{#if authError?.failed}
			<div class="auth-error">
				⚠️ Authentication temporarily unavailable
			</div>
		{/if}
	</header>

	<section class="stack hero-panel">
		<h2>Master Languages with AI-Powered Learning</h2>
		<p>
			StudyPuck combines spaced repetition flashcards with interactive AI translation drills
			to help you learn languages more effectively.
		</p>

		<div class="features grid" style="--grid-gap: var(--space-5); --grid-min-size: 18rem">
			<div class="feature">
				<h3>📚 Smart Cards</h3>
				<p>Organize vocabulary with intelligent spaced repetition.</p>
			</div>

			<div class="feature">
				<h3>🗣️ AI Conversations</h3>
				<p>Practice translations in natural conversation flows.</p>
			</div>

			<div class="feature">
				<h3>🎯 Personalized Learning</h3>
				<p>Adaptive difficulty based on your progress.</p>
			</div>
		</div>

		<div class="stack landing-actions" style="--stack-space: var(--space-3)">
			<p>Sign in to enter your active language workspace.</p>
			<div class="landing-auth">
				<AuthButton session={typedSession} />
			</div>
		</div>
	</section>
</main>

<style>
	.landing-page {
		padding-block: var(--space-6);
		--center-max: 62.5rem;
		--stack-space: var(--space-6);
	}
	
	.landing-page h1 {
		font-size: var(--font-size-display);
	}
	
	.landing-header p {
		font-size: var(--font-size-h4);
	}
	
	.hero-panel {
		background: var(--color-surface-subtle);
		padding: var(--space-6);
		border-radius: var(--radius-lg);
	}

	.feature {
		background: var(--color-surface);
		padding: var(--space-5);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-sm);
	}

	.feature h3 {
		margin: 0 0 var(--space-2) 0;
	}

	.feature p {
		margin: 0 0 var(--space-4) 0;
	}

	.landing-actions {
		padding: var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}

	.landing-auth :global(.auth-container) {
		justify-content: flex-start;
	}

	@media (max-width: 768px) {
		.landing-page h1 {
			font-size: var(--font-size-h2);
		}
	}

	.auth-error {
		background: var(--color-error-bg);
		border: 1px solid var(--color-error-border);
		color: var(--color-error-text);
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		font-weight: 500;
	}
</style>
