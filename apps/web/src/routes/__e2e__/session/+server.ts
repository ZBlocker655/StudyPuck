import { error, json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { getDb, upsertUser } from '@studypuck/database';
import {
	getE2ESessionCookieName,
	getE2ESessionCookieOptions,
	isE2ETestModeEnabled,
	serializeE2ESession,
} from '$lib/server/e2e-auth';
import type { RequestHandler } from './$types.js';

type RequestPayload = {
	userId?: string;
	email?: string;
	name?: string | null;
	image?: string | null;
};

export const POST: RequestHandler = async ({ request, cookies }) => {
	if (!isE2ETestModeEnabled()) {
		throw error(404);
	}

	const payload = (await request.json()) as RequestPayload;

	if (!payload.userId || !payload.email) {
		throw error(400, 'userId and email are required');
	}

	const database = getDb(env.DATABASE_URL);

	await upsertUser(
		{
			userId: payload.userId,
			email: payload.email,
			name: payload.name ?? null,
			pictureUrl: payload.image ?? null,
		},
		database as never
	);

	cookies.set(
		getE2ESessionCookieName(),
		serializeE2ESession({
			userId: payload.userId,
			email: payload.email,
			name: payload.name ?? null,
			image: payload.image ?? null,
		}),
		getE2ESessionCookieOptions()
	);

	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ cookies }) => {
	if (!isE2ETestModeEnabled()) {
		throw error(404);
	}

	cookies.delete(getE2ESessionCookieName(), getE2ESessionCookieOptions());

	return json({ ok: true });
};
