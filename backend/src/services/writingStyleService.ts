/**
 * 写法引擎服务
 *
 * 提供写法资产的CRUD操作、特征提取、写法绑定等功能
 */

import { v4 as uuidv4 } from 'uuid'
import type {
  WritingStyleAsset,
  WritingStyleFeature,
  WritingStyleBinding,
  CreateWritingStyleRequest,
  UpdateWritingStyleRequest,
  WritingStyleFilter,
  FeatureExtractionResult,
  ExtractFeaturesRequest,
  ExtractFeaturesResponse,
  CreateWritingStyleBindingRequest,
} from '@novel-generator/shared'
import logger from '../utils/logger.js'

// ============================================================================
// 数据存储（实际项目中应使用数据库）
// ============================================================================

// 写法资产存储
const assetsStore = new Map<string, WritingStyleAsset>()

// 写法绑定存储
const bindingsStore = new Map<string, WritingStyleBinding>()

// ============================================================================
// 写法资产服务
// ============================================================================

export const writingStyleService = {
  /**
   * 获取所有写法资产
   */
  async getAllAssets(filter?: WritingStyleFilter): Promise<WritingStyleAsset[]> {
    let assets = Array.from(assetsStore.values())

    // 应用筛选条件
    if (filter) {
      if (filter.search) {
        const searchLower = filter.search.toLowerCase()
        assets = assets.filter(
          (asset) =>
            asset.name.toLowerCase().includes(searchLower) ||
            asset.description.toLowerCase().includes(searchLower) ||
            asset.styleTags.some((tag) => tag.toLowerCase().includes(searchLower))
        )
      }

      if (filter.isCustom !== undefined) {
        assets = assets.filter((asset) => asset.isCustom === filter.isCustom)
      }

      if (filter.styleTags && filter.styleTags.length > 0) {
        assets = assets.filter((asset) =>
          filter.styleTags!.some((tag) => asset.styleTags.includes(tag))
        )
      }

      if (filter.applicableScenes && filter.applicableScenes.length > 0) {
        assets = assets.filter((asset) =>
          filter.applicableScenes!.some((scene) => asset.applicableScenes.includes(scene))
        )
      }
    }

    // 按创建时间倒序排列
    return assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  },

  /**
   * 根据ID获取写法资产
   */
  async getAssetById(id: string): Promise<WritingStyleAsset | null> {
    return assetsStore.get(id) || null
  },

  /**
   * 创建写法资产
   */
  async createAsset(data: CreateWritingStyleRequest): Promise<WritingStyleAsset> {
    const now = new Date().toISOString()

    const asset: WritingStyleAsset = {
      id: uuidv4(),
      name: data.name,
      description: data.description,
      styleTags: data.styleTags,
      applicableScenes: data.applicableScenes,
      featurePool: data.featurePool || [],
      referenceText: data.referenceText,
      sampleText: data.sampleText,
      promptTemplate: data.promptTemplate,
      isCustom: true,
      isDefault: false,
      usageStats: {
        totalUsage: 0,
      },
      createdAt: now,
      updatedAt: now,
    }

    assetsStore.set(asset.id, asset)
    logger.info(`创建写法资产: ${asset.id} - ${asset.name}`)

    return asset
  },

  /**
   * 更新写法资产
   */
  async updateAsset(id: string, data: UpdateWritingStyleRequest): Promise<WritingStyleAsset> {
    const existing = assetsStore.get(id)

    if (!existing) {
      throw new Error('写法资产不存在')
    }

    const updated: WritingStyleAsset = {
      ...existing,
      ...data,
      id, // 确保ID不被修改
      updatedAt: new Date().toISOString(),
    }

    assetsStore.set(id, updated)
    logger.info(`更新写法资产: ${id}`)

    return updated
  },

  /**
   * 删除写法资产
   */
  async deleteAsset(id: string): Promise<void> {
    const existing = assetsStore.get(id)

    if (!existing) {
      throw new Error('写法资产不存在')
    }

    if (existing.isDefault) {
      throw new Error('默认写法资产不能删除')
    }

    assetsStore.delete(id)

    // 删除相关绑定
    const bindings = Array.from(bindingsStore.values()).filter((b) => b.writingStyleId === id)
    bindings.forEach((b) => bindingsStore.delete(b.id))

    logger.info(`删除写法资产: ${id}`)
  },

  /**
   * 复制写法资产
   */
  async duplicateAsset(id: string): Promise<WritingStyleAsset> {
    const existing = assetsStore.get(id)

    if (!existing) {
      throw new Error('写法资产不存在')
    }

    const now = new Date().toISOString()
    const duplicated: WritingStyleAsset = {
      ...existing,
      id: uuidv4(),
      name: `${existing.name} (副本)`,
      isDefault: false,
      usageStats: {
        totalUsage: 0,
      },
      createdAt: now,
      updatedAt: now,
    }

    assetsStore.set(duplicated.id, duplicated)
    logger.info(`复制写法资产: ${id} -> ${duplicated.id}`)

    return duplicated
  },

  // ========================================================================
  // 特征提取
  // ========================================================================

  /**
   * 提取特征
   */
  async extractFeatures(
    text: string,
    options?: ExtractFeaturesRequest['options']
  ): Promise<ExtractFeaturesResponse> {
    logger.info('开始特征提取', { textLength: text.length, options })

    // 这里应该调用AI服务进行特征提取
    // 为了演示，我们返回模拟的特征
    const features: WritingStyleFeature[] = []

    // 提取句式特征
    if (options?.extractSentence !== false) {
      features.push({
        type: 'sentence',
        longSentenceRatio: 0.4,
        shortSentenceRatio: 0.6,
        averageSentenceLength: 15.5,
        complexSentenceRatio: 0.3,
        sentenceVariety: 75,
        rhetoricalQuestions: true,
        exclamatorySentences: false,
        parallelSentences: true,
        description: '句式以短句为主，节奏明快，善于使用排比增强气势',
      })
    }

    // 提取用词特征
    if (options?.extractVocabulary !== false) {
      features.push({
        type: 'vocabulary',
        frequentWords: [
          { word: '然后', frequency: 15, category: '连词' },
          { word: '突然', frequency: 12, category: '副词' },
          { word: '但是', frequency: 10, category: '连词' },
        ],
        rhetoricalDevices: [
          { type: 'metaphor', frequency: 5, examples: ['时间如流水'] },
          { type: 'simile', frequency: 3, examples: ['像风一样快'] },
        ],
        vocabularyRichness: 68,
        classicalRatio: 0.2,
        modernRatio: 0.8,
        description: '用词现代简洁，善于使用比喻和明喻，词汇丰富度中等',
      })
    }

    // 提取情感特征
    if (options?.extractEmotion !== false) {
      features.push({
        type: 'emotion',
        emotionalTone: 'mixed',
        emotionalIntensity: 65,
        expressionStyle: 'implicit',
        commonEmotions: [
          { emotion: '喜悦', frequency: 30 },
          { emotion: '忧伤', frequency: 25 },
          { emotion: '愤怒', frequency: 20 },
        ],
        description: '情感表达含蓄内敛，情感基调复杂多变，强度适中',
      })
    }

    // 提取节奏特征
    if (options?.extractRhythm !== false) {
      features.push({
        type: 'rhythm',
        overallPacing: 'moderate',
        paragraphRhythm: {
          averageParagraphLength: 120,
          shortParagraphRatio: 0.4,
          longParagraphRatio: 0.2,
        },
        chapterRhythm: {
          cliffhangerFrequency: 0.3,
          tensionBuildup: '渐进式',
        },
        description: '节奏适中，段落长短搭配合理，善于制造悬念',
      })
    }

    // 提取视角特征
    if (options?.extractPerspective !== false) {
      features.push({
        type: 'perspective',
        primaryPerspective: 'third_person_limited',
        perspectiveSwitching: false,
        switchFrequency: 0,
        innerMonologue: {
          frequency: 0.4,
          style: 'organized',
        },
        description: '采用第三人称有限视角，不进行视角切换，内心独白较为有序',
      })
    }

    const result: FeatureExtractionResult = {
      id: uuidv4(),
      sourceText: text,
      features,
      extractedAt: new Date().toISOString(),
      confidence: 0.85,
      metadata: {
        textLength: text.length,
      },
    }

    return {
      result,
      suggestions: [
        '建议增加更多参考文本以提高提取准确性',
        '可以针对特定类型的特征进行更深入的分析',
        '提取的特征可以进一步调整权重以优化效果',
      ],
    }
  },

  // ========================================================================
  // 写法绑定
  // ========================================================================

  /**
   * 获取写法绑定
   */
  async getBindings(targetType?: string, targetId?: string): Promise<WritingStyleBinding[]> {
    let bindings = Array.from(bindingsStore.values())

    if (targetType) {
      bindings = bindings.filter((b) => b.targetType === targetType)
    }

    if (targetId) {
      bindings = bindings.filter((b) => b.targetId === targetId)
    }

    return bindings
  },

  /**
   * 创建写法绑定
   */
  async createBinding(data: CreateWritingStyleBindingRequest): Promise<WritingStyleBinding> {
    // 检查写法资产是否存在
    const asset = assetsStore.get(data.writingStyleId)
    if (!asset) {
      throw new Error('写法资产不存在')
    }

    // 检查是否已存在相同绑定
    const existing = Array.from(bindingsStore.values()).find(
      (b) =>
        b.writingStyleId === data.writingStyleId &&
        b.targetType === data.targetType &&
        b.targetId === data.targetId
    )

    if (existing) {
      throw new Error('该写法资产已绑定到此目标')
    }

    const now = new Date().toISOString()
    const binding: WritingStyleBinding = {
      id: uuidv4(),
      writingStyleId: data.writingStyleId,
      targetType: data.targetType,
      targetId: data.targetId,
      config: data.config,
      createdAt: now,
      updatedAt: now,
    }

    bindingsStore.set(binding.id, binding)

    // 更新资产使用统计
    asset.usageStats.totalUsage++
    asset.usageStats.lastUsedAt = now
    assetsStore.set(asset.id, asset)

    logger.info(`创建写法绑定: ${binding.id}`)

    return binding
  },

  /**
   * 删除写法绑定
   */
  async deleteBinding(id: string): Promise<void> {
    const existing = bindingsStore.get(id)

    if (!existing) {
      throw new Error('写法绑定不存在')
    }

    bindingsStore.delete(id)
    logger.info(`删除写法绑定: ${id}`)
  },

  /**
   * 更新写法绑定配置
   */
  async updateBindingConfig(
    id: string,
    config: Partial<WritingStyleBinding['config']>
  ): Promise<WritingStyleBinding> {
    const existing = bindingsStore.get(id)

    if (!existing) {
      throw new Error('写法绑定不存在')
    }

    const updated: WritingStyleBinding = {
      ...existing,
      config: {
        ...existing.config,
        ...config,
      },
      updatedAt: new Date().toISOString(),
    }

    bindingsStore.set(id, updated)
    logger.info(`更新写法绑定配置: ${id}`)

    return updated
  },

  // ========================================================================
  // 导入导出
  // ========================================================================

  /**
   * 导出写法资产
   */
  async exportAssets(assetIds?: string[]): Promise<string> {
    let assets = Array.from(assetsStore.values())

    if (assetIds && assetIds.length > 0) {
      assets = assets.filter((a) => assetIds.includes(a.id))
    }

    const exportData = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      assets,
    }

    return JSON.stringify(exportData, null, 2)
  },

  /**
   * 导入写法资产
   */
  async importAssets(data: string): Promise<{
    success: boolean
    importedCount: number
    errors: Array<{ assetName: string; error: string }>
  }> {
    try {
      const importData = JSON.parse(data)
      const errors: Array<{ assetName: string; error: string }> = []
      let importedCount = 0

      for (const asset of importData.assets || []) {
        try {
          // 检查是否已存在同名资产
          const existing = Array.from(assetsStore.values()).find((a) => a.name === asset.name)

          if (existing) {
            errors.push({
              assetName: asset.name,
              error: '已存在同名资产',
            })
            continue
          }

          // 创建新资产
          const newAsset: WritingStyleAsset = {
            ...asset,
            id: uuidv4(),
            isDefault: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          assetsStore.set(newAsset.id, newAsset)
          importedCount++
        } catch (error) {
          errors.push({
            assetName: asset.name || '未知',
            error: error instanceof Error ? error.message : '导入失败',
          })
        }
      }

      return {
        success: true,
        importedCount,
        errors,
      }
    } catch (error) {
      throw new Error('导入数据格式错误')
    }
  },
}

// ============================================================================
// 初始化默认数据
// ============================================================================

// 创建默认写法资产
const defaultAsset: WritingStyleAsset = {
  id: 'default-writing-style',
  name: '默认写法',
  description: '系统默认的写法风格，适用于大多数场景',
  styleTags: ['通用', '现代'],
  applicableScenes: ['小说', '故事', '散文'],
  featurePool: [],
  isCustom: false,
  isDefault: true,
  usageStats: {
    totalUsage: 0,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

assetsStore.set(defaultAsset.id, defaultAsset)
