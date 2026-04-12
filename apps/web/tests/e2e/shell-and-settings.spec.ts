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

	await page.waitForURL('**/es/');
	await expect(page.getByRole('navigation', { name: 'Primary navigation' }).first()).toBeVisible();
	await expect(page.locator('.command-bar__context-value')).toHaveText('Dashboard');
	await expect(page.getByRole('link', { name: 'Card Review' }).first()).toBeVisible();

	await page.goto('/es/card-review');
	await expect(page.locator('.command-bar__context-value')).toHaveText('Card Review');
	await expect(page.getByRole('heading', { name: 'Card Review' })).toBeVisible();
});

test('navigates settings tabs and supports the real add-language flow', async ({ page }) => {
	await signInReturningUser(page);

	await page.goto('/es/settings');
	await page.waitForURL('**/es/settings/account');

	await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Account' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Languages' })).toBeVisible();

	await page.getByRole('link', { name: 'Languages' }).click();
	await page.waitForURL('**/es/settings/languages');
	await expect(page.getByRole('heading', { name: 'Your Languages' })).toBeVisible();

	await page.getByRole('button', { name: '+ Add Language' }).click();
	await expect(page.getByRole('dialog', { name: 'Add a Language' })).toBeVisible();
	await page.locator('label.language-picker__tile', { hasText: 'Dutch' }).click();
	await page.getByRole('button', { name: /Add Language/ }).click();

	await page.waitForURL('**/nl/');
	await expect(page.locator('.command-bar__context-value')).toHaveText('Dashboard');

	await page.goto('/nl/settings/preferences');
	await expect(page.getByRole('heading', { name: 'Appearance' })).toBeVisible();
	await expect(page.getByText('Daily study reminder')).toBeVisible();
});
