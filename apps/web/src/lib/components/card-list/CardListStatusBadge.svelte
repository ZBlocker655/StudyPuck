<script lang="ts">
  export let label = '';
  export let tone: 'draft' | 'active' | 'neutral' = 'neutral';
</script>

<span class={`card-list-status-badge card-list-status-badge--${tone}`}>{label}</span>

<style>
  .card-list-status-badge {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.45rem;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: 0.04em;
  }

  .card-list-status-badge--draft {
    background: var(--color-warning-bg);
    color: var(--color-warning-text);
    border-color: var(--color-warning-border);
  }

  .card-list-status-badge--active {
    background: var(--color-primary-subtle);
    color: var(--color-primary-text);
    border-color: color-mix(in srgb, var(--color-primary-text) 30%, transparent);
  }

  .card-list-status-badge--neutral {
    background: var(--color-surface);
    color: var(--color-text-secondary);
    border-color: var(--color-border-subtle);
  }
</style>
