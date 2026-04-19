<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    toggleSelection: void;
  }>();

  export let selected = false;
  export let checkboxLabel = 'Select card';
  export let rowTemplate = '1rem minmax(0, 2.25fr) minmax(9rem, 1fr) auto auto';
</script>

<article class:selected class="card-list-row">
  <div class="card-list-row__track" style={`--card-list-row-template: ${rowTemplate}`}>
    <label class="card-list-row__checkbox">
      <input type="checkbox" checked={selected} on:change={() => dispatch('toggleSelection')} />
      <span class="sr-only">{checkboxLabel}</span>
    </label>

    <div class="card-list-row__content">
      <slot name="content" />
    </div>

    <div class="card-list-row__groups">
      <slot name="groups" />
    </div>

    <div class="card-list-row__updated">
      <slot name="updated" />
    </div>

    <div class="card-list-row__actions" aria-label="Row actions">
      <slot name="actions" />
    </div>
  </div>
</article>

<style>
  .card-list-row {
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    transition:
      border-color var(--duration-fast) var(--ease-standard),
      background var(--duration-fast) var(--ease-standard),
      box-shadow var(--duration-fast) var(--ease-standard);
  }

  .card-list-row.selected {
    border-color: color-mix(in srgb, var(--color-primary-text) 45%, var(--color-border));
    background: color-mix(in srgb, var(--color-primary-subtle) 12%, var(--color-surface));
  }

  .card-list-row:hover,
  .card-list-row:focus-within {
    border-color: var(--color-border);
    background: color-mix(in srgb, var(--color-surface-raised) 45%, var(--color-surface));
  }

  .card-list-row__track {
    display: grid;
    grid-template-columns: var(--card-list-row-template);
    gap: var(--space-3);
    align-items: start;
    padding: var(--space-4);
  }

  .card-list-row__checkbox {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: center;
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--duration-fast) var(--ease-standard);
  }

  .card-list-row__checkbox input {
    margin: 0;
  }

  .card-list-row:hover .card-list-row__checkbox,
  .card-list-row:focus-within .card-list-row__checkbox,
  .card-list-row.selected .card-list-row__checkbox {
    opacity: 1;
    pointer-events: auto;
  }

  .card-list-row__content,
  .card-list-row__groups,
  .card-list-row__updated {
    min-inline-size: 0;
  }

  .card-list-row__actions {
    display: flex;
    align-items: center;
    justify-self: end;
    gap: var(--space-3);
    padding-inline-start: var(--space-3);
    border-inline-start: 1px solid var(--color-border-subtle);
    opacity: 0;
    pointer-events: none;
    transition: opacity var(--duration-fast) var(--ease-standard);
    white-space: nowrap;
  }

  .card-list-row:hover .card-list-row__actions,
  .card-list-row:focus-within .card-list-row__actions,
  .card-list-row.selected .card-list-row__actions {
    opacity: 1;
    pointer-events: auto;
  }

  .card-list-row :global(.card-list-action) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-text-secondary);
    font: inherit;
    font-family: var(--font-ui);
    font-size: var(--font-size-small);
    text-decoration: none;
    cursor: pointer;
  }

  .card-list-row :global(.card-list-action--promote) {
    color: var(--color-primary-text);
    font-weight: 600;
  }

  .card-list-row :global(.card-list-action--danger) {
    color: var(--color-danger-text);
  }

  .card-list-row :global(.card-list-action:hover) {
    text-decoration: underline;
  }

  .card-list-row :global(a:focus-visible),
  .card-list-row :global(button:focus-visible),
  .card-list-row input:focus-visible {
    outline: none;
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary-text) 18%, transparent);
    border-radius: var(--radius-sm);
  }

  @media (max-width: 900px) {
    .card-list-row__track {
      grid-template-columns: 1.25rem minmax(0, 1fr);
      align-items: start;
    }

    .card-list-row__checkbox {
      justify-content: start;
      opacity: 1;
      pointer-events: auto;
    }

    .card-list-row__content {
      grid-column: 2;
    }

    .card-list-row__groups,
    .card-list-row__updated,
    .card-list-row__actions {
      grid-column: 2;
      margin-inline-start: 0;
    }

    .card-list-row__actions {
      justify-self: start;
      gap: var(--space-2);
      padding-inline-start: 0;
      border-inline-start: 0;
      opacity: 1;
      pointer-events: auto;
      flex-wrap: wrap;
    }
  }
</style>
