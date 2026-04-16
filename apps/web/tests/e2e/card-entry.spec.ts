import { expect, test, type Page } from '@playwright/test';
import { resetDatabase, seedInboxNote, seedUser } from './support/database';
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
  await expect(page.getByText('alleen nederlands')).toBeVisible();
  await expect(page.getByText('hola desde inline')).toHaveCount(0);
});

test('supports command-bar quick-add flow and process handoff route', async ({ page }) => {
  await signInCardEntryUser(page);
  await page.goto('/es/card-entry');

  const commandInput = page.locator('.command-bar__input');
  await expect(page.locator('.card-entry-count')).toHaveText('0');

  await commandInput.fill('/add');
  await commandInput.press('Enter');

  const quickAddDialog = page.getByRole('dialog', { name: 'Add Note' });
  await expect(quickAddDialog).toBeVisible();
  await quickAddDialog.getByRole('textbox', { name: 'Note', exact: true }).fill('hola desde drawer');
  await quickAddDialog.getByRole('button', { name: 'Add to Inbox' }).click();

  const drawerRow = page.locator('.note-row-shell', { hasText: 'hola desde drawer' });
  await expect(drawerRow).toHaveCount(1);
  await expect(page.locator('.card-entry-count')).toHaveText('1');

  await drawerRow.hover();
  await drawerRow.getByRole('link', { name: 'Process →' }).click();

  await page.waitForURL(/\/es\/card-entry\/notes\//);
  await expect(page.getByRole('heading', { name: 'Processing workspace is next' })).toBeVisible();
  await expect(page.getByText('hola desde drawer')).toBeVisible();
});
