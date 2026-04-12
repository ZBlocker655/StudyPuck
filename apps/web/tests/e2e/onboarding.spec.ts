import { expect, test } from '@playwright/test';
import { resetDatabase, seedUser } from './support/database';
import { signInAs } from './support/session';

test('redirects a first-time user to onboarding and completes language selection', async ({ page }) => {
	await resetDatabase();

	const user = await seedUser({
		userId: 'auth0|e2e-onboarding',
		email: 'onboarding@example.com',
		name: 'Onboarding User',
	});

	await signInAs(page, user);
	await page.goto('/');

	await page.waitForURL('**/onboarding');
	await expect(page.getByRole('heading', { name: 'Welcome to StudyPuck' })).toBeVisible();

	await page.locator('label.language-tile', { hasText: 'Spanish' }).click();
	await page.getByRole('button', { name: 'Get Started' }).click();

	await page.waitForURL('**/es/');
	await expect(page.getByText('Cards Due for Review')).toBeVisible();
	await expect(page.getByText('Notes in Inbox')).toBeVisible();
});
