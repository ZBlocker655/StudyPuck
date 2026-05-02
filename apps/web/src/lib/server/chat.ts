import { getLanguageByCode } from '$lib/config/languages.js';
import { createChatResponseSchema, type ChatResponse, type ChatSuggestionType, type ConversationHistoryTurn } from '$lib/chat.js';
import {
  findRecognizedCommand,
  getCommandsForContext,
  type RouteContext,
} from '$lib/command-bar/shared.js';
import { buildStructuredChatPrompt } from '$lib/server/ai-prompts/chat.js';
import { resolveCanonicalChatContext, getAllowedSuggestionTypes, type CanonicalChatContext } from '$lib/server/chat-context.js';
import { createAiService } from '$lib/server/ai-service.js';
import { z } from 'zod';

type DatabaseClient = Parameters<typeof resolveCanonicalChatContext>[2];

type StructuredResponseGenerator = (request: {
  metadata: {
    feature: 'chat';
    operation: 'conversation';
    userId: string;
    languageId: string;
    noteId?: string;
    routeContextType: RouteContext['routeContextType'];
  };
  systemPrompt: string;
  userPrompt: string;
  responseSchema: z.ZodTypeAny;
}) => Promise<unknown>;

type HandleStudyPuckChatRequestInput = {
  userId: string;
  input: string;
  routeContext: RouteContext;
  languageId?: string;
  noteId?: string;
  cardId?: string;
  focusedField?: string;
  conversationHistory?: ConversationHistoryTurn[];
  database?: DatabaseClient;
  privateEnv: Record<string, string | undefined>;
  createNote?: (payload: { languageId: string; content: string }) => Promise<void>;
  generateStructured?: StructuredResponseGenerator;
};

function parseSlashCommand(input: string) {
  const trimmedInput = input.trim();

  if (!trimmedInput.startsWith('/')) {
    return null;
  }

  const [typedCommand] = trimmedInput.split(/\s+/, 1);

  return {
    typedCommand,
    argumentText: trimmedInput.slice(typedCommand.length).trim(),
  };
}

function normalizeChatResponse(
  response: unknown,
  allowedSuggestionTypes: readonly ChatSuggestionType[],
) {
  return createChatResponseSchema(allowedSuggestionTypes).parse(response);
}

function formatCommandList(commands: string[]) {
  if (commands.length <= 1) {
    return commands.join('');
  }

  if (commands.length === 2) {
    return `${commands[0]} and ${commands[1]}`;
  }

  return `${commands.slice(0, -1).join(', ')}, and ${commands.at(-1)}`;
}

async function handleDirectCommand(
  input: HandleStudyPuckChatRequestInput,
  command: NonNullable<ReturnType<typeof parseSlashCommand>>,
) {
  const recognizedCommand = findRecognizedCommand(input.input, input.routeContext.commandContext);

  if (!recognizedCommand) {
    return normalizeChatResponse(
      {
        message: `Command '${command.typedCommand}' is not available in ${input.routeContext.label}.`,
      },
      [],
    );
  }

  if (recognizedCommand.command === '/help') {
    const availableCommands = formatCommandList(
      getCommandsForContext(input.routeContext.commandContext).map((item) => item.command),
    );

    return normalizeChatResponse(
      {
        message: `Available commands in ${input.routeContext.label}: ${availableCommands}.`,
      },
      [],
    );
  }

  if (recognizedCommand.command === '/add') {
    if (!input.languageId) {
      return normalizeChatResponse(
        {
          message: 'Choose a language before using /add.',
        },
        [],
      );
    }

    const languageLabel = getLanguageByCode(input.languageId)?.label ?? input.languageId;

    if (!command.argumentText) {
      return normalizeChatResponse(
        {
          message: `Type /add followed by note text to add a note to ${languageLabel}.`,
        },
        [],
      );
    }

    if (!input.createNote) {
      throw new Error('The chat command handler is not configured to add notes right now.');
    }

    await input.createNote({
      languageId: input.languageId,
      content: command.argumentText,
    });

    return normalizeChatResponse(
      {
        message: `Added a note to ${languageLabel}.`,
      },
      [],
    );
  }

  return normalizeChatResponse(
    {
      message: `Command '${recognizedCommand.command}' recognized - full implementation coming in a future milestone.`,
    },
    [],
  );
}

export async function handleStudyPuckChatRequest(
  input: HandleStudyPuckChatRequestInput,
): Promise<ChatResponse> {
  const slashCommand = parseSlashCommand(input.input);

  if (slashCommand) {
    return handleDirectCommand(input, slashCommand);
  }

  if (input.routeContext.routeContextType === 'settings') {
    return normalizeChatResponse(
      {
        message: "Sorry, I can't explain anything about StudyPuck yet.",
      },
      [],
    );
  }

  // Derive the canonical context – this loads and verifies DB entities when the
  // request includes enough entity hints to do so (e.g. draft-card editing).
  const canonicalContext = await resolveCanonicalChatContext(
    input.userId,
    {
      routeContext: input.routeContext,
      languageId: input.languageId,
      noteId: input.noteId,
      cardId: input.cardId,
      focusedField: input.focusedField,
    },
    input.database ?? null,
  );

  const allowedSuggestionTypes = getAllowedSuggestionTypes(canonicalContext);
  const responseSchema = createChatResponseSchema(allowedSuggestionTypes);
  const prompt = buildStructuredChatPrompt({
    canonicalContext,
    userInput: input.input,
    allowedSuggestionTypes,
    conversationHistory: input.conversationHistory,
  });
  const generateStructured =
    input.generateStructured ??
    createAiService({
      privateEnv: input.privateEnv,
    }).generateStructured;
  const response = await generateStructured({
    metadata: {
      feature: 'chat',
      operation: 'conversation',
      userId: input.userId,
      languageId: input.languageId ?? 'unknown',
      noteId: input.noteId,
      routeContextType: input.routeContext.routeContextType,
    },
    systemPrompt: prompt.systemPrompt,
    userPrompt: prompt.userPrompt,
    responseSchema,
  });

  return normalizeChatResponse(response, allowedSuggestionTypes);
}
