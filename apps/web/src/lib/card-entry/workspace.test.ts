import { describe, expect, it } from 'vitest';
import { getUnresolvedDuplicateWarnings, replaceDraftCardInNote } from './workspace.js';
import type { CardEntryNoteShellData } from '$lib/server/card-entry.js';

function createNoteFixture(): CardEntryNoteShellData {
  return {
    noteId: 'note-1',
    content: 'Need a draft',
    state: 'unprocessed',
    aiState: 'complete',
    createdAtIso: '2026-04-18T00:00:00.000Z',
    createdAtLabel: 'Just now',
    sourceLabel: 'Manual',
    availableGroups: [
      { groupId: 'group-a', groupName: 'Grammar' },
      { groupId: 'group-b', groupName: 'Travel' },
    ],
    draftCards: [
      {
        cardId: 'card-1',
        content: 'se me ocurrió',
        meaning: null,
        examples: ['Se me ocurrió una idea.'],
        mnemonics: [],
        llmInstructions: null,
        linkedAtIso: null,
        groups: [{ groupId: 'group-a', groupName: 'Grammar' }],
        groupSuggestions: [],
        duplicateWarnings: [
          {
            warningId: 'warning-1',
            title: 'Possible duplicate',
            similarCardId: 'active-1',
            similarCardLabel: 'ocurrírsele a alguien',
            dismissed: false,
          },
        ],
      },
      {
        cardId: 'card-2',
        content: '',
        meaning: null,
        examples: [],
        mnemonics: [],
        llmInstructions: null,
        linkedAtIso: null,
        groups: [],
        groupSuggestions: [],
        duplicateWarnings: [
          {
            warningId: 'warning-2',
            title: 'Possible duplicate',
            similarCardId: 'active-2',
            similarCardLabel: 'tiempo transcurrido',
            dismissed: true,
          },
        ],
      },
    ],
  };
}

describe('replaceDraftCardInNote', () => {
  it('replaces the matching draft card and refreshes available groups', () => {
    const note = createNoteFixture();
    const updated = replaceDraftCardInNote(
      note,
      {
        ...note.draftCards[0],
        content: 'nuevo contenido',
      },
      [{ groupId: 'group-c', groupName: 'Idioms' }]
    );

    expect(updated.draftCards[0]?.content).toBe('nuevo contenido');
    expect(updated.draftCards[1]?.content).toBe(note.draftCards[1]?.content);
    expect(updated.availableGroups).toEqual([{ groupId: 'group-c', groupName: 'Idioms' }]);
  });
});

describe('getUnresolvedDuplicateWarnings', () => {
  it('flattens only unresolved warnings and falls back for blank card labels', () => {
    const note = createNoteFixture();
    const warnings = getUnresolvedDuplicateWarnings(note);

    expect(warnings).toEqual([
      {
        cardId: 'card-1',
        cardLabel: 'se me ocurrió',
        warningId: 'warning-1',
        title: 'Possible duplicate',
        similarCardLabel: 'ocurrírsele a alguien',
      },
    ]);
  });
});
