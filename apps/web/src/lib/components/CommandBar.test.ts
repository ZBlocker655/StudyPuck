// @vitest-environment node

import { createRawSnippet } from 'svelte';
import { render as renderServer } from 'svelte/server';
import { readable } from 'svelte/store';
import { describe, expect, it, vi } from 'vitest';

const pageStore = readable({
  params: { lang: 'zh' },
  route: { id: '/[lang]' },
  status: 200,
  error: null,
  data: {},
  form: undefined,
  state: {},
  url: new URL('https://studypuck.test/zh'),
});

vi.mock('$app/stores', () => ({
  page: pageStore,
}));

describe('CommandBar SSR', () => {
  it('renders on the server without touching document or window globals', async () => {
    const { default: CommandBar } = await import('./CommandBar.svelte');

    const snippet = createRawSnippet(() => ({
      render: () => '<section>context content</section>',
    }));

    expect(() =>
      renderServer(CommandBar, {
        props: {
          children: snippet,
        },
      }),
    ).not.toThrow();
  });
});
