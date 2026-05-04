import type { CardLibraryGroupListItemData } from '$lib/server/cards.js';

export function sortCardLibraryGroupItems(groups: CardLibraryGroupListItemData[]) {
  return [...groups].sort((left, right) => left.groupName.localeCompare(right.groupName));
}

export function buildDeleteGroupMessage(group: CardLibraryGroupListItemData) {
  if (group.activeCardCount === 0) {
    return 'Are you sure? This cannot be undone.';
  }

  return `This group has ${group.activeCardCount} card${group.activeCardCount === 1 ? '' : 's'}. Deleting the group will remove the group tag from those cards, but the cards themselves will not be deleted.`;
}
