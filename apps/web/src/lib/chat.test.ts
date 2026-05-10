import { describe, expect, it } from 'vitest';
import { createChatResponseSchema } from '$lib/chat.js';

describe('createChatResponseSchema', () => {
  it('accepts add_inbox_note suggestions with minimal typed payload', () => {
    const schema = createChatResponseSchema(['add_inbox_note']);

    expect(
      schema.parse({
        message: 'This would make a good review note.',
        suggestions: [{ type: 'add_inbox_note', payload: { text: 'Know when to use 谈论 vs 聊天' } }],
      }),
    ).toEqual({
      message: 'This would make a good review note.',
      suggestions: [{ type: 'add_inbox_note', payload: { text: 'Know when to use 谈论 vs 聊天' } }],
    });
  });

  it('rejects add_inbox_note suggestions when that type is not allowed', () => {
    const schema = createChatResponseSchema([]);

    expect(() =>
      schema.parse({
        message: 'No action here.',
        suggestions: [{ type: 'add_inbox_note', payload: { text: 'Review a durable distinction' } }],
      }),
    ).toThrow('expected never');
  });
});
