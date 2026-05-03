import { describe, expect, it } from 'vitest';
import { buildStructuredChatPrompt } from './chat.js';
import type { CanonicalChatContext } from '$lib/server/chat-context.js';

describe('buildStructuredChatPrompt', () => {
  it('includes note-workspace draft cards, explicit cardId suggestions, and ambiguity guidance', () => {
    const canonicalContext: CanonicalChatContext = {
      contextType: 'card_entry_note_workspace',
      languageId: 'zh',
      noteId: 'note-1',
      noteContent: 'Travel vocabulary',
      likelyTargetCardId: 'card-2',
      likelyTargetFocusedField: 'examples',
      allowedSuggestionTypes: ['append_example_sentence'],
      exampleSentenceFormat: 'sentence_translation',
      exampleSentenceFormatInstruction: 'Format every example as "<sentence> | <translation>". Do not add transliteration.',
      draftCards: [
        {
          cardId: 'card-1',
          content: '火车',
          meaning: 'train',
          examples: ['我坐火车去上海。'],
          mnemonics: [],
          llmInstructions: null,
        },
        {
          cardId: 'card-2',
          content: '飞机',
          meaning: 'airplane',
          examples: [],
          mnemonics: [],
          llmInstructions: null,
        },
      ],
    };

    const prompt = buildStructuredChatPrompt({
      canonicalContext,
      userInput: 'Give me another example sentence',
      allowedSuggestionTypes: ['append_example_sentence'],
    });

    expect(prompt.userPrompt).toContain('"contextType": "card_entry_note_workspace"');
    expect(prompt.userPrompt).toContain('"cardId":"string"');
    expect(prompt.userPrompt).toContain('"cardId": "card-1"');
    expect(prompt.userPrompt).toContain('"cardId": "card-2"');
    expect(prompt.userPrompt).toContain('ask a clarifying question instead of guessing');
    expect(prompt.userPrompt).toContain('Use the exact cardId from the workspace data');
  });
});
