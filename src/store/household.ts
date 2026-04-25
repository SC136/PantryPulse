import { create } from 'zustand';
import { Household } from '@/types';

interface HouseholdStore {
  households: Household[];
  activeHouseholdId: string | null;
  isBootstrapped: boolean;
  setHouseholds: (households: Household[]) => void;
  setActiveHouseholdId: (id: string | null) => void;
  addHousehold: (h: Household) => void;
  setBootstrapped: (v: boolean) => void;
}

function readStoredId(): string | null {
  if (typeof window === 'undefined') return null;
  try { return localStorage.getItem('activeHouseholdId'); } catch { return null; }
}

function persistId(id: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (id) localStorage.setItem('activeHouseholdId', id);
    else localStorage.removeItem('activeHouseholdId');
  } catch { /* SSR safe */ }
}

export const useHouseholdStore = create<HouseholdStore>((set) => ({
  households: [],
  activeHouseholdId: readStoredId(),
  isBootstrapped: false,

  setHouseholds: (households) =>
    set((s) => {
      // If the stored id is no longer valid, pick first
      const valid = households.some((h) => h.id === s.activeHouseholdId);
      const activeHouseholdId = valid
        ? s.activeHouseholdId
        : households[0]?.id ?? null;
      persistId(activeHouseholdId);
      return { households, activeHouseholdId };
    }),

  setActiveHouseholdId: (id) => {
    persistId(id);
    set({ activeHouseholdId: id });
  },

  addHousehold: (h) =>
    set((s) => ({ households: [...s.households, h] })),

  setBootstrapped: (isBootstrapped) => set({ isBootstrapped }),
}));
