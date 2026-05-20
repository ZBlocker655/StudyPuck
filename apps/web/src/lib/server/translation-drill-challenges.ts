import type { TranslationDrillContextCard } from '@studypuck/database';
import { createAiService } from '$lib/server/ai-service.js';
import {
  buildTranslationDrillChallengePrompt,
  translationDrillChallengePlanSchema,
  type TranslationDrillChallengePromptCard,
} from '$lib/server/ai-prompts/translation-drills.js';

type StructuredResponseGenerator = (request: {
  metadata: {
    feature: 'translation-drills';
    operation: 'plan-challenge';
    userId: string;
    languageId: string;
  };
  systemPrompt: string;
  userPrompt: string;
  responseSchema: typeof translationDrillChallengePlanSchema;
}) => Promise<{
  prompt: string;
  sourceCardIds: string[];
}>;

export type TranslationDrillChallengePlannerInput = {
  userId: string;
  languageId: string;
  targetLanguageName: string;
  cefrLevel: string | null;
  candidateCards: TranslationDrillContextCard[];
  previousSourceCardIds?: readonly string[];
  mustUseAllCandidateCards?: boolean;
};

export type TranslationDrillChallengePlan = {
  prompt: string;
  sourceCardIds: string[];
};

function isE2ETestModeEnabled() {
  if (typeof process === 'undefined') {
    return false;
  }

  return process.env?.E2E_TEST_MODE === 'enabled';
}

function toPromptCard(card: TranslationDrillContextCard): TranslationDrillChallengePromptCard {
  return {
    cardId: card.cardId,
    content: card.content,
    meaning: card.meaning,
    cardType: card.cardType,
    sourceGroupName: card.sourceGroup?.groupName ?? null,
    examples: card.examples.slice(0, 2),
    mnemonics: card.mnemonics.slice(0, 1),
    llmInstructions: card.llmInstructions,
    usageCount: card.usageCount,
    lastUsedAtIso: card.lastUsedAt?.toISOString() ?? null,
    cefrOverride: card.cefrOverride,
  };
}

function normalizeSourceCardIds(sourceCardIds: readonly string[]) {
  return [...new Set(sourceCardIds.map((cardId) => cardId.trim()).filter(Boolean))];
}

function validateChallengePlan(
  plan: TranslationDrillChallengePlan,
  input: TranslationDrillChallengePlannerInput,
): TranslationDrillChallengePlan {
  const candidateCardIds = new Set(input.candidateCards.map((card) => card.cardId));
  const normalizedSourceCardIds = normalizeSourceCardIds(plan.sourceCardIds);

  if (normalizedSourceCardIds.length === 0) {
    throw new Error('The challenge generator returned no source cards.');
  }

  if (normalizedSourceCardIds.some((cardId) => !candidateCardIds.has(cardId))) {
    throw new Error('The challenge generator returned cards outside the active Translation Drills context.');
  }

  if (input.mustUseAllCandidateCards) {
    const requiredCardIds = normalizeSourceCardIds(input.candidateCards.map((card) => card.cardId));

    if (
      normalizedSourceCardIds.length !== requiredCardIds.length
      || normalizedSourceCardIds.some((cardId, index) => cardId !== requiredCardIds[index])
    ) {
      throw new Error('The challenge generator did not keep the requested Translation Drills source cards.');
    }
  }

  return {
    prompt: plan.prompt.trim(),
    sourceCardIds: normalizedSourceCardIds,
  };
}

function buildE2EChallengePlan(input: TranslationDrillChallengePlannerInput): TranslationDrillChallengePlan {
  const previousSourceCardIds = new Set(normalizeSourceCardIds(input.previousSourceCardIds ?? []));
  const nextCandidates = input.mustUseAllCandidateCards
    ? input.candidateCards
    : input.candidateCards.filter((card) => !previousSourceCardIds.has(card.cardId));
  const selectedCards = (nextCandidates.length > 0 ? nextCandidates : input.candidateCards).slice(
    0,
    input.mustUseAllCandidateCards ? input.candidateCards.length : 1,
  );

  return {
    prompt: `Use ${selectedCards.map((card) => card.meaning?.trim() || card.content.trim()).join(' + ')} in a natural sentence.`,
    sourceCardIds: selectedCards.map((card) => card.cardId),
  };
}

export async function planTranslationDrillChallenge(
  input: TranslationDrillChallengePlannerInput & {
    privateEnv: Record<string, string | undefined>;
    generateStructured?: StructuredResponseGenerator;
  },
): Promise<TranslationDrillChallengePlan> {
  if (input.candidateCards.length === 0) {
    throw new Error('Draw or pin at least one active card before starting a challenge.');
  }

  if (isE2ETestModeEnabled()) {
    return validateChallengePlan(buildE2EChallengePlan(input), input);
  }

  const prompt = buildTranslationDrillChallengePrompt({
    targetLanguageName: input.targetLanguageName,
    cefrLevel: input.cefrLevel,
    candidateCards: input.candidateCards.map((card) => toPromptCard(card)),
    previousSourceCardIds: input.previousSourceCardIds,
    mustUseAllCandidateCards: input.mustUseAllCandidateCards,
  });
  const generateStructured = input.generateStructured ?? createAiService({
    privateEnv: input.privateEnv,
  }).generateStructured;
  const result = await generateStructured({
    metadata: {
      feature: 'translation-drills',
      operation: 'plan-challenge',
      userId: input.userId,
      languageId: input.languageId,
    },
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    responseSchema: translationDrillChallengePlanSchema,
  });

  return validateChallengePlan(result, input);
}
