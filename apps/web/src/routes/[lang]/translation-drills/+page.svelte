<script lang="ts">
  import MiniAppPlaceholder from '$lib/components/MiniAppPlaceholder.svelte';
  import { page } from '$app/stores';
</script>

<svelte:head>
  <title>Translation Drills – StudyPuck</title>
</svelte:head>

<MiniAppPlaceholder
  title="Translation Drills"
  accent="drills"
  routePath={`/${$page.params.lang}/translation-drills`}
  commandContext="Translation Drills"
  description="Practice translation in an AI-guided conversation while keeping the relevant card context close at hand."
  plannedExperience={[
    'A chat-like drill with the current sentence prompt visually separated from feedback.',
    'A context panel for drawing, snoozing, and dismissing cards without leaving the drill.',
    'Scheduling decisions that feel human-readable instead of cryptic SRS jargon.'
  ]}
>
  <div slot="preview" class="drills-preview stack">
    <article class="drill-message drill-message--assistant stack">
      <p class="drill-message__label">Prompt</p>
      <p>Translate into Chinese: “We should make up for the time we lost.”</p>
    </article>

    <article class="drill-message drill-message--user stack">
      <p class="drill-message__label">Your translation</p>
      <p>我们应该补偿失去的时间。</p>
    </article>

    <div class="drills-context stack">
      <div class="cluster drills-context__header">
        <p>Active context</p>
        <span>3 cards</span>
      </div>
      <div class="cluster drills-context__pills">
        <span>补偿</span>
        <span>失去</span>
        <span>时间</span>
      </div>
    </div>
  </div>
</MiniAppPlaceholder>

<style>
  .drills-preview,
  .drill-message,
  .drills-context {
    --stack-space: var(--space-3);
  }

  .drill-message {
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .drill-message--assistant {
    border-color: var(--color-primary);
    background: var(--color-primary-subtle);
  }

  .drill-message--user {
    margin-inline-start: var(--space-7);
  }

  .drill-message p,
  .drills-context__header p {
    margin: 0;
  }

  .drill-message__label,
  .drills-context__header {
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }

  .drills-context {
    padding: var(--space-4);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
  }

  .drills-context__header,
  .drills-context__pills {
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .drills-context__pills {
    flex-wrap: wrap;
  }

  .drills-context__pills span {
    padding: var(--space-2) var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
  }

  @media (max-width: 40rem) {
    .drill-message--user {
      margin-inline-start: 0;
    }
  }
</style>
