import { describe, expect, it, vi } from 'vitest';
import { resolveRouteContext } from '$lib/command-bar/shared.js';
import { handleStudyPuckChatRequest } from './chat.js';

describe('handleStudyPuckChatRequest', () => {
  it('routes inline /add commands through the direct application handler without calling the LLM', async () => {
    const createNote = vi.fn().mockResolvedValue(undefined);
    const generateStructured = vi.fn();

    await expect(
      handleStudyPuckChatRequest({
        userId: 'user-1',
        input: '/add hola desde chat',
        routeContext: resolveRouteContext('/es/card-entry'),
        languageId: 'es',
        privateEnv: {},
        createNote,
        generateStructured,
      }),
    ).resolves.toEqual({
      message: 'Added a note to Spanish.',
      suggestions: [],
    });

    expect(createNote).toHaveBeenCalledWith({
      languageId: 'es',
      content: 'hola desde chat',
    });
    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('returns a direct placeholder for unsupported settings help without calling the LLM', async () => {
    const generateStructured = vi.fn();

    await expect(
      handleStudyPuckChatRequest({
        userId: 'user-1',
        input: 'How do StudyPuck settings work?',
        routeContext: resolveRouteContext('/es/settings'),
        languageId: 'es',
        privateEnv: {},
        generateStructured,
      }),
    ).resolves.toEqual({
      message: "Sorry, I can't explain anything about StudyPuck yet.",
      suggestions: [],
    });

    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('normalizes LLM responses to the shared message and suggestions envelope', async () => {
    const generateStructured = vi.fn(async (request: { responseSchema: { parse: (value: unknown) => unknown } }) =>
      request.responseSchema.parse({
        message: 'Here are a few ways to practice that idea.',
      }),
    );

    await expect(
      handleStudyPuckChatRequest({
        userId: 'user-1',
        input: 'Give me a short practice idea',
        routeContext: resolveRouteContext('/es/card-review'),
        languageId: 'es',
        privateEnv: {},
        generateStructured,
      }),
    ).resolves.toEqual({
      message: 'Here are a few ways to practice that idea.',
      suggestions: [],
    });

    expect(generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          feature: 'chat',
          operation: 'conversation',
          routeContextType: 'card-review',
          languageId: 'es',
        }),
      }),
    );
  });

  it('handles slash-help requests directly without calling the LLM', async () => {
    const generateStructured = vi.fn();

    await expect(
      handleStudyPuckChatRequest({
        userId: 'user-1',
        input: '/help',
        routeContext: resolveRouteContext('/es/translation-drills'),
        languageId: 'es',
        privateEnv: {},
        generateStructured,
      }),
    ).resolves.toEqual({
      message: 'Available commands in Translation Drills: /add, /lang, /help, /next, /dismiss, and /draw.',
      suggestions: [],
    });

    expect(generateStructured).not.toHaveBeenCalled();
  });

  it('passes no allowed suggestion types when there is no draft card context', async () => {
    const generateStructured = vi.fn(async (request: { responseSchema: { parse: (value: unknown) => unknown } }) =>
      request.responseSchema.parse({ message: 'Hello from card review.' }),
    );

    const response = await handleStudyPuckChatRequest({
      userId: 'user-1',
      input: 'Can you help me?',
      routeContext: resolveRouteContext('/es/card-review'),
      languageId: 'es',
      privateEnv: {},
      generateStructured,
    });

    // No cardId means we land in the non-actionable context – no suggestions
    expect(response.suggestions).toEqual([]);
    expect(generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: expect.stringContaining('"contextType": "non_actionable"'),
      }),
    );
  });

  it('falls back to non-actionable context when no database is provided even with cardId hint', async () => {
    const generateStructured = vi.fn(async (request: { responseSchema: { parse: (value: unknown) => unknown } }) =>
      request.responseSchema.parse({
        message: 'I can help with general questions.',
        suggestions: [],
      }),
    );

    const response = await handleStudyPuckChatRequest({
      userId: 'user-1',
      input: 'Give me another example sentence',
      routeContext: resolveRouteContext('/es/card-entry'),
      languageId: 'es',
      noteId: 'note-1',
      cardId: 'card-1',
      // No database provided — falls back to non-actionable context
      privateEnv: {},
      generateStructured,
    });

    // Without a database the context resolver cannot load the card, so no
    // actionable suggestion types are allowed.
    expect(response.suggestions).toEqual([]);
    expect(generateStructured).toHaveBeenCalledWith(
      expect.objectContaining({
        userPrompt: expect.stringContaining('"contextType": "non_actionable"'),
      }),
    );
  });

  it('includes conversation history in the prompt when provided', async () => {
    let capturedUserPrompt = '';
    const generateStructured = vi.fn(async (request: { userPrompt: string; responseSchema: { parse: (value: unknown) => unknown } }) => {
      capturedUserPrompt = request.userPrompt;
      return request.responseSchema.parse({ message: 'Got it.' });
    });

    await handleStudyPuckChatRequest({
      userId: 'user-1',
      input: 'What else can you suggest?',
      routeContext: resolveRouteContext('/es/card-review'),
      languageId: 'es',
      conversationHistory: [
        { role: 'user', content: 'Give me a practice idea.' },
        { role: 'assistant', content: 'Try writing sentences with "ser me".' },
      ],
      privateEnv: {},
      generateStructured,
    });

    expect(capturedUserPrompt).toContain('Conversation history');
    expect(capturedUserPrompt).toContain('Give me a practice idea.');
    expect(capturedUserPrompt).toContain('Try writing sentences with "ser me".');
  });
});
