/**
 * Vwayaj Ayiti progress (its own persisted store, key 'konesans-vwayaj'). The game rules live in @konesans/core
 * (modules/vwayaj.ts); this file only stores the result and hands XP / activity to the main store the way the quiz does.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BADGES, emptyVwayaj, recordRun, departmentsDone, localDay, VWAYAJ_CLEAR_XP, VWAYAJ_CLEAR_COINS,
  type DepartmentId, type VwayajProgress, type VwayajRunResult,
} from '@konesans/core';
import { useStore } from './store';

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Port-au-Prince';
/** Today as 'YYYY-MM-DD' on the device clock (events and double points follow the kid's local day). */
export const vwayajToday = () => localDay(Date.now(), tz);

interface VwayajStore extends VwayajProgress {
  /** set when a run unlocks a department, so the map can pop that node once */
  justUnlocked: DepartmentId | null;
  /** department the map card shows (kept across visits) */
  selected: DepartmentId | null;
  select: (id: DepartmentId) => void;
  clearJustUnlocked: () => void;
  finishRun: (r: { dep: DepartmentId; correct: number; total: number; score: number; ids: string[] }) => VwayajRunResult;
  reset: () => void;
}

const progressOf = (s: VwayajProgress): VwayajProgress => ({ done: s.done, best: s.best, seen: s.seen, eventsPlayed: s.eventsPlayed });

export const useVwayaj = create<VwayajStore>()(
  persist(
    (set, get) => ({
      ...emptyVwayaj(),
      justUnlocked: null,
      selected: null,
      select: (selected) => set({ selected }),
      clearJustUnlocked: () => set({ justUnlocked: null }),

      finishRun: ({ dep, correct, total, score, ids }) => {
        const r = recordRun(progressOf(get()), dep, correct, ids, vwayajToday());
        set({ ...r.progress, justUnlocked: r.unlocked ?? get().justUnlocked, selected: r.unlocked ?? dep });
        // activity, streak, quests and quiz XP: same path as every quiz (category 'vwayaj')
        useStore.getState().recordQuiz({ category: 'vwayaj', correct, total, score, wrongIds: [], ids: [] });
        if (r.firstClear) useStore.getState().award(VWAYAJ_CLEAR_XP, VWAYAJ_CLEAR_COINS);
        awardVwayajBadges();
        return r;
      },

      reset: () => set({ ...emptyVwayaj(), justUnlocked: null, selected: null }),
    }),
    {
      name: 'konesans-vwayaj',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ ...progressOf(s), selected: s.selected }),
    },
  ),
);

/** Departments finished — what the trophy 'vwayaj3' counts. */
export const selectDepartmentsDone = (s: VwayajProgress) => departmentsDone(s);

/**
 * The trophies only this mode can earn ('vwayaj3', 'vetye', 'drapo'): the main store's awardBadges() has no
 * Vwayaj data, so they are checked here with the same core test and written next to the others
 * (progress.badges + newBadges, so the trophy room and the badge jingle pick them up). store.ts is untouched.
 */
const OWN_BADGES = new Set(['vwayaj3', 'vetye', 'drapo']);
export function awardVwayajBadges(): string[] {
  const v = useVwayaj.getState();
  const s = useStore.getState();
  const ctx = { p: s.progress, duelWins: s.stats.duelWins, lessonsDone: s.stats.lessons, wordsLearned: 0, departmentsUnlocked: selectDepartmentsDone(v), eventsPlayed: v.eventsPlayed };
  const won = BADGES.filter((b) => OWN_BADGES.has(b.id) && !s.progress.badges[b.id] && b.test(ctx)).map((b) => b.id);
  if (!won.length) return won;
  const at = new Date().toISOString();
  useStore.setState((st) => ({
    progress: { ...st.progress, badges: { ...st.progress.badges, ...Object.fromEntries(won.map((id) => [id, at])) } },
    newBadges: [...st.newBadges, ...won],
  }));
  return won;
}
