/** Kat Ewo collection (persisted on device under 'konesans-cards'). Which card is won is decided in @konesans/core. */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { drawCard, grantLegendCard, HERO_CARDS, type CardDraw } from '@konesans/core';
import { useStore } from './store';

export interface CardWin { id: string; isNew: boolean; coins: number }

interface CardsState {
  /** owned card ids, in the order they were won */
  owned: string[];
  /** won but not opened yet on the collection screen (shows a "NOUVO" dot) */
  fresh: string[];
  /** cards whose back the kid has read (the +5 XP is given once) */
  read: string[];
  /** last draws by key, so a remount or a double render never gives two cards for one defi */
  draws: Record<string, CardWin>;
  /**
   * The card for a finished defi (`kind: 'defi'`) or a weekly-mission reward (`kind: 'legend'`: an unowned
   * Lejand card if any is left). Idempotent per `key`. Duplicates become coins (added to the main store).
   */
  earn: (key: string, kind?: 'defi' | 'legend') => CardWin;
  /** First time the back of a card is read: +5 XP. Returns true when it was the first time. */
  markRead: (id: string) => boolean;
  markSeen: (id: string) => void;
  reset: () => void;
}

const READ_XP = 5;

export const useCards = create<CardsState>()(
  persist(
    (set, get) => ({
      owned: [],
      fresh: [],
      read: [],
      draws: {},
      earn: (key, kind = 'defi') => {
        const prev = get().draws[key];
        if (prev) return prev;
        const owned = get().owned;
        const d: CardDraw = kind === 'legend' ? grantLegendCard(owned, Math.random) : drawCard(owned, Math.random);
        const win: CardWin = { id: d.card.id, isNew: d.isNew, coins: d.coins };
        const keys = Object.keys(get().draws).slice(-19); // keep the last 20 keys
        const draws: Record<string, CardWin> = {};
        for (const k of keys) draws[k] = get().draws[k];
        draws[key] = win;
        set((s) => ({
          draws,
          owned: d.isNew ? [...s.owned, d.card.id] : s.owned,
          fresh: d.isNew ? [...s.fresh.filter((x) => x !== d.card.id), d.card.id] : s.fresh,
        }));
        if (d.coins > 0) useStore.getState().award(0, d.coins);
        return win;
      },
      markRead: (id) => {
        if (get().read.includes(id) || !get().owned.includes(id)) return false;
        set((s) => ({ read: [...s.read, id] }));
        useStore.getState().award(READ_XP, 0);
        return true;
      },
      markSeen: (id) => { if (get().fresh.includes(id)) set((s) => ({ fresh: s.fresh.filter((x) => x !== id) })); },
      reset: () => set({ owned: [], fresh: [], read: [], draws: {} }),
    }),
    {
      name: 'konesans-cards',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ owned: s.owned, fresh: s.fresh, read: s.read, draws: s.draws }),
      // drop ids of cards that no longer exist
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CardsState>;
        const known = new Set(HERO_CARDS.map((c) => c.id));
        const keep = (a?: string[]) => (a ?? []).filter((x) => known.has(x));
        return { ...current, ...p, owned: keep(p.owned), fresh: keep(p.fresh), read: keep(p.read), draws: p.draws ?? {} };
      },
    },
  ),
);

export const CARD_READ_XP = READ_XP;
