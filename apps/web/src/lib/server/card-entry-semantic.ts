import {
  cards,
  findSimilarCards,
  getCardsByStatus,
  getCardGroupsForCards,
  getDb,
  getNoteWithDraftCards,
  type Card,
} from '@studypuck/database';
import { and, eq } from 'drizzle-orm';
import { createAiService } from '$lib/server/ai-service.js';
import {
  CardEntryRequestError,
  loadCardEntryNoteShellData,
  type CardEntryDuplicateWarningData,
  type CardEntryGroupData,
  type CardEntryGroupSuggestionData,
  type CardEntryNoteDraftCardData,
  type CardEntryNoteShellData,
} from './card-entry.js';

type DatabaseClient = ReturnType<typeof getDb>;

type CardEntryMetadata = {
  semanticFingerprint?: string;
  dismissedDuplicateWarningIds?: string[];
};

type SimilarCardForGroupSuggestion = {
  cardId: string;
  similarity: number;
};

type GroupForSuggestionRanking = {
  groupId: string;
  groupName: string;
};

const GROUP_SUGGESTION_LIMIT = 5;
const GROUP_SUGGESTION_CARD_LIMIT = 12;
const GROUP_SUGGESTION_CARD_THRESHOLD = 0.72;
const GROUP_SUGGESTION_RELATIVE_MARGIN = 0.08;
const DUPLICATE_WARNING_LIMIT = 3;
const DUPLICATE_WARNING_THRESHOLD = 0.82;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getCardEntryMetadata(value: unknown): CardEntryMetadata {
  if (!isRecord(value)) {
    return {};
  }

  const cardEntry = value.cardEntry;

  if (!isRecord(cardEntry)) {
    return {};
  }

  return {
    semanticFingerprint:
      typeof cardEntry.semanticFingerprint === 'string' ? cardEntry.semanticFingerprint : undefined,
    dismissedDuplicateWarningIds: Array.isArray(cardEntry.dismissedDuplicateWarningIds)
      ? cardEntry.dismissedDuplicateWarningIds.filter(
          (warningId): warningId is string => typeof warningId === 'string' && warningId.length > 0
        )
      : [],
  };
}

function mergeCardEntryMetadata(
  existing: unknown,
  patch: Partial<CardEntryMetadata>
): Record<string, unknown> {
  const base = isRecord(existing) ? { ...existing } : {};
  const currentCardEntry = getCardEntryMetadata(existing);

  return {
    ...base,
    cardEntry: {
      ...currentCardEntry,
      ...patch,
    },
  };
}

function hashString(input: string): string {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0);
}

function buildCardSemanticText(card: Pick<Card, 'content' | 'meaning' | 'examples' | 'mnemonics' | 'llmInstructions'>) {
  return [
    card.content,
    card.meaning ?? '',
    ...normalizeStringList(card.examples),
    ...normalizeStringList(card.mnemonics),
    card.llmInstructions ?? '',
  ]
    .map((value) => value.trim())
    .filter(Boolean)
    .join('\n');
}

function buildSemanticFingerprint(input: string) {
  return hashString(input.trim());
}

function formatSimilarCardLabel(card: Pick<Card, 'content' | 'meaning'>) {
  const trimmedContent = card.content.trim();
  const trimmedMeaning = card.meaning?.trim();

  if (trimmedMeaning) {
    return `${trimmedContent} (${trimmedMeaning})`;
  }

  return trimmedContent;
}

function createDuplicateWarningId(input: {
  draftFingerprint: string;
  similarCardId: string;
  similarCardUpdatedAt: Date | null;
}) {
  return `duplicate-${hashString(
    `${input.draftFingerprint}:${input.similarCardId}:${input.similarCardUpdatedAt?.toISOString() ?? 'none'}`
  )}`;
}

async function ensureCardEmbedding(
  input: {
    userId: string;
    languageId: string;
    noteId: string;
    card: Card;
    privateEnv: Record<string, string | undefined>;
    database: DatabaseClient;
  }
): Promise<Card> {
  const semanticInput = buildCardSemanticText(input.card);
  const fingerprint = buildSemanticFingerprint(semanticInput);
  const metadata = getCardEntryMetadata(input.card.metadata);

  if (!semanticInput) {
    if (!input.card.embedding && metadata.semanticFingerprint === fingerprint) {
      return input.card;
    }

    await input.database
      .update(cards)
      .set({
        embedding: null,
        embeddingModel: null,
        embeddingGeneratedAt: null,
        metadata: mergeCardEntryMetadata(input.card.metadata, {
          semanticFingerprint: fingerprint,
        }),
      })
      .where(
        and(
          eq(cards.userId, input.card.userId),
          eq(cards.languageId, input.card.languageId),
          eq(cards.cardId, input.card.cardId)
        )
      );

    return {
      ...input.card,
      embedding: null,
      embeddingModel: null,
      embeddingGeneratedAt: null,
      metadata: mergeCardEntryMetadata(input.card.metadata, {
        semanticFingerprint: fingerprint,
      }),
    };
  }

  if (input.card.embedding && metadata.semanticFingerprint === fingerprint) {
    return input.card;
  }

  const aiService = createAiService({
    privateEnv: input.privateEnv,
  });
  const result = await aiService.generateEmbedding({
    metadata: {
      feature: 'card-entry',
      operation: 'semantic-embedding',
      userId: input.userId,
      languageId: input.languageId,
      noteId: input.noteId,
    },
    input: semanticInput,
    cacheKey: `card-entry:${input.userId}:${input.languageId}:${input.card.cardId}:embedding:${fingerprint}`,
  });
  const nextMetadata = mergeCardEntryMetadata(input.card.metadata, {
    semanticFingerprint: fingerprint,
  });
  const generatedAt = new Date();

  await input.database
    .update(cards)
    .set({
      embedding: result.embedding,
      embeddingModel: result.model,
      embeddingGeneratedAt: generatedAt,
      metadata: nextMetadata,
    })
    .where(
      and(
        eq(cards.userId, input.card.userId),
        eq(cards.languageId, input.card.languageId),
        eq(cards.cardId, input.card.cardId)
      )
    );

  return {
    ...input.card,
    embedding: result.embedding,
    embeddingModel: result.model,
    embeddingGeneratedAt: generatedAt,
    metadata: nextMetadata,
  };
}

async function ensureSemanticCandidates(
  input: {
    userId: string;
    languageId: string;
    noteId: string;
    draftCards: Card[];
    privateEnv: Record<string, string | undefined>;
    database: DatabaseClient;
  }
) {
  const activeCards = await getCardsByStatus(input.userId, input.languageId, 'active', input.database as never);

  const ensuredDraftCards: Card[] = [];

  for (const draftCard of input.draftCards) {
    ensuredDraftCards.push(
      await ensureCardEmbedding({
        ...input,
        card: draftCard,
      })
    );
  }

  const ensuredActiveCards: Card[] = [];

  for (const activeCard of activeCards) {
    ensuredActiveCards.push(
      await ensureCardEmbedding({
        ...input,
        card: activeCard,
      })
    );
  }

  return {
    draftCards: ensuredDraftCards,
    activeCards: ensuredActiveCards,
  };
}

async function buildGroupSuggestions(
  input: {
    userId: string;
    languageId: string;
    draftCard: Card;
    selectedGroups: CardEntryGroupData[];
    database: DatabaseClient;
  }
): Promise<CardEntryGroupSuggestionData[]> {
  if (!input.draftCard.embedding) {
    return [];
  }

  const selectedGroupIds = new Set(input.selectedGroups.map((group) => group.groupId));
  const similarCards = await findSimilarCards(
    input.userId,
    input.languageId,
    input.draftCard.embedding,
    GROUP_SUGGESTION_CARD_LIMIT,
    GROUP_SUGGESTION_CARD_THRESHOLD,
    input.database as never
  );

  if (similarCards.length === 0) {
    return [];
  }

  const groupsByCardId = await getCardGroupsForCards(
    input.userId,
    input.languageId,
    similarCards.map((card) => card.cardId),
    input.database as never
  );

  return rankGroupSuggestionsFromSimilarCards(
    similarCards,
    groupsByCardId,
    selectedGroupIds,
    GROUP_SUGGESTION_LIMIT
  );
}

export function rankGroupSuggestionsFromSimilarCards(
  similarCards: SimilarCardForGroupSuggestion[],
  groupsByCardId: Map<string, GroupForSuggestionRanking[]>,
  selectedGroupIds: Set<string>,
  limit = GROUP_SUGGESTION_LIMIT
): CardEntryGroupSuggestionData[] {
  const groupCandidates = new Map<
    string,
    {
      groupId: string;
      groupName: string;
      maxSimilarity: number;
      totalSimilarity: number;
      supportingCardCount: number;
    }
  >();

  for (const similarCard of similarCards) {
    for (const group of groupsByCardId.get(similarCard.cardId) ?? []) {
      if (selectedGroupIds.has(group.groupId)) {
        continue;
      }

      const existing = groupCandidates.get(group.groupId);

      if (existing) {
        existing.maxSimilarity = Math.max(existing.maxSimilarity, similarCard.similarity);
        existing.totalSimilarity += similarCard.similarity;
        existing.supportingCardCount += 1;
        continue;
      }

      groupCandidates.set(group.groupId, {
        groupId: group.groupId,
        groupName: group.groupName,
        maxSimilarity: similarCard.similarity,
        totalSimilarity: similarCard.similarity,
        supportingCardCount: 1,
      });
    }
  }

  const rankedGroups = Array.from(groupCandidates.values())
    .sort((left, right) => {
      if (right.maxSimilarity !== left.maxSimilarity) {
        return right.maxSimilarity - left.maxSimilarity;
      }

      if (right.supportingCardCount !== left.supportingCardCount) {
        return right.supportingCardCount - left.supportingCardCount;
      }

      if (right.totalSimilarity !== left.totalSimilarity) {
        return right.totalSimilarity - left.totalSimilarity;
      }

      return left.groupName.localeCompare(right.groupName);
    });

  const bestSimilarity = rankedGroups[0]?.maxSimilarity ?? 0;
  const cutoff = Math.max(
    GROUP_SUGGESTION_CARD_THRESHOLD,
    bestSimilarity - GROUP_SUGGESTION_RELATIVE_MARGIN
  );

  return rankedGroups
    .filter((group) => group.maxSimilarity >= cutoff)
    .slice(0, limit)
    .map((group) => ({
      groupId: group.groupId,
      groupName: group.groupName,
      similarityScore: Number(group.maxSimilarity.toFixed(3)),
    }));
}

async function buildDuplicateWarnings(
  input: {
    userId: string;
    languageId: string;
    draftCard: Card;
    database: DatabaseClient;
  }
): Promise<CardEntryDuplicateWarningData[]> {
  if (!input.draftCard.embedding) {
    return [];
  }

  const metadata = getCardEntryMetadata(input.draftCard.metadata);
  const dismissedIds = new Set(metadata.dismissedDuplicateWarningIds ?? []);
  const similarCards = await findSimilarCards(
    input.userId,
    input.languageId,
    input.draftCard.embedding,
    DUPLICATE_WARNING_LIMIT,
    DUPLICATE_WARNING_THRESHOLD,
    input.database as never
  );
  const draftFingerprint =
    metadata.semanticFingerprint ?? buildSemanticFingerprint(buildCardSemanticText(input.draftCard));

  return similarCards.map((similarCard) => {
    const warningId = createDuplicateWarningId({
      draftFingerprint,
      similarCardId: similarCard.cardId,
      similarCardUpdatedAt: similarCard.updatedAt ?? null,
    });

    return {
      warningId,
      title: 'Possible duplicate',
      similarCardId: similarCard.cardId,
      similarCardLabel: formatSimilarCardLabel(similarCard),
      dismissed: dismissedIds.has(warningId),
    };
  });
}

export async function refreshCardEntryNoteSemanticAssistance(input: {
  userId: string;
  languageId: string;
  noteId: string;
  privateEnv: Record<string, string | undefined>;
  database: DatabaseClient;
}): Promise<CardEntryNoteShellData> {
  const [baseNote, workspace] = await Promise.all([
    loadCardEntryNoteShellData(input.userId, input.languageId, input.noteId, input.database),
    getNoteWithDraftCards(input.userId, input.languageId, input.noteId, input.database as never),
  ]);

  if (!workspace || baseNote.aiState === 'queued' || baseNote.aiState === 'processing') {
    return baseNote;
  }

  const semanticCandidates = await ensureSemanticCandidates({
    ...input,
    draftCards: workspace.draftCards,
  });
  const rawDraftsById = new Map(
    semanticCandidates.draftCards.map((draftCard) => [draftCard.cardId, draftCard])
  );
  const semanticDraftCards: CardEntryNoteDraftCardData[] = [];

  for (const draftCard of baseNote.draftCards) {
    const rawDraftCard = rawDraftsById.get(draftCard.cardId);

    if (!rawDraftCard) {
      semanticDraftCards.push(draftCard);
      continue;
    }

    semanticDraftCards.push({
      ...draftCard,
      groupSuggestions: await buildGroupSuggestions({
        userId: input.userId,
        languageId: input.languageId,
        draftCard: rawDraftCard,
        selectedGroups: draftCard.groups,
        database: input.database,
      }),
      duplicateWarnings: await buildDuplicateWarnings({
        userId: input.userId,
        languageId: input.languageId,
        draftCard: rawDraftCard,
        database: input.database,
      }),
    });
  }

  return {
    ...baseNote,
    draftCards: semanticDraftCards,
  };
}

export async function dismissCardEntryDuplicateWarning(input: {
  userId: string;
  languageId: string;
  noteId: string;
  cardId: string;
  warningId: string;
  privateEnv: Record<string, string | undefined>;
  database: DatabaseClient;
}): Promise<CardEntryNoteShellData> {
  const note = await refreshCardEntryNoteSemanticAssistance(input);
  const card = note.draftCards.find((draftCard) => draftCard.cardId === input.cardId);
  const warning = card?.duplicateWarnings.find((duplicateWarning) => duplicateWarning.warningId === input.warningId);

  if (!card || !warning) {
    throw new CardEntryRequestError(404, 'That duplicate warning is no longer available.');
  }

  const workspace = await getNoteWithDraftCards(
    input.userId,
    input.languageId,
    input.noteId,
    input.database as never
  );
  const rawDraftCard = workspace?.draftCards.find((draftCard) => draftCard.cardId === input.cardId);

  if (!rawDraftCard) {
    throw new CardEntryRequestError(404, 'Draft card not found for this note.');
  }

  const metadata = getCardEntryMetadata(rawDraftCard.metadata);
  const dismissedDuplicateWarningIds = new Set(metadata.dismissedDuplicateWarningIds ?? []);
  dismissedDuplicateWarningIds.add(input.warningId);

  await input.database
    .update(cards)
    .set({
      metadata: mergeCardEntryMetadata(rawDraftCard.metadata, {
        dismissedDuplicateWarningIds: Array.from(dismissedDuplicateWarningIds),
      }),
    })
    .where(
      and(
        eq(cards.userId, rawDraftCard.userId),
        eq(cards.languageId, rawDraftCard.languageId),
        eq(cards.cardId, rawDraftCard.cardId)
      )
    );

  return refreshCardEntryNoteSemanticAssistance(input);
}
