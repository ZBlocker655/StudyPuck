import type {
  CardLibraryCardListItemData,
  CardLibraryData,
  CardLibraryGroupData,
} from '$lib/server/cards.js';

export type CardLibraryCardType = NonNullable<CardLibraryData['filters']['cardType']>;

export const cardLibraryTypeOptions: Array<{
  value: CardLibraryCardType;
  label: string;
}> = [
  { value: 'word', label: 'Word' },
  { value: 'pattern', label: 'Pattern' },
  { value: 'complex_prompt', label: 'Complex prompt' },
];

export function formatCardLibraryGroupFilterLabel(selectedGroupNames: string[]): string {
  if (selectedGroupNames.length === 0) {
    return 'All groups';
  }

  if (selectedGroupNames.length === 1) {
    return `Group: ${selectedGroupNames[0]}`;
  }

  return `Groups: ${selectedGroupNames.length}`;
}

export function formatCardLibraryTypeFilterLabel(selectedType: CardLibraryCardType | null): string {
  if (!selectedType) {
    return 'All types';
  }

  return `Type: ${cardLibraryTypeOptions.find((option) => option.value === selectedType)?.label ?? selectedType}`;
}

export function getVisibleCardGroups(groups: CardLibraryGroupData[], maxVisible = 2) {
  return {
    visibleGroups: groups.slice(0, maxVisible),
    overflowCount: Math.max(groups.length - maxVisible, 0),
  };
}

export function mapCardDetailToListItem(card: {
  cardId: string;
  content: string;
  meaning: string | null;
  cardType: string | null;
  updatedAtIso: string | null;
  groups: CardLibraryGroupData[];
}): CardLibraryCardListItemData {
  return {
    cardId: card.cardId,
    content: card.content,
    meaning: card.meaning,
    cardType: card.cardType,
    updatedAtIso: card.updatedAtIso ?? new Date().toISOString(),
    updatedAtLabel: 'Just now',
    groups: card.groups,
  };
}

export function sortCardLibraryItems(items: CardLibraryCardListItemData[]) {
  return [...items].sort((left, right) => {
    const leftTime = left.updatedAtIso ? Date.parse(left.updatedAtIso) : 0;
    const rightTime = right.updatedAtIso ? Date.parse(right.updatedAtIso) : 0;
    return rightTime - leftTime;
  });
}

export function sortCardLibraryGroups<T extends { groupName: string }>(groups: T[]) {
  return [...groups].sort((left, right) => left.groupName.localeCompare(right.groupName));
}
