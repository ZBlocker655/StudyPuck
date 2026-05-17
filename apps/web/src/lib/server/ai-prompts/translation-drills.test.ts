import { describe, expect, it } from 'vitest';
import { buildTranslationDrillChallengePrompt } from './translation-drills.js';

describe('buildTranslationDrillChallengePrompt', () => {
  it('allows slightly silly but semantically sound challenge meanings', () => {
    const prompt = buildTranslationDrillChallengePrompt({
      targetLanguageName: 'Chinese',
      cefrLevel: 'B1',
      candidateCards: [{
        cardId: 'card-1',
        content: '当然',
        meaning: 'of course',
        cardType: 'word',
        sourceGroupName: 'Core',
        examples: ['当然可以。'],
        mnemonics: [],
        llmInstructions: null,
        usageCount: 0,
        lastUsedAtIso: null,
        cefrOverride: null,
      }],
    });

    expect(prompt.userPrompt).toContain('Slightly absurd, playful, or silly meanings are acceptable');
    expect(prompt.userPrompt).toContain('Phrase and idiom cards should be placed in coherent situations');
  });
});
