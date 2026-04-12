import { and, eq, ne, sql } from 'drizzle-orm';
import {
  cardEntryDailyStats,
  cards,
  cardReviewDailyStats,
  getActiveUserLanguages,
  getUserByAuth0Id,
  translationDrillDailyStats,
  type StudyLanguage,
  type User,
} from '@studypuck/database';

type DatabaseClient = NonNullable<Parameters<typeof getUserByAuth0Id>[1]>;

export type SettingsLanguageSummary = {
  languageId: string;
  languageName: string;
  isActive: boolean;
  cardCount: number;
  lastStudiedLabel: string;
};

export type SettingsData = {
  dbProfile: User | null;
  languageSummaries: SettingsLanguageSummary[];
};

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function parseIsoDate(dateString: string): Date {
  return new Date(`${dateString}T00:00:00Z`);
}

export function formatRelativeStudyLabel(dateString: string | null, now = new Date()): string {
  if (!dateString) {
    return 'Never';
  }

  const currentDay = startOfUtcDay(now);
  const targetDay = startOfUtcDay(parseIsoDate(dateString));
  const differenceInDays = Math.round((currentDay.getTime() - targetDay.getTime()) / 86_400_000);

  if (differenceInDays <= 0) {
    return 'Today';
  }

  if (differenceInDays === 1) {
    return 'Yesterday';
  }

  return `${differenceInDays} days ago`;
}

async function loadLanguageSummary(
  userId: string,
  currentLanguageId: string,
  language: StudyLanguage,
  database: DatabaseClient
): Promise<SettingsLanguageSummary> {
  const [cardCountResult, cardEntryResult, cardReviewResult, translationResult] = await Promise.all([
    database
      .select({ count: sql<number>`count(*)` })
      .from(cards)
      .where(
        and(
          eq(cards.userId, userId),
          eq(cards.languageId, language.languageId),
          ne(cards.status, 'deleted')
        )
      ),
    database
      .select({ date: sql<string | null>`max(${cardEntryDailyStats.date})` })
      .from(cardEntryDailyStats)
      .where(
        and(
          eq(cardEntryDailyStats.userId, userId),
          eq(cardEntryDailyStats.languageId, language.languageId),
          sql`(
            ${cardEntryDailyStats.notesCaptured} > 0
            OR ${cardEntryDailyStats.notesProcessed} > 0
            OR ${cardEntryDailyStats.draftCardsCreated} > 0
            OR ${cardEntryDailyStats.cardsPromotedToActive} > 0
          )`
        )
      ),
    database
      .select({ date: sql<string | null>`max(${cardReviewDailyStats.date})` })
      .from(cardReviewDailyStats)
      .where(
        and(
          eq(cardReviewDailyStats.userId, userId),
          eq(cardReviewDailyStats.languageId, language.languageId),
          sql`${cardReviewDailyStats.cardsReviewed} > 0`
        )
      ),
    database
      .select({ date: sql<string | null>`max(${translationDrillDailyStats.date})` })
      .from(translationDrillDailyStats)
      .where(
        and(
          eq(translationDrillDailyStats.userId, userId),
          eq(translationDrillDailyStats.languageId, language.languageId),
          sql`${translationDrillDailyStats.sentencesTranslated} > 0`
        )
      ),
  ]);

  const latestStudyDate =
    [cardEntryResult[0]?.date, cardReviewResult[0]?.date, translationResult[0]?.date]
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1) ?? null;

  return {
    languageId: language.languageId,
    languageName: language.languageName,
    isActive: language.languageId === currentLanguageId,
    cardCount: Number(cardCountResult[0]?.count ?? 0),
    lastStudiedLabel: formatRelativeStudyLabel(latestStudyDate),
  };
}

export async function loadSettingsData(
  userId: string,
  currentLanguageId: string,
  database: DatabaseClient
): Promise<SettingsData> {
  const [dbProfile, activeLanguages] = await Promise.all([
    getUserByAuth0Id(userId, database),
    getActiveUserLanguages(userId, database),
  ]);

  const languageSummaries = await Promise.all(
    activeLanguages.map((language) => loadLanguageSummary(userId, currentLanguageId, language, database))
  );

  languageSummaries.sort((left, right) => {
    if (left.isActive !== right.isActive) {
      return left.isActive ? -1 : 1;
    }

    return left.languageName.localeCompare(right.languageName);
  });

  return {
    dbProfile,
    languageSummaries,
  };
}
