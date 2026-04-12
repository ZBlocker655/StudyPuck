<script lang="ts">
	import { signIn } from '@auth/sveltekit/client';
	import BrandLockup from '$lib/components/BrandLockup.svelte';
  import type { PageData } from './$types.js';

  export let data: PageData;
  $: authError = (data as any).authError;
</script>

<svelte:head>
	<title>StudyPuck - Master vocabulary with focus</title>
	<meta
		name="description"
		content="Master vocabulary through spaced repetition and AI translation practice."
	/>
</svelte:head>

<div class="landing-shell">
	<header class="landing-topbar">
		<div class="center landing-topbar__inner cluster">
			<BrandLockup href="/" />

			<button type="button" class="signin-button signin-button--secondary" onclick={() => signIn('auth0')}>
				Sign In
			</button>
		</div>
	</header>

	<main class="center landing-page stack">
		<section class="hero stack">
			<div class="hero__brand">
				<BrandLockup href="/" size="hero" label="StudyPuck" />
			</div>
			<h1>Master vocabulary through spaced repetition and AI translation practice.</h1>
			<p class="hero__summary">
				A calm language-learning workspace for capturing notes, reviewing at the right moment,
				and practicing active recall with AI-powered drills.
			</p>

			<div class="hero__actions cluster">
				<button type="button" class="signin-button" onclick={() => signIn('auth0')}>
					Sign In <span aria-hidden="true">→</span>
				</button>
			</div>

			{#if authError?.failed}
				<p class="auth-error" role="alert">Authentication is temporarily unavailable.</p>
			{/if}
		</section>

		<section class="feature-grid" aria-label="StudyPuck features">
			<article class="feature-card stack">
				<p class="feature-card__icon" aria-hidden="true">📚</p>
				<h2>Spaced Repetition</h2>
				<p>Cards reviewed at the optimal moment, scientifically timed for long-term retention.</p>
			</article>

			<article class="feature-card stack">
				<p class="feature-card__icon" aria-hidden="true">🤖</p>
				<h2>AI Translation Drills</h2>
				<p>Conversation-style practice powered by AI, tailored to your cards and study context.</p>
			</article>
		</section>
	</main>

	<footer class="landing-footer">
		<div class="center landing-footer__inner cluster">
			<p>© 2026 StudyPuck</p>
			<a href="https://github.com/ZBlocker655/StudyPuck" rel="noreferrer" target="_blank">GitHub ↗</a>
		</div>
	</footer>
</div>

<style>
	.landing-shell {
		min-block-size: 100vh;
		display: grid;
		grid-template-rows: auto 1fr auto;
	}

	.landing-topbar,
	.landing-footer {
		border-color: var(--color-border);
	}

	.landing-topbar {
		border-block-end: 1px solid var(--color-border);
		background: color-mix(in srgb, var(--color-background) 88%, transparent);
		backdrop-filter: blur(10px);
	}

	.landing-topbar__inner,
	.landing-footer__inner {
		justify-content: space-between;
		min-block-size: 3.75rem;
		--center-max: 72rem;
		--cluster-space: var(--space-4);
	}

	.landing-page {
		padding-block: var(--space-8);
		padding-inline: var(--space-5);
		--center-max: 72rem;
		--stack-space: var(--space-8);
	}

	.hero {
		max-inline-size: 44rem;
		margin-inline: auto;
		text-align: center;
		--stack-space: var(--space-5);
	}

	.hero__brand {
		display: flex;
		justify-content: center;
	}

	.hero h1,
	.hero__summary,
	.feature-card h2,
	.feature-card p,
	.landing-footer p {
		margin: 0;
	}

	.hero h1 {
		font-size: clamp(var(--font-size-h1), 6vw, var(--font-size-display));
		line-height: var(--leading-tight);
		letter-spacing: var(--tracking-heading);
	}

	.hero__summary {
		max-inline-size: 34rem;
		margin-inline: auto;
		font-size: var(--font-size-h4);
		color: var(--color-text-secondary);
	}

	.hero__actions {
		justify-content: center;
	}

	.signin-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
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

	.signin-button--secondary {
		padding-block: var(--space-2);
		padding-inline: var(--space-4);
	}

	.feature-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: var(--space-5);
	}

	.feature-card {
		padding: var(--space-5);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: var(--shadow-sm);
		--stack-space: var(--space-3);
	}

	.feature-card__icon {
		margin: 0;
		font-size: 2rem;
	}

	.feature-card p {
		color: var(--color-text-secondary);
	}

	.landing-footer {
		border-block-start: 1px solid var(--color-border);
	}

	.landing-footer a {
		color: var(--color-text-secondary);
		text-decoration: none;
	}

	.auth-error {
		margin: 0 auto;
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--color-error-border);
		border-radius: var(--radius-md);
		background: var(--color-error-bg);
		color: var(--color-error-text);
		font-family: var(--font-ui);
	}

	@media (max-width: 40rem) {
		.landing-page {
			padding-inline: var(--space-4);
			padding-block: var(--space-7);
		}

		.feature-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
