import { expect, test } from '@playwright/test';
import {
	resetDatabase,
	seedCardReviewCard,
	seedCardReviewDailyStat,
	seedGroup,
	seedUser
} from './support/database';
import { signInAs } from './support/session';

test('configures a Card Review session from the home screen and loads the queued cards', async ({ page }) => {
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
		cardId: 'card-review-future',
		cardContent: '逐渐',
		meaning: 'gradually',
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

	await signInAs(page, user);
	await page.goto('/zh/card-review');

	const contextView = page.getByLabel('Context view', { exact: true });
	await expect(contextView.getByRole('heading', { name: 'Card Review' })).toBeVisible();
	await expect(contextView.getByText('Core Review')).toBeVisible();
	await expect(contextView.getByText('Future Review')).toBeVisible();
	await expect(contextView.getByText('2 cards in rotation')).toBeVisible();
	await expect(contextView.getByText('1 card in rotation')).toBeVisible();

	const startButton = contextView.getByRole('button', { name: 'Start Session' });
	await expect(startButton).toBeDisabled();

	await contextView.getByRole('checkbox', { name: /Core Review/i }).check();
	await expect(startButton).toBeEnabled();

	await contextView.getByRole('radio', { name: /Limit to N cards/i }).check();
	await contextView.getByRole('spinbutton', { name: 'Session size' }).fill('1');
	await startButton.click();

	await page.waitForURL(/\/zh\/card-review\/session\?.*group=group-core-review.*limit=1/);
	await expect(contextView.getByText('Session ready with 1 card from 1 group.')).toBeVisible();
	await expect(contextView.getByText('First queued card')).toBeVisible();
	await expect(contextView.getByRole('heading', { name: '巩固' })).toBeVisible();
	await expect(contextView.getByText('Core Review')).toBeVisible();
});
