export const TRANSLATION_DRILL_TOMORROW_DAYS = 1;

type DismissScheduleLike = {
  recommendedDays: number;
  optionDays: number[];
};

function isValidDismissDays(days: number | null | undefined): days is number {
  return typeof days === 'number' && Number.isInteger(days) && days >= TRANSLATION_DRILL_TOMORROW_DAYS;
}

export function getTranslationDrillDismissOptions(schedule: DismissScheduleLike | null | undefined): number[] {
  const recommendedDays = isValidDismissDays(schedule?.recommendedDays) ? schedule.recommendedDays : null;
  const optionDays = schedule?.optionDays.filter((days) => isValidDismissDays(days)) ?? [];

  return [...new Set([
    TRANSLATION_DRILL_TOMORROW_DAYS,
    ...optionDays,
    ...(recommendedDays === null ? [] : [recommendedDays]),
  ])].sort((left, right) => {
    if (left === TRANSLATION_DRILL_TOMORROW_DAYS) {
      return -1;
    }

    if (right === TRANSLATION_DRILL_TOMORROW_DAYS) {
      return 1;
    }

    return left - right;
  });
}

export function getTranslationDrillDismissDefaultDays(schedule: DismissScheduleLike | null | undefined): number {
  if (isValidDismissDays(schedule?.recommendedDays)) {
    return schedule.recommendedDays;
  }

  return getTranslationDrillDismissOptions(schedule)[0] ?? TRANSLATION_DRILL_TOMORROW_DAYS;
}

export function normalizeTranslationDrillDismissSchedule<T extends DismissScheduleLike>(schedule: T): T {
  return {
    ...schedule,
    optionDays: getTranslationDrillDismissOptions(schedule),
  };
}
