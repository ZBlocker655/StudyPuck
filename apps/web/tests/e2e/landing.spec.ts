import { expect, test } from '@playwright/test';
import { clearSession } from './support/session';

test.beforeEach(async ({ page }) => {
	await clearSession(page);
});

test('renders the logged-out landing page', async ({ page }) => {
	await page.goto('/');

	await expect(
		page.getByRole('heading', {
			name: 'Master vocabulary through spaced repetition and AI translation practice.',
		})
	).toBeVisible();
	await expect(page.getByText('StudyPuck').first()).toBeVisible();
	await expect(page.getByRole('button', { name: 'Sign In' }).first()).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Spaced Repetition' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'AI Translation Drills' })).toBeVisible();
});
