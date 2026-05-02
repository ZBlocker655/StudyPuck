import { z } from 'zod';

export const cardEntryExampleSentenceFormatSchema = z.enum([
  'sentence_only',
  'sentence_translation',
  'sentence_transliteration_translation',
]);

export type CardEntryExampleSentenceFormat = z.infer<typeof cardEntryExampleSentenceFormatSchema>;

type StudyLanguageCardEntrySettings = {
  exampleSentenceFormat?: CardEntryExampleSentenceFormat;
} & Record<string, unknown>;

export type StudyLanguageSettings = {
  cardEntry?: StudyLanguageCardEntrySettings;
} & Record<string, unknown>;

const studyLanguageCardEntrySettingsSchema = z
  .object({
    exampleSentenceFormat: cardEntryExampleSentenceFormatSchema.optional(),
  })
  .catchall(z.unknown());

const studyLanguageSettingsSchema = z
  .object({
    cardEntry: studyLanguageCardEntrySettingsSchema.optional(),
  })
  .catchall(z.unknown());

export const DEFAULT_CARD_ENTRY_EXAMPLE_SENTENCE_FORMAT: CardEntryExampleSentenceFormat = 'sentence_translation';

export const CARD_ENTRY_EXAMPLE_SENTENCE_FORMAT_OPTIONS = [
  {
    value: 'sentence_only',
    label: 'Sentence only',
    description: 'Use only the study-language sentence.',
  },
  {
    value: 'sentence_translation',
    label: 'Sentence + translation',
    description: 'Use "sentence | translation".',
  },
  {
    value: 'sentence_transliteration_translation',
    label: 'Sentence + transliteration + translation',
    description: 'Use "sentence | transliteration | translation".',
  },
] as const satisfies ReadonlyArray<{
  value: CardEntryExampleSentenceFormat;
  label: string;
  description: string;
}>;

export function getCardEntryExampleSentenceFormatLabel(
  exampleSentenceFormat: CardEntryExampleSentenceFormat
): string {
  return (
    CARD_ENTRY_EXAMPLE_SENTENCE_FORMAT_OPTIONS.find((option) => option.value === exampleSentenceFormat)?.label ??
    'Sentence + translation'
  );
}

function normalizeStudyLanguageSettings(settings: unknown): StudyLanguageSettings {
  const parsed = studyLanguageSettingsSchema.safeParse(settings);

  if (!parsed.success) {
    return {};
  }

  return parsed.data;
}

export function readCardEntryExampleSentenceFormat(settings: unknown): CardEntryExampleSentenceFormat {
  return normalizeStudyLanguageSettings(settings).cardEntry?.exampleSentenceFormat ?? DEFAULT_CARD_ENTRY_EXAMPLE_SENTENCE_FORMAT;
}

export function updateStudyLanguageCardEntryExampleSentenceFormat(
  settings: unknown,
  exampleSentenceFormat: CardEntryExampleSentenceFormat
): StudyLanguageSettings {
  const normalizedSettings = normalizeStudyLanguageSettings(settings);

  return {
    ...normalizedSettings,
    cardEntry: {
      ...normalizedSettings.cardEntry,
      exampleSentenceFormat,
    },
  };
}

export function buildCardEntryExampleSentenceFormatInstruction(input: {
  exampleSentenceFormat: CardEntryExampleSentenceFormat;
  languageId: string;
}): string {
  switch (input.exampleSentenceFormat) {
    case 'sentence_only':
      return 'Format every example as "<sentence>" only. Do not add transliteration or translation.';
    case 'sentence_transliteration_translation':
      if (input.languageId === 'zh') {
        return 'Format every example as "<sentence> | <transliteration> | <translation>". For Chinese, use Hanzi for <sentence>, pinyin for <transliteration>, and English for <translation>.';
      }

      return 'Format every example as "<sentence> | <transliteration> | <translation>" in that exact order.';
    case 'sentence_translation':
    default:
      return 'Format every example as "<sentence> | <translation>". Do not add transliteration.';
  }
}
