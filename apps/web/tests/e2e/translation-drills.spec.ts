import { expect, test, type Page } from '@playwright/test';
import { getDb, translationDrillContext, upsertTranslationDrillDrawPile } from '@studypuck/database';
import { resetDatabase, seedActiveCard, seedGroup, seedUser } from './support/database';
import { signInAs } from './support/session';

const testDatabaseUrl =
	process.env.TEST_DATABASE_URL ??
	process.env.DATABASE_URL ??
	'postgresql://test_user:test_password@localhost:5433/studypuck_test';

async function seedTranslationDrillsUser(page: Page) {
	await resetDatabase();

	const user = await seedUser({
		userId: 'auth0|translation-drills-e2e',
		email: 'translation-drills@example.com',
		name: 'Translation Drills User',
		languages: [{ code: 'zh', label: 'Chinese' }],
	});

	const group = await seedGroup({
		userId: user.userId,
		languageId: 'zh',
		groupId: 'group-core',
		groupName: 'Core Words',
	});

	await seedActiveCard({
		userId: user.userId,
		languageId: 'zh',
		cardId: 'card-translation-drills-detail',
		cardContent: '经历',
		meaning: 'experience',
		groupId: group.groupId,
	});

	const database = getDb(testDatabaseUrl);

	await upsertTranslationDrillDrawPile(user.userId, 'zh', group.groupId, { pileSizeLimit: 4 }, database as never);
	await database.insert(translationDrillContext).values({
		userId: user.userId,
		languageId: 'zh',
		cardId: 'card-translation-drills-detail',
		state: 'active',
		addedFrom: `draw_pile:${group.groupId}`,
		addedAt: new Date('2026-05-16T12:00:00.000Z'),
	});

	await signInAs(page, user);
}

test('translation drills opens the card detail drawer from the context menu', async ({ page }) => {
	await seedTranslationDrillsUser(page);

	await page.goto('/zh/translation-drills');

	const activeCardRow = page.locator('article[aria-label="经历"]');
	await expect(activeCardRow).toBeVisible();
	const menuButton = activeCardRow.getByRole('button', { name: '···' });
	await menuButton.click();
	await expect(menuButton).toHaveAttribute('aria-expanded', 'true');

	const viewCardDetailButton = activeCardRow.getByRole('button', { name: 'View card detail' });
	await expect(viewCardDetailButton).toBeVisible();
	await viewCardDetailButton.click();

	const drawer = page.getByRole('dialog');
	await expect(drawer).toBeVisible();
	await expect(drawer.getByRole('textbox', { name: 'Content' })).toHaveValue('经历');
	await drawer.getByRole('button', { name: 'Close drawer' }).click();
	await expect(drawer).toHaveCount(0);
});
