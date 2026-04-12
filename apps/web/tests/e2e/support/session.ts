import type { Page } from '@playwright/test';

type SessionUser = {
	userId: string;
	email: string;
	name: string;
	image?: string | null;
};

export async function signInAs(page: Page, user: SessionUser) {
	const response = await page.request.post('/__e2e__/session', {
		data: user,
	});

	if (!response.ok()) {
		throw new Error(`Failed to create e2e session: ${response.status()} ${await response.text()}`);
	}
}

export async function clearSession(page: Page) {
	await page.request.delete('/__e2e__/session');
}
