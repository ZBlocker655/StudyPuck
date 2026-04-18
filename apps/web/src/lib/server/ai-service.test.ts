import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AiServiceConfigurationError, createAiService } from './ai-service.js';

const responseSchema = z.object({
  draftCards: z.array(z.object({ content: z.string() })),
});

const silentHooks = {
  enforceQuota: vi.fn(),
  readCache: vi.fn(async () => null),
  writeCache: vi.fn(async () => undefined),
  onRequestStart: vi.fn(),
  onRequestSuccess: vi.fn(),
  onRequestFailure: vi.fn(),
};

describe('createAiService', () => {
  it('parses structured JSON responses from the configured primary provider', async () => {
    const geminiGenerator = vi.fn(async () => '```json\n{"draftCards":[{"content":"hola"}]}\n```');
    const service = createAiService({
      privateEnv: {
        GEMINI_API_KEY: 'test-gemini-key',
      },
      hooks: silentHooks,
      providerGenerators: {
        gemini: geminiGenerator,
      },
    });

    const response = await service.generateStructured({
      metadata: {
        feature: 'card-entry',
        operation: 'preprocess-note',
        userId: 'user-1',
        languageId: 'es',
        noteId: 'note-1',
      },
      systemPrompt: 'system',
      userPrompt: 'user',
      responseSchema,
    });

    expect(response).toEqual({
      draftCards: [{ content: 'hola' }],
    });
    expect(geminiGenerator).toHaveBeenCalledTimes(1);
  });

  it('falls back to the secondary provider when the primary one fails', async () => {
    const geminiGenerator = vi.fn(async () => {
      throw new Error('gemini unavailable');
    });
    const openAiGenerator = vi.fn(async () => '{"draftCards":[{"content":"fallback"}]}');
    const service = createAiService({
      privateEnv: {
        GEMINI_API_KEY: 'test-gemini-key',
        OPENAI_API_KEY: 'test-openai-key',
      },
      hooks: silentHooks,
      providerGenerators: {
        gemini: geminiGenerator,
        openai: openAiGenerator,
      },
    });

    const response = await service.generateStructured({
      metadata: {
        feature: 'card-entry',
        operation: 'preprocess-note',
        userId: 'user-1',
        languageId: 'es',
        noteId: 'note-1',
      },
      systemPrompt: 'system',
      userPrompt: 'user',
      responseSchema,
    });

    expect(response).toEqual({
      draftCards: [{ content: 'fallback' }],
    });
    expect(geminiGenerator).toHaveBeenCalledTimes(1);
    expect(openAiGenerator).toHaveBeenCalledTimes(1);
  });

  it('throws a configuration error when no providers are configured', async () => {
    const service = createAiService({
      privateEnv: {},
      hooks: silentHooks,
    });

    await expect(service.generateStructured({
      metadata: {
        feature: 'card-entry',
        operation: 'preprocess-note',
        userId: 'user-1',
        languageId: 'es',
        noteId: 'note-1',
      },
      systemPrompt: 'system',
      userPrompt: 'user',
      responseSchema,
    })).rejects.toBeInstanceOf(AiServiceConfigurationError);
  });
});
