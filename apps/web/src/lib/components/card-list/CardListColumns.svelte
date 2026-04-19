<script lang="ts">
  export let labels: string[] = [];
  export let rowTemplate = 'auto minmax(0, 1.9fr) minmax(10rem, 1fr) minmax(4rem, 0.5fr) auto';
</script>

<div class="card-list-columns" aria-hidden="true" style={`--card-list-row-template: ${rowTemplate}`}>
  {#if labels[0]}
    <span>{labels[0]}</span>
  {/if}
  {#if labels[1]}
    <span>{labels[1]}</span>
  {/if}
  {#if labels[2]}
    <span>{labels[2]}</span>
  {/if}
</div>

<style>
  .card-list-columns {
    display: grid;
    grid-template-columns: var(--card-list-row-template);
    gap: var(--space-3);
    padding: 0 var(--space-4) var(--space-2);
    color: var(--color-text-muted);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .card-list-columns span:first-child {
    grid-column: 2;
  }

  @media (max-width: 900px) {
    .card-list-columns {
      display: none;
    }
  }
</style>
