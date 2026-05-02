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
export type MessageRole = 'assistant' | 'system' | 'user';

export type ConversationMessage = {
  id: string;
  role: MessageRole;
  content: string;
};

export type CommandBarState = {
  input: string;
  isFocused: boolean;
  isWaiting: boolean;
  lastSubmittedInput: string | null;
  autocompleteOpen: boolean;
  highlightedIndex: number;
  routeContext: RouteContext;
  messages: ConversationMessage[];
  desktopConversationCollapsed: boolean;
  desktopContextWidth: number;
  mobileSheetOpen: boolean;
  unreadCount: number;
};

export type CommandResponder = (
  input: string,
  routeContext: RouteContext
) => string | null | Promise<string | null>;

const DEFAULT_CONTEXT_WIDTH: Record<CommandContext, number> = {
  global: 62,
  'card-entry': 62,
  'card-review': 62,
  'translation-drills': 38,
};

let messageCounter = 0;

function createMessage(role: MessageRole, content: string): ConversationMessage {
  messageCounter += 1;

  return {
    id: `command-message-${messageCounter}`,
    role,
    content,
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
    responder?: CommandResponder
  ) {
    clearPendingTimer();
    let responseText: string;

    try {
      responseText = (await responder?.(input, routeContext)) ?? buildAssistantResponse(input, routeContext);
    } catch (error) {
      responseText = error instanceof Error ? error.message : 'Something went wrong while handling that command.';
    }

    store.update((state) => {
      if (!state.isWaiting) {
        return state;
      }

      return {
        ...state,
        isWaiting: false,
        lastSubmittedInput: null,
        messages: [...state.messages, createMessage('assistant', responseText)],
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
      let shouldScheduleResponse = false;

      store.update((state) => {
        submittedInput = state.input.trim();
        routeContext = state.routeContext;

        if (!submittedInput || state.isWaiting) {
          return state;
        }

        shouldScheduleResponse = true;

        return {
          ...state,
          input: '',
          isWaiting: true,
          lastSubmittedInput: submittedInput,
          autocompleteOpen: false,
          highlightedIndex: 0,
          messages: [...state.messages, createMessage('user', submittedInput)],
        };
      });

      if (!shouldScheduleResponse) {
        return;
      }

      clearPendingTimer();

      if (!browser) {
        void finishPendingResponse(submittedInput, routeContext, responder);
        return;
      }

      pendingResponseTimer = setTimeout(() => {
        void finishPendingResponse(submittedInput, routeContext, responder);
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
  };
}

export const commandBar = createCommandBarStore();
export type { CommandContext, CommandDefinition, RouteContext } from '$lib/command-bar/shared.js';
export { getFilteredCommandGroups, resolveRouteContext };
