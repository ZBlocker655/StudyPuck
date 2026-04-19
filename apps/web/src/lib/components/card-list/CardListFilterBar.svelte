<script lang="ts">
  type CardListGroupOption = {
    groupId: string;
    groupName: string;
  };

  export let availableGroups: CardListGroupOption[] = [];
  export let searchLabel = 'Search';
  export let searchPlaceholder = 'Search...';
  export let searchQuery = '';
  export let groupFilterLabel = 'All groups';
  export let selectedGroupIds: string[] = [];
  export let clearGroupLabel = 'Clear group filters';

  function toggleGroup(groupId: string) {
    if (selectedGroupIds.includes(groupId)) {
      selectedGroupIds = selectedGroupIds.filter((existingGroupId) => existingGroupId !== groupId);
      return;
    }

    selectedGroupIds = [...selectedGroupIds, groupId];
  }

  function clearGroupFilters() {
    selectedGroupIds = [];
  }
</script>

<section class="card-list-filter-bar">
  <label class="card-list-filter-bar__search">
    <span class="card-list-filter-bar__label">{searchLabel}</span>
    <input
      bind:value={searchQuery}
      class="card-list-filter-bar__search-input"
      type="search"
      placeholder={searchPlaceholder}
      autocomplete="off"
    />
  </label>

  <details class="card-list-filter-bar__groups">
    <summary class="card-list-filter-bar__groups-summary">
      {groupFilterLabel}
      <span aria-hidden="true">▾</span>
    </summary>

    <div class="card-list-filter-bar__groups-menu stack" style="--stack-space: var(--space-2)">
      <button type="button" class="card-list-filter-bar__clear" on:click={clearGroupFilters}>
        {clearGroupLabel}
      </button>

      {#each availableGroups as group}
        <label class="card-list-filter-bar__group-option">
          <input
            type="checkbox"
            checked={selectedGroupIds.includes(group.groupId)}
            on:change={() => toggleGroup(group.groupId)}
          />
          <span>{group.groupName}</span>
        </label>
      {/each}
    </div>
  </details>
</section>

<style>
  .card-list-filter-bar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-3);
  }

  .card-list-filter-bar__search {
    display: grid;
    gap: var(--space-1);
  }

  .card-list-filter-bar__label {
    margin: 0;
    color: var(--color-text-secondary);
    font-family: var(--font-ui);
    font-size: var(--font-size-caption);
    letter-spacing: var(--tracking-caps);
    text-transform: uppercase;
  }

  .card-list-filter-bar__search-input,
  .card-list-filter-bar__groups-summary {
    min-block-size: 2.75rem;
    padding: 0.7rem 0.95rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    transition:
      border-color var(--duration-fast) var(--ease-standard),
      box-shadow var(--duration-fast) var(--ease-standard);
  }

  .card-list-filter-bar__search-input {
    inline-size: 100%;
  }

  .card-list-filter-bar__groups {
    position: relative;
  }

  .card-list-filter-bar__groups[open] .card-list-filter-bar__groups-summary {
    border-end-start-radius: 0;
    border-end-end-radius: 0;
  }

  .card-list-filter-bar__groups-summary {
    display: inline-flex;
    min-inline-size: 10.5rem;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
    list-style: none;
  }

  .card-list-filter-bar__groups-summary::-webkit-details-marker {
    display: none;
  }

  .card-list-filter-bar__groups-menu {
    position: absolute;
    z-index: 2;
    inset-inline-end: 0;
    inline-size: min(18rem, 80vw);
    margin-block-start: -1px;
    padding: var(--space-3);
    border: 1px solid var(--color-border);
    border-start-start-radius: var(--radius-md);
    border-start-end-radius: 0;
    border-end-start-radius: var(--radius-lg);
    border-end-end-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-md);
  }

  .card-list-filter-bar__clear {
    justify-self: start;
    padding: 0;
    border: 0;
    background: none;
    color: var(--color-text-secondary);
    font: inherit;
    font-family: var(--font-ui);
    text-decoration: underline;
    cursor: pointer;
  }

  .card-list-filter-bar__group-option {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    color: inherit;
    font-family: var(--font-ui);
  }

  .card-list-filter-bar__search-input:focus-visible,
  .card-list-filter-bar__groups-summary:focus-visible,
  .card-list-filter-bar__clear:focus-visible {
    outline: none;
    border-color: color-mix(in srgb, var(--color-primary-text) 45%, var(--color-border));
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary-text) 18%, transparent);
  }

  @media (max-width: 900px) {
    .card-list-filter-bar {
      grid-template-columns: 1fr;
    }

    .card-list-filter-bar__groups-summary {
      inline-size: 100%;
    }
  }
</style>
