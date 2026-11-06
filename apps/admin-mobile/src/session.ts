/** Session: server address/key (remembered), tokens (secure storage), offline flag, toasts. */
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string; serverKey?: string };
const PREFS_KEY = 'konesans-admin:prefs';
const TOKEN_KEY = 'konesans_admin_token';
const REFRESH_KEY = 'konesans_admin_refresh';

/** Secure on device; localStorage on web (dev/testing only). */
const secure = {
  async get(k: string): Promise<string | null> {
    if (Platform.OS === 'web') { try { return globalThis.localStorage?.getItem(k) ?? null; } catch { return null; } }
    try { return await SecureStore.getItemAsync(k); } catch { return null; }
  },
  async set(k: string, v: string | null) {
    if (Platform.OS === 'web') { try { v == null ? globalThis.localStorage?.removeItem(k) : globalThis.localStorage?.setItem(k, v); } catch { /* ignore */ } return; }
    try { v == null ? await SecureStore.deleteItemAsync(k) : await SecureStore.setItemAsync(k, v); } catch { /* ignore */ }
  },
};

export interface Toast { id: number; text: string; kind: 'ok' | 'err' | 'info'; action?: { label: string; run: () => void } }

interface SessionState {
  ready: boolean;
  apiUrl: string;
  serverKey: string;
  email: string;
  token: string;
  refresh: string;
  offline: boolean;
  toast: Toast | null;
  /** Bumped after a change that other screens should reload for (save, publish). */
  dataVersion: number;
  hydrate: () => Promise<void>;
  setServer: (apiUrl: string, serverKey: string, email: string) => Promise<void>;
  setTokens: (token: string, refresh: string) => Promise<void>;
  logout: () => Promise<void>;
  setOffline: (v: boolean) => void;
  showToast: (text: string, kind?: Toast['kind'], action?: Toast['action']) => void;
  hideToast: () => void;
  bump: () => void;
}

/** Read a URL override like `?api=http://localhost:7350` (web testing only). */
function webOverride(name: string): string | undefined {
  if (Platform.OS !== 'web') return undefined;
  try { return new URLSearchParams(globalThis.location?.search ?? '').get(name) ?? undefined; } catch { return undefined; }
}

export const useSession = create<SessionState>((set, get) => ({
  ready: false,
  apiUrl: extra.apiUrl ?? '',
  serverKey: extra.serverKey ?? '',
  email: '',
  token: '',
  refresh: '',
  offline: false,
  toast: null,
  dataVersion: 0,
  async hydrate() {
    let prefs: Partial<Pick<SessionState, 'apiUrl' | 'serverKey' | 'email'>> = {};
    try { prefs = JSON.parse((await AsyncStorage.getItem(PREFS_KEY)) ?? '{}'); } catch { /* ignore */ }
    const [token, refresh] = await Promise.all([secure.get(TOKEN_KEY), secure.get(REFRESH_KEY)]);
    set({
      apiUrl: webOverride('api') ?? prefs.apiUrl ?? get().apiUrl,
      serverKey: webOverride('key') ?? prefs.serverKey ?? get().serverKey,
      email: prefs.email ?? '',
      token: token ?? '',
      refresh: refresh ?? '',
      ready: true,
    });
  },
  async setServer(apiUrl, serverKey, email) {
    set({ apiUrl, serverKey, email });
    try { await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ apiUrl, serverKey, email })); } catch { /* ignore */ }
  },
  async setTokens(token, refresh) {
    set({ token, refresh });
    await Promise.all([secure.set(TOKEN_KEY, token), secure.set(REFRESH_KEY, refresh)]);
  },
  async logout() {
    set({ token: '', refresh: '' });
    await Promise.all([secure.set(TOKEN_KEY, null), secure.set(REFRESH_KEY, null)]);
  },
  setOffline(v) { if (get().offline !== v) set({ offline: v }); },
  showToast(text, kind = 'ok', action) { set({ toast: { id: Date.now(), text, kind, action } }); },
  hideToast() { set({ toast: null }); },
  bump() { set({ dataVersion: get().dataVersion + 1 }); },
}));
