/**
 * Daily reminders — local notifications only (no push server), with expo-notifications (native module: needs the
 * APK that ships it). The plan (which day, what time, which text) is core progress/reminders.ts; this file keeps the
 * kid's choice (on/off + time, key 'konesans-reminders'), asks the permission and (re)schedules:
 * on app start, when the app comes back, after every activity (the streak day changes) and when the setting changes.
 * Older APKs without the module, and the web, simply don't show the setting (`remindersAvailable()`), like google.ts.
 * Nothing in the quiz / review / duel code imports this file.
 */
import { AppState, Platform } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { planReminders, mergeDefaults, DEFAULT_REMINDER, type ReminderPrefs, type PlannedReminder } from '@konesans/core';
import { useStore, onResetAll, KID_TZ } from './store';
import { tr, type StrKey } from './i18n';

type NotifModule = typeof import('expo-notifications');
let mod: NotifModule | null | undefined;
/** The native module, or null (older APK, web, Expo Go without it). */
function N(): NotifModule | null {
  if (mod !== undefined) return mod;
  const force = (globalThis as { __KONESANS_FORCE_REMINDERS?: boolean }).__KONESANS_FORCE_REMINDERS; // web screenshots only
  if (Platform.OS === 'web' && !force) return (mod = null);
  try {
    const m: NotifModule = null as any; if (!m) throw new Error('no notifications module in this build');
    if (!force && typeof m?.scheduleNotificationAsync !== 'function') return (mod = null);
    mod = m;
  } catch { mod = null; }
  return mod;
}
export const remindersAvailable = () => !!N();

const CHANNEL = 'reminders';
const TAG = 'konesans-reminder';

interface ReminderStore extends ReminderPrefs {
  /** the kid has seen the "why" screen before the system permission question */
  explained: boolean;
  set: (p: Partial<ReminderPrefs & { explained: boolean }>) => void;
}
export const useReminders = create<ReminderStore>()(persist((set) => ({
  ...DEFAULT_REMINDER, explained: false,
  set: (p) => set(p),
}), {
  name: 'konesans-reminders', version: 1, storage: createJSONStorage(() => AsyncStorage),
  merge: (persisted, current) => mergeDefaults(current, persisted),
  partialize: (s) => ({ on: s.on, hour: s.hour, minute: s.minute, explained: s.explained }),
}));
// "Rekòmanse a zewo" turns reminders off; taking a cloud save (recovery code, or another phone chose its progress)
// keeps this phone's choice — the plan is simply made again for the restored streak
onResetAll('reminders', ({ restore }) => { if (restore) { rescheduleReminders(); return; } useReminders.setState({ ...DEFAULT_REMINDER, explained: false }); cancelAll(); });

export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';
export async function permissionState(): Promise<PermissionState> {
  const n = N(); if (!n) return 'unavailable';
  try { const p = await n.getPermissionsAsync(); return p.granted ? 'granted' : p.canAskAgain === false ? 'denied' : 'undetermined'; } catch { return 'unavailable'; }
}
/** The system question (Android 13+ / iOS). Call it after the app's own explanation. */
export async function askPermission(): Promise<boolean> {
  const n = N(); if (!n) return false;
  try {
    await ensureChannel(n); // Android: the channel must exist before the question
    const p = await n.requestPermissionsAsync();
    return !!p.granted;
  } catch { return false; }
}

async function ensureChannel(n: NotifModule) {
  if (Platform.OS !== 'android') return;
  const lang = useStore.getState().profile.lang;
  await n.setNotificationChannelAsync(CHANNEL, { name: tr('rem_channel', lang), importance: n.AndroidImportance.DEFAULT, vibrationPattern: [0, 200, 120, 200], lightColor: '#1F47B5' });
}

async function cancelAll() {
  const n = N(); if (!n) return;
  try {
    const all = await n.getAllScheduledNotificationsAsync();
    await Promise.all(all.filter((x) => (x.content.data as { tag?: string } | null)?.tag === TAG).map((x) => n.cancelScheduledNotificationAsync(x.identifier)));
  } catch { /* nothing scheduled */ }
}

const DAILY_KEYS: StrKey[] = ['rem_daily_0', 'rem_daily_1', 'rem_daily_2', 'rem_daily_3'];
const STREAK_KEYS: StrKey[] = ['rem_streak_0', 'rem_streak_1'];
/** Ti Zwazo's words for one planned reminder. */
export function reminderText(r: PlannedReminder, lang: 'ht' | 'fr'): { title: string; body: string } {
  // "Seri w: N jou" needs N ≥ 2 (French "1 jours" is wrong, and 1 day is hardly a streak yet): use another friendly text
  const text = r.kind === 'daily' && r.text === 0 && r.streak < 2 ? 1 : r.text;
  const key = r.kind === 'streak' ? STREAK_KEYS[text % STREAK_KEYS.length] : DAILY_KEYS[text % DAILY_KEYS.length];
  return { title: tr(r.kind === 'streak' ? 'rem_title_streak' : 'rem_title', lang), body: tr(key, lang, { n: r.streak }) };
}

let running: Promise<void> | null = null; let again = false;
/** Replace our scheduled reminders with a fresh plan (serialised: a burst of calls schedules once more at most). */
export function rescheduleReminders(): Promise<void> {
  if (running) { again = true; return running; }
  running = (async () => {
    const n = N(); if (!n) return;
    const s = useStore.getState(); const prefs = useReminders.getState();
    await cancelAll();
    if (!prefs.on) return;
    if ((await permissionState()) !== 'granted') return;
    await ensureChannel(n);
    const plan = planReminders({ now: Date.now(), tz: KID_TZ, prefs, progress: s.progress, settings: s.kidSettings });
    for (const r of plan) {
      const { title, body } = reminderText(r, s.profile.lang);
      await n.scheduleNotificationAsync({
        content: { title, body, data: { tag: TAG, kind: r.kind, url: '/home' }, sound: false },
        trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: r.at, channelId: CHANNEL },
      }).catch(() => {});
    }
  })().catch(() => {}).finally(() => {
    running = null;
    if (again) { again = false; rescheduleReminders(); }
  });
  return running;
}

let started = false;
/** Called once from the root layout: shows reminders while the app is open too, and keeps the plan fresh. */
export function startReminders() {
  const n = N(); if (!n || started) return;
  started = true;
  try { n.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }) }); } catch { /* */ }
  rescheduleReminders();
  AppState.addEventListener('change', (st) => { if (st === 'active') rescheduleReminders(); });
  // an activity was finished (streak day / count changed), the language or the parent's limits changed
  useStore.subscribe((s, prev) => {
    if (s.progress.streak !== prev.progress.streak || s.profile.lang !== prev.profile.lang || s.kidSettings !== prev.kidSettings) rescheduleReminders();
  });
  useReminders.subscribe((s, prev) => { if (s.on !== prev.on || s.hour !== prev.hour || s.minute !== prev.minute) rescheduleReminders(); });
}
