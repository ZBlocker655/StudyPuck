import { and, eq, lte, sql } from 'drizzle-orm';
import {
  cardEntryDailyStats,
  cardReviewDailyStats,
  cardReviewSrs,
  getDb,
  getCardEntryCounts,
  getActiveUserLanguages,
  translationDrillDailyStats,
  type StudyLanguage,
} from '@studypuck/database';

type DatabaseClient = ReturnType<typeof getDb>;

export type DashboardStats = {
  reviewDueCount: number;
  inboxNoteCount: number;
  streakDays: number;
};

export function getPreferredLanguageCode(languages: Pick<StudyLanguage, 'languageId'>[]): string | null {
  return languages[0]?.languageId ?? null;
}

export function resolveAuthenticatedHomepage(languages: Pick<StudyLanguage, 'languageId'>[]): string {
  const preferredLanguage = getPreferredLanguageCode(languages);
  return preferredLanguage ? `/${preferredLanguage}/` : '/onboarding';
}

export function calculateStudyStreak(dates: string[], today = new Date()): number {
  const activeDates = new Set(dates);
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  let streak = 0;

  while (activeDates.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }

  return streak;
}

export async function loadActiveStudyLanguages(userId: string, database: DatabaseClient) {
  return getActiveUserLanguages(userId, database as never);
}

export async function loadDashboardStats(
  userId: string,
  languageId: string,
  database: DatabaseClient
): Promise<DashboardStats> {
  const nowEpochSeconds = Math.floor(Date.now() / 1000);

  const [reviewDueResult, cardEntryCounts, entryActivity, reviewActivity, drillActivity] = await Promise.all([
    database
      .select({ count: sql<number>`count(*)` })
      .from(cardReviewSrs)
      .where(
        and(
          eq(cardReviewSrs.userId, userId),
          eq(cardReviewSrs.languageId, languageId),
          lte(cardReviewSrs.nextDue, nowEpochSeconds)
        )
      ),
    getCardEntryCounts(userId, languageId, database as never),
    database
      .select({ date: cardEntryDailyStats.date })
      .from(cardEntryDailyStats)
      .where(
        and(
          eq(cardEntryDailyStats.userId, userId),
          eq(cardEntryDailyStats.languageId, languageId),
          sql`(
            ${cardEntryDailyStats.notesCaptured} > 0
            OR ${cardEntryDailyStats.notesProcessed} > 0
            OR ${cardEntryDailyStats.draftCardsCreated} > 0
            OR ${cardEntryDailyStats.cardsPromotedToActive} > 0
          )`
        )
      ),
    database
      .select({ date: cardReviewDailyStats.date })
      .from(cardReviewDailyStats)
      .where(
        and(
          eq(cardReviewDailyStats.userId, userId),
          eq(cardReviewDailyStats.languageId, languageId),
          sql`${cardReviewDailyStats.cardsReviewed} > 0`
        )
      ),
    database
      .select({ date: translationDrillDailyStats.date })
      .from(translationDrillDailyStats)
      .where(
        and(
          eq(translationDrillDailyStats.userId, userId),
          eq(translationDrillDailyStats.languageId, languageId),
          sql`${translationDrillDailyStats.sentencesTranslated} > 0`
        )
      ),
  ]);

  const streakDays = calculateStudyStreak([
    ...entryActivity.map((row: { date: string }) => row.date),
    ...reviewActivity.map((row: { date: string }) => row.date),
    ...drillActivity.map((row: { date: string }) => row.date),
  ]);

  return {
    reviewDueCount: Number(reviewDueResult[0]?.count ?? 0),
    inboxNoteCount: cardEntryCounts.unprocessedNoteCount,
    streakDays,
  };
}
