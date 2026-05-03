import { browser } from '$app/environment';
import { writable } from 'svelte/store';
import {
  defaultRouteContext,
  findRecognizedCommand,
  getFilteredCommandGroups,
  resolveRouteContext,
  type CommandContext,
  type CommandDefinition,
  type RouteContext,
} from '$lib/command-bar/shared.js';
import { PROMPT_HISTORY_CAP, type ChatResponse, type ChatSuggestion, type ConversationHistoryTurn } from '$lib/chat.js';
export type MessageRole = 'assistant' | 'system' | 'user';

export type ConversationMessage = {
  id: string;
  role: MessageRole;
  content: string;
  suggestions?: ChatSuggestion[];
};

export type CommandBarState = {
  input: string;
  isFocused: boolean;
  isWaiting: boolean;
  lastSubmittedInput: string | null;
  autocompleteOpen: boolean;
  highlightedIndex: number;
  routeContext: RouteContext;
  /** Active entity context used to detect when the conversation must be reset. */
  activeLanguageId: string | null;
  activeNoteId: string | null;
  activeCardId: string | null;
  messages: ConversationMessage[];
  desktopConversationCollapsed: boolean;
  desktopContextWidth: number;
  mobileSheetOpen: boolean;
  unreadCount: number;
};

export type CommandResponder = (
  input: string,
  routeContext: RouteContext,
  /** The captured store state at the moment the user's message was submitted. */
  submissionState: CommandBarState,
) => ChatResponse | string | null | Promise<ChatResponse | string | null>;

const DEFAULT_CONTEXT_WIDTH: Record<CommandContext, number> = {
  global: 62,
  'card-entry': 62,
  'card-review': 62,
  'translation-drills': 38,
};

let messageCounter = 0;

function createMessage(role: MessageRole, content: string, suggestions: ChatSuggestion[] = []): ConversationMessage {
  messageCounter += 1;

  return {
    id: `command-message-${messageCounter}`,
    role,
    content,
    suggestions,
  };
}

function initialState(): CommandBarState {
  return {
    input: '',
    isFocused: false,
    isWaiting: false,
    lastSubmittedInput: null,
    autocompleteOpen: false,
    highlightedIndex: 0,
    routeContext: defaultRouteContext(),
    activeLanguageId: null,
    activeNoteId: null,
    activeCardId: null,
    messages: [],
    desktopConversationCollapsed: false,
    desktopContextWidth: DEFAULT_CONTEXT_WIDTH.global,
    mobileSheetOpen: false,
    unreadCount: 0,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function isAutocompleteInput(input: string) {
  return input.startsWith('/');
}

function buildAssistantResponse(input: string, routeContext: RouteContext) {
  if (!input.startsWith('/')) {
    return `AI features coming soon! Your message: '${input}'`;
  }

  const command = findRecognizedCommand(input, routeContext.commandContext);
  const [typedCommand] = input.trim().split(/\s+/, 1);

  if (!command) {
    return `Command '${typedCommand}' is not available in ${routeContext.label}.`;
  }

  return `Command '${command.command}' recognized - full implementation coming in a future milestone.`;
}

function createCommandBarStore() {
  const store = writable<CommandBarState>(initialState());
  let pendingResponseTimer: ReturnType<typeof setTimeout> | null = null;

  function clearPendingTimer() {
    if (!pendingResponseTimer) {
      return;
    }

    clearTimeout(pendingResponseTimer);
    pendingResponseTimer = null;
  }

  async function finishPendingResponse(
    input: string,
    routeContext: RouteContext,
    submissionState: CommandBarState,
    responder?: CommandResponder
  ) {
    clearPendingTimer();
    let responseContent: string;
    let responseSuggestions: ChatSuggestion[] = [];

    try {
      const result = (await responder?.(input, routeContext, submissionState)) ?? buildAssistantResponse(input, routeContext);

      if (result !== null && typeof result === 'object' && 'message' in result) {
        responseContent = result.message;
        responseSuggestions = result.suggestions ?? [];
      } else {
        responseContent = result ?? buildAssistantResponse(input, routeContext);
      }
    } catch (error) {
      responseContent = error instanceof Error ? error.message : 'Something went wrong while handling that command.';
    }

    store.update((state) => {
      if (!state.isWaiting) {
        return state;
      }

      return {
        ...state,
        isWaiting: false,
        lastSubmittedInput: null,
        messages: [...state.messages, createMessage('assistant', responseContent, responseSuggestions)],
        desktopConversationCollapsed: false,
        mobileSheetOpen: true,
        unreadCount: 0,
      };
    });
  }

  return {
    subscribe: store.subscribe,

    setPathname(pathname: string) {
      const routeContext = resolveRouteContext(pathname);

      store.update((state) => {
        if (
          state.routeContext.pathname === routeContext.pathname &&
          state.routeContext.commandContext === routeContext.commandContext &&
          state.routeContext.label === routeContext.label
        ) {
          return state;
        }

        const contextChanged =
          state.routeContext.commandContext !== routeContext.commandContext ||
          state.routeContext.label !== routeContext.label;

        if (!contextChanged) {
          return { ...state, routeContext };
        }

        clearPendingTimer();

        return {
          ...state,
          routeContext,
          input: '',
          isWaiting: false,
          lastSubmittedInput: null,
          autocompleteOpen: false,
          highlightedIndex: 0,
          messages: [],
          desktopConversationCollapsed: false,
          desktopContextWidth: DEFAULT_CONTEXT_WIDTH[routeContext.commandContext],
          mobileSheetOpen: false,
          unreadCount: 0,
        };
      });
    },

    setFocused(isFocused: boolean) {
      store.update((state) => ({
        ...state,
        isFocused,
      }));
    },

    /**
     * Updates the active entity context (language, note, card) and resets the
     * conversation whenever any of those identifiers change.  Call this from
     * route components whenever the active language, note, or draft card changes.
     */
    setEntityContext(languageId: string | null, noteId: string | null, cardId: string | null) {
      store.update((state) => {
        const entityChanged =
          state.activeLanguageId !== languageId ||
          state.activeNoteId !== noteId ||
          state.activeCardId !== cardId;

        if (!entityChanged) {
          return state;
        }

        clearPendingTimer();

        return {
          ...state,
          activeLanguageId: languageId,
          activeNoteId: noteId,
          activeCardId: cardId,
          input: '',
          isWaiting: false,
          lastSubmittedInput: null,
          autocompleteOpen: false,
          highlightedIndex: 0,
          messages: [],
          desktopConversationCollapsed: false,
          mobileSheetOpen: false,
          unreadCount: 0,
        };
      });
    },

    setInput(input: string) {
      store.update((state) => ({
        ...state,
        input,
        autocompleteOpen: isAutocompleteInput(input),
        highlightedIndex: 0,
      }));
    },

    closeAutocomplete() {
      store.update((state) => ({
        ...state,
        autocompleteOpen: false,
        highlightedIndex: 0,
      }));
    },

    normaliseHighlightedIndex(visibleCount: number) {
      store.update((state) => ({
        ...state,
        highlightedIndex: visibleCount === 0 ? 0 : clamp(state.highlightedIndex, 0, visibleCount - 1),
      }));
    },

    moveSelection(visibleCount: number, delta: number) {
      store.update((state) => {
        if (visibleCount === 0) {
          return {
            ...state,
            highlightedIndex: 0,
          };
        }

        return {
          ...state,
          highlightedIndex: (state.highlightedIndex + delta + visibleCount) % visibleCount,
        };
      });
    },

    selectCommand(command: CommandDefinition) {
      store.update((state) => ({
        ...state,
        input: command.insertText,
        autocompleteOpen: false,
        highlightedIndex: 0,
      }));
    },

    submit(responder?: CommandResponder) {
      let submittedInput = '';
      let routeContext = defaultRouteContext();
      let capturedState: CommandBarState = initialState();
      let shouldScheduleResponse = false;

      store.update((state) => {
        submittedInput = state.input.trim();
        routeContext = state.routeContext;

        if (!submittedInput || state.isWaiting) {
          return state;
        }

        shouldScheduleResponse = true;

        const nextState: CommandBarState = {
          ...state,
          input: '',
          isWaiting: true,
          lastSubmittedInput: submittedInput,
          autocompleteOpen: false,
          highlightedIndex: 0,
          messages: [...state.messages, createMessage('user', submittedInput)],
        };

        capturedState = nextState;

        return nextState;
      });

      if (!shouldScheduleResponse) {
        return;
      }

      clearPendingTimer();

      if (!browser) {
        void finishPendingResponse(submittedInput, routeContext, capturedState, responder);
        return;
      }

      pendingResponseTimer = setTimeout(() => {
        void finishPendingResponse(submittedInput, routeContext, capturedState, responder);
      }, 650);
    },

    cancelPending() {
      clearPendingTimer();

      store.update((state) => ({
        ...state,
        isWaiting: false,
        input: state.lastSubmittedInput ?? state.input,
        lastSubmittedInput: null,
        autocompleteOpen: isAutocompleteInput(state.lastSubmittedInput ?? state.input),
        highlightedIndex: 0,
      }));
    },

    /**
     * Appends a standalone assistant message to the conversation without
     * going through the submit/respond cycle.  Useful for surfacing async
     * operation results (e.g. suggestion execution feedback).
     */
    pushAssistantMessage(content: string) {
      store.update((state) => ({
        ...state,
        messages: [...state.messages, createMessage('assistant', content)],
        desktopConversationCollapsed: false,
        mobileSheetOpen: true,
        unreadCount: 0,
      }));
    },

    openConversation() {
      store.update((state) => ({
        ...state,
        desktopConversationCollapsed: false,
        mobileSheetOpen: true,
        unreadCount: 0,
      }));
    },

    collapseConversation() {
      store.update((state) => ({
        ...state,
        desktopConversationCollapsed: true,
        mobileSheetOpen: false,
      }));
    },

    closeMobileSheet() {
      store.update((state) => ({
        ...state,
        mobileSheetOpen: false,
      }));
    },

    setMobileSheetOpen(isOpen: boolean) {
      store.update((state) => ({
        ...state,
        mobileSheetOpen: isOpen,
      }));
    },

    togglePaneDominance() {
      store.update((state) => {
        return {
          ...state,
          desktopConversationCollapsed: false,
          desktopContextWidth: state.desktopContextWidth > 50 ? 38 : 62,
          unreadCount: 0,
          mobileSheetOpen: state.mobileSheetOpen,
          routeContext: state.routeContext,
          input: state.input,
          isFocused: state.isFocused,
          isWaiting: state.isWaiting,
          lastSubmittedInput: state.lastSubmittedInput,
          autocompleteOpen: state.autocompleteOpen,
          highlightedIndex: state.highlightedIndex,
          messages: state.messages,
        };
      });
    },

    setDesktopContextWidth(width: number) {
      store.update((state) => ({
        ...state,
        desktopConversationCollapsed: false,
        desktopContextWidth: clamp(width, 28, 72),
        unreadCount: 0,
      }));
    },

    /**
     * Returns the recent visible messages formatted as a bounded conversation
     * history window suitable for inclusion in the backend chat request.
     * Only user and assistant turns are included; system messages are excluded.
     */
    getPromptHistory(submissionState: CommandBarState): ConversationHistoryTurn[] {
      return submissionState.messages
        .filter((message): message is ConversationMessage & { role: 'user' | 'assistant' } =>
          message.role === 'user' || message.role === 'assistant',
        )
        .slice(-PROMPT_HISTORY_CAP)
        .map((message) => ({ role: message.role, content: message.content }));
    },
  };
}

export const commandBar = createCommandBarStore();
export type { CommandContext, CommandDefinition, RouteContext } from '$lib/command-bar/shared.js';
export { getFilteredCommandGroups, resolveRouteContext };
