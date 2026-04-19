import { and, desc, eq, sql } from 'drizzle-orm';
import { cardEntryDailyStats, getDb } from '@studypuck/database';

type DatabaseClient = ReturnType<typeof getDb>;

export type CardEntryStatisticsDay = {
  date: string;
  label: string;
  notesCaptured: number;
  notesProcessed: number;
  notesDeferred: number;
  notesDeleted: number;
  draftCardsCreated: number;
  cardsPromotedToActive: number;
  groupsCreated: number;
};

export type StatisticsData = {
  cardEntryToday: CardEntryStatisticsDay;
  cardEntryRecentDays: CardEntryStatisticsDay[];
};

function getUtcDateKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

export function formatStatisticsDateLabel(dateKey: string, now = new Date()): string {
  const todayKey = getUtcDateKey(now);

  if (dateKey === todayKey) {
    return 'Today';
  }

  const yesterday = new Date(now);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  if (dateKey === getUtcDateKey(yesterday)) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${dateKey}T00:00:00Z`));
}

function mapCardEntryStatisticsDay(
  row: Partial<CardEntryStatisticsDay> & Pick<CardEntryStatisticsDay, 'date'>,
  now = new Date()
): CardEntryStatisticsDay {
  return {
    date: row.date,
    label: formatStatisticsDateLabel(row.date, now),
    notesCaptured: row.notesCaptured ?? 0,
    notesProcessed: row.notesProcessed ?? 0,
    notesDeferred: row.notesDeferred ?? 0,
    notesDeleted: row.notesDeleted ?? 0,
    draftCardsCreated: row.draftCardsCreated ?? 0,
    cardsPromotedToActive: row.cardsPromotedToActive ?? 0,
    groupsCreated: row.groupsCreated ?? 0,
  };
}

export async function loadStatisticsData(
  userId: string,
  languageId: string,
  database: DatabaseClient
): Promise<StatisticsData> {
  const recentCardEntryRows = await database
    .select({
      date: cardEntryDailyStats.date,
      notesCaptured: cardEntryDailyStats.notesCaptured,
      notesProcessed: cardEntryDailyStats.notesProcessed,
      notesDeferred: cardEntryDailyStats.notesDeferred,
      notesDeleted: cardEntryDailyStats.notesDeleted,
      draftCardsCreated: cardEntryDailyStats.draftCardsCreated,
      cardsPromotedToActive: cardEntryDailyStats.cardsPromotedToActive,
      groupsCreated: cardEntryDailyStats.groupsCreated,
    })
    .from(cardEntryDailyStats)
    .where(
      and(
        eq(cardEntryDailyStats.userId, userId),
        eq(cardEntryDailyStats.languageId, languageId),
        sql`(
          ${cardEntryDailyStats.notesCaptured} > 0
          OR ${cardEntryDailyStats.notesProcessed} > 0
          OR ${cardEntryDailyStats.notesDeferred} > 0
          OR ${cardEntryDailyStats.notesDeleted} > 0
          OR ${cardEntryDailyStats.draftCardsCreated} > 0
          OR ${cardEntryDailyStats.cardsPromotedToActive} > 0
          OR ${cardEntryDailyStats.groupsCreated} > 0
        )`
      )
    )
    .orderBy(desc(cardEntryDailyStats.date))
    .limit(7);

  const todayKey = getUtcDateKey();
  const todayRow = recentCardEntryRows.find((row: typeof recentCardEntryRows[number]) => row.date === todayKey);

  return {
    cardEntryToday: mapCardEntryStatisticsDay(
      todayRow ?? {
        date: todayKey,
      }
    ),
    cardEntryRecentDays: recentCardEntryRows.map((row: typeof recentCardEntryRows[number]) =>
      mapCardEntryStatisticsDay(row)
    ),
  };
}
