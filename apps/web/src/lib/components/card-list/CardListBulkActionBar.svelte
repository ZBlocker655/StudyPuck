<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    primary: void;
    secondary: void;
    clear: void;
  }>();

  export let selectedCount = 0;
  export let itemLabelSingular = 'card';
  export let itemLabelPlural = 'cards';
  export let primaryActionLabel = 'Primary';
  export let primaryActionPendingLabel = 'Working...';
  export let secondaryActionLabel = 'Secondary';
  export let secondaryActionPendingLabel = 'Working...';
  export let clearLabel = 'Deselect all';
  export let disabled = false;
  export let pendingAction: 'primary' | 'secondary' | null = null;
</script>

<section class="card-list-bulk-bar cluster" aria-live="polite">
  <p>{selectedCount} {selectedCount === 1 ? itemLabelSingular : itemLabelPlural} selected</p>

  <div class="card-list-bulk-bar__actions cluster">
    <button type="button" class="card-list-bulk-bar__button" disabled={disabled} on:click={() => dispatch('primary')}>
      {pendingAction === 'primary' ? primaryActionPendingLabel : primaryActionLabel}
    </button>
    <button
      type="button"
      class="card-list-bulk-bar__button card-list-bulk-bar__button--danger"
      disabled={disabled}
      on:click={() => dispatch('secondary')}
    >
      {pendingAction === 'secondary' ? secondaryActionPendingLabel : secondaryActionLabel}
    </button>
    <button type="button" class="card-list-bulk-bar__link" on:click={() => dispatch('clear')}>{clearLabel}</button>
  </div>
</section>

<style>
  .card-list-bulk-bar,
  .card-list-bulk-bar__actions {
    align-items: center;
    gap: var(--space-3);
  }

  .card-list-bulk-bar {
    justify-content: space-between;
    padding: 0.85rem 1rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .card-list-bulk-bar p {
    margin: 0;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
  }

  .card-list-bulk-bar__button,
  .card-list-bulk-bar__link {
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
  }

  .card-list-bulk-bar__button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.55rem 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    cursor: pointer;
    text-decoration: none;
    font-family: var(--font-ui);
  }

  .card-list-bulk-bar__button:first-child {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .card-list-bulk-bar__button--danger {
    color: var(--color-danger-text);
    border-color: color-mix(in srgb, var(--color-danger-border) 60%, var(--color-border));
    background: var(--color-surface);
  }

  .card-list-bulk-bar__link {
    padding: 0;
    text-decoration: underline;
    cursor: pointer;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
  }

  .card-list-bulk-bar__button:focus-visible,
  .card-list-bulk-bar__link:focus-visible {
    outline: 3px solid color-mix(in srgb, var(--color-primary-text) 35%, transparent);
    outline-offset: 2px;
  }

  @media (max-width: 640px) {
    .card-list-bulk-bar {
      align-items: start;
      flex-direction: column;
    }

    .card-list-bulk-bar__actions {
      inline-size: 100%;
      flex-wrap: wrap;
    }
  }
</style>
