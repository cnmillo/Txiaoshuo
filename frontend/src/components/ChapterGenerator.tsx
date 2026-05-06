import { useState, useCallback, useEffect, useRef } from 'react'
import {
  Sparkles,
  RotateCcw,
  Settings,
  ChevronDown,
  ChevronUp,
  Loader2,
  FileText,
  Wand2,
  Palette,
  Eraser,
} from 'lucide-react'
import {
  ChapterGenerationParams,
  BatchGenerationParams,
  GenerationProgress,
  ChapterStatus,
} from '../types/chapterExecution'
import { cn } from '../utils'
import type { PolishOptions } from '../services/api'
import { getHumanizeConfig, updateHumanizeConfig } from '../services/api'
import { logger } from '../utils/logger'

interface ChapterGeneratorProps {
  /** 当前章节ID */
  chapterId: string | null
  /** 章节序号 */
  chapterNumber: number
  /** 章节标题 */
  chapterTitle: string
  /** 章节大纲 */
  chapterOutline?: {
    summary: string
    keyPlotPoints: string[]
    involvedCharacters: string[]
  }
  /** 当前内容 */
  currentContent?: string
  /** 生成回调 */
  onGenerate: (params: ChapterGenerationParams) => Promise<void>
  /** 批量生成回调 */
  onBatchGenerate?: (params: BatchGenerationParams) => Promise<void>
  /** 内容更新回调 */
  onContentUpdate?: (content: string) => void
  /** 当前生成进度 */
  generationProgress?: GenerationProgress | null
  /** 是否正在生成 */
  isGenerating?: boolean
  /** 章节状态 */
  chapterStatus?: ChapterStatus
  /** 总章节数 */
  totalChapters?: number
  /** 可用角色列表 */
  availableCharacters?: Array<{ name: string; role: string }>
}

export default function ChapterGenerator({
  chapterId,
  chapterNumber,
  chapterTitle,
  chapterOutline,
  currentContent,
  onGenerate,
  onBatchGenerate,
  onContentUpdate,
  generationProgress,
  isGenerating = false,
  totalChapters = 1,
}: ChapterGeneratorProps) {
  // 生成参数状态
  const [generationParams, setGenerationParams] = useState<ChapterGenerationParams>({
    targetWordCount: 3000,
    writingStyle: 'standard',
    perspective: 'third',
    rhythmType: 'medium',
    emotionalTone: 'balanced',
    specialRequirements: '',
    includeOutline: true,
  })

  // 润色参数状态
  const [polishOptions, setPolishOptions] = useState<PolishOptions>({
    mode: 'style_reproduction',
    intensity: 'medium',
    targetAudience: 'general',
    tone: 'natural',
  })
  const [autoPolish, setAutoPolish] = useState(false)
  const isLoadingConfig = useRef(false)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 加载润色设置
  useEffect(() => {
    const loadConfig = async () => {
      if (isLoadingConfig.current) return
      isLoadingConfig.current = true
      
      try {
        const config = await getHumanizeConfig()
        if (config) {
          setAutoPolish(config.autoPolish ?? false)
          if (config.polishIntensity) {
            setPolishOptions(prev => ({ ...prev, intensity: config.polishIntensity }))
          }
          if (config.targetAudience) {
            setPolishOptions(prev => ({ ...prev, targetAudience: config.targetAudience }))
          }
          // 加载润色模式
          if (config.polishMode) {
            setPolishOptions(prev => ({ ...prev, mode: config.polishMode }))
          }
        }
      } catch (error) {
        logger.error('加载润色设置失败:', error)
      } finally {
        isLoadingConfig.current = false
      }
    }
    
    loadConfig()
  }, [])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // 保存润色设置（防抖）
  const saveConfig = useCallback(async (newAutoPolish: boolean, newPolishOptions: PolishOptions) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }
    
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await updateHumanizeConfig({
          autoPolish: newAutoPolish,
          polishIntensity: newPolishOptions.intensity,
          targetAudience: newPolishOptions.targetAudience,
          polishMode: newPolishOptions.mode,
        })
      } catch (error) {
        logger.error('保存润色设置失败:', error)
      }
    }, 500)
  }, [])

  // 自动润色开关变化时保存
  const handleAutoPolishChange = useCallback((value: boolean) => {
    setAutoPolish(value)
    saveConfig(value, polishOptions)
  }, [polishOptions, saveConfig])

  // 润色选项变化时保存
  const handlePolishOptionsChange = useCallback((newOptions: PolishOptions) => {
    setPolishOptions(newOptions)
    saveConfig(autoPolish, newOptions)
  }, [autoPolish, saveConfig])

  // 批量生成参数
  const [batchParams, setBatchParams] = useState({
    startChapter: chapterNumber,
    endChapter: Math.min(chapterNumber + 4, totalChapters),
    autoAudit: true,
    autoFix: false,
    autoPolish: false,
  })

  // UI状态
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
  const [showBatchPanel, setShowBatchPanel] = useState(false)

  // 更新批量生成起始章节
  useEffect(() => {
    setBatchParams((prev) => ({
      ...prev,
      startChapter: chapterNumber,
      endChapter: Math.min(chapterNumber + 4, totalChapters),
    }))
  }, [chapterNumber, totalChapters])

  // 处理单章生成
  const handleGenerate = useCallback(async () => {
    if (!chapterId || isGenerating) return
    await onGenerate({
      ...generationParams,
      autoPolish,
      polishIntensity: polishOptions.intensity,
    })
  }, [chapterId, isGenerating, generationParams, onGenerate, autoPolish, polishOptions.intensity])

  // 处理批量生成
  const handleBatchGenerate = useCallback(async () => {
    if (!onBatchGenerate || isGenerating) return
    await onBatchGenerate({
      ...batchParams,
      generationParams,
    })
    setShowBatchPanel(false)
  }, [onBatchGenerate, isGenerating, batchParams, generationParams])

  // 计算进度百分比
  const progressPercentage = generationProgress?.percentage ?? 0

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border border-gray-200">
      {/* 标题栏 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              第 {chapterNumber} 章: {chapterTitle}
            </h3>
            {chapterOutline && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{chapterOutline.summary}</p>
            )}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
            {/* 生成进度 */}
            {isGenerating && generationProgress && (
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">
                    {generationProgress.currentAction}
                  </span>
                  <span className="text-sm text-blue-600">{progressPercentage}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
                {generationProgress.estimatedTimeRemaining && (
                  <p className="text-xs text-blue-500 mt-2">
                    预计剩余时间: {Math.ceil(generationProgress.estimatedTimeRemaining / 60)} 分钟
                  </p>
                )}
              </div>
            )}

            {/* 基础参数 */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">目标字数</label>
                <input
                  type="number"
                  value={generationParams.targetWordCount}
                  onChange={(e) =>
                    setGenerationParams({
                      ...generationParams,
                      targetWordCount: parseInt(e.target.value) || 3000,
                    })
                  }
                  min={1000}
                  max={10000}
                  step={500}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">写作视角</label>
                <select
                  value={generationParams.perspective}
                  onChange={(e) =>
                    setGenerationParams({
                      ...generationParams,
                      perspective: e.target.value as 'first' | 'third',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="third">第三人称</option>
                  <option value="first">第一人称</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">节奏类型</label>
                <div className="flex gap-2">
                  {(['fast', 'medium', 'slow'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setGenerationParams({ ...generationParams, rhythmType: type })}
                      className={cn(
                        'flex-1 py-2 text-sm font-medium rounded-lg transition-colors',
                        generationParams.rhythmType === type
                          ? 'bg-primary-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      )}
                    >
                      {type === 'fast' ? '快节奏' : type === 'medium' ? '中速' : '慢节奏'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 高级设置 */}
            <div>
              <button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                className="flex items-center justify-between w-full py-2 text-sm font-medium text-gray-700"
              >
                <span className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  高级设置
                </span>
                {showAdvancedSettings ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              {showAdvancedSettings && (
                <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      写作风格
                    </label>
                    <select
                      value={generationParams.writingStyle}
                      onChange={(e) =>
                        setGenerationParams({
                          ...generationParams,
                          writingStyle: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="standard">标准</option>
                      <option value="literary">文学性</option>
                      <option value="popular">通俗</option>
                      <option value="humorous">幽默</option>
                      <option value="serious">严肃</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      情感基调
                    </label>
                    <select
                      value={generationParams.emotionalTone}
                      onChange={(e) =>
                        setGenerationParams({
                          ...generationParams,
                          emotionalTone: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="balanced">平衡</option>
                      <option value="tense">紧张</option>
                      <option value="relaxed">轻松</option>
                      <option value="emotional">情感丰富</option>
                      <option value="suspenseful">悬疑</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      特殊要求
                    </label>
                    <textarea
                      value={generationParams.specialRequirements}
                      onChange={(e) =>
                        setGenerationParams({
                          ...generationParams,
                          specialRequirements: e.target.value,
                        })
                      }
                      placeholder="输入特殊要求，如特定情节、场景描写等..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 润色设置 */}
            <div className="p-3 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium text-gray-700">自动润色</span>
                </div>
                <button
                  onClick={() => handleAutoPolishChange(!autoPolish)}
                  className={cn(
                    'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                    autoPolish ? 'bg-purple-600' : 'bg-gray-300'
                  )}
                >
                  <span
                    className={cn(
                      'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                      autoPolish ? 'translate-x-6' : 'translate-x-1'
                    )}
                  />
                </button>
              </div>

              {autoPolish && (
                <div className="space-y-3 pt-2 border-t border-purple-100">
                  {/* 润色模式选择器 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      润色模式
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePolishOptionsChange({ ...polishOptions, mode: 'style_reproduction' })}
                        className={cn(
                          'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
                          polishOptions.mode === 'style_reproduction'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-purple-100 border border-purple-200'
                        )}
                      >
                        <Palette className="w-4 h-4" />
                        风格复现
                      </button>
                      <button
                        onClick={() => handlePolishOptionsChange({ ...polishOptions, mode: 'remove_ai_flavor' })}
                        className={cn(
                          'flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2',
                          polishOptions.mode === 'remove_ai_flavor'
                            ? 'bg-purple-600 text-white'
                            : 'bg-white text-gray-600 hover:bg-purple-100 border border-purple-200'
                        )}
                      >
                        <Eraser className="w-4 h-4" />
                        去AI味
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {polishOptions.mode === 'style_reproduction'
                        ? '风格复现：保持原文风格特征，优化表达方式'
                        : '去AI味：识别并消除AI生成痕迹，使文本更自然'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      润色强度
                    </label>
                    <div className="flex gap-2">
                      {(['light', 'medium', 'deep'] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => handlePolishOptionsChange({ ...polishOptions, intensity: level })}
                          className={cn(
                            'flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors',
                            polishOptions.intensity === level
                              ? 'bg-purple-600 text-white'
                              : 'bg-white text-gray-600 hover:bg-purple-100 border border-purple-200'
                          )}
                        >
                          {level === 'light' ? '轻度' : level === 'medium' ? '中度' : '深度'}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {polishOptions.intensity === 'light' 
                        ? '轻度润色：保持原文风格，仅优化表达' 
                        : polishOptions.intensity === 'medium'
                        ? '中度润色：优化语句结构，增强可读性'
                        : '深度润色：大幅改写，提升文学性'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      目标受众
                    </label>
                    <select
                      value={polishOptions.targetAudience}
                      onChange={(e) =>
                        handlePolishOptionsChange({
                          ...polishOptions,
                          targetAudience: e.target.value as 'young' | 'adult' | 'general',
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="general">大众读者</option>
                      <option value="young">年轻读者</option>
                      <option value="adult">成年读者</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      文风基调
                    </label>
                    <select
                      value={polishOptions.tone}
                      onChange={(e) =>
                        handlePolishOptionsChange({
                          ...polishOptions,
                          tone: e.target.value as 'natural' | 'vivid' | 'concise' | 'literary',
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                    >
                      <option value="natural">自然流畅</option>
                      <option value="vivid">生动形象</option>
                      <option value="concise">简洁明快</option>
                      <option value="literary">文学性强</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* 批量生成面板 */}
            {onBatchGenerate && (
              <div>
                <button
                  onClick={() => setShowBatchPanel(!showBatchPanel)}
                  className="flex items-center justify-between w-full py-2 text-sm font-medium text-gray-700"
                >
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    批量生成
                  </span>
                  {showBatchPanel ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showBatchPanel && (
                  <div className="mt-3 space-y-3 p-3 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          起始章节
                        </label>
                        <input
                          type="number"
                          value={batchParams.startChapter}
                          onChange={(e) =>
                            setBatchParams({
                              ...batchParams,
                              startChapter: parseInt(e.target.value) || 1,
                            })
                          }
                          min={1}
                          max={totalChapters}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          结束章节
                        </label>
                        <input
                          type="number"
                          value={batchParams.endChapter}
                          onChange={(e) =>
                            setBatchParams({
                              ...batchParams,
                              endChapter: parseInt(e.target.value) || 1,
                            })
                          }
                          min={batchParams.startChapter}
                          max={totalChapters}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={batchParams.autoAudit}
                          onChange={(e) =>
                            setBatchParams({ ...batchParams, autoAudit: e.target.checked })
                          }
                          className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-600">自动审计</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={batchParams.autoFix}
                          onChange={(e) =>
                            setBatchParams({ ...batchParams, autoFix: e.target.checked })
                          }
                          className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                        />
                        <span className="text-sm text-gray-600">自动修复</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={batchParams.autoPolish}
                          onChange={(e) =>
                            setBatchParams({ ...batchParams, autoPolish: e.target.checked })
                          }
                          className="rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-sm text-gray-600">自动润色</span>
                      </label>
                    </div>

                    <button
                      onClick={handleBatchGenerate}
                      disabled={isGenerating}
                      className="w-full py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isGenerating ? (
                        <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      ) : (
                        <Sparkles className="w-4 h-4 inline mr-2" />
                      )}
                      批量生成 {batchParams.endChapter - batchParams.startChapter + 1} 章
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
      </div>

      {/* 底部操作栏 */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !chapterId}
            className="flex-1 py-2.5 bg-primary-500 text-white rounded-lg hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                生成章节
              </>
            )}
          </button>
          {currentContent && (
            <button
              onClick={() => onContentUpdate?.('')}
              className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-5 h-5" />
              重置
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
