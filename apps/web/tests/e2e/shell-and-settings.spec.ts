import { expect, test, type Page } from '@playwright/test';
import { resetDatabase, seedUser } from './support/database';
import { signInAs } from './support/session';

async function signInReturningUser(page: Page) {
	await resetDatabase();

	const user = await seedUser({
		userId: 'auth0|e2e-returning',
		email: 'returning@example.com',
		name: 'Returning User',
		languages: [{ code: 'es', label: 'Spanish' }],
	});

	await signInAs(page, user);
}

test('redirects a returning user to the dashboard and shows shell context on key pages', async ({ page }) => {
	await signInReturningUser(page);

	await page.goto('/');

	await page.waitForURL(/\/es\/?$/);
	await expect(page.locator('.command-bar__context-value')).toHaveText('Dashboard');
	await expect(page.getByRole('link', { name: 'Card Review', exact: true }).first()).toBeVisible();

	await page.goto('/es/card-review');
	await expect(page.locator('.command-bar__context-value')).toHaveText('Card Review');
	await expect(
		page.getByLabel('Context view', { exact: true }).getByRole('heading', { name: 'Card Review' })
	).toBeVisible();
});

test('navigates settings tabs and supports the real add-language flow', async ({ page }) => {
	await signInReturningUser(page);

	await page.goto('/es/settings');
	await page.waitForURL('**/es/settings/account');

	await expect(
		page.getByLabel('Context view', { exact: true }).getByRole('heading', { name: 'Settings' })
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Account', exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Languages', exact: true })).toBeVisible();

	await page.getByRole('link', { name: 'Languages', exact: true }).click();
	await page.waitForURL('**/es/settings/languages');
	const contextView = page.getByLabel('Context view', { exact: true });
	await expect(contextView.getByRole('heading', { name: 'Your Languages' })).toBeVisible();

	await contextView.getByRole('button', { name: '+ Add Language', exact: true }).click();
	const addLanguageDialog = page.locator('.dialog[aria-labelledby="add-language-title"]');
	await expect(addLanguageDialog).toBeVisible();
	await page.locator('label.language-picker__tile', { hasText: 'Dutch' }).click();
	await addLanguageDialog.getByRole('button', { name: 'Add Language →' }).click();

	await page.waitForURL(/\/nl\/?$/);
	await expect(page.locator('.command-bar__context-value')).toHaveText('Dashboard');

	await page.goto('/nl/settings/preferences');
	await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
	await expect(page.getByText('Daily study reminder')).toBeVisible();
});
