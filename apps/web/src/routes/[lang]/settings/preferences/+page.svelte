<script lang="ts">
  import { theme } from '$lib/stores/theme.js';
</script>

<svelte:head>
  <title>Settings – Preferences – StudyPuck</title>
</svelte:head>

<section class="settings-screen stack">
  <section class="settings-panel stack">
    <header class="stack settings-panel__copy">
      <h2>Appearance</h2>
      <p class="text-muted">Choose how the StudyPuck workspace looks while more preferences are being built.</p>
    </header>

    <fieldset class="preference-group">
      <legend>Theme</legend>

      <label class="preference-option">
        <input checked={$theme === 'light'} type="radio" name="theme" onchange={() => theme.set('light')} />
        <span>Light</span>
      </label>

      <label class="preference-option">
        <input checked={$theme === 'dark'} type="radio" name="theme" onchange={() => theme.set('dark')} />
        <span>Dark</span>
      </label>

      <label class="preference-option preference-option--disabled">
        <input disabled type="radio" name="theme" />
        <span>System</span>
      </label>
    </fieldset>
  </section>

  <section class="settings-panel stack">
    <header class="stack settings-panel__copy">
      <h2>Study</h2>
      <p class="text-muted">Session defaults will become server-backed in a future milestone.</p>
    </header>

    <label class="stack form-field">
      <span>Default session size</span>
      <select disabled class="form-control">
        <option selected>20 cards</option>
      </select>
    </label>
  </section>

  <section class="settings-panel stack">
    <header class="stack settings-panel__copy">
      <h2>Notifications</h2>
      <p class="text-muted">Reminder scheduling will be connected when notification infrastructure is ready.</p>
    </header>

    <div class="toggle-row" role="group" aria-label="Daily study reminder">
      <span>Daily study reminder</span>
      <span class="toggle-row__state">Coming soon</span>
    </div>

    <label class="stack form-field">
      <span>Reminder time</span>
      <select disabled class="form-control">
        <option selected>8:00 AM</option>
      </select>
    </label>
  </section>
</section>

<style>
  .settings-screen,
  .settings-panel,
  .settings-panel__copy,
  .form-field {
    --stack-space: var(--space-4);
  }

  .settings-panel {
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface);
    box-shadow: var(--shadow-sm);
  }

  .settings-panel__copy h2,
  .settings-panel__copy p {
    margin: 0;
  }

  .preference-group {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-3);
    margin: 0;
    padding: 0;
    border: 0;
  }

  .preference-group legend,
  .form-field span {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    color: var(--color-text-secondary);
  }

  .preference-option,
  .toggle-row {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-block-size: 2.75rem;
    padding-inline: var(--space-3);
    padding-block: var(--space-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    font-family: var(--font-ui);
  }

  .preference-option--disabled,
  .form-control:disabled {
    opacity: 0.65;
  }

  .toggle-row {
    justify-content: space-between;
  }

  .toggle-row__state {
    color: var(--color-text-muted);
    font-size: var(--font-size-small);
  }

  .form-control {
    min-block-size: 2.75rem;
    padding-inline: var(--space-3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface);
    color: var(--color-text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
  }

  .form-control:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }
</style>
