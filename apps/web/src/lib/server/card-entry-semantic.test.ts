import { describe, expect, it } from 'vitest';
import { rankGroupSuggestionsFromSimilarCards } from './card-entry-semantic.js';

describe('rankGroupSuggestionsFromSimilarCards', () => {
  it('ranks groups from the strongest matching active-card evidence and skips selected groups', () => {
    const similarCards = [
      { cardId: 'card-verb-1', similarity: 0.91 },
      { cardId: 'card-verb-2', similarity: 0.87 },
      { cardId: 'card-adjective-1', similarity: 0.73 },
    ];
    const groupsByCardId = new Map([
      [
        'card-verb-1',
        [
          { groupId: 'group-verbs', groupName: 'Common verbs' },
          { groupId: 'group-hsk', groupName: 'HSK 3' },
        ],
      ],
      [
        'card-verb-2',
        [
          { groupId: 'group-verbs', groupName: 'Common verbs' },
          { groupId: 'group-emotion', groupName: 'Emotion words' },
        ],
      ],
      [
        'card-adjective-1',
        [{ groupId: 'group-adjectives', groupName: 'Common adjectives' }],
      ],
    ]);

    const ranked = rankGroupSuggestionsFromSimilarCards(
      similarCards,
      groupsByCardId,
      new Set(['group-hsk']),
      5
    );

    expect(ranked).toEqual([
      {
        groupId: 'group-verbs',
        groupName: 'Common verbs',
        similarityScore: 0.91,
      },
      {
        groupId: 'group-emotion',
        groupName: 'Emotion words',
        similarityScore: 0.87,
      },
    ]);
  });
});
