import { describe, expect, it, vi } from 'vitest';
import {
  CardLibraryRequestError,
  formatCardLibraryRelativeTime,
  loadCardLibraryData,
  loadCardLibraryGroupsData,
  loadGroupDetailData,
  loadActiveCardDetailData,
  updateGroupTranslationDrillsForLanguage,
} from './cards.js';

describe('Card Library server helpers', () => {
  const database = {} as never;

  const baseDeps = {
    getActiveUserLanguages: vi.fn(async () => [{
      userId: 'user-1',
      languageId: 'zh',
      languageName: 'Chinese',
      isActive: true,
      cefrLevel: null,
      settings: null,
      createdAt: null,
    }]),
    listActiveCards: vi.fn(async () => [
      {
        cardId: 'card-2',
        content: '聊天',
        meaning: 'to chat',
        cardType: 'pattern',
        updatedAt: new Date('2026-04-02T00:00:00.000Z'),
        groups: [{ groupId: 'group-chat', groupName: 'Chat' }],
      },
    ]),
    listGroupsWithActiveCardCounts: vi.fn(async () => [
      {
        userId: 'user-1',
        languageId: 'zh',
        groupId: 'group-chat',
        groupName: 'Chat',
        description: null,
        embedding: null,
        embeddingModel: null,
        embeddingGeneratedAt: null,
        createdAt: null,
        metadata: null,
        activeCardCount: 1,
      },
    ]),
    listTranslationDrillDrawPileGroups: vi.fn(async () => [
      {
        groupId: 'group-chat',
        groupName: 'Chat',
        drawPileName: 'Chat practice',
        pileSizeLimit: 6,
        remainingCardCount: 4,
        activeCards: [],
        snoozedCards: [],
      },
    ]),
    getGroupWithActiveCardCount: vi.fn(async () => ({
      userId: 'user-1',
      languageId: 'zh',
      groupId: 'group-chat',
      groupName: 'Chat',
      description: 'Conversation cards',
      embedding: null,
      embeddingModel: null,
      embeddingGeneratedAt: null,
      createdAt: null,
      metadata: null,
      activeCardCount: 1,
    })),
    listActiveCardsInGroup: vi.fn(async () => [
      {
        cardId: 'card-2',
        content: '聊天',
        meaning: 'to chat',
        cardType: 'pattern',
        updatedAt: new Date('2026-04-02T00:00:00.000Z'),
        groups: [{ groupId: 'group-chat', groupName: 'Chat' }],
      },
    ]),
    getActiveCardWithGroups: vi.fn(async () => ({
      userId: 'user-1',
      languageId: 'zh',
      cardId: 'card-2',
      content: '聊天',
      status: 'active',
      cardType: 'pattern',
      meaning: 'to chat',
      examples: ['我们聊天吧。'],
      mnemonics: ['chat hook'],
      llmInstructions: null,
      embedding: null,
      embeddingModel: null,
      embeddingGeneratedAt: null,
      createdAt: null,
      updatedAt: new Date('2026-04-02T00:00:00.000Z'),
      deletedAt: null,
      metadata: null,
      groups: [{ groupId: 'group-chat', groupName: 'Chat' }],
    })),
    getGroups: vi.fn(async () => [
      {
        userId: 'user-1',
        languageId: 'zh',
        groupId: 'group-chat',
        groupName: 'Chat',
        description: null,
        embedding: null,
        embeddingModel: null,
        embeddingGeneratedAt: null,
        createdAt: null,
        metadata: null,
      },
    ]),
  };

  it('loads Card Library data with the active query/filter state and filtered ids', async () => {
    const url = new URL('https://studypuck.test/zh/cards?q=chat&group=group-chat&type=pattern');

    const result = await loadCardLibraryData('user-1', 'zh', url, database, baseDeps);

    expect(result.filters).toEqual({
      searchText: 'chat',
      groupIds: ['group-chat'],
      cardType: 'pattern',
    });
    expect(result.filteredCardIds).toEqual(['card-2']);
    expect(baseDeps.listActiveCards).toHaveBeenCalledWith(
      'user-1',
      'zh',
      {
        search: 'chat',
        groupIds: ['group-chat'],
        cardType: 'pattern',
      },
      database,
    );
  });

  it('loads group detail data with scoped filters and group summary', async () => {
    const url = new URL('https://studypuck.test/zh/cards/groups/group-chat?q=chat&type=pattern');

    const result = await loadGroupDetailData('user-1', 'zh', 'group-chat', url, database, baseDeps);

    expect(result.group).toEqual({
      groupId: 'group-chat',
      groupName: 'Chat',
      description: 'Conversation cards',
      activeCardCount: 1,
      translationDrills: {
        enabled: true,
        drawPileName: 'Chat practice',
        pileSizeLimit: 6,
      },
    });
    expect(result.cards.filters).toEqual({
      searchText: 'chat',
      groupIds: [],
      cardType: 'pattern',
    });
    expect(baseDeps.listActiveCardsInGroup).toHaveBeenCalledWith(
      'user-1',
      'zh',
      'group-chat',
      {
        search: 'chat',
        cardType: 'pattern',
      },
      database,
    );
    expect(result.addableCards.items.map((item) => item.cardId)).toEqual([]);
  });

  it('loads active card detail with available groups', async () => {
    const result = await loadActiveCardDetailData('user-1', 'zh', 'card-2', database, baseDeps);

    expect(result.card.examples).toEqual(['我们聊天吧。']);
    expect(result.availableGroups).toEqual([{ groupId: 'group-chat', groupName: 'Chat' }]);
  });

  it('loads the groups list sorted alphabetically with active card counts', async () => {
    baseDeps.listGroupsWithActiveCardCounts.mockResolvedValueOnce([
      {
        userId: 'user-1',
        languageId: 'zh',
        groupId: 'group-z',
        groupName: 'Zeta',
        description: null,
        embedding: null,
        embeddingModel: null,
        embeddingGeneratedAt: null,
        createdAt: null,
        metadata: null,
        activeCardCount: 0,
      },
      {
        userId: 'user-1',
        languageId: 'zh',
        groupId: 'group-a',
        groupName: 'Alpha',
        description: null,
        embedding: null,
        embeddingModel: null,
        embeddingGeneratedAt: null,
        createdAt: null,
        metadata: null,
        activeCardCount: 2,
      },
    ]);

    const result = await loadCardLibraryGroupsData('user-1', 'zh', database, baseDeps);

    expect(result.items.map((group) => group.groupName)).toEqual(['Alpha', 'Zeta']);
    expect(result.items[0]?.translationDrills).toEqual({
      enabled: false,
      drawPileName: null,
      pileSizeLimit: 10,
    });
    expect(result.items[1]?.translationDrills).toEqual({
      enabled: false,
      drawPileName: null,
      pileSizeLimit: 10,
    });
    expect(result.totalCount).toBe(2);
  });

  it('updates Translation Drills settings for a group', async () => {
    const result = await updateGroupTranslationDrillsForLanguage(
      'user-1',
      'zh',
      'group-chat',
      {
        enabled: true,
        drawPileName: 'Focused chat',
        pileSizeLimit: 8,
      },
      database,
      {
        getActiveUserLanguages: baseDeps.getActiveUserLanguages,
        upsertTranslationDrillDrawPile: vi.fn(async () => ({
          groupId: 'group-chat',
          groupName: 'Chat',
          enabled: true,
          drawPileName: 'Focused chat',
          pileSizeLimit: 8,
        })),
      },
    );

    expect(result).toEqual({
      enabled: true,
      drawPileName: 'Focused chat',
      pileSizeLimit: 8,
    });
  });

  it('excludes current group members from addable cards in group detail', async () => {
    baseDeps.listActiveCards.mockResolvedValueOnce([
      {
        cardId: 'card-2',
        content: '聊天',
        meaning: 'to chat',
        cardType: 'pattern',
        updatedAt: new Date('2026-04-02T00:00:00.000Z'),
        groups: [{ groupId: 'group-chat', groupName: 'Chat' }],
      },
      {
        cardId: 'card-3',
        content: '你好',
        meaning: 'hello',
        cardType: 'word',
        updatedAt: new Date('2026-04-03T00:00:00.000Z'),
        groups: [],
      },
    ]);

    const url = new URL('https://studypuck.test/zh/cards/groups/group-chat');
    const result = await loadGroupDetailData('user-1', 'zh', 'group-chat', url, database, baseDeps);

    expect(result.addableCards.items.map((item) => item.cardId)).toEqual(['card-3']);
    expect(result.addableCards.totalCount).toBe(1);
  });

  it('rejects invalid filter input before hitting the data layer', async () => {
    const url = new URL('https://studypuck.test/zh/cards?type=invalid');

    await expect(loadCardLibraryData('user-1', 'zh', url, database, baseDeps)).rejects.toMatchObject({
      status: 400,
    } satisfies Partial<CardLibraryRequestError>);
  });

  it('formats relative card timestamps using compact labels', () => {
    expect(formatCardLibraryRelativeTime(new Date('2026-04-10T12:00:00Z'), new Date('2026-04-12T12:00:00Z'))).toBe('2d');
  });
});
