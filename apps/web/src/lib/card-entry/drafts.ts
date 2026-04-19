import type { CardEntryDraftListItemData } from '$lib/server/card-entry.js';

export function filterDraftCards(
  items: CardEntryDraftListItemData[],
  searchQuery: string,
  selectedGroupIds: string[]
): CardEntryDraftListItemData[] {
  const normalizedSearchQuery = searchQuery.trim().toLocaleLowerCase();
  const selectedGroupIdSet = new Set(selectedGroupIds);

  return items.filter((item) => {
    const matchesSearch =
      normalizedSearchQuery.length === 0 ||
      item.content.toLocaleLowerCase().includes(normalizedSearchQuery) ||
      (item.meaning?.toLocaleLowerCase().includes(normalizedSearchQuery) ?? false) ||
      item.sourceNotes.some((sourceNote) => sourceNote.content.toLocaleLowerCase().includes(normalizedSearchQuery));

    if (!matchesSearch) {
      return false;
    }

    if (selectedGroupIdSet.size === 0) {
      return true;
    }

    return item.groups.some((group) => selectedGroupIdSet.has(group.groupId));
  });
}

export function formatDraftGroupFilterLabel(selectedGroupNames: string[]): string {
  if (selectedGroupNames.length === 0) {
    return 'All groups';
  }

  if (selectedGroupNames.length === 1) {
    return `Group: ${selectedGroupNames[0]}`;
  }

  return `Groups: ${selectedGroupNames.length}`;
}
