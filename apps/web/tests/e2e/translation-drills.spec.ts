import { expect, test, type Page } from '@playwright/test';
import { getDb, translationDrillContext, upsertTranslationDrillDrawPile } from '@studypuck/database';
import { resetDatabase, seedActiveCard, seedGroup, seedUser } from './support/database';
import { signInAs } from './support/session';

const testDatabaseUrl =
	process.env.TEST_DATABASE_URL ??
	process.env.DATABASE_URL ??
	'postgresql://test_user:test_password@localhost:5433/studypuck_test';

type SeedTranslationDrillCard = {
	cardId: string;
	content: string;
	meaning: string;
};

type SeedTranslationDrillsPageOptions = {
	groupName?: string | null;
	activeGroupCards?: SeedTranslationDrillCard[];
	snoozedGroupCards?: SeedTranslationDrillCard[];
	remainingGroupCards?: SeedTranslationDrillCard[];
	ungroupedCards?: SeedTranslationDrillCard[];
};

async function insertContextCard(input: {
	userId: string;
	languageId: string;
	cardId: string;
	state: 'active' | 'snoozed';
	addedFrom: string;
	addedAt: Date;
	stateUntil?: Date | null;
}) {
	const database = getDb(testDatabaseUrl);

	await database.insert(translationDrillContext).values({
		userId: input.userId,
		languageId: input.languageId,
		cardId: input.cardId,
		state: input.state,
		addedFrom: input.addedFrom,
		addedAt: input.addedAt,
		stateUntil: input.stateUntil ?? null,
	});
}

async function seedTranslationDrillsPage(page: Page, options: SeedTranslationDrillsPageOptions = {}) {
	await resetDatabase();

	const user = await seedUser({
		userId: 'auth0|translation-drills-e2e',
		email: 'translation-drills@example.com',
		name: 'Translation Drills User',
		languages: [{ code: 'zh', label: 'Chinese (Mandarin)' }],
	});

	const groupName = options.groupName ?? 'Core Words';
	let groupId: string | null = null;

	if (groupName) {
		const group = await seedGroup({
			userId: user.userId,
			languageId: 'zh',
			groupId: 'group-core',
			groupName,
		});

		groupId = group.groupId;
		await upsertTranslationDrillDrawPile(user.userId, 'zh', group.groupId, { pileSizeLimit: 4 }, getDb(testDatabaseUrl) as never);
	}

	for (const [index, card] of (options.activeGroupCards ?? []).entries()) {
		if (!groupId) {
			throw new Error('Active group cards require a configured Translation Drills group.');
		}

		await seedActiveCard({
			userId: user.userId,
			languageId: 'zh',
			cardId: card.cardId,
			cardContent: card.content,
			meaning: card.meaning,
			groupId,
		});
		await insertContextCard({
			userId: user.userId,
			languageId: 'zh',
			cardId: card.cardId,
			state: 'active',
			addedFrom: `draw_pile:${groupId}`,
			addedAt: new Date(`2026-05-16T12:0${index}:00.000Z`),
		});
	}

	for (const [index, card] of (options.snoozedGroupCards ?? []).entries()) {
		if (!groupId) {
			throw new Error('Snoozed group cards require a configured Translation Drills group.');
		}

		await seedActiveCard({
			userId: user.userId,
			languageId: 'zh',
			cardId: card.cardId,
			cardContent: card.content,
			meaning: card.meaning,
			groupId,
		});
		await insertContextCard({
			userId: user.userId,
			languageId: 'zh',
			cardId: card.cardId,
			state: 'snoozed',
			addedFrom: `draw_pile:${groupId}`,
			addedAt: new Date(`2026-05-16T12:1${index}:00.000Z`),
			stateUntil: new Date(`2026-05-21T12:1${index}:00.000Z`),
		});
	}

	for (const card of options.remainingGroupCards ?? []) {
		if (!groupId) {
			throw new Error('Remaining draw-pile cards require a configured Translation Drills group.');
		}

		await seedActiveCard({
			userId: user.userId,
			languageId: 'zh',
			cardId: card.cardId,
			cardContent: card.content,
			meaning: card.meaning,
			groupId,
		});
	}

	for (const [index, card] of (options.ungroupedCards ?? []).entries()) {
		await seedActiveCard({
			userId: user.userId,
			languageId: 'zh',
			cardId: card.cardId,
			cardContent: card.content,
			meaning: card.meaning,
		});
		await insertContextCard({
			userId: user.userId,
			languageId: 'zh',
			cardId: card.cardId,
			state: 'active',
			addedFrom: 'pinned',
			addedAt: new Date(`2026-05-16T12:2${index}:00.000Z`),
		});
	}

	await signInAs(page, user);
}

async function submitCommand(page: Page, input: string) {
	const commandBar = page.getByRole('textbox', { name: 'Command bar' });
	await commandBar.fill(input);
	await commandBar.press('Enter');
}

test('translation drills shows the empty-context onboarding overlay and setup affordances', async ({ page }) => {
	await seedTranslationDrillsPage(page, { groupName: null });

	await page.goto('/zh/translation-drills');

	await expect(page.locator('.command-bar__context-value')).toHaveText('Translation Drills');
	await expect(page.getByRole('heading', { name: 'Context overview' })).toBeVisible();
	await expect(page.getByRole('heading', { name: 'Add groups to start drilling' })).toBeVisible();

	const learnMoreButton = page.getByRole('button', { name: 'Learn more' });
	await expect(learnMoreButton).toHaveAttribute('aria-expanded', 'false');
	await learnMoreButton.click();
	await expect(learnMoreButton).toHaveAttribute('aria-expanded', 'true');
	await expect(
		page.getByText('Add groups, mark them as Translation Drills piles, and draw from those piles whenever you want fresh vocabulary in view.')
	).toBeVisible();
	await expect(page.getByRole('link', { name: 'Go to Groups' })).toHaveAttribute('href', '/zh/cards/groups');
});

test('translation drills covers card detail, draw piles, snooze, and dismiss flows', async ({ page }) => {
	await seedTranslationDrillsPage(page, {
		activeGroupCards: [{ cardId: 'card-experience', content: '经历', meaning: 'experience' }],
		snoozedGroupCards: [{ cardId: 'card-feeling', content: '感觉', meaning: 'feeling' }],
		remainingGroupCards: [{ cardId: 'card-study', content: '学习', meaning: 'study' }],
	});

	await page.goto('/zh/translation-drills');

	await expect(page.getByRole('button', { name: 'Core Words draw pile — 1 card remaining' })).toBeVisible();
	await expect(page.locator('article[aria-label="感觉, snoozed"]')).toBeVisible();

	const activeCardRow = page.locator('article[aria-label="经历"]');
	await expect(activeCardRow).toBeVisible({ timeout: 10000 });
	const menuButton = activeCardRow.getByRole('button', { name: 'More actions for 经历' });
	// force: true bypasses pointer-events:none from the @media(hover:hover) hover-gate
	await menuButton.click({ force: true });
	await expect(menuButton).toHaveAttribute('aria-expanded', 'true', { timeout: 10000 });
	const viewCardDetailButton = activeCardRow.getByRole('menuitem', { name: 'View card detail' });
	await expect(viewCardDetailButton).toBeVisible({ timeout: 5000 });
	await viewCardDetailButton.click();

	const drawer = page.getByRole('dialog');
	await expect(drawer).toBeVisible({ timeout: 10000 });
	await expect(drawer.getByRole('textbox', { name: 'Content' })).toHaveValue('经历');
	await drawer.getByRole('button', { name: 'Close drawer' }).click();
	await expect(drawer).toHaveCount(0);

	await page.getByRole('button', { name: 'Core Words draw pile — 1 card remaining' }).click();
	await expect(page.locator('article[aria-label="学习"]')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Core Words draw pile — Pile empty' })).toBeDisabled();

	const snoozeButton = activeCardRow.getByRole('button', { name: '💤 Snooze' });
	await expect(async () => {
		await snoozeButton.click({ force: true }); // bypass hover-gate pointer-events:none
		await expect(page.locator('article[aria-label="经历, snoozed"]')).toBeVisible();
	}).toPass({ timeout: 10000 });

	const drawnCardRow = page.locator('article[aria-label="学习"]');
	const dismissButton = drawnCardRow.getByRole('button', { name: '✕ Dismiss' });
	await expect(async () => {
		await dismissButton.click({ force: true }); // bypass hover-gate pointer-events:none
		await expect(page.getByRole('dialog', { name: '学习' })).toBeVisible();
	}).toPass({ timeout: 10000 });

	const dialog = page.getByRole('dialog', { name: '学习' });
	await expect(dialog.getByText('When should it return?')).toBeVisible();
	await expect(dialog.getByRole('radio').first()).toBeVisible();
	await dialog.getByRole('button', { name: 'Dismiss', exact: true }).click();

	await expect(page.locator('article[aria-label="学习"]')).toHaveCount(0);
	await expect(page.getByRole('status')).toContainText('学习 dismissed');
});

test('translation drills command-bar flows cover context, draw, snooze, dismiss, and challenge reset behavior', async ({ page }) => {
	await seedTranslationDrillsPage(page, {
		activeGroupCards: [
			{ cardId: 'card-experience', content: '经历', meaning: 'experience' },
			{ cardId: 'card-discuss', content: '谈论', meaning: 'discuss' },
		],
		remainingGroupCards: [{ cardId: 'card-express', content: '表达', meaning: 'express' }],
	});

	await page.goto('/zh/translation-drills');

	await expect(page.locator('.command-bar__context-value')).toHaveText('Translation Drills');
	await expect(page.getByRole('button', { name: 'Collapse cards view' })).toBeVisible();
	await page.getByRole('button', { name: 'Collapse cards view' }).click();
	const openCardsViewButtons = page.locator('button[aria-label="Open cards view"]');
	await expect(openCardsViewButtons.first()).toBeVisible();
	await openCardsViewButtons.first().click();

	const conversationView = page.getByRole('complementary', { name: 'Conversation view' });

	await submitCommand(page, '/context');
	await expect(
		conversationView.getByText(/Active context: (经历, 谈论|谈论, 经历)\. No active challenge yet\./)
	).toBeVisible();

	await submitCommand(page, '/draw Core');
	await expect(conversationView.getByText('表达 drawn into context.')).toBeVisible();
	await expect(page.locator('article[aria-label="表达"]')).toBeVisible();

	await submitCommand(page, '/snooze');
	await expect(conversationView.getByText('谈论 snoozed.')).toBeVisible();
	await expect(page.locator('article[aria-label="谈论, snoozed"]')).toBeVisible();

	await submitCommand(page, '/dismiss');
	await expect(conversationView.getByText('Choose when the card should return in the dismiss dialog.')).toBeVisible();
	const dismissDialog = page.getByRole('dialog', { name: '谈论' });
	await expect(dismissDialog).toBeVisible();
	await dismissDialog.getByRole('button', { name: 'Dismiss', exact: true }).click();
	await expect(page.locator('article[aria-label="谈论, snoozed"]')).toHaveCount(0);

	await submitCommand(page, '/next');
	await expect(conversationView.getByText('New conversation')).toBeVisible();
	await expect(conversationView.getByText('New challenge ready. Translate to Chinese (Mandarin): "Use express in a natural sentence."')).toBeVisible();
	await expect(page.getByRole('status').filter({ hasText: 'Translate to Chinese (Mandarin)' })).toContainText('Use express in a natural sentence.');
	await expect(
		conversationView.getByText(/Active context: (经历, 谈论|谈论, 经历)\. No active challenge yet\./)
	).toHaveCount(0);

	await submitCommand(page, '/next');
	await expect(conversationView.getByText('New challenge ready. Translate to Chinese (Mandarin): "Use experience in a natural sentence."')).toBeVisible();
	await expect(page.getByRole('status').filter({ hasText: 'Translate to Chinese (Mandarin)' })).toContainText('Use experience in a natural sentence.');
	await expect(conversationView.getByText('Use express in a natural sentence.')).toHaveCount(0);
});
