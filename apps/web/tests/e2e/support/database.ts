import {
	addCardToGroup,
	addStudyLanguage,
	cardEntryDailyStats,
	createDraftCardFromNote,
	createGroup,
	createInboxNote,
	createUser,
	getDb
} from '@studypuck/database';
import { resetTestTables } from '@studypuck/database/test-utils';
import { and, eq } from 'drizzle-orm';
import { cards } from '@studypuck/database';

type SeedLanguage = {
	code: string;
	label: string;
};

type SeedUserOptions = {
	userId: string;
	email: string;
	name: string;
	image?: string | null;
	languages?: SeedLanguage[];
};

type SeedInboxNoteOptions = {
	userId: string;
	languageId: string;
	content: string;
	noteId?: string;
	sourceType?: string;
	aiState?: 'queued' | 'processing' | 'complete' | 'failed';
};

type SeedDraftCardOptions = {
	userId: string;
	languageId: string;
	noteContent: string;
	cardContent: string;
	noteId?: string;
	cardId?: string;
	meaning?: string;
	groupName?: string;
	groupId?: string;
	aiState?: 'queued' | 'processing' | 'complete' | 'failed';
};

type SeedActiveCardOptions = {
	userId: string;
	languageId: string;
	cardContent: string;
	cardId?: string;
	meaning?: string;
	cardType?: 'word' | 'pattern' | 'complex_prompt';
	groupName?: string;
	groupId?: string;
};

const testDatabaseUrl =
	process.env.TEST_DATABASE_URL ??
	process.env.DATABASE_URL ??
	'postgresql://test_user:test_password@localhost:5433/studypuck_test';

export async function resetDatabase() {
	const database = getDb(testDatabaseUrl);
	await resetTestTables(database as never);
}

export async function seedUser(options: SeedUserOptions) {
	const database = getDb(testDatabaseUrl);

	await createUser(
		{
			userId: options.userId,
			email: options.email,
			name: options.name,
			pictureUrl: options.image ?? null,
		},
		database as never
	);

	for (const language of options.languages ?? []) {
		await addStudyLanguage(
			{
				userId: options.userId,
				languageId: language.code,
				languageName: language.label,
			},
			database as never
		);
	}

	return {
		userId: options.userId,
		email: options.email,
		name: options.name,
		image: options.image ?? null,
	};
}

export async function seedInboxNote(options: SeedInboxNoteOptions) {
	const database = getDb(testDatabaseUrl);

	return createInboxNote(
		{
			userId: options.userId,
			languageId: options.languageId,
			noteId: options.noteId,
			content: options.content,
			sourceType: options.sourceType ?? 'manual',
			aiState: options.aiState ?? 'queued'
		},
		database as never
	);
}

export async function seedDraftCard(options: SeedDraftCardOptions) {
	const database = getDb(testDatabaseUrl);
	const groupId = options.groupId ?? `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const note = await createInboxNote(
		{
			userId: options.userId,
			languageId: options.languageId,
			noteId: options.noteId,
			content: options.noteContent,
			sourceType: 'manual',
			aiState: options.aiState ?? 'failed'
		},
		database as never
	);

	const card = await createDraftCardFromNote(
		{
			userId: options.userId,
			languageId: options.languageId,
			noteId: note.noteId,
			cardId: options.cardId,
			content: options.cardContent,
			meaning: options.meaning
		},
		database as never
	);

	let createdGroupId: string | null = null;

	if (options.groupName) {
		const group = await createGroup(
			{
				userId: options.userId,
				languageId: options.languageId,
				groupId,
				groupName: options.groupName
			},
			database as never
		);

		createdGroupId = group.groupId;
		await addCardToGroup(
			{
				userId: options.userId,
				languageId: options.languageId,
				cardId: card.cardId,
				groupId: group.groupId
			},
			database as never
		);
	}

	return { note, card, groupId: createdGroupId };
}

export async function seedActiveCard(options: SeedActiveCardOptions) {
	const database = getDb(testDatabaseUrl);
	const cardId = options.cardId ?? `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const groupId = options.groupId ?? `group-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const now = new Date();

	const [card] = await database
		.insert(cards)
		.values({
			userId: options.userId,
			languageId: options.languageId,
			cardId,
			content: options.cardContent,
			meaning: options.meaning ?? null,
			cardType: options.cardType ?? 'word',
			status: 'active',
			createdAt: now,
			updatedAt: now,
		})
		.returning();

	if (!card) {
		throw new Error('Failed to create active card');
	}

	let createdGroupId: string | null = null;

	if (options.groupName) {
		const group = await createGroup(
			{
				userId: options.userId,
				languageId: options.languageId,
				groupId,
				groupName: options.groupName,
			},
			database as never
		);

		createdGroupId = group.groupId;
		await addCardToGroup(
			{
				userId: options.userId,
				languageId: options.languageId,
				cardId: card.cardId,
				groupId: group.groupId,
			},
			database as never
		);
	}

	return { card, groupId: createdGroupId };
}

export async function getCardStatus(userId: string, languageId: string, cardId: string) {
	const database = getDb(testDatabaseUrl);
	const [card] = await database
		.select({ status: cards.status })
		.from(cards)
		.where(and(eq(cards.userId, userId), eq(cards.languageId, languageId), eq(cards.cardId, cardId)))
		.limit(1);

	return card?.status ?? null;
}

export async function getTodayCardEntryStats(userId: string, languageId: string) {
	const database = getDb(testDatabaseUrl);
	const today = new Date().toISOString().slice(0, 10);
	const [stats] = await database
		.select()
		.from(cardEntryDailyStats)
		.where(
			and(
				eq(cardEntryDailyStats.userId, userId),
				eq(cardEntryDailyStats.languageId, languageId),
				eq(cardEntryDailyStats.date, today)
			)
		)
		.limit(1);

	return stats ?? null;
}
