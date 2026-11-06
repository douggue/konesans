/** In-memory cache of loaded questions so the editor opens instantly from the list. */
import { create } from 'zustand';
import type { AdminQuestion, Category } from './api';

interface CacheState {
  byCat: Record<string, AdminQuestion[]>;
  categories: Category[] | null;
  put: (category: string, qs: AdminQuestion[]) => void;
  upsert: (q: AdminQuestion) => void;
  remove: (id: string) => void;
  setCategories: (c: Category[]) => void;
  find: (id: string) => AdminQuestion | undefined;
}

export const useCache = create<CacheState>((set, get) => ({
  byCat: {},
  categories: null,
  put: (category, qs) => set({ byCat: { ...get().byCat, [category]: qs } }),
  upsert: (q) => {
    const list = get().byCat[q.category] ?? [];
    const i = list.findIndex((x) => x.id === q.id);
    const next = i >= 0 ? list.map((x) => (x.id === q.id ? q : x)) : [...list, q];
    set({ byCat: { ...get().byCat, [q.category]: next } });
  },
  remove: (id) => {
    const byCat = { ...get().byCat };
    for (const k of Object.keys(byCat)) byCat[k] = byCat[k].filter((q) => q.id !== id);
    set({ byCat });
  },
  setCategories: (categories) => set({ categories }),
  find: (id) => Object.values(get().byCat).flat().find((q) => q.id === id),
}));
