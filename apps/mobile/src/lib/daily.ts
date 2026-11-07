/**
 * Defi Jodi a (daily challenge) on the phone. Server: server/nakama/src/daily.ts, shared rules: core modules/daily.ts.
 *  - Online: `daily_get` gives the day's set (the same for every kid of the age band), `daily_submit` sends the ONE
 *    scored attempt (the server scores it itself), `daily_top` gives the top 10 + "your place". Being in the ranking
 *    needs a parent's permission for online play; the questions do not.
 *  - Offline: the same deterministic pick (seeded by Haiti's day + age band) on the bank this phone has (published
 *    packs, else the bundled bank) — identical to the server's set when the phone holds the same packs. The result
 *    stays on the phone and the screen says the ranking needs internet.
 *  - A scored run that could not reach the server is sent again the next time the screen opens (same day only).
 * Replays are practice: nothing is sent and no reward is given (app/daily.tsx).
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BANK, SAMPLE_QUESTIONS, pickDaily, scoreDaily, haitiDay, clampDailyCount, type AgeBand, type Question, type DailyAnswer } from '@konesans/core';
import { callRpc, onlineFailure } from './online';
import { useRemote, serverConfigured } from './remote';

export interface DailyRow { rank: number; name: string; avatar?: unknown; correct: number; total: number; score: number; me: boolean }
export interface DailyResult {
  correct: number; total: number; score: number; ms: number; perQuestion: boolean[];
  /** the server has it (scored there); false = only on this phone */
  synced: boolean;
  /** answers kept until the server has the run (offline / failed send) */
  answers?: DailyAnswer[];
  /** XP / coins / card already given for this day's scored run */
  rewarded?: boolean;
}
export interface DailyDay {
  day: string; age: AgeBand; count: number; questions: Question[];
  /** 'server' = the shared set from the server; 'local' = built on the phone (offline) */
  source: 'server' | 'local';
  result?: DailyResult;
  /** a parent allows online play (so the kid can be in the ranking) — from the server, null when unknown */
  allowed: boolean | null;
  top: DailyRow[]; me: DailyRow | null;
}

interface DailyState { days: Record<string, DailyDay> }
export const useDaily = create<DailyState>()(
  persist((): DailyState => ({ days: {} }), { name: 'konesans-daily', version: 1, storage: createJSONStorage(() => AsyncStorage) }),
);

const keyOf = (day: string, age: AgeBand) => `${day}_${age}`;
export const todayHaiti = () => haitiDay(Date.now());

function save(d: DailyDay) {
  const days = { ...useDaily.getState().days, [keyOf(d.day, d.age)]: d };
  const keep = Object.keys(days).sort((a, b) => (a < b ? 1 : -1)).slice(0, 6); // a few recent days only
  useDaily.setState({ days: Object.fromEntries(keep.map((k) => [k, days[k]])) });
  return d;
}

/** The bank this phone has: the published packs once synced, else the bundled bank (same rule as content.ts). */
function localPool(): Question[] {
  const { version, packs } = useRemote.getState();
  if (version) return Object.keys(packs).flatMap((k) => packs[k]);
  return [...BANK, ...SAMPLE_QUESTIONS.filter((s) => !BANK.some((b) => b.id === s.id))];
}
export const localDailyCount = () => clampDailyCount(useRemote.getState().config?.dailyCount);

function localDay(age: AgeBand): DailyDay {
  const day = todayHaiti();
  const have = useDaily.getState().days[keyOf(day, age)];
  if (have?.questions?.length) return have;
  return { day, age, count: localDailyCount(), questions: pickDaily(localPool(), age, day, localDailyCount()), source: 'local', allowed: null, top: [], me: null };
}

interface ServerResult { correct: number; total: number; score: number; ms: number; perQuestion: boolean[] }

/** Today's challenge for an age band: from the server when it answers, otherwise built on the phone. */
export async function loadDaily(age: AgeBand): Promise<{ day: DailyDay; online: boolean }> {
  const today = todayHaiti();
  const cached = useDaily.getState().days[keyOf(today, age)];
  if (!serverConfigured()) return { day: save(localDay(age)), online: false };
  try {
    const r = await callRpc<{ day: string; count: number; questions: Question[]; result: ServerResult | null; allowed: boolean }>('daily_get', { age });
    const mine = useDaily.getState().days[keyOf(r.day, age)] ?? cached;
    let d: DailyDay = {
      day: r.day, age, count: r.count, questions: r.questions, source: 'server', allowed: r.allowed,
      result: r.result ? { ...r.result, synced: true, rewarded: mine?.result?.rewarded } : mine?.result, top: mine?.top ?? [], me: mine?.me ?? null,
    };
    // a scored run of today's server set that never reached the server: send it now
    if (d.result && !d.result.synced && d.result.answers && mine?.source === 'server') d = await submitDaily(d, d.result.answers, true);
    else if (d.result?.synced && r.allowed) d = await refreshTop(d);
    return { day: save(d), online: true };
  } catch {
    return { day: save(cached?.questions?.length ? cached : localDay(age)), online: false };
  }
}

/**
 * The one scored run of the day. Online: the server scores it and answers with the ranking.
 * Offline (or refused): scored on the phone, kept, sent again later if the set came from the server.
 */
export async function submitDaily(d: DailyDay, answers: DailyAnswer[], retry = false): Promise<DailyDay> {
  const local = scoreDaily(d.questions, answers);
  const prev = d.result;
  if (prev?.synced && !retry) return d; // already scored: replays are practice
  const keepLocal: DailyDay = { ...d, result: { ...local, synced: false, answers, rewarded: prev?.rewarded } };
  if (d.source !== 'server' || !serverConfigured()) return save(keepLocal);
  try {
    const r = await callRpc<ServerResult & { allowed: boolean; already: boolean; top: DailyRow[]; me: DailyRow | null }>('daily_submit', { day: d.day, age: d.age, answers });
    return save({ ...d, allowed: r.allowed, top: r.top ?? [], me: r.me ?? null,
      result: { correct: r.correct, total: r.total, score: r.score, ms: r.ms, perQuestion: r.perQuestion, synced: true, rewarded: prev?.rewarded } });
  } catch (e) {
    const f = onlineFailure(e);
    // refused for good (day over, too fast…): keep the phone's score, stop retrying
    if (f && f.status >= 400 && f.status < 500) return save({ ...keepLocal, result: { ...keepLocal.result!, answers: undefined } });
    return save(keepLocal);
  }
}

/** Reload the top 10 + my place (online play allowed only). */
export async function refreshTop(d: DailyDay): Promise<DailyDay> {
  try {
    const r = await callRpc<{ allowed: boolean; top: DailyRow[]; me: DailyRow | null }>('daily_top', { age: d.age, day: d.day });
    return save({ ...d, allowed: r.allowed, top: r.top ?? [], me: r.me ?? null });
  } catch { return d; }
}

export function markRewarded(d: DailyDay): DailyDay {
  if (!d.result) return d;
  return save({ ...d, result: { ...d.result, rewarded: true } });
}

/** What the home card shows: the real count, and today's result if the kid already played. */
export function useDailyHome(age: AgeBand) {
  const remoteCount = useRemote((s) => s.config?.dailyCount);
  const d = useDaily((s) => s.days[keyOf(todayHaiti(), age)]);
  const count = d?.count ?? clampDailyCount(remoteCount);
  return { count, result: d?.result ?? null, rank: d?.result?.synced && d.allowed ? d.me?.rank ?? null : null };
}
