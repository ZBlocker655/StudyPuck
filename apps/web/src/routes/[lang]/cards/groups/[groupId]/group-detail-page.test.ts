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
  params: { lang: 'zh', groupId: 'group-1' },
  route: { id: '/[lang]/cards/groups/[groupId]' },
  status: 200,
  error: null,
  data: {},
  form: undefined,
  state: {},
  url: new URL('https://studypuck.test/zh/cards/groups/group-1'),
});

vi.mock('$app/stores', () => ({
  page: pageStore,
}));

vi.mock('$app/navigation', () => ({
  goto: vi.fn(),
}));

describe('Group detail page', () => {
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

  it('shows Translation Drills setup controls for the current group', async () => {
    const { default: GroupDetailPage } = await import('./+page.svelte');

    render(GroupDetailPage, {
      props: {
        data: {
          session: null,
          authError: undefined,
          availableLanguages: [],
          cardEntryShell: {
            unprocessedNoteCount: 0,
          },
          groupDetail: {
            group: {
              groupId: 'group-1',
              groupName: 'Chat',
              description: 'Conversation cards',
              activeCardCount: 3,
              translationDrills: {
                enabled: true,
                drawPileName: 'Chat practice',
                pileSizeLimit: 6,
              },
            },
            cards: {
              items: [],
              totalCount: 0,
              filteredCardIds: [],
              filters: {
                searchText: '',
                groupIds: [],
                cardType: null,
              },
              availableGroups: [],
            },
            addableCards: {
              items: [],
              totalCount: 0,
            },
          },
          selectedCard: null,
          selectedCardAvailableGroups: [],
        },
      },
    });

    expect(screen.getByRole('heading', { name: 'Draw pile setup' })).toBeTruthy();
    const toggle = screen.getByLabelText('Use this group in Translation Drills') as HTMLInputElement;
    expect(toggle.checked).toBe(true);
    expect(screen.getByDisplayValue('Chat practice')).toBeTruthy();
    expect(screen.getByDisplayValue('6')).toBeTruthy();
  }, 10000);
});
