export type EditableListField = 'examples' | 'mnemonics';

export type EditableCardGroup = {
  groupId: string;
  groupName: string;
};

export type EditableCardLike<Group extends EditableCardGroup = EditableCardGroup> = {
  content: string;
  meaning: string | null;
  partOfSpeech?: string | null;
  examples: string[];
  mnemonics: string[];
  llmInstructions: string | null;
  groups: Group[];
};

export type EditableCardPayload = {
  content: string;
  meaning: string;
  examples: string[];
  mnemonics: string[];
  llmInstructions: string;
  partOfSpeech: string | null;
  groups: Array<{
    groupId: string | null;
    groupName: string;
  }>;
};

export function normalizeEditorList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean);
}

export function buildEditableCardPayload<Card extends EditableCardLike>(source: Card): EditableCardPayload {
  return {
    content: source.content,
    meaning: source.meaning ?? '',
    examples: normalizeEditorList(source.examples),
    mnemonics: normalizeEditorList(source.mnemonics),
    llmInstructions: source.llmInstructions ?? '',
    partOfSpeech: source.partOfSpeech ?? null,
    groups: source.groups.map((group) => ({
      groupId: group.groupId.trim() ? group.groupId : null,
      groupName: group.groupName,
    })),
  };
}

export function updateEditableListValue<Card extends EditableCardLike>(
  draft: Card,
  field: EditableListField,
  index: number,
  value: string,
) {
  const nextValues = [...draft[field]];
  nextValues[index] = value;

  return {
    ...draft,
    [field]: nextValues,
  };
}

export function addEditableListValue<Card extends EditableCardLike>(draft: Card, field: EditableListField) {
  return {
    ...draft,
    [field]: [...draft[field], ''],
  };
}

export function appendEditableListValue<Card extends EditableCardLike>(
  draft: Card,
  field: EditableListField,
  text: string,
) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return draft;
  }

  return {
    ...draft,
    [field]: [...draft[field], trimmedText],
  };
}

export function removeEditableListValue<Card extends EditableCardLike>(
  draft: Card,
  field: EditableListField,
  index: number,
) {
  return {
    ...draft,
    [field]: draft[field].filter((_, currentIndex) => currentIndex !== index),
  };
}

export function addEditableGroup<Card extends EditableCardLike<Group>, Group extends EditableCardGroup>(
  draft: Card,
  group: Group,
) {
  return {
    ...draft,
    groups: [...draft.groups, group].sort((left, right) => left.groupName.localeCompare(right.groupName)),
  };
}

export function createEditableGroupFromQuery<Card extends EditableCardLike<Group>, Group extends EditableCardGroup>(
  draft: Card,
  groupName: string,
) {
  return {
    ...draft,
    groups: [
      ...draft.groups,
      {
        groupId: '',
        groupName: groupName.trim(),
      } as Group,
    ],
  };
}

export function removeEditableGroup<Card extends EditableCardLike<Group>, Group extends EditableCardGroup>(
  draft: Card,
  groupId: string,
) {
  return {
    ...draft,
    groups: draft.groups.filter((group) => group.groupId !== groupId),
  };
}

export function filterAvailableEditorGroups<Group extends EditableCardGroup>(
  availableGroups: readonly Group[],
  selectedGroups: readonly Group[],
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const selectedGroupIds = new Set(selectedGroups.map((group) => group.groupId));

  return availableGroups.filter(
    (group) =>
      !selectedGroupIds.has(group.groupId) &&
      group.groupName.toLocaleLowerCase().includes(normalizedQuery),
  );
}

export function canCreateEditorGroup<Group extends EditableCardGroup>(
  availableGroups: readonly Group[],
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return (
    normalizedQuery.length > 0 &&
    !availableGroups.some((group) => group.groupName.trim().toLocaleLowerCase() === normalizedQuery)
  );
}
