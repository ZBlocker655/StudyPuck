import { describe, expect, it } from 'vitest';
import {
  addEditableGroup,
  addEditableListValue,
  appendEditableListValue,
  buildEditableCardPayload,
  canCreateEditorGroup,
  filterAvailableEditorGroups,
  removeEditableGroup,
  removeEditableListValue,
  updateEditableListValue,
} from './shared.js';

const baseCard = {
  content: '火车',
  meaning: 'train',
  examples: ['  例子  '],
  mnemonics: [],
  llmInstructions: null,
  groups: [{ groupId: 'group-2', groupName: 'Travel' }],
};

describe('card editor shared helpers', () => {
  it('builds normalized payloads for editable cards', () => {
    expect(
      buildEditableCardPayload({
        ...baseCard,
        groups: [
          { groupId: 'group-2', groupName: 'Travel' },
          { groupId: '', groupName: 'New Group' },
        ],
      }),
    ).toEqual({
      content: '火车',
      meaning: 'train',
      examples: ['例子'],
      mnemonics: [],
      llmInstructions: '',
      partOfSpeech: null,
      groups: [
        { groupId: 'group-2', groupName: 'Travel' },
        { groupId: null, groupName: 'New Group' },
      ],
    });
  });

  it('updates, appends, and removes list values immutably', () => {
    const withEmptyExample = addEditableListValue(baseCard, 'examples');
    expect(withEmptyExample.examples).toEqual(['  例子  ', '']);

    const updatedExample = updateEditableListValue(withEmptyExample, 'examples', 1, '新例句');
    expect(updatedExample.examples).toEqual(['  例子  ', '新例句']);

    const appendedMnemonic = appendEditableListValue(updatedExample, 'mnemonics', '  Hook  ');
    expect(appendedMnemonic.mnemonics).toEqual(['Hook']);

    const unchangedMnemonic = appendEditableListValue(appendedMnemonic, 'mnemonics', '   ');
    expect(unchangedMnemonic).toBe(appendedMnemonic);

    const removedExample = removeEditableListValue(updatedExample, 'examples', 0);
    expect(removedExample.examples).toEqual(['新例句']);
  });

  it('adds and removes groups while keeping alphabetical order', () => {
    const withGroup = addEditableGroup(baseCard, { groupId: 'group-1', groupName: 'Basics' });
    expect(withGroup.groups).toEqual([
      { groupId: 'group-1', groupName: 'Basics' },
      { groupId: 'group-2', groupName: 'Travel' },
    ]);

    const withoutGroup = removeEditableGroup(withGroup, 'group-2');
    expect(withoutGroup.groups).toEqual([{ groupId: 'group-1', groupName: 'Basics' }]);
  });

  it('filters existing groups and reports whether a typed group can be created', () => {
    const availableGroups = [
      { groupId: 'group-1', groupName: 'Basics' },
      { groupId: 'group-2', groupName: 'Travel' },
      { groupId: 'group-3', groupName: 'Favorites' },
    ];

    expect(filterAvailableEditorGroups(availableGroups, baseCard.groups, 'fav')).toEqual([
      { groupId: 'group-3', groupName: 'Favorites' },
    ]);
    expect(canCreateEditorGroup(availableGroups, 'travel')).toBe(false);
    expect(canCreateEditorGroup(availableGroups, '  New Group  ')).toBe(true);
  });
});
