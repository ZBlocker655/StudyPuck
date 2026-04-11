import { describe, expect, it } from 'vitest';

import { getFilteredCommandGroups, resolveRouteContext } from './commandBar.js';

describe('commandBar route context', () => {
  it('maps language-prefixed mini-app routes to the correct command context', () => {
    expect(resolveRouteContext('/zh/card-review')).toMatchObject({
      commandContext: 'card-review',
      label: 'Card Review',
    });
    expect(resolveRouteContext('/zh/card-entry')).toMatchObject({
      commandContext: 'card-entry',
      label: 'Card Entry',
    });
    expect(resolveRouteContext('/zh/translation-drills')).toMatchObject({
      commandContext: 'translation-drills',
      label: 'Translation Drills',
    });
  });

  it('keeps dashboard and settings in the global command context', () => {
    expect(resolveRouteContext('/zh')).toMatchObject({
      commandContext: 'global',
      label: 'Dashboard',
    });
    expect(resolveRouteContext('/zh/settings')).toMatchObject({
      commandContext: 'global',
      label: 'Settings',
    });
  });
});

describe('commandBar command filtering', () => {
  it('shows context commands before global commands when the command list is open', () => {
    const groups = getFilteredCommandGroups('card-review', '/');

    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({
      label: 'Current context',
    });
    expect(groups[0].commands.map((command) => command.command)).toEqual(['/pin', '/snooze', '/next']);
    expect(groups[1]).toMatchObject({
      label: 'Global',
    });
    expect(groups[1].commands.map((command) => command.command)).toEqual(['/add', '/lang', '/help']);
  });

  it('does not duplicate a global-only group when already in the global context', () => {
    const groups = getFilteredCommandGroups('global', '/h');

    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      label: 'Global',
    });
    expect(groups[0].commands.map((command) => command.command)).toEqual(['/help']);
  });
});
