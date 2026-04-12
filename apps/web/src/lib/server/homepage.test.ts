import { describe, expect, it } from 'vitest';
import { calculateStudyStreak, getPreferredLanguageCode, resolveAuthenticatedHomepage } from './homepage.js';

describe('homepage helpers', () => {
  it('routes first-time users to onboarding', () => {
    expect(resolveAuthenticatedHomepage([])).toBe('/onboarding');
  });

  it('routes returning users to their first active language', () => {
    expect(resolveAuthenticatedHomepage([{ languageId: 'zh' }, { languageId: 'es' }])).toBe('/zh/');
    expect(getPreferredLanguageCode([{ languageId: 'es' }])).toBe('es');
  });

  it('counts only consecutive study days ending today', () => {
    const today = new Date('2026-04-12T12:00:00Z');

    expect(calculateStudyStreak(['2026-04-12', '2026-04-11', '2026-04-10'], today)).toBe(3);
    expect(calculateStudyStreak(['2026-04-11', '2026-04-10'], today)).toBe(0);
    expect(calculateStudyStreak(['2026-04-12', '2026-04-12', '2026-04-11'], today)).toBe(2);
  });
});
