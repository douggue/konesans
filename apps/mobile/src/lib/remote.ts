/**
 * Content from your server (admin panel → Pibliye). See docs/API.md.
 * - On start and when the app comes back to the foreground (at most every 5 minutes) we read the manifest.
 * - When its version is newer, we download the packs whose hash changed and keep everything on the device,
 *   so kids keep playing offline. Before the first successful sync the app uses the bundled bank.
 */
import { AppState } from 'react-native';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AgeBand, Question } from '@konesans/core';

export interface RemoteCategory { id: string; name: { ht: string; fr: string }; icon: string; color: string; order: number; enabled: boolean; isNew: boolean; ages: AgeBand[] }
export interface RemoteConfig {
  announcement: { on: boolean; ht: string; fr: string; color: 'blue' | 'yellow' | 'red' | 'green' };
  maintenance: { on: boolean; ht: string; fr: string };
  features: { duels: boolean; courses: boolean; coding: boolean; math: boolean; peyi: boolean };
  serveReview: boolean; dailyCount: number; minAppVersion: string;
}
interface Manifest { version: number; publishedAt: string; config: RemoteConfig; categories: RemoteCategory[]; strings: Record<string, [string, string]>; packs: { category: string; count: number; hash: string }[] }

interface RemoteState {
  version: number;
  publishedAt: string | null;
  config: RemoteConfig | null;
  categories: RemoteCategory[] | null;
  strings: Record<string, [string, string]>;
  packs: Record<string, Question[]>;
  hashes: Record<string, string>;
  checkedAt: number;
  syncing: boolean;
  lastError: string | null;
}

export const useRemote = create<RemoteState>()(
  persist(
    (): RemoteState => ({ version: 0, publishedAt: null, config: null, categories: null, strings: {}, packs: {}, hashes: {}, checkedAt: 0, syncing: false, lastError: null }),
    {
      name: 'konesans-remote', version: 1, storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ syncing, ...rest }) => rest,
    },
  ),
);

import { SERVER } from './server-config';
const API = SERVER.apiUrl.replace(/\/$/, '');
const KEY = SERVER.httpKey;
export const serverConfigured = () => !!API && !API.includes('CHANGE-ME') && !!KEY;

async function call<T>(id: string, body: object): Promise<T> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(`${API}/v2/rpc/${id}?http_key=${encodeURIComponent(KEY)}&unwrap`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body), signal: ctl.signal,
    });
    if (!r.ok) throw new Error(`${id} ${r.status}`);
    return (await r.json()) as T;
  } finally { clearTimeout(timer); }
}

const MIN_INTERVAL = 60 * 1000; // when the app comes back to the foreground

/** Check the server for newly published content. Safe to call often; does nothing offline. */
export async function syncContent(force = false): Promise<void> {
  const s = useRemote.getState();
  if (!serverConfigured() || s.syncing) return;
  if (!force && Date.now() - s.checkedAt < MIN_INTERVAL) return;
  useRemote.setState({ syncing: true });
  try {
    const man = await call<Manifest>('content_manifest', {});
    if (!man?.version || man.version <= s.version) { useRemote.setState({ checkedAt: Date.now(), lastError: null }); return; }
    const packs = { ...s.packs }; const hashes = { ...s.hashes };
    for (const p of man.packs) {
      if (hashes[p.category] === p.hash && packs[p.category]) continue;
      const pack = await call<{ questions: Question[] }>('content_pack', { category: p.category });
      packs[p.category] = pack.questions ?? [];
      hashes[p.category] = p.hash;
    }
    for (const k of Object.keys(packs)) if (!man.packs.some((p) => p.category === k)) { delete packs[k]; delete hashes[k]; }
    // only switch once every pack arrived, so a half-finished download never shows
    useRemote.setState({
      version: man.version, publishedAt: man.publishedAt, config: man.config, categories: man.categories,
      strings: man.strings ?? {}, packs, hashes, checkedAt: Date.now(), lastError: null,
    });
  } catch (e) {
    useRemote.setState({ checkedAt: Date.now(), lastError: String((e as Error)?.message ?? e) });
  } finally {
    useRemote.setState({ syncing: false });
  }
}

let started = false;
/** Start syncing: now, and each time the app returns to the foreground. */
export function startContentSync() {
  if (started) return; started = true;
  const launch = () => { syncContent(true).catch(() => {}); }; // every app start checks right away
  if (useRemote.persist.hasHydrated()) launch(); else useRemote.persist.onFinishHydration(launch);
  AppState.addEventListener('change', (st) => { if (st === 'active') syncContent().catch(() => {}); });
}

// ---------- selectors ----------
const DEFAULT_FEATURES: RemoteConfig['features'] = { duels: true, courses: true, coding: true, math: true, peyi: true };
export const useFeatures = () => useRemote((s) => s.config?.features) ?? DEFAULT_FEATURES;
export const useAnnouncement = () => useRemote((s) => (s.config?.announcement?.on ? s.config.announcement : null));
export const useMaintenance = () => useRemote((s) => (s.config?.maintenance?.on ? s.config.maintenance : null));
export const useDailyCount = () => useRemote((s) => s.config?.dailyCount) ?? 10;
