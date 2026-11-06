/** XP, levels, coins. Pure functions. */

/** XP needed to reach `level` (level 1 = 0). Gentle curve: 100, 250, 450, 700, … */
export const xpForLevel = (level: number) => (level <= 1 ? 0 : 25 * (level - 1) * (level + 2));

export function levelFromXp(xp: number): { level: number; into: number; next: number } {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return { level, into: xp - xpForLevel(level), next: xpForLevel(level + 1) - xpForLevel(level) };
}

/** Coins earned alongside XP (coins buy avatar items). 1 coin per 2 XP. */
export const coinsForXp = (xp: number) => Math.floor(xp / 2);

/** Per-category mastery level from correct answers in that category. */
export const categoryLevel = (correctAnswers: number) => Math.min(10, 1 + Math.floor(correctAnswers / 15));

export const XP = {
  duelWin: 40, duelLoss: 15, duelDraw: 25,
  lessonComplete: 20, dailyChallenge: 30, reviewSession: 15,
  shapeCorrect: 10, shapeWithHint: 5,
};
