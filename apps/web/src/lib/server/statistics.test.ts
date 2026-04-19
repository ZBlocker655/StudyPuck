import { describe, expect, it } from 'vitest';
import { formatStatisticsDateLabel } from './statistics.js';

describe('statistics helpers', () => {
  it('formats relative labels for today and yesterday', () => {
    const now = new Date('2026-04-19T12:00:00Z');

    expect(formatStatisticsDateLabel('2026-04-19', now)).toBe('Today');
    expect(formatStatisticsDateLabel('2026-04-18', now)).toBe('Yesterday');
  });

  it('formats older dates as calendar labels', () => {
    const now = new Date('2026-04-19T12:00:00Z');

    expect(formatStatisticsDateLabel('2026-04-15', now)).toBe('Apr 15');
  });
});
