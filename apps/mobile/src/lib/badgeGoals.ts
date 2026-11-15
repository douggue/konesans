/** How far along each trophy is: [have, need], or null when there is nothing to count. Shared by Twofe m and the profile. */
import { courseSummary } from '@konesans/core';
import { useStore } from './store';

export function useBadgeGoals(): Record<string, [number, number] | null> {
  const { progress, stats, courses, coding } = useStore();
  const words = courseSummary('en', courses.en).wordsLearned + courseSummary('es', courses.es).wordsLearned;
  return {
    premye: [stats.lessons, 1], seri7: [progress.streak.count, 7], seri30: [progress.streak.count, 30], mo100: [words, 100],
    duel1: [stats.duelWins, 1], duel10: [stats.duelWins, 10], kod5: [Object.keys(coding).length, 5], vwayaj3: null, vetye: null, drapo: null,
  };
}
