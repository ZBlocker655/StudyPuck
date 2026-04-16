import { describe, expect, it, vi } from 'vitest';
import { resolveCardEntryCommandResponse } from './card-entry.js';

describe('resolveCardEntryCommandResponse', () => {
  it('returns null for non-add commands', async () => {
    const createNote = vi.fn();
    const openQuickAdd = vi.fn();

    await expect(
      resolveCardEntryCommandResponse({
        input: '/help',
        activeLanguageCode: 'es',
        createNote,
        openQuickAdd,
      })
    ).resolves.toBeNull();

    expect(createNote).not.toHaveBeenCalled();
    expect(openQuickAdd).not.toHaveBeenCalled();
  });

  it('opens the quick-add drawer for bare /add', async () => {
    const createNote = vi.fn();
    const openQuickAdd = vi.fn();

    await expect(
      resolveCardEntryCommandResponse({
        input: '/add',
        activeLanguageCode: 'es',
        createNote,
        openQuickAdd,
      })
    ).resolves.toBe('Opened Quick Add for Spanish.');

    expect(openQuickAdd).toHaveBeenCalledWith({ languageCode: 'es' });
    expect(createNote).not.toHaveBeenCalled();
  });

  it('creates a note for /add with inline text', async () => {
    const createNote = vi.fn().mockResolvedValue(undefined);
    const onNoteCreated = vi.fn();

    await expect(
      resolveCardEntryCommandResponse({
        input: '/add hola desde comando',
        activeLanguageCode: 'es',
        createNote,
        openQuickAdd: vi.fn(),
        onNoteCreated,
      })
    ).resolves.toBe('Added a note to Spanish.');

    expect(createNote).toHaveBeenCalledWith({
      languageId: 'es',
      content: 'hola desde comando',
    });
    expect(onNoteCreated).toHaveBeenCalledTimes(1);
  });
});
