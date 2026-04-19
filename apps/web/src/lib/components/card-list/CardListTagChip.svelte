<script lang="ts">
  export let label = '';
</script>

<span class="card-list-tag-chip">{label}</span>

<style>
  .card-list-tag-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.15rem 0.45rem;
    border: 1px solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
    background: var(--color-surface-subtle);
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
  }
</style>
