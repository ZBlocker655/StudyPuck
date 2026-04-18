import { z } from 'zod';

export const cardEntryDraftSuggestionSchema = z.object({
  content: z.string().trim().min(1).max(500),
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
      'If the note is ambiguous, produce the safest likely draft cards instead of refusing.',
    ].join(' '),
    userPrompt: [
      `Active language code: ${input.languageId}.`,
      'Return this JSON shape exactly:',
      '{"draftCards":[{"content":"string","meaning":"string|null","examples":["string"],"mnemonics":["string"],"llmInstructions":"string|null"}]}',
      'Source note:',
      input.noteContent,
    ].join('\n'),
  };
}
