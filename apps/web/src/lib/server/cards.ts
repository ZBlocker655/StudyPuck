import {
  addCardToGroup,
  bulkAssignActiveCardsToGroup,
  createGroup,
  deleteGroup,
  getActiveCardWithGroups,
  getActiveUserLanguages,
  getDb,
  getGroupWithActiveCardCount,
  getGroups,
  listActiveCards,
  listActiveCardsInGroup,
  listGroupsWithActiveCardCounts,
  listTranslationDrillDrawPileGroups,
  removeCardFromGroup,
  softDeleteActiveCards,
  upsertTranslationDrillDrawPile,
  updateActiveCard,
  updateGroup,
  type ActiveCardDetail,
  type ActiveCardGroupSummary,
  type ActiveCardListItem,
  type GroupWithActiveCardCount,
  type SupportedCardType,
} from '@studypuck/database';
import {
  cardEntryDraftCardUpdateSchema,
  editableCardOptionalTextSchema,
  editableGroupNameSchema,
} from '$lib/schemas/card-entry.js';
import { z } from 'zod';
import {
  activeCardIdSchema,
  activeCardTypeSchema,
  activeGroupIdSchema,
  cardLibraryFiltersSchema,
  cardLibrarySearchSchema,
} from '$lib/schemas/cards.js';

type DatabaseClient = ReturnType<typeof getDb>;
type ActiveCardUpdateInput = typeof cardEntryDraftCardUpdateSchema._output;

type LoaderDeps = {
  getActiveUserLanguages: typeof getActiveUserLanguages;
  listActiveCards: typeof listActiveCards;
  listGroupsWithActiveCardCounts: typeof listGroupsWithActiveCardCounts;
  listTranslationDrillDrawPileGroups: typeof listTranslationDrillDrawPileGroups;
  getGroupWithActiveCardCount: typeof getGroupWithActiveCardCount;
  listActiveCardsInGroup: typeof listActiveCardsInGroup;
  getActiveCardWithGroups: typeof getActiveCardWithGroups;
  getGroups: typeof getGroups;
};

const defaultLoaderDeps: LoaderDeps = {
  getActiveUserLanguages,
  listActiveCards,
  listGroupsWithActiveCardCounts,
  listTranslationDrillDrawPileGroups,
  getGroupWithActiveCardCount,
  listActiveCardsInGroup,
  getActiveCardWithGroups,
  getGroups,
};

export class CardLibraryRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'CardLibraryRequestError';
    this.status = status;
  }
}

export type CardLibraryGroupData = {
  groupId: string;
  groupName: string;
};

export type TranslationDrillGroupConfigData = {
  enabled: boolean;
  drawPileName: string | null;
  pileSizeLimit: number;
};

export type CardLibraryGroupFilterOption = CardLibraryGroupData & {
  activeCardCount: number;
};

export type CardLibraryFilters = {
  searchText: string;
  groupIds: string[];
  cardType: SupportedCardType | null;
};

export type CardLibraryCardListItemData = {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  updatedAtIso: string | null;
  updatedAtLabel: string;
  groups: CardLibraryGroupData[];
};

export type CardLibraryCardDetailData = {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  partOfSpeech: string[];
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
  updatedAtIso: string | null;
  groups: CardLibraryGroupData[];
};

export type CardLibraryData = {
  items: CardLibraryCardListItemData[];
  totalCount: number;
  filteredCardIds: string[];
  filters: CardLibraryFilters;
  availableGroups: CardLibraryGroupFilterOption[];
};

export type GroupDetailData = {
  group: {
    groupId: string;
    groupName: string;
    description: string | null;
    activeCardCount: number;
    translationDrills: TranslationDrillGroupConfigData;
  };
  cards: CardLibraryData;
  addableCards: {
    items: CardLibraryCardListItemData[];
    totalCount: number;
  };
};

export type CardLibraryGroupListItemData = {
  groupId: string;
  groupName: string;
  description: string | null;
  activeCardCount: number;
  translationDrills: TranslationDrillGroupConfigData;
};

export type CardLibraryGroupsData = {
  items: CardLibraryGroupListItemData[];
  totalCount: number;
};

const cardLibraryGroupCreateSchema = z.object({
  groupName: editableGroupNameSchema,
  description: editableCardOptionalTextSchema.optional().default(null),
});

const groupDetailGroupUpdateSchema = z.object({
  groupName: editableGroupNameSchema,
  description: editableCardOptionalTextSchema.optional().default(null),
});

const DEFAULT_TRANSLATION_DRILL_PILE_SIZE_LIMIT = 10;

const translationDrillGroupConfigUpdateSchema = z.object({
  enabled: z.boolean(),
  drawPileName: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (typeof value !== 'string') {
        return null;
      }

      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    }),
  pileSizeLimit: z.coerce.number().int().min(1, 'Pile size limit must be at least 1.').max(100, 'Pile size limit must be 100 or fewer.'),
});

function normalizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

function createGroupId(): string {
  return `group-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`}`;
}

function normalizeGroupName(value: string) {
  return value.trim().toLocaleLowerCase();
}

async function assertUserHasLanguage(
  userId: string,
  languageId: string,
  database: DatabaseClient,
  deps: Pick<LoaderDeps, 'getActiveUserLanguages'> = defaultLoaderDeps,
): Promise<void> {
  const activeLanguages = await deps.getActiveUserLanguages(userId, database as never);
  const languageExists = activeLanguages.some((language) => language.languageId === languageId);

  if (!languageExists) {
    throw new CardLibraryRequestError(404, 'That language is not available for this user.');
  }
}

function parseCardId(cardId: unknown): string {
  const parsed = activeCardIdSchema.safeParse(typeof cardId === 'string' ? cardId : '');

  if (!parsed.success) {
    throw new CardLibraryRequestError(400, parsed.error.issues[0]?.message ?? 'Card identifier is invalid.');
  }

  return parsed.data;
}

function parseGroupId(groupId: unknown): string {
  const parsed = activeGroupIdSchema.safeParse(typeof groupId === 'string' ? groupId : '');

  if (!parsed.success) {
    throw new CardLibraryRequestError(400, parsed.error.issues[0]?.message ?? 'Group identifier is invalid.');
  }

  return parsed.data;
}

function parseCardIds(cardIds: unknown): string[] {
  if (!Array.isArray(cardIds)) {
    throw new CardLibraryRequestError(400, 'At least one card must be selected.');
  }

  const parsedCardIds = [...new Set(cardIds.map((cardId) => parseCardId(cardId)))];

  if (parsedCardIds.length === 0) {
    throw new CardLibraryRequestError(400, 'At least one card must be selected.');
  }

  return parsedCardIds;
}

function parseFilters(url: URL): CardLibraryFilters {
  const searchText = cardLibrarySearchSchema.parse(url.searchParams.get('q') ?? '');
  const groupIds = [...new Set(url.searchParams.getAll('group').map((groupId) => groupId.trim()).filter(Boolean))];
  const rawCardType = url.searchParams.get('type');
  let parsedCardType: SupportedCardType | null = null;

  if (rawCardType !== null && rawCardType.trim().length > 0) {
    const cardTypeResult = activeCardTypeSchema.safeParse(rawCardType);

    if (!cardTypeResult.success) {
      throw new CardLibraryRequestError(
        400,
        cardTypeResult.error.issues[0]?.message ?? 'Card type filter is invalid.',
      );
    }

    parsedCardType = cardTypeResult.data;
  }

  const parsed = cardLibraryFiltersSchema.safeParse({
    searchText,
    groupIds,
    cardType: parsedCardType,
  });

  if (!parsed.success) {
    throw new CardLibraryRequestError(400, parsed.error.issues[0]?.message ?? 'Card Library filters are invalid.');
  }

  return parsed.data;
}

export function formatCardLibraryRelativeTime(date: Date, now = new Date()): string {
  const differenceInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1_000));

  if (differenceInSeconds < 60) {
    return 'Just now';
  }

  const differenceInMinutes = Math.floor(differenceInSeconds / 60);

  if (differenceInMinutes < 60) {
    return `${differenceInMinutes}m`;
  }

  const differenceInHours = Math.floor(differenceInMinutes / 60);

  if (differenceInHours < 24) {
    return `${differenceInHours}h`;
  }

  const differenceInDays = Math.floor(differenceInHours / 24);

  if (differenceInDays < 7) {
    return `${differenceInDays}d`;
  }

  const differenceInWeeks = Math.floor(differenceInDays / 7);

  if (differenceInWeeks < 5) {
    return `${differenceInWeeks}w`;
  }

  const differenceInMonths = Math.floor(differenceInDays / 30);

  if (differenceInMonths < 12) {
    return `${differenceInMonths}mo`;
  }

  const differenceInYears = Math.floor(differenceInDays / 365);
  return `${differenceInYears}y`;
}

function mapGroupSummary(group: ActiveCardGroupSummary): CardLibraryGroupData {
  return {
    groupId: group.groupId,
    groupName: group.groupName,
  };
}

function mapGroupFilterOption(group: GroupWithActiveCardCount): CardLibraryGroupFilterOption {
  return {
    groupId: group.groupId,
    groupName: group.groupName,
    activeCardCount: group.activeCardCount,
  };
}

function createDefaultTranslationDrillGroupConfig(): TranslationDrillGroupConfigData {
  return {
    enabled: false,
    drawPileName: null,
    pileSizeLimit: DEFAULT_TRANSLATION_DRILL_PILE_SIZE_LIMIT,
  };
}

function createTranslationDrillGroupConfigLookup(
  groups: Array<{
    groupId: string;
    drawPileName: string | null;
    pileSizeLimit: number;
  }>,
) {
  return new Map<string, TranslationDrillGroupConfigData>(
    groups.map((group) => [
      group.groupId,
      {
        enabled: true,
        drawPileName: group.drawPileName,
        pileSizeLimit: group.pileSizeLimit ?? DEFAULT_TRANSLATION_DRILL_PILE_SIZE_LIMIT,
      },
    ]),
  );
}

function mapGroupListItem(
  group: GroupWithActiveCardCount,
  translationDrillConfig = createDefaultTranslationDrillGroupConfig(),
): CardLibraryGroupListItemData {
  return {
    groupId: group.groupId,
    groupName: group.groupName,
    description: group.description ?? null,
    activeCardCount: group.activeCardCount,
    translationDrills: translationDrillConfig,
  };
}

function sortGroupsByName<T extends { groupName: string }>(groups: T[]) {
  return [...groups].sort((left, right) => left.groupName.localeCompare(right.groupName));
}

function mapCardListItem(card: ActiveCardListItem, now = new Date()): CardLibraryCardListItemData {
  return {
    cardId: card.cardId,
    content: card.content,
    meaning: card.meaning,
    cardType: card.cardType,
    updatedAtIso: card.updatedAt?.toISOString() ?? null,
    updatedAtLabel: card.updatedAt ? formatCardLibraryRelativeTime(card.updatedAt, now) : 'Never',
    groups: card.groups.map((group) => mapGroupSummary(group)),
  };
}

function mapActiveCardDetail(card: ActiveCardDetail): CardLibraryCardDetailData {
  return {
    cardId: card.cardId,
    content: card.content,
    meaning: card.meaning,
    cardType: card.cardType,
    partOfSpeech: card.partOfSpeech ?? [],
    examples: normalizeStringList(card.examples),
    mnemonics: normalizeStringList(card.mnemonics),
    llmInstructions: card.llmInstructions ?? null,
    updatedAtIso: card.updatedAt?.toISOString() ?? null,
    groups: card.groups.map((group) => mapGroupSummary(group)),
  };
}

async function ensureUniqueGroupName(
  userId: string,
  languageId: string,
  groupName: string,
  database: DatabaseClient,
  options?: {
    excludeGroupId?: string;
    getGroups?: typeof getGroups;
  },
) {
  const normalizedName = normalizeGroupName(groupName);
  const existingGroups = await (options?.getGroups ?? getGroups)(userId, languageId, database as never);
  const duplicateGroup = existingGroups.find((group) => {
    if (options?.excludeGroupId && group.groupId === options.excludeGroupId) {
      return false;
    }

    return normalizeGroupName(group.groupName) === normalizedName;
  });

  if (duplicateGroup) {
    throw new CardLibraryRequestError(409, 'A group with this name already exists.');
  }
}

async function resolveGroupSelections(
  userId: string,
  languageId: string,
  selections: ActiveCardUpdateInput['groups'],
  database: DatabaseClient,
): Promise<CardLibraryGroupData[]> {
  const existingGroups = await getGroups(userId, languageId, database as never);
  const groupsById = new Map(existingGroups.map((group) => [group.groupId, group]));
  const groupsByNormalizedName = new Map(
    existingGroups.map((group) => [group.groupName.trim().toLocaleLowerCase(), group]),
  );
  const resolvedGroups = new Map<string, CardLibraryGroupData>();

  for (const selection of selections) {
    const normalizedName = selection.groupName.trim().toLocaleLowerCase();
    const explicitGroupId = selection.groupId?.trim() || null;

    if (explicitGroupId) {
      const explicitGroup = groupsById.get(explicitGroupId);

      if (!explicitGroup) {
        throw new CardLibraryRequestError(404, 'One of the selected groups no longer exists.');
      }

      resolvedGroups.set(explicitGroup.groupId, mapGroupSummary(explicitGroup));
      continue;
    }

    const existingGroup = groupsByNormalizedName.get(normalizedName);

    if (existingGroup) {
      resolvedGroups.set(existingGroup.groupId, mapGroupSummary(existingGroup));
      continue;
    }

    const parsedGroupName = editableGroupNameSchema.safeParse(selection.groupName);

    if (!parsedGroupName.success) {
      throw new CardLibraryRequestError(
        400,
        parsedGroupName.error.issues[0]?.message ?? 'Group name is invalid.',
      );
    }

    const createdGroup = await createGroup(
      {
        userId,
        languageId,
        groupId: createGroupId(),
        groupName: parsedGroupName.data,
      },
      database as never,
    );

    groupsById.set(createdGroup.groupId, createdGroup);
    groupsByNormalizedName.set(createdGroup.groupName.trim().toLocaleLowerCase(), createdGroup);
    resolvedGroups.set(createdGroup.groupId, mapGroupSummary(createdGroup));
  }

  return Array.from(resolvedGroups.values()).sort((left, right) => left.groupName.localeCompare(right.groupName));
}

async function syncActiveCardGroups(
  userId: string,
  languageId: string,
  cardId: string,
  nextGroups: CardLibraryGroupData[],
  database: DatabaseClient,
) {
  const activeCard = await getActiveCardWithGroups(userId, languageId, cardId, database as never);

  if (!activeCard) {
    throw new CardLibraryRequestError(404, 'Active card not found.');
  }

  const currentGroupIds = new Set(activeCard.groups.map((group) => group.groupId));
  const nextGroupIds = new Set(nextGroups.map((group) => group.groupId));

  for (const group of nextGroups) {
    if (!currentGroupIds.has(group.groupId)) {
      await addCardToGroup(
        {
          userId,
          languageId,
          cardId,
          groupId: group.groupId,
        },
        database as never,
      );
    }
  }

  for (const group of activeCard.groups) {
    if (!nextGroupIds.has(group.groupId)) {
      await removeCardFromGroup(userId, languageId, cardId, group.groupId, database as never);
    }
  }
}

export async function loadCardLibraryData(
  userId: string,
  languageId: string,
  url: URL,
  database: DatabaseClient,
  deps: LoaderDeps = defaultLoaderDeps,
): Promise<CardLibraryData> {
  await assertUserHasLanguage(userId, languageId, database, deps);

  const filters = parseFilters(url);
  const [items, availableGroups] = await Promise.all([
    deps.listActiveCards(
      userId,
      languageId,
      {
        search: filters.searchText,
        groupIds: filters.groupIds,
        cardType: filters.cardType,
      },
      database as never,
    ),
    deps.listGroupsWithActiveCardCounts(userId, languageId, database as never),
  ]);

  return {
    items: items.map((item) => mapCardListItem(item)),
    totalCount: items.length,
    filteredCardIds: items.map((item) => item.cardId),
    filters,
    availableGroups: sortGroupsByName(availableGroups.map((group) => mapGroupFilterOption(group))),
  };
}

export async function loadCardLibraryGroupsData(
  userId: string,
  languageId: string,
  database: DatabaseClient,
  deps: LoaderDeps = defaultLoaderDeps,
): Promise<CardLibraryGroupsData> {
  await assertUserHasLanguage(userId, languageId, database, deps);

  const [groups, translationDrillGroups] = await Promise.all([
    deps.listGroupsWithActiveCardCounts(userId, languageId, database as never),
    deps.listTranslationDrillDrawPileGroups(userId, languageId, {}, database as never),
  ]);
  const translationDrillConfigByGroupId = createTranslationDrillGroupConfigLookup(translationDrillGroups);

  return {
    items: sortGroupsByName(groups.map((group) => mapGroupListItem(
      group,
      translationDrillConfigByGroupId.get(group.groupId) ?? createDefaultTranslationDrillGroupConfig(),
    ))),
    totalCount: groups.length,
  };
}

export async function loadGroupDetailData(
  userId: string,
  languageId: string,
  groupId: unknown,
  url: URL,
  database: DatabaseClient,
  deps: LoaderDeps = defaultLoaderDeps,
): Promise<GroupDetailData> {
  await assertUserHasLanguage(userId, languageId, database, deps);

  const parsedGroupId = parseGroupId(groupId);
  const filters = parseFilters(url);
  const [group, items, allActiveCards, availableGroups, translationDrillGroups] = await Promise.all([
    deps.getGroupWithActiveCardCount(userId, languageId, parsedGroupId, database as never),
    deps.listActiveCardsInGroup(
      userId,
      languageId,
      parsedGroupId,
      {
        search: filters.searchText,
        cardType: filters.cardType,
      },
      database as never,
    ),
    deps.listActiveCards(userId, languageId, {}, database as never),
    deps.listGroupsWithActiveCardCounts(userId, languageId, database as never),
    deps.listTranslationDrillDrawPileGroups(userId, languageId, {}, database as never),
  ]);

  if (!group) {
    throw new CardLibraryRequestError(404, 'Group not found.');
  }

  const translationDrillConfigByGroupId = createTranslationDrillGroupConfigLookup(translationDrillGroups);

  return {
    group: {
      groupId: group.groupId,
      groupName: group.groupName,
      description: group.description ?? null,
      activeCardCount: group.activeCardCount,
      translationDrills: translationDrillConfigByGroupId.get(parsedGroupId) ?? createDefaultTranslationDrillGroupConfig(),
    },
    cards: {
      items: items.map((item) => mapCardListItem(item)),
      totalCount: items.length,
      filteredCardIds: items.map((item) => item.cardId),
      filters,
      availableGroups: sortGroupsByName(availableGroups.map((availableGroup) => mapGroupFilterOption(availableGroup))),
    },
    addableCards: {
      items: allActiveCards
        .filter((item) => !item.groups.some((itemGroup) => itemGroup.groupId === parsedGroupId))
        .map((item) => mapCardListItem(item)),
      totalCount: allActiveCards.filter((item) => !item.groups.some((itemGroup) => itemGroup.groupId === parsedGroupId)).length,
    },
  };
}

export async function loadActiveCardDetailData(
  userId: string,
  languageId: string,
  cardId: unknown,
  database: DatabaseClient,
  deps: LoaderDeps = defaultLoaderDeps,
): Promise<{
  card: CardLibraryCardDetailData;
  availableGroups: CardLibraryGroupData[];
}> {
  await assertUserHasLanguage(userId, languageId, database, deps);

  const parsedCardId = parseCardId(cardId);
  const [card, availableGroups] = await Promise.all([
    deps.getActiveCardWithGroups(userId, languageId, parsedCardId, database as never),
    deps.getGroups(userId, languageId, database as never),
  ]);

  if (!card) {
    throw new CardLibraryRequestError(404, 'Active card not found.');
  }

  return {
    card: mapActiveCardDetail(card),
    availableGroups: sortGroupsByName(availableGroups.map((group) => mapGroupSummary(group))),
  };
}

export async function updateCardLibraryCardForLanguage(
  userId: string,
  languageId: string,
  cardId: unknown,
  input: unknown,
  database: DatabaseClient,
) {
  await assertUserHasLanguage(userId, languageId, database);

  const parsedCardId = parseCardId(cardId);
  const parsedInput = cardEntryDraftCardUpdateSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new CardLibraryRequestError(
      400,
      parsedInput.error.issues[0]?.message ?? 'Active card update is invalid.',
    );
  }

  const resolvedGroups = await resolveGroupSelections(
    userId,
    languageId,
    parsedInput.data.groups,
    database,
  );

  const updatedCard = await updateActiveCard(
    userId,
    languageId,
    parsedCardId,
    {
      content: parsedInput.data.content,
      meaning: parsedInput.data.meaning,
      examples: parsedInput.data.examples,
      mnemonics: parsedInput.data.mnemonics,
      llmInstructions: parsedInput.data.llmInstructions,
      partOfSpeech: parsedInput.data.partOfSpeech,
    },
    database as never,
  );

  if (!updatedCard) {
    throw new CardLibraryRequestError(404, 'Active card not found.');
  }

  await syncActiveCardGroups(userId, languageId, parsedCardId, resolvedGroups, database);

  return loadActiveCardDetailData(userId, languageId, parsedCardId, database);
}

export async function bulkAssignCardLibraryCardsToGroupForLanguage(
  userId: string,
  languageId: string,
  cardIds: unknown,
  groupId: unknown,
  database: DatabaseClient,
) {
  await assertUserHasLanguage(userId, languageId, database);

  const parsedCardIds = parseCardIds(cardIds);
  const parsedGroupId = parseGroupId(groupId);
  const group = await getGroupWithActiveCardCount(userId, languageId, parsedGroupId, database as never);

  if (!group) {
    throw new CardLibraryRequestError(404, 'Group not found.');
  }

  return bulkAssignActiveCardsToGroup(
    userId,
    languageId,
    parsedCardIds,
    parsedGroupId,
    database as never,
  );
}

export async function deleteCardLibraryCardsForLanguage(
  userId: string,
  languageId: string,
  cardIds: unknown,
  database: DatabaseClient,
) {
  await assertUserHasLanguage(userId, languageId, database);

  return softDeleteActiveCards(
    userId,
    languageId,
    parseCardIds(cardIds),
    database as never,
  );
}

export async function createCardLibraryGroupForLanguage(
  userId: string,
  languageId: string,
  input: unknown,
  database: DatabaseClient,
) {
  await assertUserHasLanguage(userId, languageId, database);

  const parsedInput = cardLibraryGroupCreateSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new CardLibraryRequestError(
      400,
      parsedInput.error.issues[0]?.message ?? 'Group data is invalid.',
    );
  }

  await ensureUniqueGroupName(userId, languageId, parsedInput.data.groupName, database);

  const createdGroup = await createGroup(
    {
      userId,
      languageId,
      groupId: createGroupId(),
      groupName: parsedInput.data.groupName,
      description: parsedInput.data.description,
    },
    database as never,
  );

  return mapGroupListItem({
    ...createdGroup,
    activeCardCount: 0,
  });
}

export async function deleteCardLibraryGroupForLanguage(
  userId: string,
  languageId: string,
  groupId: unknown,
  database: DatabaseClient,
) {
  await assertUserHasLanguage(userId, languageId, database);

  const parsedGroupId = parseGroupId(groupId);
  const group = await getGroupWithActiveCardCount(userId, languageId, parsedGroupId, database as never);

  if (!group) {
    throw new CardLibraryRequestError(404, 'Group not found.');
  }

  const deleted = await deleteGroup(userId, languageId, parsedGroupId, database as never);

  if (!deleted) {
    throw new CardLibraryRequestError(404, 'Group not found.');
  }

  return {
    groupId: group.groupId,
    activeCardCount: group.activeCardCount,
  };
}

export async function updateGroupDetailForLanguage(
  userId: string,
  languageId: string,
  groupId: unknown,
  input: unknown,
  database: DatabaseClient,
  deps: {
    getActiveUserLanguages: typeof getActiveUserLanguages;
    getGroupWithActiveCardCount: typeof getGroupWithActiveCardCount;
    getGroups: typeof getGroups;
    updateGroup: typeof updateGroup;
    listTranslationDrillDrawPileGroups: typeof listTranslationDrillDrawPileGroups;
  } = {
    getActiveUserLanguages,
    getGroupWithActiveCardCount,
    getGroups,
    updateGroup,
    listTranslationDrillDrawPileGroups,
  },
) {
  await assertUserHasLanguage(userId, languageId, database, deps);

  const parsedGroupId = parseGroupId(groupId);
  const parsedInput = groupDetailGroupUpdateSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new CardLibraryRequestError(
      400,
      parsedInput.error.issues[0]?.message ?? 'Group data is invalid.',
    );
  }

  const existingGroup = await deps.getGroupWithActiveCardCount(userId, languageId, parsedGroupId, database as never);

  if (!existingGroup) {
    throw new CardLibraryRequestError(404, 'Group not found.');
  }

  await ensureUniqueGroupName(
    userId,
    languageId,
    parsedInput.data.groupName,
    database,
    {
      excludeGroupId: parsedGroupId,
      getGroups: deps.getGroups,
    },
  );

  const updatedGroup = await deps.updateGroup(
    userId,
    languageId,
    parsedGroupId,
    {
      groupName: parsedInput.data.groupName,
      description: parsedInput.data.description,
    },
    database as never,
  );

  if (!updatedGroup) {
    throw new CardLibraryRequestError(404, 'Group not found.');
  }

  const translationDrillConfig = createTranslationDrillGroupConfigLookup(
    await deps.listTranslationDrillDrawPileGroups(userId, languageId, database as never),
  ).get(parsedGroupId) ?? createDefaultTranslationDrillGroupConfig();

  return {
    groupId: updatedGroup.groupId,
    groupName: updatedGroup.groupName,
    description: updatedGroup.description ?? null,
    activeCardCount: existingGroup.activeCardCount,
    translationDrills: translationDrillConfig,
  };
}

export async function updateGroupTranslationDrillsForLanguage(
  userId: string,
  languageId: string,
  groupId: unknown,
  input: unknown,
  database: DatabaseClient,
  deps: {
    getActiveUserLanguages: typeof getActiveUserLanguages;
    upsertTranslationDrillDrawPile: typeof upsertTranslationDrillDrawPile;
  } = {
    getActiveUserLanguages,
    upsertTranslationDrillDrawPile,
  },
): Promise<TranslationDrillGroupConfigData> {
  await assertUserHasLanguage(userId, languageId, database, deps);

  const parsedGroupId = parseGroupId(groupId);
  const parsedInput = translationDrillGroupConfigUpdateSchema.safeParse(input);

  if (!parsedInput.success) {
    throw new CardLibraryRequestError(
      400,
      parsedInput.error.issues[0]?.message ?? 'Translation Drills settings are invalid.',
    );
  }

  try {
    const updatedConfig = await deps.upsertTranslationDrillDrawPile(
      userId,
      languageId,
      parsedGroupId,
      {
        enabled: parsedInput.data.enabled,
        drawPileName: parsedInput.data.drawPileName,
        pileSizeLimit: parsedInput.data.pileSizeLimit,
      },
      database as never,
    );

    return {
      enabled: updatedConfig.enabled,
      drawPileName: updatedConfig.drawPileName,
      pileSizeLimit: updatedConfig.pileSizeLimit,
    };
  } catch (error) {
    if (
      error instanceof Error
      && error.message === 'That group is not available for Translation Drills.'
    ) {
      throw new CardLibraryRequestError(404, error.message);
    }

    throw error;
  }
}

export async function addCardsToGroupDetailForLanguage(
  userId: string,
  languageId: string,
  groupId: unknown,
  cardIds: unknown,
  database: DatabaseClient,
) {
  await assertUserHasLanguage(userId, languageId, database);

  const parsedGroupId = parseGroupId(groupId);
  const parsedCardIds = parseCardIds(cardIds);
  const group = await getGroupWithActiveCardCount(userId, languageId, parsedGroupId, database as never);

  if (!group) {
    throw new CardLibraryRequestError(404, 'Group not found.');
  }

  return bulkAssignActiveCardsToGroup(
    userId,
    languageId,
    parsedCardIds,
    parsedGroupId,
    database as never,
  );
}

export async function removeCardsFromGroupDetailForLanguage(
  userId: string,
  languageId: string,
  groupId: unknown,
  cardIds: unknown,
  database: DatabaseClient,
) {
  await assertUserHasLanguage(userId, languageId, database);

  const parsedGroupId = parseGroupId(groupId);
  const parsedCardIds = parseCardIds(cardIds);
  const group = await getGroupWithActiveCardCount(userId, languageId, parsedGroupId, database as never);

  if (!group) {
    throw new CardLibraryRequestError(404, 'Group not found.');
  }

  const removableCards = await listActiveCardsInGroup(userId, languageId, parsedGroupId, {}, database as never);
  const removableCardIds = removableCards
    .map((card) => card.cardId)
    .filter((cardId) => parsedCardIds.includes(cardId));

  for (const cardId of removableCardIds) {
    await removeCardFromGroup(userId, languageId, cardId, parsedGroupId, database as never);
  }

  return removableCardIds;
}
