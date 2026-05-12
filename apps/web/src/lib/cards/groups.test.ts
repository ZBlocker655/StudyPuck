import { describe, expect, it } from 'vitest';
import { buildDeleteGroupMessage, sortCardLibraryGroupItems } from './groups.js';

describe('sortCardLibraryGroupItems', () => {
  it('sorts groups alphabetically by name', () => {
    expect(
      sortCardLibraryGroupItems([
        { groupId: 'g2', groupName: 'Travel', description: null, activeCardCount: 1, translationDrills: { enabled: false, drawPileName: null, pileSizeLimit: 10 } },
        { groupId: 'g1', groupName: 'Daily', description: null, activeCardCount: 0, translationDrills: { enabled: true, drawPileName: 'Daily drills', pileSizeLimit: 4 } },
      ]),
    ).toEqual([
      { groupId: 'g1', groupName: 'Daily', description: null, activeCardCount: 0, translationDrills: { enabled: true, drawPileName: 'Daily drills', pileSizeLimit: 4 } },
      { groupId: 'g2', groupName: 'Travel', description: null, activeCardCount: 1, translationDrills: { enabled: false, drawPileName: null, pileSizeLimit: 10 } },
    ]);
  });
});

describe('buildDeleteGroupMessage', () => {
  it('uses concise copy for empty groups and dissociation copy for non-empty groups', () => {
    expect(
      buildDeleteGroupMessage({ groupId: 'g1', groupName: 'Greetings', description: null, activeCardCount: 0, translationDrills: { enabled: false, drawPileName: null, pileSizeLimit: 10 } }),
    ).toBe('Are you sure? This cannot be undone.');
    expect(
      buildDeleteGroupMessage({ groupId: 'g2', groupName: 'Daily', description: null, activeCardCount: 2, translationDrills: { enabled: false, drawPileName: null, pileSizeLimit: 10 } }),
    ).toContain('This group has 2 cards.');
  });
});
