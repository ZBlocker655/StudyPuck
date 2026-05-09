import { z } from 'zod';

export type AiProviderName = 'gemini' | 'openai';

export type AiRequestMetadata = {
  feature: 'card-entry' | 'chat';
  operation: 'preprocess-note' | 'semantic-embedding' | 'conversation';
  userId: string;
  languageId: string;
  noteId?: string;
  routeContextType?: string;
};

export type AiRequestHooks = {
  enforceQuota: (metadata: AiRequestMetadata) => Promise<void> | void;
  readCache: <T>(cacheKey: string) => Promise<T | null> | T | null;
  writeCache: <T>(cacheKey: string, value: T) => Promise<void> | void;
  onRequestStart: (input: { provider: AiProviderName; metadata: AiRequestMetadata; model: string }) => Promise<void> | void;
  onRequestSuccess: (input: {
    provider: AiProviderName;
    metadata: AiRequestMetadata;
    model: string;
    rawTextLength: number;
  }) => Promise<void> | void;
  onRequestFailure: (input: {
    provider: AiProviderName;
    metadata: AiRequestMetadata;
    model: string;
    error: unknown;
  }) => Promise<void> | void;
};

type AiProviderConfig = {
  name: AiProviderName;
  textModel: string;
  embeddingModel: string;
  apiKey: string;
};

type StructuredRequest<T> = {
  metadata: AiRequestMetadata;
  systemPrompt: string;
  userPrompt: string;
  responseSchema: z.ZodType<T>;
  cacheKey?: string;
};

type ProviderRequest = {
  config: AiProviderConfig;
  systemPrompt: string;
  userPrompt: string;
};

type EmbeddingProviderRequest = {
  config: AiProviderConfig;
  input: string;
};

type ProviderGenerateJson = (request: ProviderRequest) => Promise<string>;
type ProviderGenerateEmbedding = (request: EmbeddingProviderRequest) => Promise<number[]>;

type EmbeddingRequest = {
  metadata: AiRequestMetadata;
  input: string;
  cacheKey?: string;
};

export type AiEmbeddingResult = {
  embedding: number[];
  model: string;
};

const DEFAULT_HOOKS: AiRequestHooks = {
  enforceQuota: () => undefined,
  readCache: async () => null,
  writeCache: async () => undefined,
  onRequestStart: ({ provider, metadata, model }) => {
    console.info(`[ai:${metadata.feature}] starting ${metadata.operation} via ${provider}:${model}`);
  },
  onRequestSuccess: ({ provider, metadata, model }) => {
    console.info(`[ai:${metadata.feature}] completed ${metadata.operation} via ${provider}:${model}`);
  },
  onRequestFailure: ({ provider, metadata, model, error }) => {
    console.error(`[ai:${metadata.feature}] failed ${metadata.operation} via ${provider}:${model}`, error);
  },
};

export class AiServiceConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiServiceConfigurationError';
  }
}

export class AiServiceRequestError extends Error {
  providerName: AiProviderName;
  cause: unknown;
  attempts: AiProviderAttemptFailure[];

  constructor(
    providerName: AiProviderName,
    message: string,
    cause?: unknown,
    attempts: AiProviderAttemptFailure[] = [],
  ) {
    super(message);
    this.name = 'AiServiceRequestError';
    this.providerName = providerName;
    this.cause = cause;
    this.attempts = attempts;
  }
}

export type AiStructuredResponseFailureStage = 'json_extract' | 'json_parse' | 'schema_validation';

export class AiStructuredResponseError extends Error {
  stage: AiStructuredResponseFailureStage;
  cause: unknown;
  rawTextPreview: string | null;
  issues: z.ZodIssue[];

  constructor(input: {
    stage: AiStructuredResponseFailureStage;
    message: string;
    cause?: unknown;
    rawTextPreview?: string | null;
    issues?: z.ZodIssue[];
  }) {
    super(input.message);
    this.name = 'AiStructuredResponseError';
    this.stage = input.stage;
    this.cause = input.cause;
    this.rawTextPreview = input.rawTextPreview ?? null;
    this.issues = input.issues ?? [];
  }
}

export type AiProviderAttemptFailure = {
  provider: AiProviderName;
  model: string;
  message: string;
  stage: AiStructuredResponseFailureStage | 'provider_request';
  rawTextPreview: string | null;
  issues: z.ZodIssue[];
};

function normalizeProviderOrder(primaryProvider: AiProviderName): AiProviderName[] {
  return primaryProvider === 'openai' ? ['openai', 'gemini'] : ['gemini', 'openai'];
}

function getConfiguredProviders(privateEnv: Record<string, string | undefined>): AiProviderConfig[] {
  const primaryProvider = privateEnv.STUDYPUCK_AI_PRIMARY_PROVIDER === 'openai' ? 'openai' : 'gemini';
  const providerOrder = normalizeProviderOrder(primaryProvider);

  const providerConfigs: Record<AiProviderName, AiProviderConfig | null> = {
    gemini: privateEnv.GEMINI_API_KEY
        ? {
            name: 'gemini',
          apiKey: privateEnv.GEMINI_API_KEY,
          textModel: privateEnv.GEMINI_TEXT_MODEL || 'gemini-2.5-flash',
          embeddingModel: 'gemini-embedding-001',
        }
      : null,
    openai: privateEnv.OPENAI_API_KEY
      ? {
          name: 'openai',
          apiKey: privateEnv.OPENAI_API_KEY,
          textModel: privateEnv.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
          embeddingModel: 'text-embedding-3-small',
        }
      : null,
  };

  return providerOrder
    .map((providerName) => providerConfigs[providerName])
    .filter((provider): provider is AiProviderConfig => Boolean(provider));
}

function extractJsonText(rawText: string): string {
  const trimmed = rawText.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    return trimmed;
  }

  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);

  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBraceIndex = trimmed.indexOf('{');
  const lastBraceIndex = trimmed.lastIndexOf('}');

  if (firstBraceIndex >= 0 && lastBraceIndex > firstBraceIndex) {
    return trimmed.slice(firstBraceIndex, lastBraceIndex + 1);
  }

  throw new Error('The AI response did not contain valid JSON.');
}

function buildRawTextPreview(rawText: string): string {
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  return normalized.length > 400 ? `${normalized.slice(0, 400)}…` : normalized;
}

async function parseStructuredResponse<T>(rawText: string, responseSchema: z.ZodType<T>): Promise<T> {
  let jsonText = '';

  try {
    jsonText = extractJsonText(rawText);
  } catch (error) {
    throw new AiStructuredResponseError({
      stage: 'json_extract',
      message: 'The AI response did not contain valid JSON.',
      cause: error,
      rawTextPreview: buildRawTextPreview(rawText),
    });
  }

  let parsedJson: unknown;

  try {
    parsedJson = JSON.parse(jsonText);
  } catch (error) {
    throw new AiStructuredResponseError({
      stage: 'json_parse',
      message: 'The AI response contained malformed JSON.',
      cause: error,
      rawTextPreview: buildRawTextPreview(jsonText),
    });
  }

  const parsed = responseSchema.safeParse(parsedJson);

  if (!parsed.success) {
    throw new AiStructuredResponseError({
      stage: 'schema_validation',
      message: 'The AI response did not match the expected schema.',
      rawTextPreview: buildRawTextPreview(jsonText),
      issues: parsed.error.issues,
    });
  }

  return parsed.data;
}

async function callGemini(request: ProviderRequest): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${request.config.textModel}:generateContent?key=${request.config.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: request.systemPrompt }],
        },
        contents: [
          {
            role: 'user',
            parts: [{ text: request.userPrompt }],
          },
        ],
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Gemini request failed with status ${response.status}${errorText ? `: ${errorText}` : ''}`
    );
  }

  const body = await response.json();
  const rawText = body.candidates?.[0]?.content?.parts
    ?.map((part: { text?: string }) => part.text ?? '')
    .join('')
    .trim();

  if (!rawText) {
    throw new Error('Gemini returned an empty response.');
  }

  return rawText;
}

async function callGeminiEmbedding(request: EmbeddingProviderRequest): Promise<number[]> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${request.config.embeddingModel}:embedContent?key=${request.config.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: `models/${request.config.embeddingModel}`,
        content: {
          parts: [{ text: request.input }],
        },
        taskType: 'SEMANTIC_SIMILARITY',
        outputDimensionality: 768,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `Gemini embedding request failed with status ${response.status}${errorText ? `: ${errorText}` : ''}`
    );
  }

  const body = await response.json();
  const embedding = body.embedding?.values;

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('Gemini returned an empty embedding.');
  }

  return embedding;
}

async function callOpenAi(request: ProviderRequest): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.config.apiKey}`,
    },
    body: JSON.stringify({
      model: request.config.textModel,
      response_format: {
        type: 'json_object',
      },
      messages: [
        {
          role: 'system',
          content: request.systemPrompt,
        },
        {
          role: 'user',
          content: request.userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`OpenAI request failed with status ${response.status}${errorText ? `: ${errorText}` : ''}`);
  }

  const body = await response.json();
  const rawText = body.choices?.[0]?.message?.content?.trim();

  if (!rawText) {
    throw new Error('OpenAI returned an empty response.');
  }

  return rawText;
}

async function callOpenAiEmbedding(request: EmbeddingProviderRequest): Promise<number[]> {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.config.apiKey}`,
    },
    body: JSON.stringify({
      model: request.config.embeddingModel,
      input: request.input,
      dimensions: 768,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(
      `OpenAI embedding request failed with status ${response.status}${errorText ? `: ${errorText}` : ''}`
    );
  }

  const body = await response.json();
  const embedding = body.data?.[0]?.embedding;

  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('OpenAI returned an empty embedding.');
  }

  return embedding;
}

const DEFAULT_PROVIDER_GENERATORS: Record<AiProviderName, ProviderGenerateJson> = {
  gemini: callGemini,
  openai: callOpenAi,
};

const DEFAULT_EMBEDDING_GENERATORS: Record<AiProviderName, ProviderGenerateEmbedding> = {
  gemini: callGeminiEmbedding,
  openai: callOpenAiEmbedding,
};

function summarizeAttemptFailure(
  provider: AiProviderName,
  model: string,
  error: unknown,
): AiProviderAttemptFailure {
  if (error instanceof AiStructuredResponseError) {
    return {
      provider,
      model,
      message: error.message,
      stage: error.stage,
      rawTextPreview: error.rawTextPreview,
      issues: error.issues,
    };
  }

  return {
    provider,
    model,
    message: error instanceof Error ? error.message : String(error),
    stage: 'provider_request',
    rawTextPreview: null,
    issues: [],
  };
}

export function createAiService(options: {
  privateEnv: Record<string, string | undefined>;
  hooks?: Partial<AiRequestHooks>;
  providerGenerators?: Partial<Record<AiProviderName, ProviderGenerateJson>>;
  embeddingGenerators?: Partial<Record<AiProviderName, ProviderGenerateEmbedding>>;
}) {
  const providers = getConfiguredProviders(options.privateEnv);
  const hooks = {
    ...DEFAULT_HOOKS,
    ...options.hooks,
  };
  const providerGenerators = {
    ...DEFAULT_PROVIDER_GENERATORS,
    ...options.providerGenerators,
  };
  const embeddingGenerators = {
    ...DEFAULT_EMBEDDING_GENERATORS,
    ...options.embeddingGenerators,
  };

  return {
    async generateStructured<T>(request: StructuredRequest<T>): Promise<T> {
      if (providers.length === 0) {
        throw new AiServiceConfigurationError(
          'No AI text provider is configured. Set GEMINI_API_KEY or OPENAI_API_KEY.'
        );
      }

      await hooks.enforceQuota(request.metadata);

      if (request.cacheKey) {
        const cached = await hooks.readCache<T>(request.cacheKey);

        if (cached) {
          return cached;
        }
      }

      let lastError: unknown;
      const attempts: AiProviderAttemptFailure[] = [];

      for (const provider of providers) {
        try {
          await hooks.onRequestStart({
            provider: provider.name,
            metadata: request.metadata,
            model: provider.textModel,
          });

          const rawText = await providerGenerators[provider.name]({
            config: provider,
            systemPrompt: request.systemPrompt,
            userPrompt: request.userPrompt,
          });
          const parsed = await parseStructuredResponse(rawText, request.responseSchema);

          await hooks.onRequestSuccess({
            provider: provider.name,
            metadata: request.metadata,
            model: provider.textModel,
            rawTextLength: rawText.length,
          });

          if (request.cacheKey) {
            await hooks.writeCache(request.cacheKey, parsed);
          }

          return parsed;
        } catch (error) {
          lastError = error;
          attempts.push(summarizeAttemptFailure(provider.name, provider.textModel, error));
          await hooks.onRequestFailure({
            provider: provider.name,
            metadata: request.metadata,
            model: provider.textModel,
            error,
          });
        }
      }

      throw new AiServiceRequestError(
        providers[0]!.name,
        'All configured AI providers failed to return a valid response.',
        lastError,
        attempts,
      );
    },

    async generateEmbedding(request: EmbeddingRequest): Promise<AiEmbeddingResult> {
      if (providers.length === 0) {
        throw new AiServiceConfigurationError(
          'No AI embedding provider is configured. Set GEMINI_API_KEY or OPENAI_API_KEY.'
        );
      }

      await hooks.enforceQuota(request.metadata);

      if (request.cacheKey) {
        const cached = await hooks.readCache<AiEmbeddingResult>(request.cacheKey);

        if (cached) {
          return cached;
        }
      }

      let lastError: unknown;

      for (const provider of providers) {
        try {
          await hooks.onRequestStart({
            provider: provider.name,
            metadata: request.metadata,
            model: provider.embeddingModel,
          });

          const embedding = await embeddingGenerators[provider.name]({
            config: provider,
            input: request.input,
          });
          const result: AiEmbeddingResult = {
            embedding,
            model: provider.embeddingModel,
          };

          await hooks.onRequestSuccess({
            provider: provider.name,
            metadata: request.metadata,
            model: provider.embeddingModel,
            rawTextLength: request.input.length,
          });

          if (request.cacheKey) {
            await hooks.writeCache(request.cacheKey, result);
          }

          return result;
        } catch (error) {
          lastError = error;
          await hooks.onRequestFailure({
            provider: provider.name,
            metadata: request.metadata,
            model: provider.embeddingModel,
            error,
          });
        }
      }

      throw new AiServiceRequestError(
        providers[0]!.name,
        'All configured AI providers failed to return a valid embedding.',
        lastError
      );
    },
  };
}
