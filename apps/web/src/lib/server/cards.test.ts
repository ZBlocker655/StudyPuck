import { describe, expect, it, vi } from 'vitest';
import {
  CardLibraryRequestError,
  formatCardLibraryRelativeTime,
  loadCardLibraryData,
  loadGroupDetailData,
  loadActiveCardDetailData,
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
  });

  it('loads active card detail with available groups', async () => {
    const result = await loadActiveCardDetailData('user-1', 'zh', 'card-2', database, baseDeps);

    expect(result.card.examples).toEqual(['我们聊天吧。']);
    expect(result.availableGroups).toEqual([{ groupId: 'group-chat', groupName: 'Chat' }]);
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
