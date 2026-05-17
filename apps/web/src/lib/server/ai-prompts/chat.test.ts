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
      allowedSuggestionTypes: ['append_example_sentence', 'append_mnemonic', 'add_inbox_note'],
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
      allowedSuggestionTypes: ['append_example_sentence', 'append_mnemonic', 'add_inbox_note'],
    });

    expect(prompt.userPrompt).toContain('"contextType": "card_entry_note_workspace"');
    expect(prompt.userPrompt).toContain('{"type":"append_example_sentence","payload":{"cardId":"string","text":"string"}}');
    expect(prompt.userPrompt).toContain('{"type":"append_mnemonic","payload":{"cardId":"string","text":"string"}}');
    expect(prompt.userPrompt).toContain('{"type":"add_inbox_note","payload":{"text":"string"}}');
    expect(prompt.userPrompt).toContain('"cardId": "card-1"');
    expect(prompt.userPrompt).toContain('"cardId": "card-2"');
    expect(prompt.userPrompt).toContain('ask a clarifying question instead of guessing');
    expect(prompt.userPrompt).toContain('Use the exact cardId from the workspace data');
    expect(prompt.userPrompt).toContain('Keep payload.text short, note-like');
  });

  it('includes card-library list state and snapshot data for card-library chat contexts', () => {
    const canonicalContext: CanonicalChatContext = {
      contextType: 'card_library_list',
      languageId: 'zh',
      allowedSuggestionTypes: ['add_inbox_note', 'create_group'],
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
      allowedSuggestionTypes: ['add_inbox_note', 'create_group'],
    });

    expect(prompt.userPrompt).toContain('"contextType": "card_library_list"');
    expect(prompt.userPrompt).toContain('"searchText": "train"');
    expect(prompt.userPrompt).toContain('"groupName": "Travel"');
    expect(prompt.userPrompt).toContain('"selectedCardIds": [');
    expect(prompt.userPrompt).toContain('"content": "火车"');
    expect(prompt.userPrompt).toContain('{"type":"add_inbox_note","payload":{"text":"string"}}');
  });

  it('includes exact ID guidance for group-management suggestion types', () => {
    const canonicalContext: CanonicalChatContext = {
      contextType: 'group_detail',
      languageId: 'zh',
      allowedSuggestionTypes: ['add_inbox_note', 'create_group', 'add_card_to_group', 'remove_card_from_group'],
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
      allowedSuggestionTypes: ['add_inbox_note', 'create_group', 'add_card_to_group', 'remove_card_from_group'],
    });

    expect(prompt.userPrompt).toContain('{"type":"add_inbox_note","payload":{"text":"string"}}');
    expect(prompt.userPrompt).toContain('{"type":"create_group","payload":{"name":"string","description":"string | null"}}');
    expect(prompt.userPrompt).toContain('{"type":"add_card_to_group","payload":{"cardId":"string","groupId":"string"}}');
    expect(prompt.userPrompt).toContain('{"type":"remove_card_from_group","payload":{"cardId":"string","groupId":"string"}}');
    expect(prompt.userPrompt).toContain('Use exact cardId and groupId values from the machine context');
    expect(prompt.userPrompt).toContain('set description to null when no description is needed');
  });

  it('makes clear that study-language help is still allowed when only inbox-note suggestions are available', () => {
    const canonicalContext: CanonicalChatContext = {
      contextType: 'non_actionable',
      routeContextType: 'card-review',
      languageId: 'zh',
      allowedSuggestionTypes: ['add_inbox_note'],
    };

    const prompt = buildStructuredChatPrompt({
      canonicalContext,
      userInput: 'Why is 了 used here?',
      allowedSuggestionTypes: ['add_inbox_note'],
    });

    expect(prompt.systemPrompt).toContain(
      'You should still answer study-language questions, explain vocabulary or grammar, give practice ideas, and discuss the visible study content even when no app action is available.',
    );
    expect(prompt.userPrompt).toContain(
      'Suggestions are only for typed app actions. They do not limit normal study-language help.',
    );
    expect(prompt.userPrompt).toContain('Allowed suggestion types: add_inbox_note.');
    expect(prompt.userPrompt).toContain('Never assume add_inbox_note creates anything automatically');
  });

  it('includes Card Review action suggestion shapes and current-card guidance for active sessions', () => {
    const canonicalContext: CanonicalChatContext = {
      contextType: 'card_review_session',
      languageId: 'zh',
      allowedSuggestionTypes: ['add_inbox_note', 'pin_review_card', 'snooze_review_card', 'next_review_card'],
      selection: {
        groupIds: ['group-1'],
        limit: 10,
        countMode: 'limit',
      },
      initialTotalCount: 4,
      completedCount: 1,
      remainingCount: 3,
      currentCardNumber: 2,
      currentCard: {
        cardId: 'card-1',
        content: '谈论',
        meaning: 'to discuss',
        cardType: 'word',
        groupNames: ['Conversation'],
        examples: ['我们以后再谈论这个问题。'],
        mnemonics: ['Think of a discussion turning in loops.'],
        llmInstructions: null,
        nextDueAtIso: '2026-05-10T12:00:00.000Z',
        reviewCount: 2,
      },
      upcomingCards: [
        {
          cardId: 'card-2',
          content: '聊天',
          meaning: 'to chat',
          cardType: 'word',
          groupNames: ['Conversation'],
          examples: [],
          mnemonics: [],
          llmInstructions: null,
          nextDueAtIso: '2026-05-10T12:05:00.000Z',
          reviewCount: 1,
        },
      ],
    };

    const prompt = buildStructuredChatPrompt({
      canonicalContext,
      userInput: 'I know this one already, move on.',
      allowedSuggestionTypes: ['add_inbox_note', 'pin_review_card', 'snooze_review_card', 'next_review_card'],
    });

    expect(prompt.userPrompt).toContain('"contextType": "card_review_session"');
    expect(prompt.userPrompt).toContain('"currentCardNumber": 2');
    expect(prompt.userPrompt).toContain('{"type":"pin_review_card","payload":{"cardId":"string"}}');
    expect(prompt.userPrompt).toContain('{"type":"snooze_review_card","payload":{"cardId":"string"}}');
    expect(prompt.userPrompt).toContain('{"type":"next_review_card","payload":{"cardId":"string"}}');
    expect(prompt.userPrompt).toContain('Use the exact current review cardId from the machine context');
    expect(prompt.userPrompt).toContain('"cardId": "card-1"');
  });

  it('includes Translation Drills challenge guidance and drill-action suggestion shapes', () => {
    const canonicalContext: CanonicalChatContext = {
      contextType: 'translation_drills_challenge',
      languageId: 'zh',
      allowedSuggestionTypes: [
        'add_inbox_note',
        'draw_translation_drill_card',
        'snooze_translation_drill_card',
        'dismiss_translation_drill_card',
        'next_translation_drill_challenge',
      ],
      summary: {
        configuredGroupCount: 1,
        activeCardCount: 1,
        snoozedCardCount: 1,
        dismissedCardCount: 0,
        disabledCardCount: 0,
        remainingDrawCount: 2,
        hasConfiguredDrawPiles: true,
        hasVisibleContext: true,
      },
      configuredGroups: [{
        groupId: 'group-1',
        groupName: 'Core',
        drawPileName: 'Core drill',
        pileSizeLimit: 4,
        remainingCardCount: 2,
        activeCardCount: 1,
        snoozedCardCount: 1,
      }],
      visibleContextCards: [
        {
          cardId: 'card-1',
          content: '谈论',
          meaning: 'to discuss',
          cardType: 'word',
          state: 'active',
          sourceGroupName: 'Core',
          examples: ['我们以后再谈论这个问题。'],
          mnemonics: ['discussion loops'],
          llmInstructions: null,
        },
      ],
      focusedCardId: 'card-1',
      activeChallenge: {
        challengeId: 'challenge-1',
        prompt: 'We should discuss this carefully before we decide.',
        sourceCardIds: ['card-1'],
        startedAtIso: '2026-05-10T12:00:00.000Z',
        sourceCards: [
          {
            cardId: 'card-1',
            content: '谈论',
            meaning: 'to discuss',
            cardType: 'word',
            state: 'active',
            sourceGroupName: 'Core',
            examples: ['我们以后再谈论这个问题。'],
            mnemonics: ['discussion loops'],
            llmInstructions: null,
          },
        ],
      },
    };

    const prompt = buildStructuredChatPrompt({
      canonicalContext,
      userInput: 'I would say: 我们应该仔细谈论这个问题。',
      allowedSuggestionTypes: [
        'add_inbox_note',
        'draw_translation_drill_card',
        'snooze_translation_drill_card',
        'dismiss_translation_drill_card',
        'next_translation_drill_challenge',
      ],
    });

    expect(prompt.userPrompt).toContain('"contextType": "translation_drills_challenge"');
    expect(prompt.userPrompt).toContain('{"type":"draw_translation_drill_card","payload":{"groupId":"string"}}');
    expect(prompt.userPrompt).toContain('{"type":"snooze_translation_drill_card","payload":{"cardId":"string"}}');
    expect(prompt.userPrompt).toContain('{"type":"dismiss_translation_drill_card","payload":{"cardId":"string"}}');
    expect(prompt.userPrompt).toContain('{"type":"next_translation_drill_challenge","payload":{}}');
    expect(prompt.userPrompt).toContain('The active Translation Drills challenge is authoritative app state.');
    expect(prompt.userPrompt).toContain('If the user message looks like an attempted translation for the active challenge');
    expect(prompt.userPrompt).toContain('You may proactively suggest add_inbox_note when the drill reveals a durable usage distinction');
    expect(prompt.userPrompt).toContain('If the learner gives a natural, correct translation that uses a valid synonym');
    expect(prompt.userPrompt).toContain('If the learner leaves an English word or phrase in the answer');
    expect(prompt.userPrompt).toContain('If the missing English word is the intended source-card target');
    expect(prompt.userPrompt).toContain('If the missing English word is not the intended source-card target');
    expect(prompt.userPrompt).toContain('If prior conversation history shows you already hinted');
    expect(prompt.userPrompt).toContain('Only call the answer plainly wrong when it is ungrammatical');
    expect(prompt.userPrompt).toContain('follow-up question about the challenge');
    expect(prompt.userPrompt).toContain('Use exact groupId and cardId values from the Translation Drills machine context');
  });
});
