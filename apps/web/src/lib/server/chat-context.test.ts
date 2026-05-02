import { describe, expect, it } from 'vitest';
import { resolveRouteContext } from '$lib/command-bar/shared.js';
import { resolveCanonicalChatContext, getAllowedSuggestionTypes } from './chat-context.js';

// ── Tests: non-actionable context ─────────────────────────────────────────────

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

// ── Tests: draft card editor context (database path) ─────────────────────────

describe('resolveCanonicalChatContext — draft card editor', () => {
  it('attempts a DB call when all entity hints + database are provided', async () => {
    // Pass an empty object as a fake database — the resolver will call
    // getNoteWithDraftCards which uses the db as a Drizzle query builder.
    // The empty object will cause a runtime error inside the DB query,
    // confirming that the draft-card-editor code path was entered rather than
    // the non-actionable fallback.
    const fakeDb = {} as Parameters<typeof resolveCanonicalChatContext>[2];

    await expect(
      resolveCanonicalChatContext(
        'user-1',
        {
          routeContext: resolveRouteContext('/es/card-entry'),
          languageId: 'es',
          noteId: 'note-1',
          cardId: 'card-1',
        },
        fakeDb,
      ),
    ).rejects.toThrow(); // Confirms the DB-loading path was taken, not the fallback
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
