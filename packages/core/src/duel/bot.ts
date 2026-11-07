import type { DuelState, PlayerId, ReactionId } from './match.js';
import type { AgeBand } from '../types.js';
import { QUESTION_TIME_MS } from '../quiz/engine.js';

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
  // a longer clock (6–8: 30 s) stretches Robo's thinking time the same way, so speed points stay fair
  const k = s.questionMs / QUESTION_TIME_MS;
  const atMs = Math.round((profile.minMs + rand() * (profile.maxMs - profile.minMs)) * k);
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

/**
 * Robo's friendly reactions (same stickers as the kids'): a "good luck" at the start, and now and then one after a
 * reveal — cheering the kid's right answer, encouraging after a miss. Never mocking. `null` = stay quiet this time.
 * `delayMs` = how long after the moment Robo "taps" it (so it feels human).
 */
export function planBotReaction(moment: 'start' | 'reveal', s: DuelState, botId: PlayerId, rand: () => number): { reaction: ReactionId; delayMs: number } | null {
  const pick = (xs: ReactionId[]) => xs[Math.floor(rand() * xs.length) % xs.length];
  const delayMs = Math.round(500 + rand() * 900);
  if (moment === 'start') return rand() < 0.7 ? { reaction: pick(['bon_chans', 'mwen_pare']), delayMs } : null;
  const q = s.questions[s.index];
  const bot = s.players.find((p) => p.id === botId);
  const kid = s.players.find((p) => p.id !== botId);
  if (!q || !bot || !kid) return null;
  const botRight = bot.answer?.chosen === q.answer;
  const kidRight = kid.answer?.chosen === q.answer;
  const [chance, choices]: [number, ReactionId[]] =
    kidRight && !botRight ? [0.6, ['bravo', 'byen_jwe', 'wow']]
      : kidRight && botRight ? [0.4, ['byen_jwe', 'ke', 'dife']]
        : botRight ? [0.35, ['bon_chans', 'anko']]
          : [0.3, ['ri', 'anko']];
  return rand() < chance ? { reaction: pick(choices), delayMs } : null;
}
