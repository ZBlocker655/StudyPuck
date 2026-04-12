<script lang="ts">
  import MiniAppPlaceholder from '$lib/components/MiniAppPlaceholder.svelte';
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Card Review – StudyPuck</title>
</svelte:head>

<MiniAppPlaceholder
  title="Card Review"
  accent="review"
  routePath={`/${$page.params.lang}/card-review`}
  commandContext="Card Review"
  description="Run deliberate spaced-repetition sessions with typography-forward cards, subtle progress, and fast review actions."
  plannedExperience={[
    'A focused setup screen for choosing what is due and how much to review.',
    'A distraction-light review card with excellent readability for CJK and longer notes.',
    'Fast rating controls for easy, medium, and hard without fumbling for the interface.'
  ]}
>
  <div slot="preview" class="review-preview stack">
    <div class="review-preview__status cluster">
      <p>Due today</p>
      <span>18 cards</span>
    </div>

    <article class="review-card stack">
      <p class="review-card__eyebrow">Current card</p>
      <h2>补偿</h2>
      <p>to make up for / to compensate</p>
      <p class="review-card__example">Example: 我们以后再补偿这次错过的时间。</p>
    </article>

    <div class="review-actions cluster">
      <span class="review-actions__pill">Easy</span>
      <span class="review-actions__pill">Medium</span>
      <span class="review-actions__pill">Hard</span>
    </div>
  </div>
</MiniAppPlaceholder>

<style>
  .review-preview,
  .review-card {
    --stack-space: var(--space-4);
  }

  .review-preview__status,
  .review-actions {
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
  }

  .review-preview__status,
  .review-actions__pill,
  .review-card {
    font-family: var(--font-ui);
  }

  .review-preview__status {
    color: var(--color-info-text);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .review-preview__status p {
    margin: 0;
  }

  .review-card {
    padding: var(--space-5);
    border: 1px solid var(--color-info-border);
    border-radius: var(--radius-lg);
    background: color-mix(in srgb, var(--color-info-bg) 55%, var(--color-surface));
    box-shadow: var(--shadow-sm);
  }

  .review-card__eyebrow,
  .review-card p,
  .review-card h2 {
    margin: 0;
  }

  .review-card__eyebrow {
    color: var(--color-text-secondary);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .review-card h2 {
    font-size: clamp(2.25rem, 8vw, 3.25rem);
    line-height: var(--leading-tight);
  }

  .review-card__example {
    color: var(--color-text-secondary);
  }

  .review-actions__pill {
    flex: 1;
    min-block-size: 2.75rem;
    padding: var(--space-3);
    border: 1px solid var(--color-info-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    text-align: center;
    font-size: var(--font-size-ui);
  }

  @media (max-width: 40rem) {
    .review-actions {
      flex-direction: column;
    }
  }
</style>
