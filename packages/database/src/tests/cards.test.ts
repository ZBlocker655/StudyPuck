import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { setupTestDatabase, cleanupTestDatabase, resetTestTables, type TestDb } from '../test-utils.js';
import { cardGroups, cards, groups, studyLanguages, users } from '../schema.js';
import {
  bulkAssignActiveCardsToGroup,
  getActiveCardWithGroups,
  getGroupWithActiveCardCount,
  listActiveCards,
  listActiveCardsInGroup,
  listGroupsWithActiveCardCounts,
  softDeleteActiveCards,
  updateActiveCard,
} from '../cards.js';

const TEST_USER = { userId: 'auth0|cards-user', email: 'cards@example.com' };
const TEST_LANG = { userId: TEST_USER.userId, languageId: 'zh', languageName: 'Chinese' };

describe('Card Library database operations', () => {
  let db: TestDb;
  let sql: ReturnType<typeof postgres>;

  beforeAll(async () => {
    ({ db, sql } = await setupTestDatabase());
  });

  afterAll(async () => {
    if (sql) {
      await cleanupTestDatabase(sql);
    }
  });

  beforeEach(async () => {
    await resetTestTables(db);
    await db.insert(users).values(TEST_USER);
    await db.insert(studyLanguages).values(TEST_LANG);
  });

  async function seedLibrary() {
    await db.insert(groups).values([
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        groupId: 'group-greetings',
        groupName: 'Greetings',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        groupId: 'group-food',
        groupName: 'Food',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        groupId: 'group-chat',
        groupName: 'Chat',
      },
    ]);

    await db.insert(cards).values([
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-content',
        content: '谈论',
        status: 'active',
        cardType: 'word',
        meaning: 'to discuss',
        updatedAt: new Date('2026-04-01T00:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-meaning',
        content: '聊天',
        status: 'active',
        cardType: 'pattern',
        meaning: 'to chat casually',
        updatedAt: new Date('2026-04-02T00:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-examples',
        content: '吃饭',
        status: 'active',
        cardType: 'word',
        examples: ['我们一起吃饭。'],
        updatedAt: new Date('2026-04-03T00:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-mnemonics',
        content: '东西 vs 事情',
        status: 'active',
        cardType: 'complex_prompt',
        mnemonics: ['Food memory hook'],
        updatedAt: new Date('2026-04-04T00:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-wildcards',
        content: '100% 确定',
        status: 'active',
        cardType: 'pattern',
        meaning: 'contains_under_score',
        examples: ['Use \\ literally here.'],
        updatedAt: new Date('2026-04-04T12:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-draft',
        content: '草稿',
        status: 'draft',
        updatedAt: new Date('2026-04-05T00:00:00.000Z'),
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-deleted',
        content: '已删除',
        status: 'deleted',
        deletedAt: new Date('2026-04-06T00:00:00.000Z'),
        updatedAt: new Date('2026-04-06T00:00:00.000Z'),
      },
    ]);

    await db.insert(cardGroups).values([
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-content',
        groupId: 'group-greetings',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-meaning',
        groupId: 'group-chat',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-examples',
        groupId: 'group-food',
      },
      {
        userId: TEST_USER.userId,
        languageId: TEST_LANG.languageId,
        cardId: 'card-draft',
        groupId: 'group-greetings',
      },
    ]);
  }

  it('lists only active cards in last-modified-desc order and searches across all study fields', async () => {
    await seedLibrary();

    const allCards = await listActiveCards(TEST_USER.userId, TEST_LANG.languageId, {}, db);
    const meaningMatch = await listActiveCards(TEST_USER.userId, TEST_LANG.languageId, { search: 'casually' }, db);
    const exampleMatch = await listActiveCards(TEST_USER.userId, TEST_LANG.languageId, { search: '一起吃饭' }, db);
    const mnemonicMatch = await listActiveCards(TEST_USER.userId, TEST_LANG.languageId, { search: 'memory hook' }, db);

    expect(allCards.map((card) => card.cardId)).toEqual([
      'card-wildcards',
      'card-mnemonics',
      'card-examples',
      'card-meaning',
      'card-content',
    ]);
    expect(meaningMatch.map((card) => card.cardId)).toEqual(['card-meaning']);
    expect(exampleMatch.map((card) => card.cardId)).toEqual(['card-examples']);
    expect(mnemonicMatch.map((card) => card.cardId)).toEqual(['card-mnemonics']);
    expect(allCards.every((card) => card.cardId !== 'card-draft' && card.cardId !== 'card-deleted')).toBe(true);
  });

  it('treats SQL LIKE wildcard characters as literal search input', async () => {
    await seedLibrary();

    const percentMatch = await listActiveCards(TEST_USER.userId, TEST_LANG.languageId, { search: '%' }, db);
    const underscoreMatch = await listActiveCards(TEST_USER.userId, TEST_LANG.languageId, { search: '_' }, db);
    const slashMatch = await listActiveCards(TEST_USER.userId, TEST_LANG.languageId, { search: '\\' }, db);

    expect(percentMatch.map((card) => card.cardId)).toEqual(['card-wildcards']);
    expect(underscoreMatch.map((card) => card.cardId)).toEqual(['card-wildcards']);
    expect(slashMatch.map((card) => card.cardId)).toEqual(['card-wildcards']);
  });

  it('supports OR group filtering, card type filtering, and scoped group detail lists', async () => {
    await seedLibrary();

    const groupedCards = await listActiveCards(
      TEST_USER.userId,
      TEST_LANG.languageId,
      { groupIds: ['group-greetings', 'group-food'] },
      db,
    );
    const typedCards = await listActiveCards(
      TEST_USER.userId,
      TEST_LANG.languageId,
      { cardType: 'word' },
      db,
    );
    const foodCards = await listActiveCardsInGroup(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'group-food',
      { search: '吃饭' },
      db,
    );

    expect(groupedCards.map((card) => card.cardId)).toEqual(['card-examples', 'card-content']);
    expect(typedCards.map((card) => card.cardId)).toEqual(['card-examples', 'card-content']);
    expect(foodCards.map((card) => card.cardId)).toEqual(['card-examples']);
  });

  it('loads active card detail with groups and excludes non-active cards', async () => {
    await seedLibrary();

    const activeCard = await getActiveCardWithGroups(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'card-content',
      db,
    );
    const draftCard = await getActiveCardWithGroups(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'card-draft',
      db,
    );

    expect(activeCard?.cardId).toBe('card-content');
    expect(activeCard?.groups).toEqual([{ groupId: 'group-greetings', groupName: 'Greetings' }]);
    expect(draftCard).toBeNull();
  });

  it('reports group counts using only active cards', async () => {
    await seedLibrary();

    const groupSummaries = await listGroupsWithActiveCardCounts(TEST_USER.userId, TEST_LANG.languageId, db);
    const greetings = await getGroupWithActiveCardCount(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'group-greetings',
      db,
    );

    expect(groupSummaries.map((group) => [group.groupId, group.activeCardCount])).toEqual([
      ['group-chat', 1],
      ['group-food', 1],
      ['group-greetings', 1],
    ]);
    expect(greetings?.activeCardCount).toBe(1);
  });

  it('updates active cards, bulk-assigns memberships, and soft-deletes only active cards', async () => {
    await seedLibrary();

    const updated = await updateActiveCard(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'card-content',
      { meaning: 'to talk over' },
      db,
    );
    const assignedCardIds = await bulkAssignActiveCardsToGroup(
      TEST_USER.userId,
      TEST_LANG.languageId,
      ['card-content', 'card-deleted'],
      'group-food',
      db,
    );
    const deletedCardIds = await softDeleteActiveCards(
      TEST_USER.userId,
      TEST_LANG.languageId,
      ['card-content', 'card-meaning', 'card-deleted'],
      db,
    );

    const [storedContentCard] = await db
      .select()
      .from(cards)
      .where(eq(cards.cardId, 'card-content'));
    const foodCards = await listActiveCardsInGroup(
      TEST_USER.userId,
      TEST_LANG.languageId,
      'group-food',
      {},
      db,
    );

    expect(updated?.meaning).toBe('to talk over');
    expect(assignedCardIds).toEqual(['card-content']);
    expect(deletedCardIds).toEqual(['card-content', 'card-meaning']);
    expect(storedContentCard.status).toBe('deleted');
    expect(storedContentCard.deletedAt).not.toBeNull();
    expect(foodCards.map((card) => card.cardId)).toEqual(['card-examples']);
  });
});
