import { describe, expect, it } from 'vitest';
import {
  buildCardEntryExampleSentenceFormatInstruction,
  readCardEntryExampleSentenceFormat,
  updateStudyLanguageCardEntryExampleSentenceFormat,
} from './example-sentence-format.js';

describe('readCardEntryExampleSentenceFormat', () => {
  it('falls back to the default format when no setting exists', () => {
    expect(readCardEntryExampleSentenceFormat(undefined)).toBe('sentence_translation');
  });

  it('reads the stored card entry format from language settings', () => {
    expect(
      readCardEntryExampleSentenceFormat({
        cardEntry: {
          exampleSentenceFormat: 'sentence_transliteration_translation',
        },
      })
    ).toBe('sentence_transliteration_translation');
  });
});

describe('updateStudyLanguageCardEntryExampleSentenceFormat', () => {
  it('preserves unrelated settings while updating the card entry format', () => {
    expect(
      updateStudyLanguageCardEntryExampleSentenceFormat(
        {
          cefrOverride: 'B1',
          cardEntry: {
            customFlag: true,
          },
        },
        'sentence_only'
      )
    ).toEqual({
      cefrOverride: 'B1',
      cardEntry: {
        customFlag: true,
        exampleSentenceFormat: 'sentence_only',
      },
    });
  });
});

describe('buildCardEntryExampleSentenceFormatInstruction', () => {
  it('uses Chinese-specific transliteration guidance for zh', () => {
    expect(
      buildCardEntryExampleSentenceFormatInstruction({
        exampleSentenceFormat: 'sentence_transliteration_translation',
        languageId: 'zh',
      })
    ).toContain('pinyin');
  });
});
