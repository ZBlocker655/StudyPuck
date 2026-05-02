import { chatResponseSchema, type ChatRequest, type ChatResponse } from '$lib/chat.js';

export async function requestStructuredChatResponse(payload: ChatRequest): Promise<ChatResponse> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const parsedBody = chatResponseSchema.safeParse(await response.json().catch(() => null));

  if (!response.ok || !parsedBody.success) {
    throw new Error(
      parsedBody.success
        ? parsedBody.data.message
        : `The chat assistant could not respond right now. (Status: ${response.status})`,
    );
  }

  return parsedBody.data;
}
