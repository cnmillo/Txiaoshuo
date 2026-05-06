import { create } from 'zustand'
import type { Novel } from '@shared/types'

interface AppState {
  novels: Novel[]
  setNovels: (novels: Novel[]) => void
  addNovel: (novel: Novel) => void
  removeNovel: (id: string) => void
  updateNovel: (id: string, updates: Partial<Novel>) => void
}

export const useAppStore = create<AppState>((set) => ({
  novels: [],
  setNovels: (novels) => set({ novels }),
  addNovel: (novel) => set((state) => ({ novels: [...state.novels, novel] })),
  removeNovel: (id) =>
    set((state) => ({ novels: state.novels.filter((n) => n.id !== id) })),
  updateNovel: (id, updates) =>
    set((state) => ({
      novels: state.novels.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
}))
