/**
 * 节奏拆章组件
 *
 * 将当前卷的节奏落实到章节列表
 * 支持添加、编辑、删除章节，以及调整章节顺序
 * 提供章节节奏可视化（情感曲线、冲突强度等）
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  List,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Check,
  Loader2,
  Users,
  ArrowRight,
  GripVertical,
  Sparkles,
  Activity,
  BookOpen,
  Zap,
} from 'lucide-react'
import { useWorkflowStore } from '../stores/workflowStore'
import {
  WorkflowStage,
  StageStatus,
  type RhythmBreakdownStageData,
  type ChapterOutline,
} from '../types/workflow'
import { generateRhythmBreakdownAI } from '../services/api'
import toast from 'react-hot-toast'

// ============================================================================
// 工具函数
// ============================================================================

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成唯一ID
function generateId(): string {
  return `chapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// 组件属性
// ============================================================================

interface RhythmBreakdownViewProps {
  /** 初始数据（用于编辑模式） */
  initialData?: Partial<RhythmBreakdownStageData>
  /** 保存回调 */
  onSave?: (data: RhythmBreakdownStageData) => Promise<void> | void
  /** 保存成功回调 */
  onSaveSuccess?: () => void
  /** 保存失败回调 */
  onSaveError?: (error: Error) => void
  /** 是否显示保存按钮 */
  showSaveButton?: boolean
  /** 是否禁用表单 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
  /** 是否自动生成 */
  autoGenerate?: boolean
}

// ============================================================================
// 节奏类型配置
// ============================================================================

const RHYTHM_TYPES = [
  {
    value: 'fast',
    label: '快节奏',
    color: 'bg-red-500',
    description: '紧张刺激，快速推进',
    intensity: 0.8,
  },
  {
    value: 'medium',
    label: '中节奏',
    color: 'bg-yellow-500',
    description: '张弛有度，稳步发展',
    intensity: 0.5,
  },
  {
    value: 'slow',
    label: '慢节奏',
    color: 'bg-green-500',
    description: '舒缓细腻，铺垫蓄势',
    intensity: 0.2,
  },
] as const

// ============================================================================
// 单章编辑器组件
// ============================================================================

interface ChapterEditorProps {
  chapter: ChapterOutline
  index: number
  isEditing: boolean
  onEdit: () => void
  onSave: (chapter: ChapterOutline) => void
  onCancel: () => void
  onDelete: () => void
  disabled?: boolean
  availableCharacters?: string[]
}

function ChapterEditor({
  chapter,
  index: _index,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  disabled,
  availableCharacters = [],
}: ChapterEditorProps) {
  void _index // 参数保留用于未来扩展
  const [editData, setEditData] = useState<ChapterOutline>(chapter)
  const [newPlotPoint, setNewPlotPoint] = useState('')
  const [newCharacter, setNewCharacter] = useState('')

  // 当 chapter 变化时更新编辑数据
  useEffect(() => {
    if (!isEditing) {
      setEditData(chapter)
    }
  }, [chapter, isEditing])

  // 添加关键情节点
  const handleAddPlotPoint = () => {
    if (!newPlotPoint.trim()) return
    setEditData({
      ...editData,
      keyPlotPoints: [...editData.keyPlotPoints, newPlotPoint.trim()],
    })
    setNewPlotPoint('')
  }

  // 删除关键情节点
  const handleRemovePlotPoint = (idx: number) => {
    setEditData({
      ...editData,
      keyPlotPoints: editData.keyPlotPoints.filter((_, i) => i !== idx),
    })
  }

  // 添加涉及角色
  const handleAddCharacter = () => {
    if (!newCharacter.trim()) return
    if (editData.involvedCharacters.includes(newCharacter.trim())) return
    setEditData({
      ...editData,
      involvedCharacters: [...editData.involvedCharacters, newCharacter.trim()],
    })
    setNewCharacter('')
  }

  // 删除涉及角色
  const handleRemoveCharacter = (idx: number) => {
    setEditData({
      ...editData,
      involvedCharacters: editData.involvedCharacters.filter((_, i) => i !== idx),
    })
  }

  // 获取节奏类型样式
  const getRhythmStyle = (rhythmType: ChapterOutline['rhythmType']) => {
    const type = RHYTHM_TYPES.find((t) => t.value === rhythmType)
    return type || RHYTHM_TYPES[1]
  }

  // 获取状态样式
  const getStatusStyle = (status: StageStatus) => {
    switch (status) {
      case StageStatus.PENDING:
        return 'bg-gray-100 text-gray-800'
      case StageStatus.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800'
      case StageStatus.COMPLETED:
        return 'bg-green-100 text-green-800'
      case StageStatus.SKIPPED:
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取状态标签
  const getStatusLabel = (status: StageStatus) => {
    switch (status) {
      case StageStatus.PENDING:
        return '待写作'
      case StageStatus.IN_PROGRESS:
        return '写作中'
      case StageStatus.COMPLETED:
        return '已完成'
      case StageStatus.SKIPPED:
        return '已跳过'
      default:
        return '未知'
    }
  }

  if (isEditing) {
    return (
      <div className="p-6 space-y-4 bg-blue-50/50">
        {/* 章节标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            章节标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
            className="input-field"
            placeholder="如：第一章 初入江湖"
          />
        </div>

        {/* 章节摘要 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            章节摘要 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={editData.summary}
            onChange={(e) => setEditData({ ...editData, summary: e.target.value })}
            className="textarea-field"
            rows={3}
            placeholder="简要描述本章的主要内容和情节"
          />
        </div>

        {/* 预计字数和节奏类型 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              预计字数
            </label>
            <input
              type="number"
              min={500}
              step={100}
              value={editData.estimatedWordCount}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  estimatedWordCount: Number(e.target.value),
                })
              }
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              节奏类型
            </label>
            <select
              value={editData.rhythmType}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  rhythmType: e.target.value as ChapterOutline['rhythmType'],
                })
              }
              className="input-field"
            >
              {RHYTHM_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 关键情节点 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            关键情节点
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {editData.keyPlotPoints.map((point, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                <Zap className="w-3 h-3 mr-1" />
                {point}
                <button
                  type="button"
                  onClick={() => handleRemovePlotPoint(idx)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newPlotPoint}
              onChange={(e) => setNewPlotPoint(e.target.value)}
              className="input-field flex-1"
              placeholder="添加关键情节点"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddPlotPoint()
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddPlotPoint}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              添加
            </button>
          </div>
        </div>

        {/* 涉及角色 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            涉及角色
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {editData.involvedCharacters.map((character, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
              >
                <Users className="w-3 h-3 mr-1" />
                {character}
                <button
                  type="button"
                  onClick={() => handleRemoveCharacter(idx)}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            {availableCharacters.length > 0 ? (
              <select
                value={newCharacter}
                onChange={(e) => setNewCharacter(e.target.value)}
                className="input-field flex-1"
              >
                <option value="">选择角色...</option>
                {availableCharacters
                  .filter((c) => !editData.involvedCharacters.includes(c))
                  .map((character) => (
                    <option key={character} value={character}>
                      {character}
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type="text"
                value={newCharacter}
                onChange={(e) => setNewCharacter(e.target.value)}
                className="input-field flex-1"
                placeholder="输入角色名称"
              />
            )}
            <button
              type="button"
              onClick={handleAddCharacter}
              disabled={!newCharacter}
              className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              添加
            </button>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-2 pt-4 border-t border-blue-200">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() => onSave(editData)}
            disabled={!editData.title || !editData.summary}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </div>
    )
  }

  // 展示模式
  const rhythmStyle = getRhythmStyle(chapter.rhythmType)

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
            {chapter.chapterNumber}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">{chapter.title}</h4>
            <div className="flex items-center gap-3 mt-1">
              <span
                className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                  rhythmStyle.color,
                  'text-white'
                )}
              >
                {rhythmStyle.label}
              </span>
              <span className="text-sm text-gray-500">
                约 {chapter.estimatedWordCount.toLocaleString()} 字
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              getStatusStyle(chapter.status)
            )}
          >
            {getStatusLabel(chapter.status)}
          </span>
          {!disabled && (
            <>
              <button
                type="button"
                onClick={onEdit}
                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onDelete}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 章节摘要 */}
      <p className="text-gray-600 text-sm mb-4">{chapter.summary}</p>

      {/* 关键情节点 */}
      {chapter.keyPlotPoints.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Zap className="w-4 h-4 text-yellow-500" />
            关键情节点
          </h5>
          <div className="flex flex-wrap gap-2">
            {chapter.keyPlotPoints.map((point, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
              >
                {point}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 涉及角色 */}
      {chapter.involvedCharacters.length > 0 && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Users className="w-4 h-4 text-purple-600" />
            涉及角色
          </h5>
          <div className="flex flex-wrap gap-2">
            {chapter.involvedCharacters.map((character, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-2.5 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs"
              >
                {character}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 节奏可视化组件
// ============================================================================

interface RhythmVisualizationProps {
  chapters: ChapterOutline[]
}

function RhythmVisualization({ chapters }: RhythmVisualizationProps) {
  // 计算节奏数据
  const rhythmData = useMemo(() => {
    return chapters.map((chapter) => {
      const type = RHYTHM_TYPES.find((t) => t.value === chapter.rhythmType)
      return {
        chapterNumber: chapter.chapterNumber,
        title: chapter.title,
        intensity: type?.intensity || 0.5,
        wordCount: chapter.estimatedWordCount,
      }
    })
  }, [chapters])

  if (chapters.length === 0) {
    return null
  }

  if (chapters.length === 1) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          章节节奏可视化
        </h4>
        <div className="text-center text-gray-500 py-8">
          需要至少2个章节才能显示节奏曲线
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        章节节奏可视化
      </h4>

      {/* 节奏曲线 */}
      <div className="relative h-48 mb-4">
        {/* Y轴标签 */}
        <div className="absolute left-0 top-0 bottom-0 w-16 flex flex-col justify-between text-xs text-gray-500 py-2">
          <span>紧张</span>
          <span>中等</span>
          <span>舒缓</span>
        </div>

        {/* 图表区域 */}
        <div className="ml-16 h-full relative">
          {/* 背景网格 */}
          <div className="absolute inset-0 grid grid-cols-1 grid-rows-3">
            <div className="border-b border-gray-100" />
            <div className="border-b border-gray-100" />
            <div />
          </div>

          {/* 节奏曲线 */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 200" preserveAspectRatio="none">
            {/* 渐变定义 */}
            <defs>
              <linearGradient id="rhythmGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.3" />
                <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.3" />
              </linearGradient>
            </defs>

            {/* 填充区域 */}
            <path
              d={`
                M 0 ${200 - rhythmData[0].intensity * 200}
                ${rhythmData
                  .map(
                    (data, index) =>
                      `L ${(index / (rhythmData.length - 1)) * 100} ${200 - data.intensity * 200}`
                  )
                  .join(' ')}
                L 100 200 L 0 200 Z
              `}
              fill="url(#rhythmGradient)"
            />

            {/* 曲线 */}
            <path
              d={`
                M 0 ${200 - rhythmData[0].intensity * 200}
                ${rhythmData
                  .map(
                    (data, index) =>
                      `L ${(index / (rhythmData.length - 1)) * 100} ${200 - data.intensity * 200}`
                  )
                  .join(' ')}
              `}
              fill="none"
              stroke="rgb(59, 130, 246)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {/* 数据点 */}
            {rhythmData.map((data, index) => (
              <circle
                key={index}
                cx={(index / (rhythmData.length - 1)) * 100}
                cy={200 - data.intensity * 200}
                r="4"
                fill="rgb(59, 130, 246)"
                stroke="white"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span>快节奏</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <span>中节奏</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span>慢节奏</span>
        </div>
      </div>

      {/* 字数统计 */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {chapters.length}
            </p>
            <p className="text-xs text-gray-500">总章节</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {chapters.reduce((sum, c) => sum + c.estimatedWordCount, 0).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">预计总字数</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {Math.round(
                chapters.reduce((sum, c) => sum + c.estimatedWordCount, 0) / chapters.length
              ).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500">平均每章字数</p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export default function RhythmBreakdownView({
  initialData: _initialData, // eslint-disable-line @typescript-eslint/no-unused-vars
  onSave,
  onSaveSuccess,
  onSaveError,
  showSaveButton = true,
  disabled = false,
  className,
  autoGenerate = false,
}: RhythmBreakdownViewProps) {
  // 从工作流 store 获取数据
  const { updateStageData, getStageData, completeStage } = useWorkflowStore()
  const existingData = getStageData(WorkflowStage.RHYTHM_BREAKDOWN)
  const volumeData = getStageData(WorkflowStage.VOLUME_STRATEGY)
  const characterData = getStageData(WorkflowStage.CHARACTER_PREPARATION)

  // 获取所有卷列表
  const volumes = useMemo(() => volumeData?.volumes || [], [volumeData?.volumes])
  
  // 当前选中的卷索引（本地状态）
  const [selectedVolumeIndex, setSelectedVolumeIndex] = useState<number>(
    volumeData?.currentVolumeIndex || 0
  )
  
  // 获取当前卷
  const currentVolume = useMemo(() => {
    if (volumes.length === 0) return null
    return volumes[selectedVolumeIndex]
  }, [volumes, selectedVolumeIndex])

  // 获取可用角色列表（去重）
  const availableCharacters = useMemo(() => {
    const characterSet = new Set<string>()
    if (characterData?.mainCharacters) {
      characterData.mainCharacters.forEach((c) => characterSet.add(c.name))
    }
    if (characterData?.supportingCharacters) {
      characterData.supportingCharacters.forEach((c) => characterSet.add(c.name))
    }
    return Array.from(characterSet)
  }, [characterData])

  // 状态
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null)

  // 表单数据 - 每个卷独立的章节数据
  const [volumeChaptersData, setVolumeChaptersData] = useState<Record<string, ChapterOutline[]>>(
    existingData?.volumeChapters || {}
  )
  
  // 当前卷的章节数据
  const [formData, setFormData] = useState<{
    currentVolumeId: string
    chapters: ChapterOutline[]
    currentChapterIndex: number
  }>({
    currentVolumeId: currentVolume?.id || existingData?.currentVolumeId || '',
    chapters: existingData?.volumeChapters?.[currentVolume?.id || ''] || existingData?.chapters || [],
    currentChapterIndex: 0,
  })

  // 当切换卷时，保存当前卷数据并加载新卷数据
  const handleVolumeChange = useCallback((newIndex: number) => {
    if (!currentVolume) return
    
    // 保存当前卷的章节数据到 store
    const store = useWorkflowStore.getState()
    const currentRhythmData = store.getStageData(WorkflowStage.RHYTHM_BREAKDOWN) as RhythmBreakdownStageData | null
    
    const updatedVolumeChapters = {
      ...(currentRhythmData?.volumeChapters || volumeChaptersData),
      [currentVolume.id]: formData.chapters
    }
    
    // 更新 store 中的数据
    const newRhythmData: RhythmBreakdownStageData = {
      currentVolumeId: currentVolume.id,
      chapters: formData.chapters,
      currentChapterIndex: 0,
      createdAt: currentRhythmData?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      volumeChapters: updatedVolumeChapters,
    }
    store.updateStageData(WorkflowStage.RHYTHM_BREAKDOWN, newRhythmData)
    
    // 更新本地状态
    setVolumeChaptersData(updatedVolumeChapters)
    
    // 更新 VolumeStrategy 的 currentVolumeIndex
    const currentVolumeData = store.getStageData(WorkflowStage.VOLUME_STRATEGY)
    if (currentVolumeData) {
      store.updateStageData(WorkflowStage.VOLUME_STRATEGY, {
        ...currentVolumeData,
        currentVolumeIndex: newIndex
      })
    }
    
    // 切换到新卷
    setSelectedVolumeIndex(newIndex)
    
    // 加载新卷的章节数据（从更新后的数据中获取）
    const newVolume = volumes[newIndex]
    const savedChapters = updatedVolumeChapters[newVolume?.id] || []
    
    setFormData({
      currentVolumeId: newVolume?.id || '',
      chapters: savedChapters,
      currentChapterIndex: 0,
    })
  }, [currentVolume, formData.chapters, volumeChaptersData, volumes])

  // 当 currentVolume 变化时更新
  useEffect(() => {
    if (currentVolume && !existingData?.volumeChapters?.[currentVolume.id]) {
      const savedChapters = volumeChaptersData[currentVolume.id] || []
      setFormData((prev) => ({
        ...prev,
        currentVolumeId: currentVolume.id,
        chapters: savedChapters,
      }))
    }
  }, [currentVolume, existingData, volumeChaptersData])

  // 自动生成
  useEffect(() => {
    if (autoGenerate && !existingData && currentVolume) {
      handleAIGenerate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, existingData, currentVolume])

  // 生成默认章节列表（基于当前卷的章节范围）
  const handleGenerateDefault = useCallback(() => {
    if (!currentVolume) return

    const totalChapters = currentVolume.chapterRange.end - currentVolume.chapterRange.start + 1
    const chapters: ChapterOutline[] = []
    
    for (let i = currentVolume.chapterRange.start; i <= currentVolume.chapterRange.end; i++) {
      const relativeIndex = i - currentVolume.chapterRange.start
      const progress = totalChapters > 1 ? relativeIndex / (totalChapters - 1) : 0
      
      let rhythmType: 'slow' | 'medium' | 'fast' = 'medium'
      if (progress < 0.3) {
        rhythmType = 'slow'
      } else if (progress > 0.7) {
        rhythmType = 'fast'
      }
      
      let defaultSummary = ''
      const defaultPlotPoints: string[] = []
      const defaultCharacters: string[] = []
      
      if (progress < 0.25) {
        defaultSummary = '开篇铺垫，引入本章场景与人物，为后续发展埋下伏笔'
        defaultPlotPoints.push('场景描写与氛围营造', '人物登场与关系铺垫')
      } else if (progress < 0.5) {
        defaultSummary = '情节推进，矛盾逐渐显现，角色关系发生变化'
        defaultPlotPoints.push('矛盾冲突展开', '关键转折点')
      } else if (progress < 0.75) {
        defaultSummary = '高潮前奏，紧张气氛升级，多方势力交汇'
        defaultPlotPoints.push('危机升级', '关键抉择时刻')
      } else {
        defaultSummary = '高潮与收尾，核心冲突爆发，本章故事走向结局'
        defaultPlotPoints.push('核心冲突爆发', '结局走向')
      }
      
      if (availableCharacters.length > 0) {
        const charCount = Math.min(2 + Math.floor(Math.random() * 2), availableCharacters.length)
        const shuffled = [...availableCharacters].sort(() => Math.random() - 0.5)
        defaultCharacters.push(...shuffled.slice(0, charCount))
      }
      
      chapters.push({
        id: generateId(),
        chapterNumber: i,
        title: `第${i}章`,
        summary: defaultSummary,
        keyPlotPoints: defaultPlotPoints,
        involvedCharacters: defaultCharacters,
        estimatedWordCount: 3000,
        rhythmType,
        status: StageStatus.PENDING,
      })
    }

    setFormData((prev) => ({
      ...prev,
      chapters,
    }))
    
    // 更新 volumeChaptersData 状态
    setVolumeChaptersData(prev => ({
      ...prev,
      [currentVolume.id]: chapters
    }))
    
    const rhythmData: RhythmBreakdownStageData = {
      currentVolumeId: currentVolume.id,
      chapters,
      currentChapterIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      volumeChapters: {
        ...volumeChaptersData,
        [currentVolume.id]: chapters
      },
    }
    updateStageData(WorkflowStage.RHYTHM_BREAKDOWN, rhythmData)
  }, [currentVolume, availableCharacters, updateStageData, volumeChaptersData])

  // AI生成节奏拆章
  const [isAIGenerating, setIsAIGenerating] = useState(false)
  const handleAIGenerate = useCallback(async () => {
    if (!currentVolume) {
      toast.error('请先选择卷')
      return
    }
    setIsAIGenerating(true)
    try {
      const store = useWorkflowStore.getState()
      const projectSetting = store.getStageData(WorkflowStage.PROJECT_SETTING) as Record<string, unknown> | null
      const characterData = store.getStageData(WorkflowStage.CHARACTER_PREPARATION) as Record<string, unknown> | null
      const volumeData = currentVolume as unknown as Record<string, unknown>
      const result = await generateRhythmBreakdownAI({
        title: (projectSetting?.title as string) || '未命名小说',
        genre: (projectSetting?.genre as string) || '玄幻',
        volumeName: currentVolume.name,
        volumeChapterRange: currentVolume.chapterRange,
        coreEvent: currentVolume.mission || '',
        characterArc: (volumeData.characterArc as string) || '',
        tensionLevel: (volumeData.tensionLevel as number) || 5,
        characters: [
          ...((characterData?.mainCharacters as Array<Record<string, unknown>>) || []),
          ...((characterData?.supportingCharacters as Array<Record<string, unknown>>) || [])
        ].map((c) => ({
          name: String(c.name || ''),
          role: String(c.role || '配角')
        }))
      })
      const chapters: ChapterOutline[] = result.chapters.map((ch, chapterIndex) => {
        const involvedCharacters: string[] = []
        if (ch.pov) {
          involvedCharacters.push(ch.pov)
        }
        if (availableCharacters.length > 0) {
          const otherChars = availableCharacters.filter(c => c !== ch.pov)
          const seed = chapterIndex * 7 + ch.chapterNumber
          const shuffled = otherChars.sort((a, b) => {
            const hashA = (seed + a.charCodeAt(0)) % 100
            const hashB = (seed + b.charCodeAt(0)) % 100
            return hashA - hashB
          })
          const additionalChars = shuffled.slice(0, Math.min(2, shuffled.length))
          involvedCharacters.push(...additionalChars)
        }
        
        return {
          id: generateId(),
          chapterNumber: ch.chapterNumber,
          title: ch.title,
          summary: ch.summary,
          keyPlotPoints: ch.keyEvents || [],
          involvedCharacters,
          estimatedWordCount: ch.wordCountTarget || 3000,
          rhythmType: ch.tensionLevel >= 7 ? 'fast' : ch.tensionLevel >= 4 ? 'medium' : 'slow',
          status: StageStatus.PENDING,
        }
      })
      setFormData(prev => ({ ...prev, chapters }))
      
      // 更新 volumeChaptersData 状态
      const newVolumeChapters = {
        ...volumeChaptersData,
        [currentVolume.id]: chapters
      }
      setVolumeChaptersData(newVolumeChapters)
      
      const rhythmData: RhythmBreakdownStageData = {
        currentVolumeId: currentVolume.id,
        chapters,
        currentChapterIndex: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        volumeChapters: newVolumeChapters,
      }
      updateStageData(WorkflowStage.RHYTHM_BREAKDOWN, rhythmData)
      
      toast.success('AI已生成节奏拆章，请查看并调整')
    } catch (error) {
      console.error('AI生成节奏拆章失败:', error)
      toast.error('AI生成失败，请检查模型配置')
      handleGenerateDefault()
    } finally {
      setIsAIGenerating(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentVolume, availableCharacters, updateStageData, volumeChaptersData])

  // 添加新章节
  const handleAddChapter = useCallback(() => {
    const lastChapter = formData.chapters[formData.chapters.length - 1]
    const nextChapterNumber = lastChapter ? lastChapter.chapterNumber + 1 : 1

    const defaultCharacters: string[] = []
    if (availableCharacters.length > 0) {
      const charCount = Math.min(2 + Math.floor(Math.random() * 2), availableCharacters.length)
      const shuffled = [...availableCharacters].sort(() => Math.random() - 0.5)
      defaultCharacters.push(...shuffled.slice(0, charCount))
    }

    const newChapter: ChapterOutline = {
      id: generateId(),
      chapterNumber: nextChapterNumber,
      title: `第${nextChapterNumber}章`,
      summary: '待补充章节内容摘要',
      keyPlotPoints: ['待补充情节点'],
      involvedCharacters: defaultCharacters,
      estimatedWordCount: 3000,
      rhythmType: 'medium',
      status: StageStatus.PENDING,
    }

    setFormData((prev) => ({
      ...prev,
      chapters: [...prev.chapters, newChapter],
    }))
    setEditingChapterId(newChapter.id)
  }, [formData.chapters, availableCharacters])

  // 删除章节
  const handleDeleteChapter = useCallback((chapterId: string) => {
    setFormData((prev) => ({
      ...prev,
      chapters: prev.chapters.filter((c) => c.id !== chapterId),
    }))
  }, [])

  // 保存章节编辑
  const handleSaveChapter = useCallback((chapter: ChapterOutline) => {
    setFormData((prev) => ({
      ...prev,
      chapters: prev.chapters.map((c) => (c.id === chapter.id ? chapter : c)),
    }))
    setEditingChapterId(null)
  }, [])

  // 调整章节顺序
  const handleMoveChapter = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= formData.chapters.length) return

    const newChapters = [...formData.chapters]
    ;[newChapters[index], newChapters[newIndex]] = [newChapters[newIndex], newChapters[index]]

    // 更新章节序号
    newChapters.forEach((chapter, idx) => {
      chapter.chapterNumber = idx + 1
    })

    setFormData((prev) => ({
      ...prev,
      chapters: newChapters,
    }))
  }, [formData.chapters])

  // 保存数据
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      // 更新当前卷的章节数据
      const updatedVolumeChapters = {
        ...volumeChaptersData,
        [currentVolume?.id || '']: formData.chapters
      }
      
      const rhythmData: RhythmBreakdownStageData = {
        currentVolumeId: formData.currentVolumeId,
        chapters: formData.chapters,
        currentChapterIndex: formData.currentChapterIndex,
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        volumeChapters: updatedVolumeChapters,
      }

      // 更新工作流状态
      updateStageData(WorkflowStage.RHYTHM_BREAKDOWN, rhythmData)
      
      // 更新本地状态
      setVolumeChaptersData(updatedVolumeChapters)

      // 调用外部保存回调
      if (onSave) {
        await onSave(rhythmData)
      }

      setSaveSuccess(true)
      onSaveSuccess?.()
    } catch (error) {
      console.error('保存节奏拆章失败:', error)
      onSaveError?.(error instanceof Error ? error : new Error('保存失败'))
    } finally {
      setIsSaving(false)
    }
  }, [formData, currentVolume, volumeChaptersData, existingData, updateStageData, onSave, onSaveSuccess, onSaveError])

  // 完成阶段
  const handleComplete = useCallback(async () => {
    await handleSave()
    completeStage(WorkflowStage.RHYTHM_BREAKDOWN)
  }, [handleSave, completeStage])

  return (
    <div className={cn('space-y-4', className)}>
      {/* 标题区域 */}
      <div className="border-b border-gray-200 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <List className="w-5 h-5 text-blue-600" />
              节奏拆章
            </h2>
            <p className="mt-0.5 text-sm text-gray-500">
              将当前卷的节奏落实到章节列表
            </p>
          </div>
          {!disabled && formData.chapters.length === 0 && currentVolume && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={isAIGenerating}
                className={cn(
                  'flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200',
                  'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600',
                  'disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed'
                )}
              >
                {isAIGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" />生成中...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-1.5" />AI 生成</>
                )}
              </button>
              <button
                type="button"
                onClick={handleGenerateDefault}
                className={cn(
                  'flex items-center px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-200',
                  'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                )}
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                快速生成
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 卷切换标签页 */}
      {volumes.length > 1 && (
        <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
          <span className="text-sm text-gray-500 mr-2">选择卷：</span>
          <div className="flex gap-1 flex-wrap">
            {volumes.map((vol, idx) => (
              <button
                key={vol.id}
                type="button"
                onClick={() => handleVolumeChange(idx)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                  selectedVolumeIndex === idx
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                )}
              >
                {vol.name}
                {volumeChaptersData[vol.id]?.length > 0 && (
                  <span className="ml-1 text-xs opacity-75">
                    ({volumeChaptersData[vol.id].length}章)
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 当前卷信息 */}
      {currentVolume && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-blue-800">{currentVolume.name}</span>
            <span className="text-blue-600">
              第 {currentVolume.chapterRange?.start || 1} - {currentVolume.chapterRange?.end || 10} 章
            </span>
            {formData.chapters.length > 0 && (
              <span className="text-gray-500">
                · 已规划 {formData.chapters.length} 章
              </span>
            )}
          </div>
        </div>
      )}

      {/* 主要内容 */}
      <div className="space-y-6">
        {/* 章节列表 */}
        {formData.chapters.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">还没有添加任何章节</p>
            {!disabled && (
              <button
                type="button"
                onClick={handleAddChapter}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加第一章
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 节奏可视化 */}
            <RhythmVisualization chapters={formData.chapters} />

            {/* 章节列表 */}
            <div className="space-y-4">
              {formData.chapters.map((chapter, index) => (
                <div
                  key={chapter.id}
                  className={cn(
                    'border rounded-xl transition-all duration-200',
                    editingChapterId === chapter.id
                      ? 'border-blue-500 bg-blue-50/30'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  {/* 章节头部 - 拖拽和排序 */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">第 {index + 1} 章</span>
                    </div>
                    {!disabled && editingChapterId !== chapter.id && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveChapter(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveChapter(index, 'down')}
                          disabled={index === formData.chapters.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 章节内容 */}
                  <ChapterEditor
                    chapter={chapter}
                    index={index}
                    isEditing={editingChapterId === chapter.id}
                    onEdit={() => setEditingChapterId(chapter.id)}
                    onSave={handleSaveChapter}
                    onCancel={() => setEditingChapterId(null)}
                    onDelete={() => handleDeleteChapter(chapter.id)}
                    disabled={disabled}
                    availableCharacters={availableCharacters}
                  />
                </div>
              ))}
            </div>

            {/* 添加新章节按钮 */}
            {!disabled && (
              <button
                type="button"
                onClick={handleAddChapter}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                添加新章节
              </button>
            )}
          </>
        )}
      </div>

      {/* 操作按钮 */}
      {showSaveButton && formData.chapters.length > 0 && (
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            {saveSuccess && (
              <div className="flex items-center text-sm text-green-600">
                <Check className="w-4 h-4 mr-1" />
                <span>保存成功</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleAIGenerate}
              disabled={disabled || isAIGenerating}
              className={cn(
                'flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600',
                'disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed'
              )}
            >
              {isAIGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 辅助生成
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={disabled || isSaving}
              className={cn(
                'flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                'bg-blue-600 text-white hover:bg-blue-700',
                'disabled:bg-gray-300 disabled:cursor-not-allowed'
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存规划
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={disabled || isSaving}
              className={cn(
                'flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                'bg-green-600 text-white hover:bg-green-700',
                'disabled:bg-gray-300 disabled:cursor-not-allowed'
              )}
            >
              完成并继续
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
