import { describe, expect, it } from 'vitest';
import {
  buildGroupDetailMobileMeta,
  filterAddableGroupCards,
  matchesGroupDetailFilters,
  withCurrentGroupMembership,
} from './group-detail.js';

describe('buildGroupDetailMobileMeta', () => {
  it('combines meaning and updated label for mobile rows', () => {
    expect(
      buildGroupDetailMobileMeta({
        cardId: 'card-1',
        content: '你好',
        meaning: 'hello',
        cardType: 'word',
        updatedAtIso: '2026-04-01T00:00:00.000Z',
        updatedAtLabel: '2d',
        groups: [],
      }),
    ).toBe('hello · 2d');
  });
});

describe('filterAddableGroupCards', () => {
  const items = [
    {
      cardId: 'card-1',
      content: '你好',
      meaning: 'hello',
      cardType: 'word',
      updatedAtIso: '2026-04-01T00:00:00.000Z',
      updatedAtLabel: '2d',
      groups: [],
    },
    {
      cardId: 'card-2',
      content: '谢谢',
      meaning: 'thank you',
      cardType: 'word',
      updatedAtIso: '2026-04-02T00:00:00.000Z',
      updatedAtLabel: '1d',
      groups: [],
    },
  ];

  it('filters by content or meaning', () => {
    expect(filterAddableGroupCards(items, 'thank').map((item) => item.cardId)).toEqual(['card-2']);
    expect(filterAddableGroupCards(items, '你好').map((item) => item.cardId)).toEqual(['card-1']);
  });
});

describe('matchesGroupDetailFilters', () => {
  const item = {
    cardId: 'card-1',
    content: '你好',
    meaning: 'hello',
    cardType: 'word',
    updatedAtIso: '2026-04-01T00:00:00.000Z',
    updatedAtLabel: '2d',
    groups: [],
  };

  it('checks type and search state', () => {
    expect(matchesGroupDetailFilters(item, '', null)).toBe(true);
    expect(matchesGroupDetailFilters(item, 'hell', 'word')).toBe(true);
    expect(matchesGroupDetailFilters(item, 'bye', 'word')).toBe(false);
    expect(matchesGroupDetailFilters(item, '', 'pattern')).toBe(false);
  });
});

describe('withCurrentGroupMembership', () => {
  it('adds the current group exactly once and sorts the result', () => {
    expect(
      withCurrentGroupMembership(
        [{ groupId: 'group-b', groupName: 'Beta' }],
        { groupId: 'group-a', groupName: 'Alpha' },
      ),
    ).toEqual([
      { groupId: 'group-a', groupName: 'Alpha' },
      { groupId: 'group-b', groupName: 'Beta' },
    ]);
  });
});
