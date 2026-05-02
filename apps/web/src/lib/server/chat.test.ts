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
          contextType: 'card-review',
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
      message: 'Available commands in Translation Drills: /add, /lang, /help, /next, /dismiss, /draw.',
      suggestions: [],
    });

    expect(generateStructured).not.toHaveBeenCalled();
  });
});
