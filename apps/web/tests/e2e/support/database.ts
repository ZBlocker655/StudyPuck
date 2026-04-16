import { addStudyLanguage, createInboxNote, createUser, getDb } from '@studypuck/database';
import { resetTestTables } from '@studypuck/database/test-utils';

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
		},
		database as never
	);
}
