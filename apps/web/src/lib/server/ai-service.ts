import { z } from 'zod';

export type AiProviderName = 'gemini' | 'openai';

export type AiRequestMetadata = {
  feature: 'card-entry';
  operation: 'preprocess-note';
  userId: string;
  languageId: string;
  noteId: string;
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
  model: string;
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

type ProviderGenerateJson = (request: ProviderRequest) => Promise<string>;

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

  constructor(providerName: AiProviderName, message: string, cause?: unknown) {
    super(message);
    this.name = 'AiServiceRequestError';
    this.providerName = providerName;
    this.cause = cause;
  }
}

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
          model: privateEnv.GEMINI_TEXT_MODEL || 'gemini-2.5-flash',
        }
      : null,
    openai: privateEnv.OPENAI_API_KEY
      ? {
          name: 'openai',
          apiKey: privateEnv.OPENAI_API_KEY,
          model: privateEnv.OPENAI_TEXT_MODEL || 'gpt-4o-mini',
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

async function parseStructuredResponse<T>(rawText: string, responseSchema: z.ZodType<T>): Promise<T> {
  const parsedJson = JSON.parse(extractJsonText(rawText));
  return responseSchema.parse(parsedJson);
}

async function callGemini(request: ProviderRequest): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${request.config.model}:generateContent?key=${request.config.apiKey}`,
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

async function callOpenAi(request: ProviderRequest): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${request.config.apiKey}`,
    },
    body: JSON.stringify({
      model: request.config.model,
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
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const body = await response.json();
  const rawText = body.choices?.[0]?.message?.content?.trim();

  if (!rawText) {
    throw new Error('OpenAI returned an empty response.');
  }

  return rawText;
}

const DEFAULT_PROVIDER_GENERATORS: Record<AiProviderName, ProviderGenerateJson> = {
  gemini: callGemini,
  openai: callOpenAi,
};

export function createAiService(options: {
  privateEnv: Record<string, string | undefined>;
  hooks?: Partial<AiRequestHooks>;
  providerGenerators?: Partial<Record<AiProviderName, ProviderGenerateJson>>;
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

      for (const provider of providers) {
        try {
          await hooks.onRequestStart({
            provider: provider.name,
            metadata: request.metadata,
            model: provider.model,
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
            model: provider.model,
            rawTextLength: rawText.length,
          });

          if (request.cacheKey) {
            await hooks.writeCache(request.cacheKey, parsed);
          }

          return parsed;
        } catch (error) {
          lastError = error;
          await hooks.onRequestFailure({
            provider: provider.name,
            metadata: request.metadata,
            model: provider.model,
            error,
          });
        }
      }

      throw new AiServiceRequestError(
        providers[0]!.name,
        'All configured AI providers failed to return a valid response.',
        lastError
      );
    },
  };
}
