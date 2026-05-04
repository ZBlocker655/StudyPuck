import { describe, expect, it } from 'vitest';
import {
  cardLibraryTypeOptions,
  formatCardLibraryGroupFilterLabel,
  formatCardLibraryTypeFilterLabel,
  getVisibleCardGroups,
  sortCardLibraryGroups,
} from './library.js';

describe('formatCardLibraryGroupFilterLabel', () => {
  it('formats default, single-select, and multi-select group labels', () => {
    expect(formatCardLibraryGroupFilterLabel([])).toBe('All groups');
    expect(formatCardLibraryGroupFilterLabel(['Greetings'])).toBe('Group: Greetings');
    expect(formatCardLibraryGroupFilterLabel(['Greetings', 'Daily'])).toBe('Groups: 2');
  });
});

describe('formatCardLibraryTypeFilterLabel', () => {
  it('formats default and selected card-type labels', () => {
    expect(formatCardLibraryTypeFilterLabel(null)).toBe('All types');
    expect(formatCardLibraryTypeFilterLabel('pattern')).toBe('Type: Pattern');
  });
});

describe('getVisibleCardGroups', () => {
  it('limits visible groups and reports overflow count', () => {
    expect(
      getVisibleCardGroups(
        [
          { groupId: 'g1', groupName: 'Greetings' },
          { groupId: 'g2', groupName: 'Daily' },
          { groupId: 'g3', groupName: 'Food' },
        ],
        2,
      ),
    ).toEqual({
      visibleGroups: [
        { groupId: 'g1', groupName: 'Greetings' },
        { groupId: 'g2', groupName: 'Daily' },
      ],
      overflowCount: 1,
    });
  });
});

describe('sortCardLibraryGroups', () => {
  it('sorts group options alphabetically by group name', () => {
    expect(
      sortCardLibraryGroups([
        { groupId: 'g2', groupName: 'Travel' },
        { groupId: 'g1', groupName: 'Daily' },
      ]),
    ).toEqual([
      { groupId: 'g1', groupName: 'Daily' },
      { groupId: 'g2', groupName: 'Travel' },
    ]);
  });
});

describe('cardLibraryTypeOptions', () => {
  it('exposes the supported card types for the filter UI', () => {
    expect(cardLibraryTypeOptions.map((option) => option.value)).toEqual(['word', 'pattern', 'complex_prompt']);
  });
});
