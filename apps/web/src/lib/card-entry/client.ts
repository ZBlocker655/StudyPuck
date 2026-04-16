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
