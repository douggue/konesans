/** App state: profile, progress, settings. Persisted on device; the server sync layer plugs in later via core/sync. */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';
import { avatarFromSeed } from '@/ui/avatar';
import { changeRequestStatus, type ChangeRequest } from './online';
import { serverConfigured } from './remote';
import {
  DEFAULT_SETTINGS, emptyProgress, emptyCourseProgress, recordLesson as coreRecordLesson, applyEvent, ensureQuests,
  recordActivity, levelFromXp, generateUsername, localDay, noteWrong, checkBadges, courseSummary,
  emptyMissionLog, noteFullDay, openChest as coreOpenChest, weeklyLegendEarned as coreWeeklyLegendEarned, claimWeeklyLegend as coreClaimWeeklyLegend,
  rankForXp, unlocksEarned, type MissionLog, type UnlockCtx,
  type AgeBand, type AvatarConfig, type KidSettings, type Progress, type CourseProgress, type CourseId, type LessonResult, type GameEvent, type Lang, type CountryQuizOptions,
} from '@konesans/core';

export interface Profile { id: string; username: string; age: AgeBand; lang: Lang; avatarColor: number; avatar?: AvatarConfig; createdAt: string; /** school class (strings/requests.ts GRADES), set by an approved change request */ grade?: string }
export interface AppSettings { sfx: boolean; music: boolean; voice: boolean; haptic: boolean; textSize: 0 | 1 | 2 }
export interface Stats { duels: number; duelWins: number; lessons: number; questionsAnswered: number; correct: number; perCategoryCorrect: Record<string, number>; mathBest?: number }

interface State {
  hydrated: boolean;
  onboarded: boolean;
  profile: Profile;
  progress: Progress;
  courses: Record<CourseId, CourseProgress>;
  /** last course tab the kid was on */
  courseLang: CourseId;
  setCourseLang: (l: CourseId) => void;
  /** last Peyi quiz options */
  peyi: CountryQuizOptions;
  setPeyi: (p: Partial<CountryQuizOptions>) => void;
  coding: Record<number, number>; // levelId -> best stars (1–3)
  settings: AppSettings;
  kidSettings: KidSettings;
  stats: Stats;
  seen: string[];
  // actions
  setHydrated: () => void;
  setLang: (lang: Lang) => void;
  setAge: (age: AgeBand) => void;
  rerollName: () => void;
  setAvatar: (a: AvatarConfig) => void;
  finishOnboarding: () => void;
  setSettings: (s: Partial<AppSettings>) => void;
  setKidSettings: (s: Partial<KidSettings>) => void;
  touch: () => void;
  emit: (e: GameEvent) => number;
  award: (xp: number, coins?: number) => void;
  recordQuiz: (r: { category: string; correct: number; total: number; score: number; wrongIds: string[]; ids: string[] }) => void;
  recordDuel: (won: boolean, draw: boolean, score: number) => void;
  recordLessonDone: (lang: CourseId, lessonId: string, r: LessonResult) => void;
  recordCoding: (levelId: number, stars: number, xp: number) => void;
  recordMath: (score: number, xp: number) => void;
  resetAll: () => void;
  /** Award trophies whose condition is now met (called after every activity). */
  awardBadges: () => string[];
  /** Trophies just won, shown once on the next screen. */
  newBadges: string[];
  clearNewBadges: () => void;
  /** Countries recently asked in Peyi, so a replay brings new ones. */
  recentPeyi: string[];
  notePeyi: (isos: string[]) => void;

  // ─── daily missions, ranks, unlockable avatar items ───
  /** daily chest + weekly 7/7 log (see core progress/quests) */
  missions: MissionLog;
  /** Open today's chest. Returns the reward, or null when it is not ready / already opened today. */
  openChest: () => { xp: number; coins: number } | null;
  /** The cards feature calls this when it hands out the guaranteed Legend hero card for a 7/7 week. Returns false if not earned / already claimed. */
  claimWeeklyLegend: () => boolean;
  /** Highest rank index already celebrated (-1 = not known yet: set silently on first check, no party for old progress). */
  rankSeen: number;
  ackRank: (index: number) => void;
  /** Avatar item ids unlocked so far (never removed, e.g. when a streak breaks). */
  unlocked: string[];
  /** Unlocked items the kid has already looked at in the avatar builder (others get a "Nouvo" dot). */
  seenUnlocks: string[];
  syncUnlocks: () => string[];
  markUnlocksSeen: (ids: string[]) => void;

  // ─── age / class change requests (Espas Paran; an admin approves, see online.ts) ───
  /** Latest request from this phone as the server last told us. `applied`: an approved change is already in the profile. */
  changeReq: (ChangeRequest & { applied?: boolean }) | null;
  setChangeReq: (r: ChangeRequest | null) => void;
  /** Ask the server for the latest request; applies an approved one (age band + class) once. Throws when offline. */
  syncChangeReq: () => Promise<ChangeRequest | null>;
}

const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Port-au-Prince';
const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const freshProfile = (): Profile => ({ id: newId(), username: generateUsername(Date.now()), age: '9-11', lang: 'ht', avatarColor: 0, createdAt: new Date().toISOString() });
const unlockCtx = (s: { progress: Progress; stats: Stats }): UnlockCtx => ({ xp: s.progress.xp, streak: s.progress.streak.count, badges: Object.keys(s.progress.badges).length });
const freshStats = (): Stats => ({ duels: 0, duelWins: 0, lessons: 0, questionsAnswered: 0, correct: 0, perCategoryCorrect: {} });

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      hydrated: false,
      onboarded: false,
      profile: freshProfile(),
      progress: emptyProgress(),
      courses: { en: emptyCourseProgress(), es: emptyCourseProgress() },
      courseLang: 'en',
      setCourseLang: (courseLang) => set({ courseLang }),
      peyi: { mode: 'drapo', level: 1, region: 'Karayib' },
      setPeyi: (p) => set((s) => ({ peyi: { ...s.peyi, ...p } })),
      coding: {},
      settings: { sfx: true, music: true, voice: true, haptic: true, textSize: 1 },
      kidSettings: DEFAULT_SETTINGS,
      stats: freshStats(),
      seen: [],
      newBadges: [],
      recentPeyi: [],
      missions: emptyMissionLog(),
      rankSeen: -1,
      unlocked: [],
      seenUnlocks: [],
      changeReq: null,

      setHydrated: () => set({ hydrated: true }),
      setLang: (lang) => set((s) => ({ profile: { ...s.profile, lang } })),
      setAge: (age) => set((s) => ({ profile: { ...s.profile, age }, settings: { ...s.settings, voice: age === '6-8' ? true : s.settings.voice } })),
      rerollName: () => set((s) => ({ profile: { ...s.profile, username: generateUsername(Date.now() + Math.floor(Math.random() * 1e6)) } })),
      setAvatar: (avatar) => set((s) => ({ profile: { ...s.profile, avatar } })),
      finishOnboarding: () => { set({ onboarded: true }); get().touch(); },
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      setKidSettings: (p) => set((s) => ({ kidSettings: { ...s.kidSettings, ...p } })),

      /** Mark activity: streak + today's quests. */
      touch: () => {
        set((s) => {
          const now = Date.now();
          let p = recordActivity(s.progress, s.kidSettings, now, tz);
          p = ensureQuests(p, s.profile.id, localDay(now, tz));
          return { progress: p };
        });
        get().awardBadges();
      },

      awardBadges: () => {
        const s = get();
        const words = courseSummary('en', s.courses.en).wordsLearned + courseSummary('es', s.courses.es).wordsLearned;
        const { progress, awarded } = checkBadges({ p: s.progress, duelWins: s.stats.duelWins, lessonsDone: s.stats.lessons, wordsLearned: words, departmentsUnlocked: 0, eventsPlayed: [] }, new Date().toISOString());
        if (awarded.length) set({ progress, newBadges: [...s.newBadges, ...awarded] });
        get().syncUnlocks();
        return awarded;
      },
      clearNewBadges: () => set({ newBadges: [] }),
      notePeyi: (isos) => set((s) => ({ recentPeyi: [...s.recentPeyi.filter((x) => !isos.includes(x)), ...isos].slice(-60) })),

      emit: (e) => {
        const { progress, xpAwarded } = applyEvent(get().progress, e);
        // applyEvent already added the quest XP to progress.xp: only the coins are added here (XP used to be paid twice)
        set((s) => ({ progress, missions: noteFullDay(s.missions ?? emptyMissionLog(), progress) }));
        if (xpAwarded) get().award(0, Math.floor(xpAwarded / 2));
        return xpAwarded;
      },

      openChest: () => {
        get().touch();
        const s = get();
        const r = coreOpenChest(s.missions ?? emptyMissionLog(), s.progress, localDay(Date.now(), tz));
        if (!r) return null;
        set({ missions: r.log });
        get().award(r.xp, r.coins);
        return { xp: r.xp, coins: r.coins };
      },
      claimWeeklyLegend: () => {
        const s = get(); const day = localDay(Date.now(), tz);
        const log = s.missions ?? emptyMissionLog();
        if (!coreWeeklyLegendEarned(log, day)) return false;
        set({ missions: coreClaimWeeklyLegend(log, day) });
        return true;
      },
      ackRank: (index) => set((s) => ({ rankSeen: Math.max(s.rankSeen ?? -1, index) })),
      syncUnlocks: () => {
        const s = get();
        const have = s.unlocked ?? [];
        const add = unlocksEarned(unlockCtx(s)).filter((id) => !have.includes(id));
        if (add.length) set({ unlocked: [...have, ...add] });
        return add;
      },
      setChangeReq: (r) => set((s) => ({ changeReq: r ? { ...r, applied: s.changeReq?.id === r.id ? s.changeReq.applied : false } : null })),
      syncChangeReq: async () => {
        const r = await changeRequestStatus();
        const s = get();
        // only requests made for this profile (a reset makes a new one) and never twice
        if (r && r.status === 'approved' && !(s.changeReq?.id === r.id && s.changeReq.applied) && r.createdAt >= s.profile.createdAt) {
          if (r.requested.age) s.setAge(r.requested.age);
          if (r.requested.grade) set((x) => ({ profile: { ...x.profile, grade: r.requested.grade } }));
          set({ changeReq: { ...r, applied: true } });
        } else get().setChangeReq(r);
        return r;
      },
      markUnlocksSeen: (ids) => set((s) => ({ seenUnlocks: [...new Set([...(s.seenUnlocks ?? []), ...ids])] })),

      award: (xp, coins = Math.floor(xp / 2)) => { set((s) => ({ progress: { ...s.progress, xp: s.progress.xp + xp, coins: s.progress.coins + coins } })); get().syncUnlocks(); },

      recordQuiz: (r) => {
        const st = get();
        st.touch();
        let p = st.progress;
        for (const id of r.wrongIds) p = noteWrong(p, id, Date.now());
        set({ progress: p, seen: [...st.seen, ...r.ids].slice(-400), stats: {
          ...st.stats, questionsAnswered: st.stats.questionsAnswered + r.total, correct: st.stats.correct + r.correct,
          perCategoryCorrect: { ...st.stats.perCategoryCorrect, [r.category]: (st.stats.perCategoryCorrect[r.category] ?? 0) + r.correct },
        } });
        for (let i = 0; i < r.total; i++) get().emit({ type: 'answer', correct: i < r.correct, category: r.category });
        get().award(Math.round(r.score / 4));
      },

      recordDuel: (won, draw, score) => {
        const st = get(); st.touch();
        set({ stats: { ...st.stats, duels: st.stats.duels + 1, duelWins: st.stats.duelWins + (won ? 1 : 0) } });
        get().emit({ type: 'duel_end', won, draw });
        get().award(won ? 40 : draw ? 25 : 15);
        get().awardBadges();
      },

      recordLessonDone: (lang, lessonId, r) => {
        const st = get(); st.touch();
        set({ courses: { ...st.courses, [lang]: coreRecordLesson(st.courses[lang], lessonId, r) }, stats: { ...st.stats, lessons: st.stats.lessons + 1 } });
        get().emit({ type: 'lesson_done', course: lang });
        get().award(r.xp, r.coins);
        get().awardBadges();
      },

      recordCoding: (levelId, stars, xp) => {
        const st = get(); st.touch();
        set({ coding: { ...st.coding, [levelId]: Math.max(st.coding[levelId] ?? 0, stars) } });
        get().award(xp);
      },

      recordMath: (score, xp) => { get().touch(); get().emit({ type: 'math_run', score }); get().award(xp); set((s) => ({ stats: { ...s.stats, mathBest: Math.max(s.stats.mathBest ?? 0, score) } })); },

      resetAll: () => set({ changeReq: null, missions: emptyMissionLog(), rankSeen: -1, unlocked: [], seenUnlocks: [], recentPeyi: [], newBadges: [], onboarded: false, profile: freshProfile(), progress: emptyProgress(), courses: { en: emptyCourseProgress(), es: emptyCourseProgress() }, coding: {}, stats: freshStats(), seen: [] }),
    }),
    {
      name: 'konesans-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ changeReq: s.changeReq, missions: s.missions, rankSeen: s.rankSeen, unlocked: s.unlocked, seenUnlocks: s.seenUnlocks, recentPeyi: s.recentPeyi, onboarded: s.onboarded, profile: s.profile, progress: s.progress, courses: s.courses, courseLang: s.courseLang, peyi: s.peyi, coding: s.coding, settings: s.settings, kidSettings: s.kidSettings, stats: s.stats, seen: s.seen }),
      onRehydrateStorage: () => (state) => { state?.setHydrated(); checkPendingChangeReq(); },
    },
  ),
);

/** While a change request is waiting, look for the admin's answer on start and when the app comes back (at most once a minute). */
let lastReqCheck = 0;
function checkPendingChangeReq() {
  const s = useStore.getState();
  if (s.changeReq?.status !== 'pending' || !serverConfigured() || Date.now() - lastReqCheck < 60_000) return;
  lastReqCheck = Date.now();
  s.syncChangeReq().catch(() => { /* offline: try again later */ });
}
AppState.addEventListener('change', (st) => { if (st === 'active') checkPendingChangeReq(); });

/** The kid's avatar (a stable default derived from the profile id until they make one). */
export const useAvatar = (): AvatarConfig => { const p = useStore((s) => s.profile); return p.avatar ?? avatarFromSeed(p.id); };

export const useLevel = () => { const xp = useStore((s) => s.progress.xp); return levelFromXp(xp); };

/** Today's local day in the kid's time zone (missions roll over at local midnight). */
export const todayLocal = () => localDay(Date.now(), tz);
export const KID_TZ = tz;

/** Rank from XP (Ti Grenn → … → Lejand). */
export const useRank = () => { const xp = useStore((s) => s.progress.xp); return rankForXp(xp); };

/**
 * Weekly missions: true when all daily missions were done on all 7 days of this week (Mon→Sun)
 * and the guaranteed Legend hero card hasn't been handed out yet. The cards feature shows/gives the card,
 * then calls `useStore.getState().claimWeeklyLegend()`.
 */
export const selectWeeklyLegendEarned = (s: { missions?: MissionLog }) => coreWeeklyLegendEarned(s.missions ?? emptyMissionLog(), localDay(Date.now(), tz));
export const useWeeklyLegendEarned = () => useStore(selectWeeklyLegendEarned);

/** Context for avatar item locks. */
export const useUnlockCtx = (): UnlockCtx => {
  const xp = useStore((s) => s.progress.xp); const streak = useStore((s) => s.progress.streak.count); const badges = useStore((s) => Object.keys(s.progress.badges).length);
  return { xp, streak, badges };
};
