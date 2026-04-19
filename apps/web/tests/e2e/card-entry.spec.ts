import { expect, test, type Page } from '@playwright/test';
import { getCardStatus, getTodayCardEntryStats, resetDatabase, seedDraftCard, seedInboxNote, seedUser } from './support/database';
import { signInAs } from './support/session';

async function signInCardEntryUser(page: Page) {
  await resetDatabase();

  const user = await seedUser({
    userId: 'auth0|card-entry-e2e',
    email: 'card-entry@example.com',
    name: 'Card Entry User',
    languages: [
      { code: 'es', label: 'Spanish' },
      { code: 'nl', label: 'Dutch' },
    ],
  });

  await signInAs(page, user);

  return user;
}

test('supports inbox capture, nav badges, note actions, and language isolation', async ({ page }) => {
  const user = await signInCardEntryUser(page);
  await seedInboxNote({
    userId: user.userId,
    languageId: 'nl',
    noteId: 'note-nl-only',
    content: 'alleen nederlands',
  });

  await page.goto('/es/card-entry');

  await expect(page.getByRole('heading', { name: 'Card Entry' })).toBeVisible();
  await expect(page.getByText('Your inbox is empty')).toBeVisible();
  await expect(page.locator('.app-sidebar .nav-badge')).toHaveCount(0);
  await expect(page.locator('.card-entry-count')).toHaveText('0');

  await page.getByRole('textbox', { name: 'New note' }).fill('hola desde inline');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  const inlineRow = page.locator('.note-row-shell', { hasText: 'hola desde inline' });
  await expect(inlineRow).toHaveCount(1);
  await expect(page.locator('.card-entry-count')).toHaveText('1');
  await expect(page.locator('.app-sidebar .nav-badge')).toHaveText('1');

  await inlineRow.hover();
  await inlineRow.getByRole('button', { name: 'Defer' }).click();

  await expect(page.getByText('hola desde inline')).toHaveCount(0);
  await expect(page.getByText('Your inbox is empty')).toBeVisible();
  await expect(page.locator('.app-sidebar .nav-badge')).toHaveCount(0);

  await page.goto('/nl/card-entry');
  await expect(page.locator('.note-row-shell', { hasText: 'alleen nederlands' })).toHaveCount(1);
  await expect(page.getByText('hola desde inline')).toHaveCount(0);
});

test('supports command-bar quick-add flow and process handoff route', async ({ page }) => {
  await signInCardEntryUser(page);
  await page.goto('/es/card-entry');

  const commandInput = page.locator('.command-bar__input');
  await expect(page.locator('.card-entry-count')).toHaveText('0');

  const quickAddDialog = page.getByRole('dialog', { name: 'Add Note' });
  await expect(async () => {
    await commandInput.fill('/add');
    await commandInput.press('Enter');
    await expect(quickAddDialog).toBeVisible();
  }).toPass({ timeout: 10000 });
  await quickAddDialog.getByRole('textbox', { name: 'Note', exact: true }).fill('hola desde drawer');
  await quickAddDialog.getByRole('button', { name: 'Add to Inbox' }).click();

  const drawerRow = page.locator('.note-row-shell', { hasText: 'hola desde drawer' });
  await expect(drawerRow).toHaveCount(1);
  await expect(page.locator('.card-entry-count')).toHaveText('1');

  await drawerRow.hover();
  await drawerRow.getByRole('link', { name: 'Process →' }).click();

  await page.waitForURL(/\/es\/card-entry\/notes\//);
  await expect(page.getByRole('heading', { name: 'Note Processing' })).toBeVisible();
  await expect(page.getByText('hola desde drawer')).toBeVisible();
  await expect(page.getByText(/AI is preparing your cards…|AI processing failed/)).toBeVisible();
});

test('surfaces dashboard card-entry counts with actionable inbox and draft links', async ({ page }) => {
  const user = await signInCardEntryUser(page);
  await seedDraftCard({
    userId: user.userId,
    languageId: 'es',
    noteContent: 'repasar por si acaso',
    cardContent: 'por si acaso',
    meaning: 'just in case',
    groupName: 'Grammar'
  });

  await page.goto('/es/');

  await expect(page.getByText('Notes in Inbox')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Enter Cards →' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'View 1 draft card →' })).toBeVisible();

  await page.getByRole('link', { name: 'View 1 draft card →' }).click();
  await page.waitForURL('/es/card-entry/drafts');
  await expect(page.getByRole('heading', { name: 'Drafts' })).toBeVisible();
});

test('supports manual processing into a draft, sign-off promotion, and statistics surfacing', async ({ page }) => {
  const user = await signInCardEntryUser(page);
  const seededNote = await seedInboxNote({
    userId: user.userId,
    languageId: 'es',
    noteId: 'note-manual-process',
    content: 'usar para que con subjuntivo',
    aiState: 'failed'
  });

  await page.goto(`/es/card-entry/notes/${seededNote.noteId}`);

  await expect(page.getByRole('heading', { name: 'Note Processing' })).toBeVisible();
  await expect(page.getByText('AI processing failed')).toBeVisible();

  await page.getByRole('button', { name: '+ Add another card' }).click();
  await page.getByRole('textbox', { name: 'Content' }).fill('para que + subjuntivo');
  await page.getByRole('textbox', { name: 'Meaning' }).fill('so that');

  await page.getByRole('button', { name: '+ Add group' }).click();
  await page.getByPlaceholder('Search groups...').fill('Grammar');
  await page.getByRole('button', { name: '+ Create "Grammar"' }).click();

  await page.getByRole('button', { name: /Sign off — Promote all to active/ }).click();
  await page.waitForURL('/es/card-entry');
  await expect(page.getByText('usar para que con subjuntivo')).toHaveCount(0);

  await page.goto('/es/stats');
  await expect(page.getByRole('heading', { name: 'Statistics' })).toBeVisible();
  const promotedTile = page.locator('.stat-tile', { hasText: 'Cards promoted to active' });
  await expect(promotedTile).toContainText('1');

  const todayStats = await getTodayCardEntryStats(user.userId, 'es');
  expect(todayStats?.notesCaptured).toBe(1);
  expect(todayStats?.draftCardsCreated).toBe(1);
  expect(todayStats?.cardsPromotedToActive).toBe(1);
});

test('supports workspace delete and draft review navigation', async ({ page }) => {
  const user = await signInCardEntryUser(page);
  const reviewDraft = await seedDraftCard({
    userId: user.userId,
    languageId: 'es',
    noteId: 'note-draft-review',
    noteContent: 'repasar aunque',
    cardId: 'draft-review-card',
    cardContent: 'aunque',
    meaning: 'although',
    groupName: 'Connectors'
  });
  const deleteDraft = await seedDraftCard({
    userId: user.userId,
    languageId: 'es',
    noteId: 'note-delete-workspace',
    cardId: 'draft-delete-workspace-card',
    noteContent: 'borrar esta nota',
    cardContent: 'borrar',
    meaning: 'to delete'
  });

  await page.goto('/es/card-entry/drafts');
  await page.getByRole('searchbox', { name: 'Search drafts' }).fill('aunque');
  const reviewRow = page.locator('.card-list-row', { hasText: 'aunque' });
  const reviewLink = reviewRow.getByRole('link', { name: /aunque/ });
  await expect(reviewLink).toBeVisible();

  await reviewLink.click();
  await page.waitForURL(`/es/card-entry/notes/${reviewDraft.note.noteId}`);
  await expect(page.getByText('repasar aunque')).toBeVisible();

  await page.goto(`/es/card-entry/notes/${deleteDraft.note.noteId}`);
  await page.getByRole('button', { name: 'Delete' }).click();
  await page.waitForURL('/es/card-entry');
  await expect(page.getByText('borrar esta nota')).toHaveCount(0);

  const deletedCardStatus = await getCardStatus(user.userId, 'es', deleteDraft.card.cardId);
  expect(deletedCardStatus).toBe('deleted');
});
