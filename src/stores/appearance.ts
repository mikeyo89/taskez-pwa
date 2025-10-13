"use client";

import { create } from 'zustand';
import { ACCENT_STORAGE_KEY, DEFAULT_ACCENT, type AccentKey, applyAccent } from '@/lib/appearance';

type AppearanceState = {
  accent: AccentKey;
  hydrated: boolean;
  setAccent: (accent: AccentKey) => void;
  hydrate: () => void;
};

export const useAppearanceStore = create<AppearanceState>((set, get) => ({
  accent: DEFAULT_ACCENT,
  hydrated: false,
  setAccent: (accent) => {
    applyAccent(accent);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    }
    set({ accent });
  },
  hydrate: () => {
    if (get().hydrated || typeof window === 'undefined') {
      return;
    }
    const stored = window.localStorage.getItem(ACCENT_STORAGE_KEY) as AccentKey | null;
    const accent = stored ?? DEFAULT_ACCENT;
    applyAccent(accent);
    set({ accent, hydrated: true });
  }
}));
