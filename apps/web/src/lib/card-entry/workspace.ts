import type {
  CardEntryGroupData,
  CardEntryNoteDraftCardData,
  CardEntryNoteShellData,
} from '$lib/server/card-entry.js';

export type UnresolvedDuplicateWarning = {
  cardId: string;
  cardLabel: string;
  warningId: string;
  title: string;
  similarCardLabel: string;
};

export function replaceDraftCardInNote(
  note: CardEntryNoteShellData,
  updatedCard: CardEntryNoteDraftCardData,
  availableGroups: CardEntryGroupData[]
): CardEntryNoteShellData {
  return {
    ...note,
    availableGroups,
    draftCards: note.draftCards.map((draftCard) =>
      draftCard.cardId === updatedCard.cardId ? updatedCard : draftCard
    ),
  };
}

export function getUnresolvedDuplicateWarnings(note: CardEntryNoteShellData): UnresolvedDuplicateWarning[] {
  return note.draftCards.flatMap((draftCard) =>
    draftCard.duplicateWarnings
      .filter((warning) => !warning.dismissed)
      .map((warning) => ({
        cardId: draftCard.cardId,
        cardLabel: draftCard.content.trim() || 'Untitled draft card',
        warningId: warning.warningId,
        title: warning.title,
        similarCardLabel: warning.similarCardLabel,
      }))
  );
}
