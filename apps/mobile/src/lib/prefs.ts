/** Small kid preferences kept on the phone (separate from the main store). */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Difficulty } from '@konesans/core';

interface Prefs { difficulty: Difficulty; setDifficulty: (d: Difficulty) => void }
export const usePrefs = create<Prefs>()(persist((set) => ({ difficulty: 2, setDifficulty: (difficulty) => set({ difficulty }) }), {
  name: 'konesans-prefs', version: 1, storage: createJSONStorage(() => AsyncStorage),
}));
