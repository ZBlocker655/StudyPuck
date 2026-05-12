// @vitest-environment jsdom

import { writable } from 'svelte/store';
import { render, screen } from '@testing-library/svelte';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

type MockPageStoreValue = {
  params: { lang: string; groupId?: string; noteId?: string };
  route: { id: string };
  status: number;
  error: null;
  data: Record<string, never>;
  form: undefined;
  state: Record<string, never>;
  url: URL;
};

const pageStore = writable<MockPageStoreValue>({
  params: { lang: 'zh' },
  route: { id: '/[lang]/cards/groups' },
  status: 200,
  error: null,
  data: {},
  form: undefined,
  state: {},
  url: new URL('https://studypuck.test/zh/cards/groups'),
});

vi.mock('$app/stores', () => ({
  page: pageStore,
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
}));

describe('Groups page', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }) as typeof window.matchMedia;
  });

  afterAll(() => {
    vi.doUnmock('$app/stores');
    vi.doUnmock('$app/navigation');
  });

  it('renders a Translation Drills badge for configured groups', async () => {
    const { default: GroupsPage } = await import('./+page.svelte');

    render(GroupsPage, {
      props: {
        data: {
          session: null,
          authError: undefined,
          availableLanguages: [],
          cardEntryShell: {
            unprocessedNoteCount: 0,
          },
          groups: {
            items: [
              {
                groupId: 'group-1',
                groupName: 'Chat',
                description: 'Conversation cards',
                activeCardCount: 5,
                translationDrills: {
                  enabled: true,
                  drawPileName: 'Chat practice',
                  pileSizeLimit: 6,
                },
              },
              {
                groupId: 'group-2',
                groupName: 'Travel',
                description: null,
                activeCardCount: 2,
                translationDrills: {
                  enabled: false,
                  drawPileName: null,
                  pileSizeLimit: 10,
                },
              },
            ],
            totalCount: 2,
          },
        },
      },
    });

    expect(screen.getByText('Translation Drills')).toBeTruthy();
    expect(screen.getByText('Chat practice')).toBeTruthy();
  });
});
