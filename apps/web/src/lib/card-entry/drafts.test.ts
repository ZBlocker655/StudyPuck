import { describe, expect, it } from 'vitest';
import { filterDraftCards, formatDraftGroupFilterLabel } from './drafts.js';
import type { CardEntryDraftListItemData } from '$lib/server/card-entry.js';

const items: CardEntryDraftListItemData[] = [
  {
    cardId: 'card-1',
    content: 'Relative time expression',
    meaning: 'after a while',
    updatedAtIso: '2026-04-18T00:00:00.000Z',
    updatedAtLabel: '2h ago',
    groups: [{ groupId: 'group-grammar', groupName: 'Grammar' }],
    sourceNotes: [
      {
        noteId: 'note-1',
        content: 'Saw a great example sentence in the textbook',
        state: 'unprocessed',
        createdAtIso: '2026-04-18T00:00:00.000Z',
        linkedAtIso: '2026-04-18T00:00:00.000Z',
      },
    ],
  },
  {
    cardId: 'card-2',
    content: 'Particle distinction',
    meaning: 'contrast marker',
    updatedAtIso: '2026-04-17T00:00:00.000Z',
    updatedAtLabel: '1d ago',
    groups: [{ groupId: 'group-particles', groupName: 'Particles' }],
    sourceNotes: [
      {
        noteId: 'note-2',
        content: 'Need to review particles',
        state: 'unprocessed',
        createdAtIso: '2026-04-17T00:00:00.000Z',
        linkedAtIso: '2026-04-17T00:00:00.000Z',
      },
    ],
  },
];

describe('filterDraftCards', () => {
  it('matches search against content, meaning, and source note content', () => {
    expect(filterDraftCards(items, 'textbook', [])).toEqual([items[0]]);
    expect(filterDraftCards(items, 'contrast', [])).toEqual([items[1]]);
  });

  it('applies OR logic across selected group filters', () => {
    expect(filterDraftCards(items, '', ['group-grammar'])).toEqual([items[0]]);
    expect(filterDraftCards(items, '', ['group-grammar', 'group-particles'])).toEqual(items);
  });
});

describe('formatDraftGroupFilterLabel', () => {
  it('formats the group filter label for default, single, and multi-select states', () => {
    expect(formatDraftGroupFilterLabel([])).toBe('All groups');
    expect(formatDraftGroupFilterLabel(['Grammar'])).toBe('Group: Grammar');
    expect(formatDraftGroupFilterLabel(['Grammar', 'Particles'])).toBe('Groups: 2');
  });
});
