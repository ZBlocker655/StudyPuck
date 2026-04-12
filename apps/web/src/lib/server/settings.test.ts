import { describe, expect, it } from 'vitest';
import { formatRelativeStudyLabel } from './settings.js';

describe('formatRelativeStudyLabel', () => {
  const referenceDate = new Date('2026-04-12T12:00:00Z');

  it('returns Today for the current day', () => {
    expect(formatRelativeStudyLabel('2026-04-12', referenceDate)).toBe('Today');
  });

  it('returns Yesterday for the previous day', () => {
    expect(formatRelativeStudyLabel('2026-04-11', referenceDate)).toBe('Yesterday');
  });

  it('returns a day count for older activity', () => {
    expect(formatRelativeStudyLabel('2026-04-08', referenceDate)).toBe('4 days ago');
  });

  it('returns Never when there is no study activity yet', () => {
    expect(formatRelativeStudyLabel(null, referenceDate)).toBe('Never');
  });
});
