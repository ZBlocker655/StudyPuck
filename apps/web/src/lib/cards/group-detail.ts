import type {
  CardLibraryCardListItemData,
  CardLibraryData,
  CardLibraryGroupData,
} from '$lib/server/cards.js';

export type GroupDetailCardType = NonNullable<CardLibraryData['filters']['cardType']>;

export function buildGroupDetailMobileMeta(item: CardLibraryCardListItemData) {
  const segments = [];

  if (item.meaning) {
    segments.push(item.meaning);
  }

  segments.push(item.updatedAtLabel);
  return segments.join(' · ');
}

export function filterAddableGroupCards(items: CardLibraryCardListItemData[], query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return items;
  }

  return items.filter((item) => {
    const haystacks = [item.content, item.meaning ?? ''];
    return haystacks.some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
  });
}

export function matchesGroupDetailFilters(
  item: CardLibraryCardListItemData,
  searchQuery: string,
  selectedType: GroupDetailCardType | null,
) {
  if (selectedType && item.cardType !== selectedType) {
    return false;
  }

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();

  if (!normalizedQuery) {
    return true;
  }

  return [item.content, item.meaning ?? ''].some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
}

export function withCurrentGroupMembership(
  groups: CardLibraryGroupData[],
  currentGroup: CardLibraryGroupData,
) {
  if (groups.some((group) => group.groupId === currentGroup.groupId)) {
    return groups;
  }

  return [...groups, currentGroup].sort((left, right) => left.groupName.localeCompare(right.groupName));
}
