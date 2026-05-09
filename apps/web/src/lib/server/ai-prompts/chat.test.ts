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
      allowedSuggestionTypes: ['append_example_sentence', 'append_mnemonic'],
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
      allowedSuggestionTypes: ['append_example_sentence', 'append_mnemonic'],
    });

    expect(prompt.userPrompt).toContain('"contextType": "card_entry_note_workspace"');
    expect(prompt.userPrompt).toContain('{"type":"append_example_sentence","payload":{"cardId":"string","text":"string"}}');
    expect(prompt.userPrompt).toContain('{"type":"append_mnemonic","payload":{"cardId":"string","text":"string"}}');
    expect(prompt.userPrompt).toContain('"cardId": "card-1"');
    expect(prompt.userPrompt).toContain('"cardId": "card-2"');
    expect(prompt.userPrompt).toContain('ask a clarifying question instead of guessing');
    expect(prompt.userPrompt).toContain('Use the exact cardId from the workspace data');
  });

  it('includes card-library list state and snapshot data for card-library chat contexts', () => {
    const canonicalContext: CanonicalChatContext = {
      contextType: 'card_library_list',
      languageId: 'zh',
      allowedSuggestionTypes: ['create_group'],
      listState: {
        searchText: 'train',
        groupFilters: [{ groupId: 'group-1', groupName: 'Travel' }],
        cardType: 'word',
        ordering: 'updated_desc',
      },
      resultCount: 2,
      selectedCardIds: ['card-2'],
      selectedCards: [
        {
          cardId: 'card-2',
          content: '飞机',
          meaning: 'airplane',
          cardType: 'word',
          groupNames: ['Travel'],
        },
      ],
      visibleCards: [
        {
          cardId: 'card-1',
          content: '火车',
          meaning: 'train',
          cardType: 'word',
          groupNames: ['Travel'],
        },
      ],
    };

    const prompt = buildStructuredChatPrompt({
      canonicalContext,
      userInput: 'What should I study first from this list?',
      allowedSuggestionTypes: ['create_group'],
    });

    expect(prompt.userPrompt).toContain('"contextType": "card_library_list"');
    expect(prompt.userPrompt).toContain('"searchText": "train"');
    expect(prompt.userPrompt).toContain('"groupName": "Travel"');
    expect(prompt.userPrompt).toContain('"selectedCardIds": [');
    expect(prompt.userPrompt).toContain('"content": "火车"');
  });

  it('includes exact ID guidance for group-management suggestion types', () => {
    const canonicalContext: CanonicalChatContext = {
      contextType: 'group_detail',
      languageId: 'zh',
      allowedSuggestionTypes: ['create_group', 'add_card_to_group', 'remove_card_from_group'],
      group: {
        groupId: 'group-current',
        groupName: 'Travel',
        description: 'Trips and transit',
        activeCardCount: 2,
      },
      availableGroupsForAddition: [{ groupId: 'group-other', groupName: 'Favorites' }],
      listState: {
        searchText: '',
        cardType: null,
        scopeGroupId: 'group-current',
        ordering: 'updated_desc',
      },
      resultCount: 2,
      selectedCardIds: ['card-1'],
      selectedCards: [
        {
          cardId: 'card-1',
          content: '火车',
          meaning: 'train',
          cardType: 'word',
          groupNames: ['Travel'],
        },
      ],
      visibleCards: [
        {
          cardId: 'card-1',
          content: '火车',
          meaning: 'train',
          cardType: 'word',
          groupNames: ['Travel'],
        },
      ],
    };

    const prompt = buildStructuredChatPrompt({
      canonicalContext,
      userInput: 'Put this card into Favorites too',
      allowedSuggestionTypes: ['create_group', 'add_card_to_group', 'remove_card_from_group'],
    });

    expect(prompt.userPrompt).toContain('{"type":"create_group","payload":{"name":"string","description":"string | null"}}');
    expect(prompt.userPrompt).toContain('{"type":"add_card_to_group","payload":{"cardId":"string","groupId":"string"}}');
    expect(prompt.userPrompt).toContain('{"type":"remove_card_from_group","payload":{"cardId":"string","groupId":"string"}}');
    expect(prompt.userPrompt).toContain('Use exact cardId and groupId values from the machine context');
    expect(prompt.userPrompt).toContain('set description to null when no description is needed');
  });
});
