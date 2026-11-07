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

/**
 * The XP table — every activity's reward is decided here, so one minute of honest play pays about the same in
 * every mode (a typical activity: 15–40 XP; coins = XP / 2). Tested in test/xp.test.ts.
 */
export const XP = {
  duelWin: 40, duelLoss: 15, duelDraw: 25,
  lessonComplete: 20, dailyChallenge: 30, reviewSession: 15,
  shapeCorrect: 10, shapeWithHint: 5,
  /** cap for one quiz / one Kalkil Mantal run */
  activityCap: 40,
  /** Kalkil Mantal: a base for playing the run, plus 0.4 XP per point */
  mathBase: 10, mathPerPoint: 0.4,
  /** Coding: first clear of a level = base + per star; a replay only pays the stars it adds */
  codingClear: 10, codingStar: 5,
};

/** Category quiz / Peyi / Vwayaj run: 1 XP per 4 points (a 10-question quiz ≈ 20–35 XP), capped. */
export const quizXp = (score: number) => Math.max(0, Math.min(XP.activityCap, Math.round(score / 4)));

/** Kalkil Mantal run (60 s): 10 XP for playing + 0.4 per point, capped at 40. Nothing for a run with 0 points. */
export const mathRunXp = (score: number) => (score > 0 ? Math.min(XP.activityCap, XP.mathBase + Math.round(score * XP.mathPerPoint)) : 0);

/**
 * Coding level: the first clear pays 10 + 5 per star (15–25 XP); a replay pays only the stars it improves
 * (5 per new star), so replaying a 3-star level pays nothing.
 */
export const codingXp = (prevStars: number, stars: number) =>
  prevStars <= 0 ? (stars > 0 ? XP.codingClear + XP.codingStar * stars : 0) : XP.codingStar * Math.max(0, stars - prevStars);
