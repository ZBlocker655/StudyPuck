type CreateInboxNotePayload = {
  languageId: string;
  content: string;
};

type CreateInboxNoteResponse = {
  noteId: string;
};

export async function createInboxNoteRequest(
  payload: CreateInboxNotePayload
): Promise<CreateInboxNoteResponse> {
  const response = await fetch('/api/card-entry/notes', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = (await response.json().catch(() => null)) as
    | { noteId?: string; message?: string }
    | null;

  if (!response.ok || !data?.noteId) {
    throw new Error(data?.message ?? 'The note could not be added right now.');
  }

  return {
    noteId: data.noteId,
  };
}

type AppendExampleSentencePayload = {
  lang: string;
  noteId: string;
  cardId: string;
  text: string;
};

/**
 * Appends an example sentence to a draft card by calling the dedicated server
 * endpoint.  Throws if the request fails.
 */
export async function appendExampleSentenceRequest(
  payload: AppendExampleSentencePayload
): Promise<void> {
  const { lang, noteId, cardId, text } = payload;

  const response = await fetch(
    `/${lang}/card-entry/notes/${noteId}/draft-cards/${cardId}/append-example`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({ text }),
    }
  );

  const data = (await response.json().catch(() => null)) as { message?: string } | null;

  if (!response.ok) {
    throw new Error(data?.message ?? 'The example sentence could not be saved right now.');
  }
}
