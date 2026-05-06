/**
 * 工作流控制组件
 * 
 * 提供工作流的导航控制按钮，包括：
 * - 上一步/下一步
 * - 保存/重置
 * - 导出/导入
 */

import React, { useState, useCallback, useRef } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  ChevronLeft,
  ChevronRight,
  Save,
  RotateCcw,
  Download,
  Upload,
  Check,
  Loader2,
  Trash2,
  AlertTriangle,
} from 'lucide-react'
import { useWorkflowStore } from '../../stores/workflowStore'
import { WorkflowStage } from '../../types/workflow'
import { STAGE_CONFIGS } from '../../config/workflowConfig'
import {
  downloadWorkflowState,
  readWorkflowFromFile,
  validateWorkflowState,
} from '../../utils/workflowPersistence'
import toast from 'react-hot-toast'

// ============================================================================
// 工具函数
// ============================================================================

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// 组件属性
// ============================================================================

interface WorkflowControlsProps {
  /** 当前阶段 */
  currentStage: WorkflowStage
  /** 上一步回调 */
  onPrevious?: () => void
  /** 下一步回调 */
  onNext?: () => void
  /** 保存回调 */
  onSave?: () => void
  /** 重置回调 */
  onReset?: () => void
  /** 是否显示上一步按钮 */
  showPrevious?: boolean
  /** 是否显示下一步按钮 */
  showNext?: boolean
  /** 是否显示保存按钮 */
  showSave?: boolean
  /** 是否显示重置按钮 */
  showReset?: boolean
  /** 是否显示导出按钮 */
  showExport?: boolean
  /** 是否显示导入按钮 */
  showImport?: boolean
  /** 是否显示一键清空按钮 */
  showClearAll?: boolean
  /** 是否禁用所有按钮 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
  /** 按钮大小 */
  size?: 'sm' | 'md' | 'lg'
  /** 布局方向 */
  layout?: 'horizontal' | 'vertical'
}

// ============================================================================
// 主组件
// ============================================================================

export default function WorkflowControls({
  currentStage,
  onPrevious,
  onNext,
  onSave,
  onReset,
  showPrevious = true,
  showNext = true,
  showSave = true,
  showReset = false,
  showExport = true,
  showImport = true,
  showClearAll = false,
  disabled = false,
  className,
  size = 'md',
  layout = 'horizontal',
}: WorkflowControlsProps) {
  const { workflowState, save, restore, reset } = useWorkflowStore()
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentConfig = STAGE_CONFIGS[currentStage]
  const hasPrevious = currentConfig.previousStage !== undefined
  const hasNext = currentConfig.nextStage !== undefined

  // 获取按钮大小样式
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm'
      case 'lg':
        return 'px-6 py-3 text-lg'
      case 'md':
      default:
        return 'px-4 py-2 text-base'
    }
  }

  // 处理保存
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      save()
      onSave?.()
      setSaveSuccess(true)
      toast.success('保存成功')
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch (error) {
      console.error('保存失败:', error)
      toast.error('保存失败')
    } finally {
      setIsSaving(false)
    }
  }, [save, onSave])

  // 处理导出
  const handleExport = useCallback(() => {
    try {
      downloadWorkflowState(workflowState)
      toast.success('导出成功')
    } catch (error) {
      console.error('导出失败:', error)
      toast.error('导出失败')
    }
  }, [workflowState])

  // 处理导入
  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      try {
        const state = await readWorkflowFromFile(file)
        if (!state) {
          throw new Error('无法读取文件')
        }

        const validation = validateWorkflowState(state)
        if (!validation.isValid) {
          throw new Error(`文件格式错误: ${validation.errors.join(', ')}`)
        }

        restore(state)
        toast.success('导入成功')
      } catch (error) {
        console.error('导入失败:', error)
        toast.error(error instanceof Error ? error.message : '导入失败')
      } finally {
        // 重置文件输入
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    },
    [restore]
  )

  // 触发文件选择
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  // 处理一键清空
  const handleClearAll = useCallback(() => {
    setShowClearConfirm(true)
  }, [])

  // 确认清空
  const confirmClearAll = useCallback(() => {
    try {
      reset()
      toast.success('已清空所有小说数据')
    } catch (error) {
      console.error('清空失败:', error)
      toast.error('清空失败')
    } finally {
      setShowClearConfirm(false)
    }
  }, [reset])

  // 取消清空
  const cancelClearAll = useCallback(() => {
    setShowClearConfirm(false)
  }, [])

  return (
    <div
      className={cn(
        'flex gap-2',
        layout === 'vertical' ? 'flex-col' : 'flex-row items-center',
        className
      )}
    >
      {/* 上一步按钮 */}
      {showPrevious && (
        <button
          onClick={onPrevious}
          disabled={disabled || !hasPrevious}
          className={cn(
            'flex items-center gap-2 rounded-lg font-medium transition-all duration-200',
            'bg-white border border-gray-300 text-gray-700',
            'hover:bg-gray-50 hover:border-gray-400',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            getSizeStyles()
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>上一步</span>
        </button>
      )}

      {/* 下一步按钮 */}
      {showNext && (
        <button
          onClick={onNext}
          disabled={disabled || !hasNext}
          className={cn(
            'flex items-center gap-2 rounded-lg font-medium transition-all duration-200',
            'bg-blue-600 text-white',
            'hover:bg-blue-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            getSizeStyles()
          )}
        >
          <span>下一步</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* 分隔线 */}
      {(showPrevious || showNext) && (showSave || showReset || showExport || showImport) && (
        <div className="w-px h-8 bg-gray-300 mx-2" />
      )}

      {/* 保存按钮 - 主要操作 */}
      {showSave && (
        <button
          onClick={handleSave}
          disabled={disabled || isSaving}
          className={cn(
            'flex items-center gap-2 rounded-lg font-medium transition-all duration-200',
            saveSuccess
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-blue-600 text-white hover:bg-blue-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            getSizeStyles()
          )}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>保存中...</span>
            </>
          ) : saveSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>已保存</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>保存</span>
            </>
          )}
        </button>
      )}

      {/* 重置按钮 */}
      {showReset && (
        <button
          onClick={onReset}
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 rounded-lg font-medium transition-all duration-200',
            'bg-white border border-red-300 text-red-600',
            'hover:bg-red-50 hover:border-red-400',
            'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            getSizeStyles()
          )}
        >
          <RotateCcw className="w-4 h-4" />
          <span>重置</span>
        </button>
      )}

      {/* 一键清空按钮 */}
      {showClearAll && (
        <button
          onClick={handleClearAll}
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 rounded-lg font-medium transition-all duration-200',
            'bg-red-600 text-white',
            'hover:bg-red-700',
            'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            getSizeStyles()
          )}
        >
          <Trash2 className="w-4 h-4" />
          <span>一键清空</span>
        </button>
      )}

      {/* 导入/导出分组 */}
      {(showExport || showImport) && (
        <div className="flex items-center gap-1 pl-2 ml-2 border-l border-gray-200">
          {showImport && (
            <>
              <button
                onClick={triggerFileInput}
                disabled={disabled}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg font-medium transition-all duration-200',
                  'bg-white border border-gray-300 text-gray-600',
                  'hover:bg-gray-50 hover:text-gray-800 hover:border-gray-400',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'px-3 py-2 text-sm'
                )}
                title="导入工作流状态"
              >
                <Upload className="w-4 h-4" />
                <span>导入</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </>
          )}
          {showExport && (
            <button
              onClick={handleExport}
              disabled={disabled}
              className={cn(
                'flex items-center gap-1.5 rounded-lg font-medium transition-all duration-200',
                'bg-white border border-gray-300 text-gray-600',
                'hover:bg-gray-50 hover:text-gray-800 hover:border-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'px-3 py-2 text-sm'
              )}
              title="导出工作流状态"
            >
              <Download className="w-4 h-4" />
              <span>导出</span>
            </button>
          )}
        </div>
      )}

      {/* 确认清空对话框 */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 背景遮罩 */}
          <div 
            className="absolute inset-0 bg-black/50"
            onClick={cancelClearAll}
          />
          {/* 对话框内容 */}
          <div className="relative bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  确认清空
                </h3>
                <p className="text-gray-600">
                  确定要清空所有小说数据吗？此操作不可恢复。
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={cancelClearAll}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmClearAll}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 导出
// ============================================================================

export { WorkflowControls }
export type { WorkflowControlsProps }
