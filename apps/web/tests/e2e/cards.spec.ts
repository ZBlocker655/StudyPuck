import { expect, test, type Page } from '@playwright/test';
import { resetDatabase, seedActiveCard, seedGroup, seedUser } from './support/database';
import { signInAs } from './support/session';

async function signInCardsUser(page: Page) {
	await resetDatabase();

	const user = await seedUser({
		userId: 'auth0|cards-e2e',
		email: 'cards@example.com',
		name: 'Cards User',
		languages: [
			{ code: 'es', label: 'Spanish' },
			{ code: 'nl', label: 'Dutch' },
		],
	});

	await signInAs(page, user);

	return user;
}

// ─── Card Library ────────────────────────────────────────────────────────────

test('card library shows empty state when no active cards exist', async ({ page }) => {
	await signInCardsUser(page);

	await page.goto('/es/cards');

	await expect(page.getByRole('heading', { level: 1, name: 'Cards' })).toBeVisible();
	await expect(page.getByText('No cards yet')).toBeVisible();
	await expect(page.getByRole('link', { name: 'Go to Card Entry' })).toBeVisible();
});

test('card library renders active cards and is scoped to the active language', async ({ page }) => {
	const user = await signInCardsUser(page);

	await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardId: 'card-es-hola',
		cardContent: 'hola',
		meaning: 'hello',
	});
	await seedActiveCard({
		userId: user.userId,
		languageId: 'nl',
		cardId: 'card-nl-hallo',
		cardContent: 'hallo',
		meaning: 'hello in Dutch',
	});

	await page.goto('/es/cards');

	await expect(page.getByText('hola')).toBeVisible();
	await expect(page.getByText('hallo')).toHaveCount(0);
});

test('card library free-text search filters the card list', async ({ page }) => {
	const user = await signInCardsUser(page);

	await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardContent: 'hablar',
		meaning: 'to speak',
	});
	await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardContent: 'escuchar',
		meaning: 'to listen',
	});

	await page.goto('/es/cards');

	await expect(page.getByText('hablar')).toBeVisible();
	await expect(page.getByText('escuchar')).toBeVisible();

	await page.getByRole('searchbox', { name: 'Search cards' }).fill('hablar');

	await expect(page.getByText('hablar')).toBeVisible();
	await expect(page.getByText('escuchar')).toHaveCount(0);
});

test('card library shows no-results state when search matches nothing', async ({ page }) => {
	const user = await signInCardsUser(page);

	await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardContent: 'hablar',
		meaning: 'to speak',
	});

	await page.goto('/es/cards');
	await page.getByRole('searchbox', { name: 'Search cards' }).fill('zzzznotfound');

	await expect(page.getByText('No cards match your filters')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
});

test('card library clears filters when Clear filters is clicked', async ({ page }) => {
	const user = await signInCardsUser(page);

	await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardContent: 'hablar',
		meaning: 'to speak',
	});

	await page.goto('/es/cards');
	await page.getByRole('searchbox', { name: 'Search cards' }).fill('zzzznotfound');
	await expect(page.getByText('No cards match your filters')).toBeVisible();

	await page.getByRole('button', { name: 'Clear filters' }).click();

	await expect(page.getByText('hablar')).toBeVisible();
});

test('card library opens the card drawer when a row is activated', async ({ page }) => {
	const user = await signInCardsUser(page);

	await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardId: 'card-drawer-test',
		cardContent: 'aprender',
		meaning: 'to learn',
	});

	await page.goto('/es/cards?card=card-drawer-test');

	const drawer = page.getByRole('dialog');
	await expect(drawer).toBeVisible();
	await expect(drawer.getByRole('textbox', { name: 'Content' })).toHaveValue('aprender');
});

test('card library drawer closes on backdrop click', async ({ page }) => {
	const user = await signInCardsUser(page);

	await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardId: 'card-backdrop-test',
		cardContent: 'cerrar',
		meaning: 'to close',
	});

	await page.goto('/es/cards?card=card-backdrop-test');
	const drawer = page.getByRole('dialog');
	await expect(drawer).toBeVisible();

	await page.locator('.active-card-drawer__backdrop').click();
	await expect(page).not.toHaveURL(/card=/);
	await expect(drawer).toHaveCount(0);
});

test('card library drawer closes on Escape key', async ({ page }) => {
	const user = await signInCardsUser(page);

	await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardId: 'card-escape-test',
		cardContent: 'salir',
		meaning: 'to exit',
	});

	await page.goto('/es/cards');

	const drawer = page.getByRole('dialog');
	await page.getByText('salir', { exact: true }).click();
	await expect(drawer).toBeVisible();

	await drawer.focus();
	await page.keyboard.press('Escape');
	await expect(page).not.toHaveURL(/card=/);
	await expect(drawer).toHaveCount(0);
});

test('card library deletes a card from the drawer and removes it from the list', async ({ page }) => {
	const user = await signInCardsUser(page);

	await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardId: 'card-delete-test',
		cardContent: 'borrar',
		meaning: 'to delete',
	});

	await page.goto('/es/cards?card=card-delete-test');

	const drawer = page.getByRole('dialog');
	await expect(drawer).toBeVisible();

	const confirmDialog = page.getByRole('alertdialog');
	await drawer.getByRole('button', { name: 'Delete card' }).click();
	await expect(confirmDialog).toBeVisible();

	await confirmDialog.getByRole('button', { name: 'Delete card' }).click();

	await expect(page.getByText('No cards yet')).toBeVisible({ timeout: 10000 });
});

test('card library Cards nav link is highlighted when on a cards route', async ({ page }) => {
	await signInCardsUser(page);

	await page.goto('/es/cards');

	const cardsNavLink = page.locator('.app-sidebar .nav-link--active', { hasText: 'Cards' });
	await expect(cardsNavLink).toBeVisible();
});

// ─── Groups List ─────────────────────────────────────────────────────────────

test('groups list shows empty state when no groups exist', async ({ page }) => {
	await signInCardsUser(page);

	await page.goto('/es/cards/groups');

	await expect(page.getByRole('heading', { level: 1, name: 'Groups' })).toBeVisible();
	await expect(page.getByText('No groups yet')).toBeVisible();
	await expect(page.getByRole('button', { name: '+ Create your first group' })).toBeVisible();
});

test('groups list creates a new group via the drawer', async ({ page }) => {
	await signInCardsUser(page);

	await page.goto('/es/cards/groups');
	const drawer = page.getByRole('dialog', { name: 'New Group' });
	await page.getByRole('button', { name: /\+ New/ }).click();
	await expect(drawer).toBeVisible();

	await drawer.getByRole('textbox', { name: /Group name/i }).fill('Vocabulary');
	await drawer.getByRole('button', { name: 'Create Group' }).click();

	await expect(page.getByRole('heading', { level: 2, name: 'Vocabulary' })).toBeVisible({ timeout: 10000 });
	await expect(drawer).toHaveCount(0);
});

test('groups list create-group drawer closes on Escape', async ({ page }) => {
	await signInCardsUser(page);

	await page.goto('/es/cards/groups');
	const drawer = page.getByRole('dialog', { name: 'New Group' });
	await expect(async () => {
		await page.getByRole('button', { name: /\+ New/ }).click();
		await expect(drawer).toBeVisible();
	}).toPass({ timeout: 10000 });

	await page.keyboard.press('Escape');

	await expect(drawer).toHaveCount(0);
});

test('groups list renders existing groups and navigates to group detail', async ({ page }) => {
	const user = await signInCardsUser(page);

	await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardContent: 'navegar',
		meaning: 'to navigate',
		groupName: 'Verbs',
	});

	await page.goto('/es/cards/groups');

	await expect(page.getByRole('heading', { level: 2, name: 'Verbs' })).toBeVisible();

	await page.locator('.groups-page__row-shell', { hasText: 'Verbs' }).getByRole('button', { name: /^Verbs/ }).click();
	await expect(page).toHaveURL(/\/es\/cards\/groups\/[^/?]+$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Verbs' })).toBeVisible();
});

test('groups list deletes a group via confirm dialog', async ({ page }) => {
	const user = await signInCardsUser(page);

	await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardContent: 'eliminar',
		meaning: 'to eliminate',
		groupName: 'TestGroup',
	});

	await page.goto('/es/cards/groups');

	await expect(page.getByRole('heading', { level: 2, name: 'TestGroup' })).toBeVisible();

	const dialog = page.getByRole('alertdialog');
	await page.locator('.groups-page__row-shell', { hasText: 'TestGroup' })
		.getByRole('button', { name: 'Delete TestGroup' })
		.click();
	await expect(dialog).toBeVisible();
	await expect(dialog).toContainText('Delete "TestGroup"?');

	await dialog.getByRole('button', { name: 'Delete Group' }).click();

	await expect(page.getByRole('heading', { level: 2, name: 'TestGroup' })).toHaveCount(0, { timeout: 10000 });
});

test('groups list delete confirm dialog cancels when Cancel is clicked', async ({ page }) => {
	const user = await signInCardsUser(page);

	await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardContent: 'cancelar',
		meaning: 'to cancel',
		groupName: 'CancelGroup',
	});

	await page.goto('/es/cards/groups');

	const dialog = page.getByRole('alertdialog');
	await page.locator('.groups-page__row-shell', { hasText: 'CancelGroup' })
		.getByRole('button', { name: 'Delete CancelGroup' })
		.click();
	await expect(dialog).toBeVisible();

	await dialog.getByRole('button', { name: 'Cancel' }).click();

	await expect(dialog).toHaveCount(0);
	await expect(page.getByRole('heading', { level: 2, name: 'CancelGroup' })).toBeVisible();
});

// ─── Group Detail ─────────────────────────────────────────────────────────────

test('group detail shows back link and card count', async ({ page }) => {
	const user = await signInCardsUser(page);

	const { groupId } = await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardContent: 'aprender',
		meaning: 'to learn',
		groupName: 'Study',
	});

	await page.goto(`/es/cards/groups/${groupId}`);

	await expect(page.getByRole('heading', { level: 1, name: 'Study' })).toBeVisible();
	await expect(page.getByRole('link', { name: '← Back to Groups' })).toBeVisible();
	await expect(page.getByText('1 card')).toBeVisible();
});

test('group detail shows empty state when no cards are in the group', async ({ page }) => {
	const user = await signInCardsUser(page);
	const group = await seedGroup({
		userId: user.userId,
		languageId: 'es',
		groupName: 'EmptyTarget',
	});

	await page.goto(`/es/cards/groups/${group.groupId}`);

	await expect(page.getByText('No cards in this group yet')).toBeVisible();
	await expect(page.locator('.group-detail-page__state').getByRole('button', { name: '+ Add Cards' })).toBeVisible();
});

test('group detail adds cards via the Add Cards drawer', async ({ page }) => {
	const user = await signInCardsUser(page);

	// Seed a card NOT in a group
	await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardId: 'card-add-to-group',
		cardContent: 'agregar',
		meaning: 'to add',
	});

	// Seed a group with no cards
	const { groupId } = await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardId: 'card-already-in-group',
		cardContent: 'ya-en-grupo',
		meaning: 'already in group',
		groupName: 'Destination',
	});

	await page.goto(`/es/cards/groups/${groupId}`);
	await expect(page.getByRole('heading', { level: 1, name: 'Destination', exact: true })).toBeVisible();

	await page.getByRole('button', { name: '+ Add Cards' }).click();

	const addDrawer = page.getByRole('dialog', { name: /Add cards to/ });
	await expect(addDrawer).toBeVisible();

	await addDrawer.getByRole('checkbox', { name: /agregar/i }).check();

	await addDrawer.getByRole('button', { name: /Add \d+ card/ }).click();

	await expect(addDrawer).toHaveCount(0, { timeout: 10000 });
	await expect(page.getByText('agregar')).toBeVisible();
	await expect(page.getByText('2 cards')).toBeVisible();
});

test('group detail removes cards from the group using bulk Remove from group action', async ({ page }) => {
	const user = await signInCardsUser(page);

	const { groupId } = await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardId: 'card-remove-from-group',
		cardContent: 'quitar',
		meaning: 'to remove',
		groupName: 'RemoveGroup',
	});

	await page.goto(`/es/cards/groups/${groupId}`);

	await expect(page.getByText('quitar')).toBeVisible();
	await expect(page.getByText('1 card')).toBeVisible();

	const row = page.locator('.card-list-row', { hasText: 'quitar' });
	const bulkBar = page.locator('.card-list-bulk-bar');
	await page.getByRole('button', { name: 'Select cards' }).click();
	await row.getByRole('checkbox', { name: 'Select card' }).check();
	await expect(row.getByRole('checkbox', { name: 'Select card' })).toBeChecked();
	await expect(bulkBar).toBeVisible();
	await bulkBar.getByRole('button', { name: 'Remove from group' }).click();

	await expect(page.getByText('No cards in this group yet')).toBeVisible({ timeout: 10000 });
	await expect(page.getByText('0 cards')).toBeVisible();
});

test('group detail edits the group name inline', async ({ page }) => {
	const user = await signInCardsUser(page);

	const { groupId } = await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardContent: 'editar',
		meaning: 'to edit',
		groupName: 'OldName',
	});

	await page.goto(`/es/cards/groups/${groupId}`);
	await expect(page.getByRole('heading', { level: 1, name: 'OldName', exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'OldName' }).click();

	const nameInput = page.getByRole('textbox', { name: 'Group name' });
	await expect(nameInput).toBeVisible();
	await nameInput.fill('NewName');
	await nameInput.press('Enter');

	await expect(page.getByRole('heading', { level: 1, name: 'NewName', exact: true })).toBeVisible({ timeout: 10000 });
});

test('group detail deletes the group and navigates back to groups list', async ({ page }) => {
	const user = await signInCardsUser(page);

	const { groupId } = await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardContent: 'destruir',
		meaning: 'to destroy',
		groupName: 'DeleteMe',
	});

	await page.goto(`/es/cards/groups/${groupId}`);
	await expect(page.getByRole('heading', { level: 1, name: 'DeleteMe', exact: true })).toBeVisible();

	await page.getByRole('button', { name: 'Delete Group' }).click();

	const dialog = page.getByRole('alertdialog');
	await expect(dialog).toBeVisible();
	await expect(dialog).toContainText('Delete "DeleteMe"?');

	await dialog.getByRole('button', { name: 'Delete Group' }).click();

	await page.waitForURL(/\/es\/cards\/groups$/);
	await expect(page.getByRole('heading', { level: 1, name: 'Groups' })).toBeVisible();
});

test('group detail search filter shows no-results state when nothing matches', async ({ page }) => {
	const user = await signInCardsUser(page);

	const { groupId } = await seedActiveCard({
		userId: user.userId,
		languageId: 'es',
		cardContent: 'buscar',
		meaning: 'to search',
		groupName: 'SearchGroup',
	});

	await page.goto(`/es/cards/groups/${groupId}`);

	await page.getByRole('searchbox', { name: 'Search cards' }).fill('zzzznotfound');

	await expect(page.getByText('No cards match your filters')).toBeVisible();
	await expect(page.getByRole('button', { name: 'Clear filters' })).toBeVisible();
});
