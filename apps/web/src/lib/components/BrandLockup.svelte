<script lang="ts">
  export let href = '/';
  export let label = 'StudyPuck home';
  export let size: 'compact' | 'hero' = 'compact';
</script>

<a class:brand--hero={size === 'hero'} class="brand cluster" href={href} aria-label={label}>
  <img class="brand__mark" src="/logo.svg" alt="" />
  <span class="brand__name">StudyPuck</span>
</a>

<style>
  .brand {
    align-items: center;
    color: var(--color-text-primary);
    text-decoration: none;
    --cluster-space: var(--space-3);
  }

  .brand__mark {
    inline-size: 2rem;
    block-size: 2rem;
    flex: none;
  }

  .brand__name {
    font-family: var(--font-heading);
    font-size: var(--font-size-h4);
    line-height: 1;
  }

  .brand--hero .brand__mark {
    inline-size: 2.5rem;
    block-size: 2.5rem;
  }

  .brand--hero .brand__name {
    font-size: var(--font-size-h3);
  }
</style>
