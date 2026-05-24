import type { TranslationDrillContextCard } from '@studypuck/database';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { planTranslationDrillChallenge } from './translation-drill-challenges.js';

function createCandidateCard(overrides: Partial<TranslationDrillContextCard> = {}): TranslationDrillContextCard {
  return {
    cardId: 'card-1',
    content: '经历',
    meaning: 'experience',
    cardType: 'word',
    partOfSpeech: null,
    sourceGroup: { groupId: 'group-core', groupName: 'Core Words' },
    examples: [],
    mnemonics: [],
    llmInstructions: null,
    usageCount: 0,
    lastUsedAt: null,
    cefrOverride: null,
    addedFrom: 'draw_pile:group-core',
    addedAt: new Date('2026-05-16T12:00:00.000Z'),
    state: 'active',
    stateUntil: null,
    nextDueAt: null,
    intervalDays: null,
    performanceScore: null,
    metadata: null,
    updatedAt: new Date('2026-05-16T12:00:00.000Z'),
    ...overrides,
  };
}

describe('planTranslationDrillChallenge', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('uses a deterministic local planner in e2e mode', async () => {
    vi.stubEnv('E2E_TEST_MODE', 'enabled');
    const generateStructured = vi.fn();

    const plan = await planTranslationDrillChallenge({
      userId: 'auth0|translation-drills',
      languageId: 'zh',
      targetLanguageName: 'Chinese (Mandarin)',
      cefrLevel: 'B1',
      candidateCards: [
        createCandidateCard(),
        createCandidateCard({
          cardId: 'card-2',
          content: '谈论',
          meaning: 'discuss',
        }),
      ],
      privateEnv: {},
      generateStructured,
    });

    expect(plan).toEqual({
      prompt: 'Use experience in a natural sentence.',
      sourceCardIds: ['card-1'],
    });
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('rotates away from the previous source card in e2e mode when another candidate exists', async () => {
    vi.stubEnv('E2E_TEST_MODE', 'enabled');

    const plan = await planTranslationDrillChallenge({
      userId: 'auth0|translation-drills',
      languageId: 'zh',
      targetLanguageName: 'Chinese (Mandarin)',
      cefrLevel: 'B1',
      candidateCards: [
        createCandidateCard(),
        createCandidateCard({
          cardId: 'card-2',
          content: '谈论',
          meaning: 'discuss',
        }),
      ],
      previousSourceCardIds: ['card-1'],
      privateEnv: {},
    });

    expect(plan).toEqual({
      prompt: 'Use discuss in a natural sentence.',
      sourceCardIds: ['card-2'],
    });
  });
});
