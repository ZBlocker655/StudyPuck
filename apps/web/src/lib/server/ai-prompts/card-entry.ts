import { z } from 'zod';
import {
  buildCardEntryExampleSentenceFormatInstruction,
  getCardEntryExampleSentenceFormatLabel,
  type CardEntryExampleSentenceFormat,
} from '$lib/card-entry/example-sentence-format.js';

export const cardEntryCardTypeSchema = z.enum(['word', 'pattern', 'complex_prompt']).default('word');

export const partOfSpeechSchema = z.enum([
  'noun', 'verb', 'adjective', 'adverb', 'pronoun', 'preposition',
  'conjunction', 'particle', 'measure_word', 'numeral', 'interjection', 'idiom',
]).nullable().optional().default(null);

export const cardEntryDraftSuggestionSchema = z.object({
  content: z.string().trim().min(1).max(500),
  cardType: cardEntryCardTypeSchema,
  partOfSpeech: partOfSpeechSchema,
  meaning: z.string().trim().max(500).nullable().optional().default(null),
  examples: z.array(z.string().trim().min(1).max(500)).max(5).optional().default([]),
  mnemonics: z.array(z.string().trim().min(1).max(500)).max(5).optional().default([]),
  llmInstructions: z.string().trim().max(1_000).nullable().optional().default(null),
});

export const cardEntryPreprocessResponseSchema = z.object({
  draftCards: z.array(cardEntryDraftSuggestionSchema).min(1).max(5),
});

export type CardEntryPreprocessResponse = z.infer<typeof cardEntryPreprocessResponseSchema>;

export function buildCardEntryPreprocessPrompt(input: {
  languageId: string;
  noteContent: string;
  exampleSentenceFormat: CardEntryExampleSentenceFormat;
}): {
  systemPrompt: string;
  userPrompt: string;
} {
  return {
    systemPrompt: [
      'You are generating draft language-learning cards for StudyPuck Card Entry.',
      'Return only JSON.',
      'Create 1 to 5 draft cards from the note.',
      'Preserve the user note intent instead of inventing unrelated material.',
      'Keep examples and mnemonics concise and useful for study.',
      'Use the configured example sentence format consistently across every example string and do not mix formats within one response.',
      'If the note is ambiguous, produce the safest likely draft cards instead of refusing.',
      'For word-type cards, set partOfSpeech to the most likely part of speech: one of noun, verb, adjective, adverb, pronoun, preposition, conjunction, particle, measure_word, numeral, interjection, idiom. Set to null for non-word card types.',
      'Set cardType based on the content: use "word" for a single vocabulary word or very short vocabulary item (e.g. 经历, repasar, bonjour);',
      'use "pattern" for a phrase, expression, grammar pattern, or multi-word construction (e.g. 这还有什么说的, sin embargo, au fur et à mesure);',
      'use "complex_prompt" for a comparative, analytical, or multi-concept prompt (e.g. 东西 vs 事情, ser vs estar).',
      'When in doubt between "word" and "pattern", prefer "pattern" for content containing more than one meaningful token or a full expression.',
    ].join(' '),
    userPrompt: [
      `Active language code: ${input.languageId}.`,
      `Example sentence format: ${getCardEntryExampleSentenceFormatLabel(input.exampleSentenceFormat)}.`,
      buildCardEntryExampleSentenceFormatInstruction(input),
      'Return this JSON shape exactly:',
      '{"draftCards":[{"content":"string","cardType":"word|pattern|complex_prompt","partOfSpeech":"noun|verb|adjective|adverb|pronoun|preposition|conjunction|particle|measure_word|numeral|interjection|idiom|null","meaning":"string|null","examples":["string"],"mnemonics":["string"],"llmInstructions":"string|null"}]}',
      'Source note:',
      input.noteContent,
    ].join('\n'),
  };
}
