// @vitest-environment jsdom

import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import CardsSubnav from './CardsSubnav.svelte';

describe('CardsSubnav', () => {
  it('renders cards and groups links with the correct active state', () => {
    render(CardsSubnav, {
      props: {
        lang: 'zh',
        activeSection: 'groups',
      },
    });

    const cardsLink = screen.getByRole('link', { name: 'Cards' });
    const groupsLink = screen.getByRole('link', { name: 'Groups' });

    expect(cardsLink.getAttribute('href')).toBe('/zh/cards');
    expect(groupsLink.getAttribute('href')).toBe('/zh/cards/groups');
    expect(cardsLink.getAttribute('aria-current')).toBeNull();
    expect(groupsLink.getAttribute('aria-current')).toBe('page');
  });
});
