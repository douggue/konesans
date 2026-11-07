import type { Question } from '../types.js';
import { QUESTION_TIME_MS, scoreAnswer } from '../quiz/engine.js';

/**
 * Authoritative 1v1 duel. The SERVER owns this state and applies commands;
 * clients only send `answer` / `react` / `leave` and receive projections
 * (see `publicView`) that never contain the correct answer before reveal.
 *
 * Phases:  lobby → question → reveal → question … → ended
 */

export type PlayerId = string;

export interface DuelPlayer {
  id: PlayerId;
  username: string;
  /** Avatar config shown to the other player (no personal data). */
  avatar?: unknown;
  isBot: boolean;
  score: number;
  combo: number;
  connected: boolean;
  /** Answer for the current question (reset each question). */
  answer?: { chosen: number; atMs: number };
}

export type Phase = 'lobby' | 'question' | 'reveal' | 'ended';

export interface DuelState {
  matchId: string;
  phase: Phase;
  players: DuelPlayer[];          // exactly 2 once started
  questions: Question[];          // already option-shuffled by selectQuestions
  index: number;                  // current question
  phaseStartedAt: number;         // ms
  questionMs: number;
  revealMs: number;
  lobbyTimeoutMs: number;
  /** Pause between "opponent found" and the first question (online: lets both phones play the VS animation). */
  introMs?: number;
  /** Last reactions (player id → preset id) this question, for the UI. */
  reactions: Record<PlayerId, string>;
  /** How many reactions each player has sent this match — lets a client tell a repeat of the same sticker from an old one. */
  reactSeq?: Record<PlayerId, number>;
  /** When each player's last reaction was accepted (ms), for the anti-spam cooldown. */
  reactAt?: Record<PlayerId, number>;
  endReason?: 'completed' | 'forfeit' | 'timeout';
  winnerId?: PlayerId | null;     // null = draw
}

export type DuelCommand =
  | { type: 'join'; player: Omit<DuelPlayer, 'score' | 'combo' | 'connected'> }
  | { type: 'start' }
  | { type: 'answer'; playerId: PlayerId; chosen: number }
  | { type: 'react'; playerId: PlayerId; reaction: string }
  | { type: 'leave'; playerId: PlayerId }
  | { type: 'tick' };

export const DEFAULTS = { questionMs: QUESTION_TIME_MS, revealMs: 3_000, lobbyTimeoutMs: 10_000 };

export function createDuel(matchId: string, questions: Question[], now: number, cfg: Partial<typeof DEFAULTS> & { introMs?: number } = {}): DuelState {
  return { matchId, phase: 'lobby', players: [], questions, index: 0, phaseStartedAt: now, reactions: {}, ...DEFAULTS, ...cfg };
}

/** Apply a command at time `now`. Always returns a new state (never mutates). Invalid commands are ignored. */
export function reduce(s: DuelState, cmd: DuelCommand, now: number): DuelState {
  switch (cmd.type) {
    case 'join': {
      if (s.phase !== 'lobby' || s.players.length >= 2 || s.players.some((p) => p.id === cmd.player.id)) return s;
      const players = [...s.players, { ...cmd.player, score: 0, combo: 0, connected: true }];
      const next = { ...s, players };
      return players.length === 2 ? startQuestion(next, now + (s.introMs ?? 0)) : next;
    }
    case 'start':
      return s.phase === 'lobby' && s.players.length === 2 ? startQuestion(s, now) : s;
    case 'answer': {
      if (s.phase !== 'question' || now < s.phaseStartedAt) return s; // not before the question shows
      const p = s.players.find((x) => x.id === cmd.playerId);
      const q = s.questions[s.index];
      if (!p || p.answer || !Number.isInteger(cmd.chosen) || cmd.chosen < 0 || cmd.chosen >= q.options.length) return s;
      const players = s.players.map((x) => (x.id === cmd.playerId ? { ...x, answer: { chosen: cmd.chosen, atMs: now - s.phaseStartedAt } } : x));
      const next = { ...s, players };
      return players.every((x) => x.answer || !x.connected) ? reveal(next, now) : next;
    }
    case 'react': {
      if (!(PRESET_REACTIONS as readonly string[]).includes(cmd.reaction) || !s.players.some((p) => p.id === cmd.playerId)) return s;
      const last = s.reactAt?.[cmd.playerId];
      if (last !== undefined && now - last < REACT_COOLDOWN_MS) return s; // spam: drop it
      return {
        ...s,
        reactions: { ...s.reactions, [cmd.playerId]: cmd.reaction },
        reactSeq: { ...s.reactSeq, [cmd.playerId]: (s.reactSeq?.[cmd.playerId] ?? 0) + 1 },
        reactAt: { ...s.reactAt, [cmd.playerId]: now },
      };
    }
    case 'leave': {
      if (s.phase === 'ended') return s;
      const players = s.players.map((x) => (x.id === cmd.playerId ? { ...x, connected: false } : x));
      if (s.phase === 'lobby') return { ...s, players: players.filter((x) => x.id !== cmd.playerId) };
      const other = players.find((x) => x.id !== cmd.playerId);
      return { ...s, players, phase: 'ended', endReason: 'forfeit', winnerId: other?.id ?? null };
    }
    case 'tick': {
      const elapsed = now - s.phaseStartedAt;
      if (s.phase === 'lobby' && elapsed >= s.lobbyTimeoutMs) return { ...s, phase: 'ended', endReason: 'timeout', winnerId: null };
      if (s.phase === 'question' && elapsed >= s.questionMs) return reveal(s, now);
      if (s.phase === 'reveal' && elapsed >= s.revealMs) return s.index + 1 >= s.questions.length ? finish(s) : startQuestion({ ...s, index: s.index + 1 }, now);
      return s;
    }
  }
}

function startQuestion(s: DuelState, now: number): DuelState {
  return { ...s, phase: 'question', phaseStartedAt: now, reactions: {}, players: s.players.map((p) => ({ ...p, answer: undefined })) };
}

/** Score both players for the current question and move to reveal. */
function reveal(s: DuelState, now: number): DuelState {
  const q = s.questions[s.index];
  const players = s.players.map((p) => {
    const correct = !!p.answer && p.answer.chosen === q.answer;
    const combo = correct ? p.combo + 1 : 0;
    const pts = scoreAnswer({ correct, elapsedMs: p.answer?.atMs ?? s.questionMs, combo }, s.questionMs);
    return { ...p, combo, score: p.score + pts };
  });
  return { ...s, players, phase: 'reveal', phaseStartedAt: now };
}

function finish(s: DuelState): DuelState {
  const [a, b] = s.players;
  const winnerId = a.score === b.score ? null : a.score > b.score ? a.id : b.id;
  return { ...s, phase: 'ended', endReason: 'completed', winnerId };
}

/**
 * Preset, kid-safe reactions (all friendly — nothing mocking). Free text is never accepted.
 * Append only: older apps still send the first ids, and the server checks every id against this list.
 */
export const PRESET_REACTIONS = ['bravo', 'wow', 'byen_jwe', 'anko', 'bon_chans', 'mwen_pare', 'ri', 'ke', 'dife'] as const;
export type ReactionId = (typeof PRESET_REACTIONS)[number];
/** Minimum time between two reactions from the same player; faster ones are dropped (the app waits 3 s). */
export const REACT_COOLDOWN_MS = 2_000;

/** What a client is allowed to see. Hides the answer key during `question`, and the opponent's choice until reveal. */
export function publicView(s: DuelState, viewerId: PlayerId) {
  const q = s.questions[s.index];
  const showAnswer = s.phase === 'reveal' || s.phase === 'ended';
  return {
    matchId: s.matchId, phase: s.phase, index: s.index, total: s.questions.length,
    phaseStartedAt: s.phaseStartedAt, questionMs: s.questionMs,
    question: q ? { id: q.id, prompt: q.prompt, options: q.options, media: q.media, answer: showAnswer ? q.answer : undefined, explain: showAnswer ? q.explain : undefined } : undefined,
    players: s.players.map((p) => ({
      id: p.id, username: p.username, avatar: p.avatar, isBot: p.isBot, score: p.score, connected: p.connected,
      answered: !!p.answer,
      chosen: p.id === viewerId || showAnswer ? p.answer?.chosen : undefined,
    })),
    reactions: s.reactions, reactSeq: s.reactSeq ?? {}, endReason: s.endReason, winnerId: s.winnerId,
  };
}

/** Rating change (Elo-style, K=24) applied after a completed match. */
export function ratingDelta(mine: number, theirs: number, result: 1 | 0.5 | 0, k = 24): number {
  const expected = 1 / (1 + 10 ** ((theirs - mine) / 400));
  return Math.round(k * (result - expected));
}
