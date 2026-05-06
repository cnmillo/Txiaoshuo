/**
 * 写法资产状态管理
 *
 * 使用 Zustand 管理写法资产、特征提取、写法绑定等状态
 * 支持持久化和状态同步
 */

import { create } from 'zustand'
import { subscribeWithSelector, persist } from 'zustand/middleware'
import type {
  WritingStyleAsset,
  WritingStyleFeature,
  WritingStyleBinding,
  FeaturePoolItem,
  FeatureCombination,
  WritingStyleFilter,
  CreateWritingStyleRequest,
  UpdateWritingStyleRequest,
  CreateWritingStyleBindingRequest,
  ExtractFeaturesRequest,
  ExtractFeaturesResponse,
} from '@shared/types'

// ============================================================================
// 状态类型定义
// ============================================================================

interface WritingStyleState {
  // 写法资产列表
  assets: WritingStyleAsset[]
  // 当前选中的资产
  selectedAsset: WritingStyleAsset | null
  // 特征池
  featurePool: FeaturePoolItem[]
  // 特征组合
  featureCombinations: FeatureCombination[]
  // 写法绑定
  bindings: WritingStyleBinding[]
  // 筛选条件
  filter: WritingStyleFilter
  // 加载状态
  isLoading: boolean
  // 错误信息
  error: string | null
  // 是否已初始化
  isInitialized: boolean
}

interface WritingStyleActions {
  // 初始化
  initialize: () => Promise<void>

  // 写法资产操作
  fetchAssets: (filter?: WritingStyleFilter) => Promise<void>
  fetchAsset: (id: string) => Promise<WritingStyleAsset | null>
  createAsset: (data: CreateWritingStyleRequest) => Promise<WritingStyleAsset>
  updateAsset: (id: string, data: UpdateWritingStyleRequest) => Promise<WritingStyleAsset>
  deleteAsset: (id: string) => Promise<void>
  duplicateAsset: (id: string) => Promise<WritingStyleAsset>
  setSelectedAsset: (asset: WritingStyleAsset | null) => void

  // 特征池操作
  addToFeaturePool: (feature: WritingStyleFeature, source?: 'extracted' | 'manual' | 'template') => void
  removeFromFeaturePool: (featureId: string) => void
  updateFeaturePoolItem: (featureId: string, updates: Partial<FeaturePoolItem>) => void
  toggleFeatureEnabled: (featureId: string) => void
  setFeatureWeight: (featureId: string, weight: number) => void
  clearFeaturePool: () => void

  // 特征组合操作
  createFeatureCombination: (name: string, description: string, features: Array<{ featureId: string; weight: number }>) => FeatureCombination
  updateFeatureCombination: (id: string, updates: Partial<FeatureCombination>) => void
  deleteFeatureCombination: (id: string) => void
  applyFeatureCombination: (combinationId: string) => void

  // 特征提取
  extractFeatures: (request: ExtractFeaturesRequest) => Promise<ExtractFeaturesResponse>
  extractAndAddToPool: (request: ExtractFeaturesRequest) => Promise<void>

  // 写法绑定操作
  createBinding: (data: CreateWritingStyleBindingRequest) => Promise<WritingStyleBinding>
  fetchBindings: (targetType?: string, targetId?: string) => Promise<void>
  deleteBinding: (id: string) => Promise<void>
  updateBindingConfig: (id: string, config: Partial<WritingStyleBinding['config']>) => Promise<void>

  // 筛选和搜索
  setFilter: (filter: Partial<WritingStyleFilter>) => void
  clearFilter: () => void
  searchAssets: (query: string) => Promise<void>

  // 导入导出
  exportAssets: (assetIds?: string[]) => Promise<string>
  importAssets: (data: string) => Promise<{ success: boolean; importedCount: number; errors: string[] }>

  // 工具方法
  getAssetById: (id: string) => WritingStyleAsset | undefined
  getBindingsByAsset: (assetId: string) => WritingStyleBinding[]
  getBindingsByTarget: (targetType: string, targetId: string) => WritingStyleBinding[]
  getEnabledFeatures: () => FeaturePoolItem[]
  calculateFeatureWeights: () => Record<string, number>

  // 状态管理
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

type WritingStyleStore = WritingStyleState & WritingStyleActions

// ============================================================================
// 初始状态
// ============================================================================

const initialState: WritingStyleState = {
  assets: [],
  selectedAsset: null,
  featurePool: [],
  featureCombinations: [],
  bindings: [],
  filter: {},
  isLoading: false,
  error: null,
  isInitialized: false,
}

// ============================================================================
// API 辅助函数
// ============================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

async function apiCall<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || '请求失败')
  }

  const data = await response.json()
  return data.data
}

// ============================================================================
// Store 实现
// ============================================================================

export const useWritingStyleStore = create<WritingStyleStore>()(
  persist(
    subscribeWithSelector((set, get) => ({
      ...initialState,

      // ========================================================================
      // 初始化
      // ========================================================================

      initialize: async () => {
        if (get().isInitialized) return

        try {
          set({ isLoading: true, error: null })
          await get().fetchAssets()
          set({ isInitialized: true, isLoading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '初始化失败',
            isLoading: false,
          })
        }
      },

      // ========================================================================
      // 写法资产操作
      // ========================================================================

      fetchAssets: async (filter?: WritingStyleFilter) => {
        try {
          set({ isLoading: true, error: null })

          const params = new URLSearchParams()
          if (filter?.search) params.append('search', filter.search)
          if (filter?.isCustom !== undefined) params.append('isCustom', String(filter.isCustom))
          if (filter?.styleTags) params.append('styleTags', filter.styleTags.join(','))
          if (filter?.applicableScenes) params.append('applicableScenes', filter.applicableScenes.join(','))

          const assets = await apiCall<WritingStyleAsset[]>(`/writing-styles?${params.toString()}`)

          set({ assets, filter: filter || {}, isLoading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取写法资产失败',
            isLoading: false,
          })
          throw error
        }
      },

      fetchAsset: async (id: string) => {
        try {
          set({ isLoading: true, error: null })
          const asset = await apiCall<WritingStyleAsset>(`/writing-styles/${id}`)
          set({ isLoading: false })
          return asset
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取写法资产详情失败',
            isLoading: false,
          })
          return null
        }
      },

      createAsset: async (data: CreateWritingStyleRequest) => {
        try {
          set({ isLoading: true, error: null })
          const asset = await apiCall<WritingStyleAsset>('/writing-styles', {
            method: 'POST',
            body: JSON.stringify(data),
          })

          set((state) => ({
            assets: [...state.assets, asset],
            isLoading: false,
          }))

          return asset
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '创建写法资产失败',
            isLoading: false,
          })
          throw error
        }
      },

      updateAsset: async (id: string, data: UpdateWritingStyleRequest) => {
        try {
          set({ isLoading: true, error: null })
          const asset = await apiCall<WritingStyleAsset>(`/writing-styles/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
          })

          set((state) => ({
            assets: state.assets.map((a) => (a.id === id ? asset : a)),
            selectedAsset: state.selectedAsset?.id === id ? asset : state.selectedAsset,
            isLoading: false,
          }))

          return asset
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '更新写法资产失败',
            isLoading: false,
          })
          throw error
        }
      },

      deleteAsset: async (id: string) => {
        try {
          set({ isLoading: true, error: null })
          await apiCall<void>(`/writing-styles/${id}`, {
            method: 'DELETE',
          })

          set((state) => ({
            assets: state.assets.filter((a) => a.id !== id),
            selectedAsset: state.selectedAsset?.id === id ? null : state.selectedAsset,
            isLoading: false,
          }))
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '删除写法资产失败',
            isLoading: false,
          })
          throw error
        }
      },

      duplicateAsset: async (id: string) => {
        try {
          set({ isLoading: true, error: null })
          const asset = await apiCall<WritingStyleAsset>(`/writing-styles/${id}/duplicate`, {
            method: 'POST',
          })

          set((state) => ({
            assets: [...state.assets, asset],
            isLoading: false,
          }))

          return asset
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '复制写法资产失败',
            isLoading: false,
          })
          throw error
        }
      },

      setSelectedAsset: (asset: WritingStyleAsset | null) => {
        set({ selectedAsset: asset })
      },

      // ========================================================================
      // 特征池操作
      // ========================================================================

      addToFeaturePool: (feature: WritingStyleFeature, source: 'extracted' | 'manual' | 'template' = 'manual') => {
        const item: FeaturePoolItem = {
          id: `feature_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          feature,
          isEnabled: true,
          weight: 0.5,
          source,
          createdAt: new Date().toISOString(),
        }

        set((state) => ({
          featurePool: [...state.featurePool, item],
        }))
      },

      removeFromFeaturePool: (featureId: string) => {
        set((state) => ({
          featurePool: state.featurePool.filter((item) => item.id !== featureId),
        }))
      },

      updateFeaturePoolItem: (featureId: string, updates: Partial<FeaturePoolItem>) => {
        set((state) => ({
          featurePool: state.featurePool.map((item) =>
            item.id === featureId ? { ...item, ...updates } : item
          ),
        }))
      },

      toggleFeatureEnabled: (featureId: string) => {
        set((state) => ({
          featurePool: state.featurePool.map((item) =>
            item.id === featureId ? { ...item, isEnabled: !item.isEnabled } : item
          ),
        }))
      },

      setFeatureWeight: (featureId: string, weight: number) => {
        set((state) => ({
          featurePool: state.featurePool.map((item) =>
            item.id === featureId ? { ...item, weight: Math.max(0, Math.min(1, weight)) } : item
          ),
        }))
      },

      clearFeaturePool: () => {
        set({ featurePool: [] })
      },

      // ========================================================================
      // 特征组合操作
      // ========================================================================

      createFeatureCombination: (name: string, description: string, features: Array<{ featureId: string; weight: number }>) => {
        const combination: FeatureCombination = {
          id: `combination_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name,
          description,
          features,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        set((state) => ({
          featureCombinations: [...state.featureCombinations, combination],
        }))

        return combination
      },

      updateFeatureCombination: (id: string, updates: Partial<FeatureCombination>) => {
        set((state) => ({
          featureCombinations: state.featureCombinations.map((combo) =>
            combo.id === id ? { ...combo, ...updates, updatedAt: new Date().toISOString() } : combo
          ),
        }))
      },

      deleteFeatureCombination: (id: string) => {
        set((state) => ({
          featureCombinations: state.featureCombinations.filter((combo) => combo.id !== id),
        }))
      },

      applyFeatureCombination: (combinationId: string) => {
        const combination = get().featureCombinations.find((c) => c.id === combinationId)
        if (!combination) return

        set((state) => ({
          featurePool: state.featurePool.map((item) => {
            const featureWeight = combination.features.find((f) => f.featureId === item.id)
            return featureWeight ? { ...item, weight: featureWeight.weight, isEnabled: true } : item
          }),
        }))
      },

      // ========================================================================
      // 特征提取
      // ========================================================================

      extractFeatures: async (request: ExtractFeaturesRequest) => {
        try {
          set({ isLoading: true, error: null })
          const response = await apiCall<ExtractFeaturesResponse>('/writing-styles/extract-features', {
            method: 'POST',
            body: JSON.stringify(request),
          })
          set({ isLoading: false })
          return response
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '特征提取失败',
            isLoading: false,
          })
          throw error
        }
      },

      extractAndAddToPool: async (request: ExtractFeaturesRequest) => {
        const response = await get().extractFeatures(request)

        // 将提取的特征添加到特征池
        response.result.features.forEach((feature) => {
          get().addToFeaturePool(feature, 'extracted')
        })
      },

      // ========================================================================
      // 写法绑定操作
      // ========================================================================

      createBinding: async (data: CreateWritingStyleBindingRequest) => {
        try {
          set({ isLoading: true, error: null })
          const binding = await apiCall<WritingStyleBinding>('/writing-styles/bindings', {
            method: 'POST',
            body: JSON.stringify(data),
          })

          set((state) => ({
            bindings: [...state.bindings, binding],
            isLoading: false,
          }))

          return binding
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '创建写法绑定失败',
            isLoading: false,
          })
          throw error
        }
      },

      fetchBindings: async (targetType?: string, targetId?: string) => {
        try {
          set({ isLoading: true, error: null })

          const params = new URLSearchParams()
          if (targetType) params.append('targetType', targetType)
          if (targetId) params.append('targetId', targetId)

          const bindings = await apiCall<WritingStyleBinding[]>(`/writing-styles/bindings?${params.toString()}`)

          set({ bindings, isLoading: false })
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '获取写法绑定失败',
            isLoading: false,
          })
          throw error
        }
      },

      deleteBinding: async (id: string) => {
        try {
          set({ isLoading: true, error: null })
          await apiCall<void>(`/writing-styles/bindings/${id}`, {
            method: 'DELETE',
          })

          set((state) => ({
            bindings: state.bindings.filter((b) => b.id !== id),
            isLoading: false,
          }))
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '删除写法绑定失败',
            isLoading: false,
          })
          throw error
        }
      },

      updateBindingConfig: async (id: string, config: Partial<WritingStyleBinding['config']>) => {
        try {
          set({ isLoading: true, error: null })
          const binding = await apiCall<WritingStyleBinding>(`/writing-styles/bindings/${id}/config`, {
            method: 'PATCH',
            body: JSON.stringify(config),
          })

          set((state) => ({
            bindings: state.bindings.map((b) => (b.id === id ? binding : b)),
            isLoading: false,
          }))
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '更新写法绑定配置失败',
            isLoading: false,
          })
          throw error
        }
      },

      // ========================================================================
      // 筛选和搜索
      // ========================================================================

      setFilter: (filter: Partial<WritingStyleFilter>) => {
        set((state) => ({
          filter: { ...state.filter, ...filter },
        }))
      },

      clearFilter: () => {
        set({ filter: {} })
      },

      searchAssets: async (query: string) => {
        await get().fetchAssets({ search: query })
      },

      // ========================================================================
      // 导入导出
      // ========================================================================

      exportAssets: async (assetIds?: string[]) => {
        try {
          set({ isLoading: true, error: null })

          const params = assetIds ? `?ids=${assetIds.join(',')}` : ''
          const data = await apiCall<string>(`/writing-styles/export${params}`)

          set({ isLoading: false })
          return data
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '导出写法资产失败',
            isLoading: false,
          })
          throw error
        }
      },

      importAssets: async (data: string) => {
        try {
          set({ isLoading: true, error: null })

          const result = await apiCall<{ success: boolean; importedCount: number; errors: string[] }>(
            '/writing-styles/import',
            {
              method: 'POST',
              body: JSON.stringify({ data }),
            }
          )

          // 刷新资产列表
          await get().fetchAssets()

          set({ isLoading: false })
          return result
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '导入写法资产失败',
            isLoading: false,
          })
          throw error
        }
      },

      // ========================================================================
      // 工具方法
      // ========================================================================

      getAssetById: (id: string) => {
        return get().assets.find((asset) => asset.id === id)
      },

      getBindingsByAsset: (assetId: string) => {
        return get().bindings.filter((binding) => binding.writingStyleId === assetId)
      },

      getBindingsByTarget: (targetType: string, targetId: string) => {
        return get().bindings.filter(
          (binding) => binding.targetType === targetType && binding.targetId === targetId
        )
      },

      getEnabledFeatures: () => {
        return get().featurePool.filter((item) => item.isEnabled)
      },

      calculateFeatureWeights: () => {
        const enabledFeatures = get().getEnabledFeatures()
        const totalWeight = enabledFeatures.reduce((sum, item) => sum + item.weight, 0)

        if (totalWeight === 0) return {}

        const weights: Record<string, number> = {}
        enabledFeatures.forEach((item) => {
          weights[item.id] = item.weight / totalWeight
        })

        return weights
      },

      // ========================================================================
      // 状态管理
      // ========================================================================

      setLoading: (isLoading: boolean) => {
        set({ isLoading })
      },

      setError: (error: string | null) => {
        set({ error })
      },

      reset: () => {
        set(initialState)
      },
    })),
    {
      name: 'writing-style-storage',
      partialize: (state) => ({
        featurePool: state.featurePool,
        featureCombinations: state.featureCombinations,
        filter: state.filter,
      }),
    }
  )
)

// ============================================================================
// 选择器
// ============================================================================

/**
 * 获取所有写法资产
 */
export const selectAllAssets = (state: WritingStyleStore) => state.assets

/**
 * 获取选中的写法资产
 */
export const selectSelectedAsset = (state: WritingStyleStore) => state.selectedAsset

/**
 * 获取特征池
 */
export const selectFeaturePool = (state: WritingStyleStore) => state.featurePool

/**
 * 获取启用的特征
 */
export const selectEnabledFeatures = (state: WritingStyleStore) =>
  state.featurePool.filter((item) => item.isEnabled)

/**
 * 获取加载状态
 */
export const selectIsLoading = (state: WritingStyleStore) => state.isLoading

/**
 * 获取错误信息
 */
export const selectError = (state: WritingStyleStore) => state.error

/**
 * 获取筛选后的资产
 */
export const selectFilteredAssets = (state: WritingStyleStore) => {
  const { assets, filter } = state

  return assets.filter((asset) => {
    if (filter.search) {
      const searchLower = filter.search.toLowerCase()
      if (
        !asset.name.toLowerCase().includes(searchLower) &&
        !asset.description.toLowerCase().includes(searchLower) &&
        !asset.styleTags.some((tag) => tag.toLowerCase().includes(searchLower))
      ) {
        return false
      }
    }

    if (filter.isCustom !== undefined && asset.isCustom !== filter.isCustom) {
      return false
    }

    if (filter.styleTags && filter.styleTags.length > 0) {
      if (!filter.styleTags.some((tag) => asset.styleTags.includes(tag))) {
        return false
      }
    }

    if (filter.applicableScenes && filter.applicableScenes.length > 0) {
      if (!filter.applicableScenes.some((scene) => asset.applicableScenes.includes(scene))) {
        return false
      }
    }

    return true
  })
}
