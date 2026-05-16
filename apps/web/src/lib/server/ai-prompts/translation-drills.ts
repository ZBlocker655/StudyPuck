import { z } from 'zod';

export const translationDrillChallengePlanSchema = z.object({
  prompt: z.string().trim().min(8).max(220),
  sourceCardIds: z.array(z.string().trim().min(1).max(128)).min(1).max(2),
});

export type TranslationDrillChallengePromptCard = {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  sourceGroupName: string | null;
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
  usageCount: number;
  lastUsedAtIso: string | null;
  cefrOverride: string | null;
};

export function buildTranslationDrillChallengePrompt(input: {
  targetLanguageName: string;
  cefrLevel: string | null;
  candidateCards: TranslationDrillChallengePromptCard[];
  previousSourceCardIds?: readonly string[];
  mustUseAllCandidateCards?: boolean;
}) {
  const selectionGuidance = input.mustUseAllCandidateCards
    ? [
        'Use every candidate card below as a challenge focus.',
        'Return all of their cardIds in sourceCardIds, preserving only the cards that were explicitly provided.',
      ]
    : [
        'Choose the best 1 or 2 candidate cards for a single coherent challenge.',
        'Prefer one focus card unless a second card makes the challenge more natural.',
        'Avoid returning the exact previous card combination when another equally good challenge is available.',
      ];

  return {
    systemPrompt: [
      'You design Translation Drills challenges for StudyPuck.',
      'Return only JSON.',
      'Write one natural English sentence or short utterance for the learner to translate into the target language.',
      'Do not mention StudyPuck, cards, drills, or source-card metadata in the prompt.',
    ].join(' '),
    userPrompt: [
      `Target language: ${input.targetLanguageName}`,
      `Learner CEFR level: ${input.cefrLevel ?? 'unknown'}`,
      'Challenge quality rubric:',
      '- The prompt must sound like something a real person might say or write.',
      '- The prompt must create a clear reason to use the chosen target-language card or cards.',
      '- Phrase and idiom cards should be placed in coherent situations, not dictionary-style gloss templates.',
      '- Slightly absurd, playful, or silly meanings are acceptable when the sentence remains grammatically correct and semantically sound.',
      '- Use card examples and llmInstructions as guidance for natural usage, register, and grammar pressure.',
      '- Do not copy target-language text into the English prompt.',
      '- Avoid awkward English that mechanically mirrors the source-card meaning.',
      '- Keep the challenge focused enough that the learner can reasonably answer with one sentence.',
      ...selectionGuidance,
      `Previous sourceCardIds: ${JSON.stringify(input.previousSourceCardIds ?? [])}`,
      'Candidate cards:',
      JSON.stringify(input.candidateCards, null, 2),
      'Return this JSON shape exactly:',
      '{"prompt":"string","sourceCardIds":["card-id-1"]}',
    ].join('\n'),
  };
}
