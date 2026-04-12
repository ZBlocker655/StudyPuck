<script lang="ts">
  import type { ActionData, PageData } from './$types.js';
  import { getUserInitials } from '$lib/utils/user.js';
  import { page } from '$app/stores';

  export let data: PageData;
  export let form: ActionData;

  let deleteDialogOpen = false;
  let deleteConfirmation = '';
  let deleteNotice = '';

  const savedDisplayName =
    form?.savedDisplayName ??
    data.dbProfile?.name ??
    data.session?.user?.name ??
    '';

  let displayName = form?.displayName ?? savedDisplayName;

  function formatMemberSince(date: Date | string | null | undefined): string {
    if (!date) return 'Unknown';

    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      year: 'numeric',
    }).format(new Date(date));
  }

  function formatLastLogin(date: Date | string | null | undefined): string {
    if (!date) return 'Unknown';

    const value = new Date(date);
    const now = new Date();
    const sameDay =
      value.getFullYear() === now.getFullYear() &&
      value.getMonth() === now.getMonth() &&
      value.getDate() === now.getDate();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const sameAsYesterday =
      value.getFullYear() === yesterday.getFullYear() &&
      value.getMonth() === yesterday.getMonth() &&
      value.getDate() === yesterday.getDate();

    const timeLabel = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    }).format(value);

    if (sameDay) {
      return `Today, ${timeLabel}`;
    }

    if (sameAsYesterday) {
      return `Yesterday, ${timeLabel}`;
    }

    return `${new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(value)}, ${timeLabel}`;
  }

  function handleNameBlur(event: FocusEvent) {
    const relatedTarget = event.relatedTarget as HTMLElement | null;

    if (relatedTarget?.dataset.keepDirty === 'true') {
      return;
    }

    displayName = savedDisplayName;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && deleteDialogOpen) {
      deleteDialogOpen = false;
      deleteConfirmation = '';
    }
  }

  function openDeleteDialog() {
    deleteDialogOpen = true;
    deleteConfirmation = '';
  }

  function closeDeleteDialog() {
    deleteDialogOpen = false;
    deleteConfirmation = '';
  }

  function handleDeletePlaceholder() {
    deleteNotice = 'Account deletion will be connected in a future milestone.';
    closeDeleteDialog();
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
  <title>Settings – Account – StudyPuck</title>
</svelte:head>

<section class="account-page stack">
  {#if form?.successMessage}
    <p class="status-message" role="status">{form.successMessage}</p>
  {/if}

  {#if form?.errorMessage}
    <p class="status-message status-message--error" role="alert">{form.errorMessage}</p>
  {/if}

  {#if deleteNotice}
    <p class="status-message status-message--warning" role="status">{deleteNotice}</p>
  {/if}

  <section class="settings-panel stack">
    <header class="stack settings-panel__copy">
      <h2>Profile</h2>
      <p class="text-muted">Keep the basics tidy while Auth0 continues handling sign-in and email identity.</p>
    </header>

    <div class="profile-grid">
      <div class="profile-avatar-badge" aria-hidden="true">
        {#if data.session?.user?.image}
          <img src={data.session.user.image} alt="" class="profile-avatar-image" />
        {:else}
          <span>{getUserInitials(data.session?.user)}</span>
        {/if}
      </div>

      <div class="stack profile-details">
        <form method="POST" class="stack profile-editor">
          <label class="stack profile-editor__field">
            <span class="field-label">Display Name</span>
            <div class="profile-editor__row">
              <input
                bind:value={displayName}
                class="text-input"
                name="displayName"
                type="text"
                autocomplete="name"
                onblur={handleNameBlur}
              />
              <button
                data-keep-dirty="true"
                type="submit"
                class="primary-button"
                disabled={displayName.trim() === savedDisplayName || displayName.trim().length === 0}
              >
                Save
              </button>
            </div>
          </label>
        </form>

        <dl class="details-list">
          <div>
            <dt>Email</dt>
            <dd>{data.dbProfile?.email ?? data.session?.user?.email ?? 'Unavailable'}</dd>
          </div>

          <div>
            <dt>Member since</dt>
            <dd>{formatMemberSince(data.dbProfile?.createdAt)}</dd>
          </div>

          <div>
            <dt>Last login</dt>
            <dd>{formatLastLogin(data.dbProfile?.lastLoginAt)}</dd>
          </div>
        </dl>
      </div>
    </div>
  </section>

  <section class="settings-panel stack">
    <header class="stack settings-panel__copy">
      <h2>Study Languages</h2>
      <p class="text-muted">A quick summary of the languages configured for this account.</p>
    </header>

    {#if data.languageSummaries.length > 0}
      <p class="language-summary">
        {#each data.languageSummaries as language, index}
          <span class:language-summary__active={language.isActive}>{language.languageName}</span>{#if index < data.languageSummaries.length - 1}<span aria-hidden="true"> • </span>{/if}
        {/each}
      </p>
    {:else}
      <p class="text-muted">No study languages are configured yet.</p>
    {/if}

    <a class="secondary-button secondary-button--link" href={`/${$page.params.lang}/settings/languages`}>
      Manage Languages →
    </a>
  </section>

  <section class="settings-panel stack">
    <header class="stack settings-panel__copy">
      <h2>Account Actions</h2>
      <p class="text-muted">Sign out right away, or review the future delete-account flow.</p>
    </header>

    <div class="stack account-actions">
      <form action="/auth/logout" method="POST">
        <button type="submit" class="secondary-button">Sign Out</button>
      </form>

      <div class="stack account-actions__danger">
        <button type="button" class="danger-button" onclick={openDeleteDialog}>Delete Account</button>
        <p class="text-muted">Account deletion is designed here, but the destructive backend flow is not enabled yet.</p>
      </div>
    </div>
  </section>
</section>

{#if deleteDialogOpen}
  <button type="button" class="dialog-backdrop" aria-label="Close delete account dialog" onclick={closeDeleteDialog}></button>

  <div class="dialog stack" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
    <div class="stack dialog__copy">
      <h2 id="delete-account-title">Delete Account</h2>
      <p>
        This will permanently delete your StudyPuck account and all study data — cards, review history, and language configurations.
      </p>
      <p>This cannot be undone. Type DELETE below to enable the placeholder confirmation.</p>
    </div>

    <label class="stack dialog__field">
      <span class="field-label">Confirmation</span>
      <input bind:value={deleteConfirmation} class="text-input" type="text" autocomplete="off" />
    </label>

    <div class="cluster dialog__actions">
      <button type="button" class="secondary-button" onclick={closeDeleteDialog}>Cancel</button>
      <button
        type="button"
        class="danger-button danger-button--solid"
        disabled={deleteConfirmation.trim().toUpperCase() !== 'DELETE'}
        onclick={handleDeletePlaceholder}
      >
        Delete Account
      </button>
    </div>
  </div>
{/if}

<style>
  .account-page {
    --stack-space: var(--space-5);
  }

  .settings-panel,
  .settings-panel__copy,
  .profile-details,
  .profile-editor,
  .profile-editor__field,
  .account-actions,
  .account-actions__danger,
  .dialog,
  .dialog__copy,
  .dialog__field {
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
  .settings-panel__copy p,
  .language-summary,
  .dialog__copy h2,
  .dialog__copy p {
    margin: 0;
  }

  .profile-grid {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr);
    gap: var(--space-5);
    align-items: start;
  }

  .profile-avatar-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    inline-size: 5rem;
    block-size: 5rem;
    overflow: hidden;
    border-radius: 50%;
    background: var(--color-primary);
    color: var(--color-text-inverse);
    font-family: var(--font-ui);
    font-size: var(--font-size-h4);
    font-weight: 700;
  }

  .profile-avatar-image {
    inline-size: 100%;
    block-size: 100%;
    object-fit: cover;
  }

  .field-label,
  .details-list dt {
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
    color: var(--color-text-secondary);
  }

  .profile-editor__row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: var(--space-3);
  }

  .text-input,
  .primary-button,
  .secondary-button,
  .secondary-button--link,
  .danger-button,
  .danger-button--solid {
    min-block-size: 2.75rem;
    border-radius: var(--radius-md);
    font-family: var(--font-ui);
    font-size: var(--font-size-ui);
  }

  .text-input {
    padding-inline: var(--space-3);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .primary-button,
  .secondary-button,
  .secondary-button--link,
  .danger-button,
  .danger-button--solid {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding-inline: var(--space-4);
    padding-block: var(--space-3);
    text-decoration: none;
  }

  .primary-button {
    border: 1px solid var(--color-primary);
    background: var(--color-primary);
    color: var(--color-text-inverse);
  }

  .secondary-button,
  .secondary-button--link {
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    color: var(--color-text-primary);
  }

  .danger-button {
    border: 1px solid var(--color-error-border);
    background: var(--color-surface);
    color: var(--color-error-text);
  }

  .danger-button--solid {
    border: 1px solid var(--color-error-text);
    background: var(--color-error-text);
    color: var(--color-text-inverse);
  }

  .details-list {
    display: grid;
    gap: var(--space-4);
    margin: 0;
  }

  .details-list div {
    display: grid;
    gap: var(--space-1);
  }

  .details-list dd {
    margin: 0;
  }

  .language-summary {
    color: var(--color-text-secondary);
  }

  .language-summary__active {
    color: var(--color-text-primary);
    font-weight: 600;
  }

  .status-message {
    margin: 0;
    padding: var(--space-3) var(--space-4);
    border: 1px solid var(--color-success-border);
    border-radius: var(--radius-md);
    background: var(--color-success-bg);
    color: var(--color-success-text);
  }

  .status-message--error {
    border-color: var(--color-error-border);
    background: var(--color-error-bg);
    color: var(--color-error-text);
  }

  .status-message--warning {
    border-color: var(--color-warning-border);
    background: var(--color-warning-bg);
    color: var(--color-warning-text);
  }

  .dialog-backdrop {
    position: fixed;
    inset: 0;
    z-index: 49;
    border: 0;
    background: color-mix(in srgb, var(--color-background) 55%, transparent);
  }

  .dialog {
    position: fixed;
    inset-block-start: 50%;
    inset-inline-start: 50%;
    z-index: 50;
    inline-size: min(100% - (var(--space-4) * 2), 34rem);
    padding: var(--space-5);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    background: var(--color-surface-raised);
    box-shadow: var(--shadow-lg);
    transform: translate(-50%, -50%);
  }

  .dialog__actions {
    align-items: center;
    gap: var(--space-3);
  }

  .text-input:focus-visible,
  .primary-button:focus-visible,
  .secondary-button:focus-visible,
  .secondary-button--link:focus-visible,
  .danger-button:focus-visible,
  .danger-button--solid:focus-visible {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  @media (max-width: 48rem) {
    .profile-grid {
      grid-template-columns: 1fr;
    }

    .profile-editor__row,
    .dialog__actions {
      grid-template-columns: 1fr;
      flex-direction: column;
      align-items: stretch;
    }

    .primary-button,
    .secondary-button,
    .secondary-button--link,
    .danger-button,
    .danger-button--solid {
      inline-size: 100%;
    }
  }
</style>
