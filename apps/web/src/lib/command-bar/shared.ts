export type CommandContext = 'global' | 'card-entry' | 'card-review' | 'translation-drills';

export type ChatContextType =
  | 'workspace'
  | 'card-entry'
  | 'card-review'
  | 'translation-drills'
  | 'cards'
  | 'settings'
  | 'stats';

export type RouteContext = {
  commandContext: CommandContext;
  contextType: ChatContextType;
  label: string;
  pathname: string;
};

export type CommandDefinition = {
  command: string;
  description: string;
  commandContext: CommandContext | 'global';
  insertText: string;
};

export const COMMANDS: CommandDefinition[] = [
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

export function defaultRouteContext(): RouteContext {
  return {
    commandContext: 'global',
    contextType: 'workspace',
    label: 'Workspace',
    pathname: '',
  };
}

export function resolveRouteContext(pathname: string): RouteContext {
  const segments = pathname.split('/').filter(Boolean);
  const section = segments[1];

  if (!section) {
    return {
      commandContext: 'global',
      contextType: 'workspace',
      label: segments[0] ? 'Dashboard' : 'Workspace',
      pathname,
    };
  }

  switch (section) {
    case 'card-entry':
      return { commandContext: 'card-entry', contextType: 'card-entry', label: 'Card Entry', pathname };
    case 'card-review':
      return { commandContext: 'card-review', contextType: 'card-review', label: 'Card Review', pathname };
    case 'translation-drills':
      return {
        commandContext: 'translation-drills',
        contextType: 'translation-drills',
        label: 'Translation Drills',
        pathname,
      };
    case 'cards':
      return { commandContext: 'global', contextType: 'cards', label: 'Cards', pathname };
    case 'settings':
      return { commandContext: 'global', contextType: 'settings', label: 'Settings', pathname };
    case 'stats':
      return { commandContext: 'global', contextType: 'stats', label: 'Statistics', pathname };
    default:
      return { commandContext: 'global', contextType: 'workspace', label: 'Workspace', pathname };
  }
}

export function getCommandsForContext(commandContext: CommandContext) {
  return COMMANDS.filter(
    (command) => command.commandContext === commandContext || command.commandContext === 'global',
  );
}

export function findRecognizedCommand(input: string, commandContext: CommandContext) {
  const [typedCommand] = input.trim().split(/\s+/, 1);

  return getCommandsForContext(commandContext).find((command) => command.command === typedCommand) ?? null;
}

function getCommandQuery(input: string) {
  return input.slice(1).trim().toLowerCase();
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
