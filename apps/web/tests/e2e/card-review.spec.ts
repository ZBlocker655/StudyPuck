import { expect, test } from '@playwright/test';
import {
	resetDatabase,
	seedCardReviewCard,
	seedCardReviewDailyStat,
	seedGroup,
	seedUser
} from './support/database';
import { signInAs } from './support/session';

async function seedReviewFixture() {
	await resetDatabase();

	const user = await seedUser({
		userId: 'auth0|e2e-card-review',
		email: 'card-review@example.com',
		name: 'Card Review User',
		languages: [{ code: 'zh', label: 'Chinese' }]
	});

	const coreGroup = await seedGroup({
		userId: user.userId,
		languageId: 'zh',
		groupId: 'group-core-review',
		groupName: 'Core Review'
	});

	const futureGroup = await seedGroup({
		userId: user.userId,
		languageId: 'zh',
		groupId: 'group-future-review',
		groupName: 'Future Review'
	});

	await seedCardReviewCard({
		userId: user.userId,
		languageId: 'zh',
		cardId: 'card-review-due-1',
		cardContent: '补偿',
		meaning: 'to compensate',
		examples: ['我们以后再补偿这次错过的时间。'],
		groupId: coreGroup.groupId,
		dueAt: new Date('2026-05-09T12:00:00.000Z'),
		lastReviewedAt: new Date('2026-05-07T12:00:00.000Z'),
		reviewCount: 1,
		intervalDays: 2
	});

	await seedCardReviewCard({
		userId: user.userId,
		languageId: 'zh',
		cardId: 'card-review-due-2',
		cardContent: '巩固',
		meaning: 'to consolidate',
		mnemonics: ['solid core'],
		groupId: coreGroup.groupId,
		dueAt: new Date('2026-05-08T12:00:00.000Z'),
		lastReviewedAt: new Date('2026-05-06T12:00:00.000Z'),
		reviewCount: 1,
		intervalDays: 2
	});

	await seedCardReviewCard({
		userId: user.userId,
		languageId: 'zh',
		cardId: 'card-review-due-3',
		cardContent: '逐渐',
		meaning: 'gradually',
		llmInstructions: 'Prefer examples about steady progress.',
		groupId: coreGroup.groupId,
		dueAt: new Date('2026-05-07T12:00:00.000Z'),
		lastReviewedAt: new Date('2026-05-05T12:00:00.000Z'),
		reviewCount: 2,
		intervalDays: 3
	});

	await seedCardReviewCard({
		userId: user.userId,
		languageId: 'zh',
		cardId: 'card-review-future',
		cardContent: '预习',
		meaning: 'to preview a lesson',
		groupId: futureGroup.groupId,
		dueAt: new Date('2026-05-12T12:00:00.000Z'),
		lastReviewedAt: new Date('2026-05-08T12:00:00.000Z'),
		reviewCount: 2,
		intervalDays: 4
	});

	await seedCardReviewDailyStat({
		userId: user.userId,
		languageId: 'zh',
		date: new Date().toISOString().slice(0, 10),
		cardsReviewed: 2
	});

	await seedCardReviewDailyStat({
		userId: user.userId,
		languageId: 'zh',
		date: new Date(Date.now() - 86_400_000).toISOString().slice(0, 10),
		cardsReviewed: 4
	});

	return { user, coreGroup };
}

async function submitCommandBar(page: import('@playwright/test').Page, input: string) {
	const commandBar = page.getByLabel('Command bar');
	await commandBar.fill(input);
	await commandBar.press('Enter');
}

test('configures a Card Review session from the home screen and loads the real session UI', async ({ page }) => {
	const { user, coreGroup } = await seedReviewFixture();

	await signInAs(page, user);
	await page.goto('/zh/card-review');

	const contextView = page.getByLabel('Context view', { exact: true });
	await expect(contextView.getByRole('heading', { name: 'Card Review' })).toBeVisible();
	await expect(contextView.getByText('Core Review')).toBeVisible();
	await expect(contextView.getByText('Future Review')).toBeVisible();

	const startButton = contextView.getByRole('button', { name: 'Start Session' });
	await expect(startButton).toBeDisabled();

	await contextView.getByRole('checkbox', { name: /Core Review/i }).check();
	await expect(startButton).toBeEnabled();

	await contextView.getByRole('radio', { name: /Limit to N cards/i }).check();
	await contextView.getByRole('spinbutton', { name: 'Session size' }).fill('2');
	await startButton.click();

	await page.waitForURL(new RegExp(`/zh/card-review/session\\?.*group=${coreGroup.groupId}.*limit=2`));
	await expect(contextView.getByText('Card 1 of 2')).toBeVisible();
	await expect(contextView.getByRole('heading', { name: '逐渐' })).toBeVisible();
	await expect(contextView.getByRole('button', { name: 'Easy 1' })).toBeVisible();
	await expect(contextView.getByRole('button', { name: 'Pin to Drills' })).toBeVisible();
	await expect(contextView.getByRole('heading', { name: 'Up next' })).toBeVisible();
	await expect(contextView.getByText('巩固')).toBeVisible();
});

test('advances through session actions, supports drawer navigation, and shows the completion CTAs', async ({ page }) => {
	const { user, coreGroup } = await seedReviewFixture();

	await signInAs(page, user);
	await page.goto(`/zh/card-review/session?group=${coreGroup.groupId}`);

	const contextView = page.getByLabel('Context view', { exact: true });
	await expect(contextView.getByText('Card 1 of 3')).toBeVisible();
	await expect(contextView.getByRole('heading', { name: '逐渐' })).toBeVisible();

	await contextView.getByRole('button', { name: 'Card details' }).click();
	const drawer = page.getByRole('dialog');
	await expect(drawer.locator('textarea').first()).toHaveValue('逐渐');
	await drawer.getByRole('button', { name: 'Next card' }).click();
	await expect(drawer.locator('textarea').first()).toHaveValue('巩固');
	await drawer.getByRole('button', { name: 'Previous card' }).click();
	await expect(drawer.locator('textarea').first()).toHaveValue('逐渐');
	await drawer.getByRole('button', { name: 'Close drawer' }).click();

	await contextView.getByRole('button', { name: 'Easy 1' }).click();
	await expect(contextView.getByText('Easy recorded.')).toBeVisible();
	await expect(contextView.getByText('Card 2 of 3')).toBeVisible();
	await expect(contextView.getByRole('heading', { name: '巩固' })).toBeVisible();

	await page.keyboard.press('P');
	await expect(contextView.getByText('Card pinned to Translation Drills.')).toBeVisible();
	await expect(contextView.getByText('Card 3 of 3')).toBeVisible();
	await expect(contextView.getByRole('heading', { name: '补偿' })).toBeVisible();

	await page.keyboard.press('3');
	await expect(contextView.getByRole('heading', { name: 'Session complete' })).toBeVisible();
	await expect(contextView.getByText('Cards reviewed')).toBeVisible();
	await expect(contextView.getByText(/^2$/)).toBeVisible();
	await expect(contextView.getByText('Easy 1')).toBeVisible();
	await expect(contextView.getByText('Hard 1')).toBeVisible();
	await expect(contextView.getByRole('link', { name: 'Review more' })).toBeVisible();
	await expect(contextView.getByRole('link', { name: 'Go to Translation Drills →' })).toBeVisible();
	await expect(contextView.getByRole('link', { name: 'Back to home' })).toBeVisible();
});

test('resets Card Review conversation state across setup and session changes and keeps review commands app-owned', async ({
	page
}) => {
	const { user, coreGroup } = await seedReviewFixture();
	const chatInputs: string[] = [];

	await page.route('**/api/chat', async (route) => {
		const payload = route.request().postDataJSON() as { input?: string };
		const input = typeof payload.input === 'string' ? payload.input : '';
		chatInputs.push(input);

		if (input === 'Any cards due right now?') {
			await route.fulfill({
				status: 200,
				contentType: 'application/json',
				body: JSON.stringify({
					message: 'Pick a due group to start your session.',
					suggestions: []
				})
			});
			return;
		}

		await route.fulfill({
			status: 200,
			contentType: 'application/json',
			body: JSON.stringify({
				message: 'You can skip this one.',
				suggestions: [{ type: 'next_review_card', payload: { cardId: 'card-review-due-3' } }]
			})
		});
	});

	await signInAs(page, user);
	await page.goto('/zh/card-review');

	const contextView = page.getByLabel('Context view', { exact: true });
	const conversationView = page.getByLabel('Conversation view', { exact: true });

	await submitCommandBar(page, 'Any cards due right now?');
	await expect(conversationView.getByText('Pick a due group to start your session.')).toBeVisible();

	await contextView.getByRole('checkbox', { name: /Core Review/i }).check();
	await contextView.getByRole('button', { name: 'Start Session' }).click();

	await page.waitForURL(new RegExp(`/zh/card-review/session\\?.*group=${coreGroup.groupId}`));
	await expect(contextView.getByRole('heading', { name: '逐渐' })).toBeVisible();
	await expect(conversationView.getByText('Pick a due group to start your session.')).toHaveCount(0);

	await submitCommandBar(page, 'Skip this card');
	await expect(conversationView.getByText('You can skip this one.')).toBeVisible();

	await conversationView.locator('button.suggestion-button').filter({ hasText: 'Next card' }).first().click();
	await expect(contextView.getByRole('heading', { name: '巩固' })).toBeVisible();
	await expect(conversationView.getByText('You can skip this one.')).toHaveCount(0);

	await submitCommandBar(page, '/pin');
	await expect(contextView.getByRole('heading', { name: '补偿' })).toBeVisible();
	expect(chatInputs).toEqual(['Any cards due right now?', 'Skip this card']);
});

test('supports keyboard access for the end-session dialog and restores focus when dismissed', async ({ page }) => {
	const { user, coreGroup } = await seedReviewFixture();

	await signInAs(page, user);
	await page.goto(`/zh/card-review/session?group=${coreGroup.groupId}`);

	const contextView = page.getByLabel('Context view', { exact: true });
	const openDialogButton = contextView.getByRole('button', { name: 'End session' });
	await openDialogButton.click();

	const dialog = page.getByRole('alertdialog', { name: 'End session?' });
	const keepReviewingButton = dialog.getByRole('button', { name: 'Keep reviewing' });
	const endSessionButton = dialog.getByRole('button', { name: 'End session' });

	await expect(keepReviewingButton).toBeFocused();
	await page.keyboard.press('Shift+Tab');
	await expect(endSessionButton).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(keepReviewingButton).toBeFocused();
	await page.keyboard.press('Escape');

	await expect(dialog).toHaveCount(0);
	await expect(openDialogButton).toBeFocused();
});
