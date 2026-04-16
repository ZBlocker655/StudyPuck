import { getLanguageByCode } from '$lib/config/languages.js';

type ResolveCardEntryCommandResponseInput = {
  input: string;
  activeLanguageCode: string;
  createNote: (payload: { languageId: string; content: string }) => Promise<void>;
  openQuickAdd: (request: { languageCode: string; initialContent?: string }) => void;
  onNoteCreated?: () => Promise<void> | void;
};

function parseAddCommand(input: string): { content: string } | null {
  const trimmedInput = input.trim();

  if (!trimmedInput.startsWith('/')) {
    return null;
  }

  const [typedCommand] = trimmedInput.split(/\s+/, 1);

  if (typedCommand !== '/add') {
    return null;
  }

  return {
    content: trimmedInput.slice(typedCommand.length).trim(),
  };
}

export async function resolveCardEntryCommandResponse(
  input: ResolveCardEntryCommandResponseInput
): Promise<string | null> {
  const parsedCommand = parseAddCommand(input.input);

  if (!parsedCommand) {
    return null;
  }

  const activeLanguage = getLanguageByCode(input.activeLanguageCode);
  const languageLabel = activeLanguage?.label ?? input.activeLanguageCode;

  if (parsedCommand.content.length === 0) {
    input.openQuickAdd({ languageCode: input.activeLanguageCode });
    return `Opened Quick Add for ${languageLabel}.`;
  }

  await input.createNote({
    languageId: input.activeLanguageCode,
    content: parsedCommand.content,
  });
  await input.onNoteCreated?.();

  return `Added a note to ${languageLabel}.`;
}
