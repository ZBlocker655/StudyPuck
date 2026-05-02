import { describe, expect, it, vi } from 'vitest';
import { resolveRouteContext } from '$lib/command-bar/shared.js';
import { resolveCanonicalChatContext, getAllowedSuggestionTypes } from './chat-context.js';

// Stub database that returns a simple note+card workspace
function makeStubDatabase(
  noteResult: unknown = null,
  languagesResult: unknown[] = [],
) {
  return {
    _getNoteWithDraftCards: vi.fn(async () => noteResult),
    _getActiveUserLanguages: vi.fn(async () => languagesResult),
  };
}

describe('resolveCanonicalChatContext', () => {
  it('returns a non-actionable context when no database is provided', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/card-entry'),
        languageId: 'es',
        noteId: 'note-1',
        cardId: 'card-1',
      },
      null,
    );

    expect(context.contextType).toBe('non_actionable');
    expect(context.allowedSuggestionTypes).toEqual([]);
  });

  it('returns a non-actionable context when card-entry has no cardId', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/card-entry'),
        languageId: 'es',
        noteId: 'note-1',
        // no cardId
      },
      null,
    );

    expect(context.contextType).toBe('non_actionable');
    expect(getAllowedSuggestionTypes(context)).toEqual([]);
  });

  it('returns a non-actionable context for cards, stats, and workspace routes', async () => {
    for (const pathname of ['/es/cards', '/es/stats', '/es']) {
      const context = await resolveCanonicalChatContext(
        'user-1',
        {
          routeContext: resolveRouteContext(pathname),
          languageId: 'es',
        },
        null,
      );

      expect(context.contextType).toBe('non_actionable');
      expect(context.allowedSuggestionTypes).toEqual([]);
    }
  });

  it('includes the languageId and routeContextType in non-actionable context', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/zh/translation-drills'),
        languageId: 'zh',
      },
      null,
    );

    expect(context.contextType).toBe('non_actionable');
    if (context.contextType === 'non_actionable') {
      expect(context.languageId).toBe('zh');
      expect(context.routeContextType).toBe('translation-drills');
    }
  });
});

describe('getAllowedSuggestionTypes', () => {
  it('returns empty array for non-actionable context', async () => {
    const context = await resolveCanonicalChatContext(
      'user-1',
      {
        routeContext: resolveRouteContext('/es/cards'),
        languageId: 'es',
      },
      null,
    );

    expect(getAllowedSuggestionTypes(context)).toEqual([]);
  });
});
