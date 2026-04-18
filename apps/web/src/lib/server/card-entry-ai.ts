import {
  finalizeInboxNoteAiProcessing,
  getNoteWithDraftCards,
  transitionInboxNoteAiState,
  type InboxNoteAiState,
  type TransactionCapableDatabaseConnection,
} from '@studypuck/database';
import { buildCardEntryPreprocessPrompt, cardEntryPreprocessResponseSchema } from '$lib/server/ai-prompts/card-entry.js';
import { createAiService } from '$lib/server/ai-service.js';

const TERMINAL_AI_STATES: InboxNoteAiState[] = ['complete', 'failed'];

export async function ensureCardEntryNoteProcessingState(input: {
  userId: string;
  languageId: string;
  noteId: string;
  transactionDatabase: TransactionCapableDatabaseConnection;
  privateEnv: Record<string, string | undefined>;
}) {
  const workspace = await getNoteWithDraftCards(
    input.userId,
    input.languageId,
    input.noteId,
    input.transactionDatabase as never
  );

  if (!workspace) {
    return null;
  }

  if (workspace.note.state !== 'unprocessed' || TERMINAL_AI_STATES.includes(workspace.note.aiState as InboxNoteAiState)) {
    return workspace;
  }

  if (workspace.note.aiState === 'processing') {
    return workspace;
  }

  const claimed = await transitionInboxNoteAiState(
    input.userId,
    input.languageId,
    input.noteId,
    'queued',
    'processing',
    input.transactionDatabase as never
  );

  if (!claimed) {
    return getNoteWithDraftCards(input.userId, input.languageId, input.noteId, input.transactionDatabase as never);
  }

  try {
    const aiService = createAiService({
      privateEnv: input.privateEnv,
    });
    const prompt = buildCardEntryPreprocessPrompt({
      languageId: input.languageId,
      noteContent: workspace.note.content,
    });
    const response = await aiService.generateStructured({
      metadata: {
        feature: 'card-entry',
        operation: 'preprocess-note',
        userId: input.userId,
        languageId: input.languageId,
        noteId: input.noteId,
      },
      systemPrompt: prompt.systemPrompt,
      userPrompt: prompt.userPrompt,
      responseSchema: cardEntryPreprocessResponseSchema,
      cacheKey: `card-entry:${input.userId}:${input.languageId}:${input.noteId}:preprocess`,
    });

    return finalizeInboxNoteAiProcessing(
      {
        userId: input.userId,
        languageId: input.languageId,
        noteId: input.noteId,
        draftCards: response.draftCards.map((draftCard) => ({
          content: draftCard.content,
          meaning: draftCard.meaning,
          examples: draftCard.examples,
          mnemonics: draftCard.mnemonics,
          llmInstructions: draftCard.llmInstructions,
          cardType: 'word',
        })),
      },
      input.transactionDatabase as never
    );
  } catch (error) {
    console.error('Card Entry AI preprocessing failed:', error);

    await transitionInboxNoteAiState(
      input.userId,
      input.languageId,
      input.noteId,
      'processing',
      'failed',
      input.transactionDatabase as never
    );

    return getNoteWithDraftCards(input.userId, input.languageId, input.noteId, input.transactionDatabase as never);
  }
}
