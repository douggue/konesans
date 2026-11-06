import type { DuelState } from './match.js';
import type { AgeBand } from '../types.js';

/**
 * Bot opponent used when no human is found within the lobby timeout.
 * It answers at human-like speed and accuracy for the age band, so a kid
 * always gets a game. Bots are always labelled `isBot` (the UI shows a robot badge).
 */
export interface BotProfile { accuracy: number; minMs: number; maxMs: number }

export const BOT_PROFILES: Record<AgeBand, BotProfile> = {
  '6-8': { accuracy: 0.55, minMs: 4000, maxMs: 11000 },
  '9-11': { accuracy: 0.65, minMs: 3000, maxMs: 9000 },
  '12-14': { accuracy: 0.72, minMs: 2500, maxMs: 8000 },
};

export const BOT_NAMES = ['Robo Lanbi', 'Robo Kolibri', 'Robo Mango', 'Robo Tanbou', 'Robo Zandolit'];

/**
 * Decide the bot's answer for the current question. Deterministic given `rand`.
 * Returns when (ms after question start) and which option it picks.
 */
export function planBotAnswer(s: DuelState, profile: BotProfile, rand: () => number): { atMs: number; chosen: number } {
  const q = s.questions[s.index];
  const atMs = Math.round(profile.minMs + rand() * (profile.maxMs - profile.minMs));
  if (rand() < profile.accuracy) return { atMs, chosen: q.answer };
  const wrong = q.options.map((_, i) => i).filter((i) => i !== q.answer);
  return { atMs, chosen: wrong[Math.floor(rand() * wrong.length)] };
}

/** Adaptive difficulty: nudge accuracy toward a ~55% kid win-rate over the last matches. */
export function adaptBot(profile: BotProfile, kidWinRate: number): BotProfile {
  const target = 0.55;
  const adj = (kidWinRate - target) * 0.3; // kid winning too much → bot gets better
  return { ...profile, accuracy: Math.min(0.9, Math.max(0.3, profile.accuracy + adj)) };
}
