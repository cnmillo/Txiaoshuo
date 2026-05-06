import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AIModel } from '../types/aiModel'

interface AppState {
  aiModels: AIModel[]
  activeModel: AIModel | null
  setAIModels: (models: AIModel[]) => void
  setActiveModel: (model: AIModel | null) => void
  addAIModel: (model: AIModel) => void
  updateAIModel: (id: string, model: Partial<AIModel>) => void
  removeAIModel: (id: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      aiModels: [],
      activeModel: null,
      
      setAIModels: (models) => set({ aiModels: models }),
      
      setActiveModel: (model) => set({ activeModel: model }),
      
      addAIModel: (model) => set((state) => ({
        aiModels: [...state.aiModels, model]
      })),
      
      updateAIModel: (id, updates) => set((state) => ({
        aiModels: state.aiModels.map((m) =>
          m.id === id ? { ...m, ...updates } : m
        ),
        activeModel: state.activeModel?.id === id
          ? { ...state.activeModel, ...updates }
          : state.activeModel
      })),
      
      removeAIModel: (id) => set((state) => ({
        aiModels: state.aiModels.filter((m) => m.id !== id),
        activeModel: state.activeModel?.id === id ? null : state.activeModel
      }))
    }),
    {
      name: 'app-storage',
      partialize: (state) => ({
        aiModels: state.aiModels,
        activeModel: state.activeModel
      })
    }
  )
)
