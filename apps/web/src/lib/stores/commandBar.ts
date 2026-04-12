import { browser } from '$app/environment';
import { writable } from 'svelte/store';

export type CommandContext = 'global' | 'card-entry' | 'card-review' | 'translation-drills';
export type MessageRole = 'assistant' | 'system' | 'user';

export type RouteContext = {
  commandContext: CommandContext;
  label: string;
  pathname: string;
};

export type CommandDefinition = {
  command: string;
  description: string;
  commandContext: CommandContext | 'global';
  insertText: string;
};

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

const COMMANDS: CommandDefinition[] = [
  {
    command: '/add',
    description: 'Add a note to the inbox for the current language.',
    commandContext: 'global',
    insertText: '/add ',
  },
  {
    command: '/lang',
    description: 'Switch to the specified language.',
    commandContext: 'global',
    insertText: '/lang ',
  },
  {
    command: '/help',
    description: 'Display all commands available in the current context.',
    commandContext: 'global',
    insertText: '/help',
  },
  {
    command: '/process',
    description: 'Open the processing workspace for the next inbox item.',
    commandContext: 'card-entry',
    insertText: '/process',
  },
  {
    command: '/defer',
    description: 'Defer the current inbox item.',
    commandContext: 'card-entry',
    insertText: '/defer',
  },
  {
    command: '/pin',
    description: 'Pin the current card to Translation Drills context.',
    commandContext: 'card-review',
    insertText: '/pin',
  },
  {
    command: '/snooze',
    description: 'Snooze the current card.',
    commandContext: 'card-review',
    insertText: '/snooze',
  },
  {
    command: '/next',
    description: 'Move to the next card in the current review session.',
    commandContext: 'card-review',
    insertText: '/next',
  },
  {
    command: '/next',
    description: 'Request the next translation challenge.',
    commandContext: 'translation-drills',
    insertText: '/next',
  },
  {
    command: '/dismiss',
    description: 'Dismiss the current card from the translation context.',
    commandContext: 'translation-drills',
    insertText: '/dismiss',
  },
  {
    command: '/draw',
    description: 'Draw more cards from a group into the translation context.',
    commandContext: 'translation-drills',
    insertText: '/draw ',
  },
];

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

function defaultRouteContext(): RouteContext {
  return {
    commandContext: 'global',
    label: 'Workspace',
    pathname: '',
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

export function resolveRouteContext(pathname: string): RouteContext {
  const segments = pathname.split('/').filter(Boolean);
  const section = segments[1];

  if (!section) {
    return {
      commandContext: 'global',
      label: segments[0] ? 'Dashboard' : 'Workspace',
      pathname,
    };
  }

  switch (section) {
    case 'card-entry':
      return { commandContext: 'card-entry', label: 'Card Entry', pathname };
    case 'card-review':
      return { commandContext: 'card-review', label: 'Card Review', pathname };
    case 'translation-drills':
      return { commandContext: 'translation-drills', label: 'Translation Drills', pathname };
    case 'cards':
      return { commandContext: 'global', label: 'Cards', pathname };
    case 'settings':
      return { commandContext: 'global', label: 'Settings', pathname };
    case 'stats':
      return { commandContext: 'global', label: 'Statistics', pathname };
    default:
      return { commandContext: 'global', label: 'Workspace', pathname };
  }
}

function isAutocompleteInput(input: string) {
  return input.startsWith('/');
}

function getCommandQuery(input: string) {
  return input.slice(1).trim().toLowerCase();
}

function getCommandsForContext(commandContext: CommandContext) {
  return COMMANDS.filter(
    (command) => command.commandContext === commandContext || command.commandContext === 'global',
  );
}

function findRecognizedCommand(input: string, commandContext: CommandContext) {
  const [typedCommand] = input.trim().split(/\s+/, 1);

  return getCommandsForContext(commandContext).find((command) => command.command === typedCommand) ?? null;
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

  function finishPendingResponse(input: string, routeContext: RouteContext) {
    clearPendingTimer();

    store.update((state) => {
      if (!state.isWaiting) {
        return state;
      }

      return {
        ...state,
        isWaiting: false,
        lastSubmittedInput: null,
        messages: [...state.messages, createMessage('assistant', buildAssistantResponse(input, routeContext))],
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

    submit() {
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
        finishPendingResponse(submittedInput, routeContext);
        return;
      }

      pendingResponseTimer = setTimeout(() => {
        finishPendingResponse(submittedInput, routeContext);
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

export function getFilteredCommandGroups(commandContext: CommandContext, input: string) {
  const query = getCommandQuery(input);
  const contextCommands =
    commandContext === 'global'
      ? []
      : COMMANDS.filter((command) => command.commandContext === commandContext).filter((command) =>
          command.command.slice(1).startsWith(query),
        );
  const globalCommands = COMMANDS.filter((command) => command.commandContext === 'global').filter((command) =>
    command.command.slice(1).startsWith(query),
  );

  return [
    { label: 'Current context', commands: contextCommands },
    { label: 'Global', commands: globalCommands },
  ].filter((group) => group.commands.length > 0);
}

export const commandBar = createCommandBarStore();
