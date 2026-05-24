import { describe, expect, it } from 'vitest';
import { cardEntryDraftSuggestionSchema, buildCardEntryPreprocessPrompt } from './card-entry.js';

describe('cardEntryDraftSuggestionSchema', () => {
  it('accepts "word" as cardType', () => {
    const result = cardEntryDraftSuggestionSchema.parse({ content: '经历', cardType: 'word' });
    expect(result.cardType).toBe('word');
  });

  it('accepts "pattern" as cardType', () => {
    const result = cardEntryDraftSuggestionSchema.parse({ content: '这还有什么说的', cardType: 'pattern' });
    expect(result.cardType).toBe('pattern');
  });

  it('accepts "complex_prompt" as cardType', () => {
    const result = cardEntryDraftSuggestionSchema.parse({ content: '东西 vs 事情', cardType: 'complex_prompt' });
    expect(result.cardType).toBe('complex_prompt');
  });

  it('defaults cardType to "word" when omitted', () => {
    const result = cardEntryDraftSuggestionSchema.parse({ content: '经历' });
    expect(result.cardType).toBe('word');
  });

  it('rejects invalid cardType values', () => {
    expect(() => cardEntryDraftSuggestionSchema.parse({ content: '经历', cardType: 'sentence' })).toThrow();
  });

  it('accepts a valid partOfSpeech value', () => {
    const result = cardEntryDraftSuggestionSchema.parse({ content: '经历', cardType: 'word', partOfSpeech: 'verb' });
    expect(result.partOfSpeech).toBe('verb');
  });

  it('defaults partOfSpeech to null when omitted', () => {
    const result = cardEntryDraftSuggestionSchema.parse({ content: '经历', cardType: 'word' });
    expect(result.partOfSpeech).toBeNull();
  });

  it('accepts null partOfSpeech explicitly', () => {
    const result = cardEntryDraftSuggestionSchema.parse({ content: '经历', cardType: 'word', partOfSpeech: null });
    expect(result.partOfSpeech).toBeNull();
  });

  it('rejects invalid partOfSpeech values', () => {
    expect(() => cardEntryDraftSuggestionSchema.parse({ content: '经历', cardType: 'word', partOfSpeech: 'gerund' })).toThrow();
  });
});

describe('buildCardEntryPreprocessPrompt', () => {
  it('includes cardType in the JSON shape example', () => {
    const { userPrompt } = buildCardEntryPreprocessPrompt({
      languageId: 'zh',
      noteContent: 'test',
      exampleSentenceFormat: 'sentence_translation',
    });
    expect(userPrompt).toContain('cardType');
  });

  it('includes card type classification guidance in the system prompt', () => {
    const { systemPrompt } = buildCardEntryPreprocessPrompt({
      languageId: 'zh',
      noteContent: 'test',
      exampleSentenceFormat: 'sentence_translation',
    });
    expect(systemPrompt).toContain('"word"');
    expect(systemPrompt).toContain('"pattern"');
    expect(systemPrompt).toContain('"complex_prompt"');
  });

  it('provides multi-word / phrase guidance that covers CJK expressions', () => {
    const { systemPrompt } = buildCardEntryPreprocessPrompt({
      languageId: 'zh',
      noteContent: 'test',
      exampleSentenceFormat: 'sentence_translation',
    });
    // The prompt should explicitly mention phrase/expression/multi-word criteria so
    // the LLM does not classify Chinese phrases like 这还有什么说的 as "word".
    expect(systemPrompt).toMatch(/phrase|expression|multi-word/i);
  });

  it('embeds the active language code in the user prompt', () => {
    const { userPrompt } = buildCardEntryPreprocessPrompt({
      languageId: 'es',
      noteContent: 'repasar',
      exampleSentenceFormat: 'sentence_translation',
    });
    expect(userPrompt).toContain('es');
  });

  it('includes deterministic translation formatting guidance in the user prompt', () => {
    const { userPrompt } = buildCardEntryPreprocessPrompt({
      languageId: 'es',
      noteContent: 'repasar',
      exampleSentenceFormat: 'sentence_translation',
    });

    expect(userPrompt).toContain('<sentence> | <translation>');
  });

  it('includes Chinese-specific Hanzi and pinyin guidance when transliteration is selected', () => {
    const { userPrompt } = buildCardEntryPreprocessPrompt({
      languageId: 'zh',
      noteContent: '经历',
      exampleSentenceFormat: 'sentence_transliteration_translation',
    });

    expect(userPrompt).toContain('Hanzi');
    expect(userPrompt).toContain('pinyin');
    expect(userPrompt).toContain('English');
  });

  it('includes partOfSpeech in the JSON shape', () => {
    const { userPrompt } = buildCardEntryPreprocessPrompt({
      languageId: 'zh',
      noteContent: '经历',
      exampleSentenceFormat: 'sentence_translation',
    });
    expect(userPrompt).toContain('partOfSpeech');
  });

  it('instructs the model to guess POS for word-type cards', () => {
    const { systemPrompt } = buildCardEntryPreprocessPrompt({
      languageId: 'zh',
      noteContent: '经历',
      exampleSentenceFormat: 'sentence_translation',
    });
    expect(systemPrompt).toContain('partOfSpeech');
    expect(systemPrompt).toContain('null for non-word');
  });
});
