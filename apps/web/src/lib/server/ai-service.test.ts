import { beforeEach, describe, expect, it, vi } from 'vitest';
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  it('generates embeddings from the configured primary provider', async () => {
    const geminiEmbedding = vi.fn(async () => [0.1, 0.2, 0.3]);
    const service = createAiService({
      privateEnv: {
        GEMINI_API_KEY: 'test-gemini-key',
      },
      hooks: silentHooks,
      embeddingGenerators: {
        gemini: geminiEmbedding,
      },
    });

    const response = await service.generateEmbedding({
      metadata: {
        feature: 'card-entry',
        operation: 'semantic-embedding',
        userId: 'user-1',
        languageId: 'es',
        noteId: 'note-1',
      },
      input: 'hola mundo',
    });

    expect(response).toEqual({
      embedding: [0.1, 0.2, 0.3],
      model: 'gemini-embedding-001',
    });
    expect(geminiEmbedding).toHaveBeenCalledTimes(1);
  });

  it('falls back to the secondary provider when the primary embedding call fails', async () => {
    const geminiEmbedding = vi.fn(async () => {
      throw new Error('gemini unavailable');
    });
    const openAiEmbedding = vi.fn(async () => [0.4, 0.5, 0.6]);
    const service = createAiService({
      privateEnv: {
        GEMINI_API_KEY: 'test-gemini-key',
        OPENAI_API_KEY: 'test-openai-key',
      },
      hooks: silentHooks,
      embeddingGenerators: {
        gemini: geminiEmbedding,
        openai: openAiEmbedding,
      },
    });

    const response = await service.generateEmbedding({
      metadata: {
        feature: 'card-entry',
        operation: 'semantic-embedding',
        userId: 'user-1',
        languageId: 'es',
        noteId: 'note-1',
      },
      input: 'fallback embedding',
    });

    expect(response).toEqual({
      embedding: [0.4, 0.5, 0.6],
      model: 'text-embedding-3-small',
    });
    expect(geminiEmbedding).toHaveBeenCalledTimes(1);
    expect(openAiEmbedding).toHaveBeenCalledTimes(1);
  });
});
