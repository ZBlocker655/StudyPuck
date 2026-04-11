// @vitest-environment jsdom

import { createRawSnippet } from 'svelte';
import { readable } from 'svelte/store';
import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pageStore = readable({
  params: { lang: 'zh' },
  route: { id: '/[lang]/card-review' },
  status: 200,
  error: null,
  data: {},
  form: undefined,
  state: {},
  url: new URL('https://studypuck.test/zh/card-review'),
});

vi.mock('$app/stores', () => ({
  page: pageStore,
}));

describe('CommandBar component behavior', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('opens command autocomplete for slash input and shows the current context', async () => {
    const { default: CommandBar } = await import('./CommandBar.svelte');

    const snippet = createRawSnippet(() => ({
      render: () => '<section>context content</section>',
    }));

    render(CommandBar, {
      props: {
        children: snippet,
      },
    });

    const contextBlock = document.querySelector('.command-bar__context');
    expect(contextBlock).not.toBeNull();
    expect(within(contextBlock as HTMLElement).getByText('Card Review')).toBeTruthy();

    const textbox = screen.getByLabelText('Command bar');
    await fireEvent.input(textbox, { target: { value: '/n' } });

    expect(screen.getByText('/next')).toBeTruthy();
    expect(screen.getByText('Move to the next card in the current review session.')).toBeTruthy();
  });
});
