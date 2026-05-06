/**
 * 卷战略规划组件
 *
 * 用于规划分卷、卷级使命、升级节点和卷尾钩子
 * 支持添加、编辑、删除卷，以及调整卷的顺序
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Check,
  Loader2,
  Target,
  Zap,
  ArrowRight,
  GripVertical,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { useWorkflowStore } from '../stores/workflowStore'
import {
  WorkflowStage,
  StageStatus,
  type VolumeStrategyStageData,
  type Volume,
  type UpgradeNode,
} from '../types/workflow'
import { generateVolumeStrategyAI } from '../services/api'
import toast from 'react-hot-toast'

// ============================================================================
// 工具函数
// ============================================================================

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成唯一ID
function generateId(): string {
  return `volume_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// ============================================================================
// 组件属性
// ============================================================================

interface VolumeStrategyViewProps {
  /** 初始数据（用于编辑模式） */
  initialData?: Partial<VolumeStrategyStageData>
  /** 保存回调 */
  onSave?: (data: VolumeStrategyStageData) => Promise<void> | void
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
// 单卷编辑器组件
// ============================================================================

interface VolumeEditorProps {
  volume: Volume
  index: number
  isEditing: boolean
  onEdit: () => void
  onSave: (volume: Volume) => void
  onCancel: () => void
  onDelete: () => void
  disabled?: boolean
}

function VolumeEditor({
  volume,
  index,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  disabled,
}: VolumeEditorProps) {
  const [editData, setEditData] = useState<Volume>(volume)
  const [newEvent, setNewEvent] = useState('')

  // 当 volume 变化时更新编辑数据
  useEffect(() => {
    if (!isEditing) {
      setEditData(volume)
    }
  }, [volume, isEditing])

  // 添加关键事件
  const handleAddEvent = () => {
    if (!newEvent.trim()) return
    const newNode: UpgradeNode = {
      id: `event_${Date.now()}`,
      name: newEvent.trim(),
      upgradeContent: newEvent.trim(),
      chapterRange: {
        start: editData.chapterRange.start,
        end: editData.chapterRange.end,
      },
      keyEvents: [],
    }
    setEditData({
      ...editData,
      upgradeNodes: [...editData.upgradeNodes, newNode],
    })
    setNewEvent('')
  }

  // 删除关键事件
  const handleRemoveEvent = (eventId: string) => {
    setEditData({
      ...editData,
      upgradeNodes: editData.upgradeNodes.filter((node) => node.id !== eventId),
    })
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
        return '待规划'
      case StageStatus.IN_PROGRESS:
        return '规划中'
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
        {/* 卷名 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            卷名 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={editData.name}
            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
            className="input-field"
            placeholder="如：初入江湖卷"
          />
        </div>

        {/* 章节范围 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            章节范围
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min={1}
              value={editData.chapterRange.start}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  chapterRange: {
                    ...editData.chapterRange,
                    start: Number(e.target.value),
                  },
                })
              }
              className="input-field w-24"
            />
            <span className="text-gray-500">-</span>
            <input
              type="number"
              min={1}
              value={editData.chapterRange.end}
              onChange={(e) =>
                setEditData({
                  ...editData,
                  chapterRange: {
                    ...editData.chapterRange,
                    end: Number(e.target.value),
                  },
                })
              }
              className="input-field w-24"
            />
            <span className="text-gray-500">章</span>
          </div>
        </div>

        {/* 卷使命 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            卷级使命 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={editData.mission}
            onChange={(e) => setEditData({ ...editData, mission: e.target.value })}
            className="textarea-field"
            rows={3}
            placeholder="描述这一卷的核心使命和目标"
          />
        </div>

        {/* 升级节点 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            升级节点
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {editData.upgradeNodes.map((node) => (
              <span
                key={node.id}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                <Zap className="w-3 h-3 mr-1" />
                {node.name}
                <button
                  type="button"
                  onClick={() => handleRemoveEvent(node.id)}
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
              value={newEvent}
              onChange={(e) => setNewEvent(e.target.value)}
              className="input-field flex-1"
              placeholder="添加升级节点"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddEvent()
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddEvent}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              添加
            </button>
          </div>
        </div>

        {/* 卷尾钩子 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            卷尾钩子
          </label>
          <textarea
            value={editData.endingHook}
            onChange={(e) => setEditData({ ...editData, endingHook: e.target.value })}
            className="textarea-field"
            rows={2}
            placeholder="描述卷尾的悬念或钩子，吸引读者继续阅读"
          />
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
            disabled={!editData.name || !editData.mission}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            保存
          </button>
        </div>
      </div>
    )
  }

  // 展示模式
  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold">
            {index + 1}
          </div>
          <div>
            <h4 className="text-lg font-semibold text-gray-900">{volume.name}</h4>
            <p className="text-sm text-gray-500">
              第 {volume.chapterRange.start} - {volume.chapterRange.end} 章
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium',
              getStatusStyle(volume.status)
            )}
          >
            {getStatusLabel(volume.status)}
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

      {/* 卷使命 */}
      <div className="mb-4">
        <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
          <Target className="w-4 h-4 text-blue-600" />
          卷级使命
        </h5>
        <p className="text-gray-600 text-sm">{volume.mission}</p>
      </div>

      {/* 升级节点 */}
      {volume.upgradeNodes.length > 0 && (
        <div className="mb-4">
          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <Zap className="w-4 h-4 text-yellow-500" />
            升级节点
          </h5>
          <div className="flex flex-wrap gap-2">
            {volume.upgradeNodes.map((node) => (
              <span
                key={node.id}
                className="inline-flex items-center px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
              >
                {node.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 卷尾钩子 */}
      {volume.endingHook && (
        <div>
          <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
            <AlertCircle className="w-4 h-4 text-purple-600" />
            卷尾钩子
          </h5>
          <p className="text-gray-600 text-sm">{volume.endingHook}</p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 卷间衔接建议组件
// ============================================================================

interface VolumeTransitionProps {
  volumes: Volume[]
}

function VolumeTransition({ volumes }: VolumeTransitionProps) {
  const transitions = useMemo(() => {
    const suggestions: string[] = []
    for (let i = 0; i < volumes.length - 1; i++) {
      const current = volumes[i]
      const next = volumes[i + 1]

      // 检查章节连续性
      if (current.chapterRange.end + 1 !== next.chapterRange.start) {
        suggestions.push(
          `第${i + 1}卷与第${i + 2}卷之间存在章节断层（第${current.chapterRange.end}章 -> 第${next.chapterRange.start}章）`
        )
      }

      // 检查使命衔接
      if (current.endingHook && next.mission) {
        suggestions.push(
          `建议确保第${i + 1}卷的卷尾钩子"${current.endingHook.slice(0, 20)}..."与第${i + 2}卷的使命"${next.mission.slice(0, 20)}..."形成良好衔接`
        )
      }
    }
    return suggestions
  }, [volumes])

  if (transitions.length === 0) {
    return null
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
      <h4 className="text-sm font-medium text-yellow-800 mb-2 flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        卷间衔接建议
      </h4>
      <ul className="space-y-1">
        {transitions.map((suggestion, index) => (
          <li key={index} className="text-sm text-yellow-700 flex items-start gap-2">
            <span className="text-yellow-500 mt-1">•</span>
            {suggestion}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export default function VolumeStrategyView({
  initialData,
  onSave,
  onSaveSuccess,
  onSaveError,
  showSaveButton = true,
  disabled = false,
  className,
  autoGenerate = false,
}: VolumeStrategyViewProps) {
  const { updateStageData, getStageData, completeStage } = useWorkflowStore()
  const existingData = getStageData(WorkflowStage.VOLUME_STRATEGY)
  const macroPlanningData = getStageData(WorkflowStage.MACRO_PLANNING)
  const characterPrepData = getStageData(WorkflowStage.CHARACTER_PREPARATION)

  // 状态
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [editingVolumeId, setEditingVolumeId] = useState<string | null>(null)

  // 表单数据
  const [formData, setFormData] = useState<{
    volumes: Volume[]
    currentVolumeIndex: number
  }>({
    volumes: initialData?.volumes || existingData?.volumes || [],
    currentVolumeIndex: initialData?.currentVolumeIndex || existingData?.currentVolumeIndex || 0,
  })

  // 自动生成
  useEffect(() => {
    if (autoGenerate && !existingData && macroPlanningData) {
      handleAIGenerate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, existingData, macroPlanningData])

  // 生成默认卷结构（基于宏观规划的升级节点）
  const handleGenerateDefault = useCallback(() => {
    if (!macroPlanningData?.upgradeNodes) return

    const volumes: Volume[] = macroPlanningData.upgradeNodes.map((node, index) => {
      const defaultHooks = [
        '主角在关键时刻展现出惊人实力，引来各方关注',
        '一场意外打破了平静，新的危机悄然逼近',
        '真相逐渐浮出水面，更大的阴谋正在酝酿',
        '主角突破瓶颈后，发现这只是开始',
        '宿敌现身，一场恶战在所难免'
      ]
      
      return {
        id: generateId(),
        name: `${node.name}卷`,
        mission: node.upgradeContent,
        upgradeNodes: [
          {
            ...node,
            id: `vol_${node.id}`,
          },
        ],
        endingHook: defaultHooks[index % defaultHooks.length],
        chapterRange: node.chapterRange,
        status: StageStatus.PENDING,
      }
    })

    setFormData((prev) => ({
      ...prev,
      volumes,
    }))
  }, [macroPlanningData])

  // AI生成卷战略
  const [isAIGenerating, setIsAIGenerating] = useState(false)
  const handleAIGenerate = useCallback(async () => {
    if (!macroPlanningData) {
      toast.error('请先完成宏观规划')
      return
    }
    setIsAIGenerating(true)
    try {
      const projectSetting = useWorkflowStore.getState().getStageData(WorkflowStage.PROJECT_SETTING) as Record<string, unknown> | null
      const mainCharacters = (characterPrepData?.mainCharacters as unknown as Array<Record<string, string>>) || []
      const result = await generateVolumeStrategyAI({
        title: (projectSetting?.title as string) || '未命名小说',
        genre: (projectSetting?.genre as string) || '玄幻',
        overallDirection: macroPlanningData.overallDirection || '',
        coreConflict: macroPlanningData.coreConflict || '',
        upgradeNodes: (macroPlanningData.upgradeNodes || []).map(n => ({
          name: n.name,
          chapterRange: n.chapterRange,
          upgradeContent: n.upgradeContent,
          keyEvents: n.keyEvents || []
        })),
        mainCharacters: mainCharacters.map(c => ({
          name: c.name || '',
          role: c.role || '主角'
        }))
      })
      const volumes: Volume[] = result.volumes.map(v => ({
        id: generateId(),
        name: v.name,
        mission: v.coreEvent,
        upgradeNodes: (v.upgradeNodes || []).map((node) => ({
          id: generateId(),
          name: node.name,
          chapterRange: v.chapterRange,
          upgradeContent: node.upgradeContent,
          keyEvents: []
        })),
        endingHook: v.endingHook || '',
        chapterRange: v.chapterRange,
        status: StageStatus.PENDING,
        characterArc: v.characterArc || '',
        tensionLevel: v.tensionLevel,
      }))
      setFormData(prev => ({ ...prev, volumes }))
      toast.success('AI已生成卷战略，请查看并调整')
    } catch (error) {
      console.error('AI生成卷战略失败:', error)
      toast.error('AI生成失败，请检查模型配置')
      handleGenerateDefault()
    } finally {
      setIsAIGenerating(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [macroPlanningData])

  // 添加新卷
  const handleAddVolume = useCallback(() => {
    const lastVolume = formData.volumes[formData.volumes.length - 1]
    const startChapter = lastVolume ? lastVolume.chapterRange.end + 1 : 1

    const newVolume: Volume = {
      id: generateId(),
      name: `第${formData.volumes.length + 1}卷`,
      mission: '待补充卷使命',
      upgradeNodes: [{
        id: generateId(),
        name: '升级节点',
        chapterRange: { start: startChapter, end: startChapter + 19 },
        upgradeContent: '待补充升级内容',
        keyEvents: []
      }],
      endingHook: '待补充卷尾钩子',
      chapterRange: {
        start: startChapter,
        end: startChapter + 19,
      },
      status: StageStatus.PENDING,
    }

    setFormData((prev) => ({
      ...prev,
      volumes: [...prev.volumes, newVolume],
    }))
    setEditingVolumeId(newVolume.id)
  }, [formData.volumes])

  // 删除卷
  const handleDeleteVolume = useCallback((volumeId: string) => {
    setFormData((prev) => ({
      ...prev,
      volumes: prev.volumes.filter((v) => v.id !== volumeId),
    }))
  }, [])

  // 保存卷编辑
  const handleSaveVolume = useCallback((volume: Volume) => {
    setFormData((prev) => ({
      ...prev,
      volumes: prev.volumes.map((v) => (v.id === volume.id ? volume : v)),
    }))
    setEditingVolumeId(null)
  }, [])

  // 调整卷顺序
  const handleMoveVolume = useCallback((index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= formData.volumes.length) return

    const newVolumes = [...formData.volumes]
    ;[newVolumes[index], newVolumes[newIndex]] = [newVolumes[newIndex], newVolumes[index]]

    setFormData((prev) => ({
      ...prev,
      volumes: newVolumes,
    }))
  }, [formData.volumes])

  // 保存数据
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const volumeData: VolumeStrategyStageData = {
        volumes: formData.volumes,
        currentVolumeIndex: formData.currentVolumeIndex,
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // 更新工作流状态
      updateStageData(WorkflowStage.VOLUME_STRATEGY, volumeData)

      // 调用外部保存回调
      if (onSave) {
        await onSave(volumeData)
      }

      setSaveSuccess(true)
      onSaveSuccess?.()
    } catch (error) {
      console.error('保存卷战略失败:', error)
      onSaveError?.(error instanceof Error ? error : new Error('保存失败'))
    } finally {
      setIsSaving(false)
    }
  }, [formData, existingData, updateStageData, onSave, onSaveSuccess, onSaveError])

  // 完成阶段
  const handleComplete = useCallback(async () => {
    await handleSave()
    completeStage(WorkflowStage.VOLUME_STRATEGY)
  }, [handleSave, completeStage])

  return (
    <div className={cn('space-y-6', className)}>
      {/* 标题区域 */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              卷战略规划
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              规划分卷、卷级使命、升级节点和卷尾钩子
            </p>
          </div>
          {!disabled && formData.volumes.length === 0 && macroPlanningData && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAIGenerate}
                disabled={isAIGenerating || !macroPlanningData}
                className={cn(
                  'flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                  'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600',
                  'disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed'
                )}
              >
                {isAIGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />AI 生成中...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" />AI 生成卷战略</>
                )}
              </button>
              <button
                type="button"
                onClick={handleGenerateDefault}
                className={cn(
                  'flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                  'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                )}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                基于宏观规划生成
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 主要内容 */}
      <div className="space-y-4">
        {/* 卷列表 */}
        {formData.volumes.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
            <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">还没有添加任何卷</p>
            {!disabled && (
              <button
                type="button"
                onClick={handleAddVolume}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                添加第一卷
              </button>
            )}
          </div>
        ) : (
          <>
            {/* 卷列表 */}
            <div className="space-y-4">
              {formData.volumes.map((volume, index) => (
                <div
                  key={volume.id}
                  className={cn(
                    'border rounded-xl transition-all duration-200',
                    editingVolumeId === volume.id
                      ? 'border-blue-500 bg-blue-50/30'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  )}
                >
                  {/* 卷头部 - 拖拽和排序 */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">第 {index + 1} 卷</span>
                    </div>
                    {!disabled && editingVolumeId !== volume.id && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMoveVolume(index, 'up')}
                          disabled={index === 0}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveVolume(index, 'down')}
                          disabled={index === formData.volumes.length - 1}
                          className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 卷内容 */}
                  <VolumeEditor
                    volume={volume}
                    index={index}
                    isEditing={editingVolumeId === volume.id}
                    onEdit={() => setEditingVolumeId(volume.id)}
                    onSave={handleSaveVolume}
                    onCancel={() => setEditingVolumeId(null)}
                    onDelete={() => handleDeleteVolume(volume.id)}
                    disabled={disabled}
                  />
                </div>
              ))}
            </div>

            {/* 添加新卷按钮 */}
            {!disabled && (
              <button
                type="button"
                onClick={handleAddVolume}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                添加新卷
              </button>
            )}

            {/* 卷间衔接建议 */}
            {formData.volumes.length > 1 && (
              <VolumeTransition volumes={formData.volumes} />
            )}
          </>
        )}
      </div>

      {/* 操作按钮 */}
      {showSaveButton && formData.volumes.length > 0 && (
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
              disabled={disabled || isAIGenerating || !macroPlanningData}
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
