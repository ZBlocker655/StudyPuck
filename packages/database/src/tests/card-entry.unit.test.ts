import { describe, expect, it } from 'vitest';
import { signOffNote } from '../card-entry.js';

class FakeQuery<T> {
  constructor(private readonly result: T) {}

  from() {
    return this;
  }

  where() {
    return this;
  }

  orderBy() {
    return this;
  }

  limit() {
    return this;
  }

  innerJoin() {
    return this;
  }

  returning() {
    return this;
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

describe('Card Entry transaction behavior', () => {
  it('signs off notes without requiring nested transaction support on the inner transaction client', async () => {
    const note = {
      userId: 'auth0|card-entry-user',
      languageId: 'es',
      noteId: 'note-signoff-no-nested-tx',
      content: 'repasar para que',
      sourceType: 'manual',
      state: 'unprocessed' as const,
      aiState: 'failed' as const,
      createdAt: new Date('2026-04-01T00:00:00.000Z'),
    };

    const selectResults = [
      [note],
      [{ cardId: 'draft-no-nested-tx' }],
      [{ cardId: 'draft-no-nested-tx' }],
      [{ cardId: 'draft-no-nested-tx' }],
      [{ cardId: 'draft-no-nested-tx' }],
      [{ noteId: note.noteId }],
      [],
      [],
      [{ ...note, state: 'processed' as const }],
    ];

    const updateResults = [[], []];
    const insertResults = [[{
      userId: note.userId,
      languageId: note.languageId,
      date: '2026-04-01',
      notesCaptured: 0,
      notesProcessed: 1,
      notesDeferred: 0,
      notesDeleted: 0,
      draftCardsCreated: 0,
      cardsPromotedToActive: 1,
      groupsCreated: 0,
    }]];

    const tx = {
      select: () => new FakeQuery(selectResults.shift() ?? []),
      update: () => ({
        set: () => new FakeQuery(updateResults.shift() ?? []),
      }),
      insert: () => ({
        values: () => new FakeQuery(insertResults.shift() ?? []),
      }),
    };

    const outerDb = {
      transaction: async <T>(callback: (database: typeof tx) => Promise<T>) => callback(tx),
    };

    const result = await signOffNote(note.userId, note.languageId, note.noteId, outerDb as never);

    expect(result.promotedCardIds).toEqual(['draft-no-nested-tx']);
    expect(result.note.state).toBe('processed');
  });
});
