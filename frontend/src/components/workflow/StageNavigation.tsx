/**
 * 阶段导航栏组件
 * 
 * 显示所有工作流阶段，支持点击跳转到已完成阶段
 * 显示每个阶段的状态（待处理、进行中、已完成、已跳过）
 */

import React, { useMemo } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  Check,
  Circle,
  Loader2,
  SkipForward,
  Lightbulb,
  Settings,
  GitBranch,
  Users,
  BookOpen,
  List,
  PenTool,
  ChevronRight,
} from 'lucide-react'
import {
  WorkflowStage,
  StageStatus,
  type StageState,
} from '../../types/workflow'
import { STAGE_CONFIGS, STAGE_ORDER, getStageIndex } from '../../config/workflowConfig'

// ============================================================================
// 工具函数
// ============================================================================

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// 图标映射
// ============================================================================

const STAGE_ICONS: Record<WorkflowStage, React.ComponentType<{ className?: string }>> = {
  [WorkflowStage.INSPIRATION]: Lightbulb,
  [WorkflowStage.PROJECT_SETTING]: Settings,
  [WorkflowStage.MACRO_PLANNING]: GitBranch,
  [WorkflowStage.CHARACTER_PREPARATION]: Users,
  [WorkflowStage.VOLUME_STRATEGY]: BookOpen,
  [WorkflowStage.RHYTHM_BREAKDOWN]: List,
  [WorkflowStage.CHAPTER_EXECUTION]: PenTool,
}

// ============================================================================
// 组件属性
// ============================================================================

interface StageNavigationProps {
  /** 当前阶段 */
  currentStage: WorkflowStage
  /** 所有阶段状态 */
  stages: Record<WorkflowStage, StageState>
  /** 阶段点击回调 */
  onStageClick?: (stage: WorkflowStage) => void
  /** 布局方向 */
  layout?: 'vertical' | 'horizontal'
  /** 是否显示描述 */
  showDescription?: boolean
  /** 是否显示图标 */
  showIcon?: boolean
  /** 是否显示状态指示器 */
  showStatus?: boolean
  /** 自定义类名 */
  className?: string
  /** 是否紧凑模式 */
  compact?: boolean
}

// ============================================================================
// 阶段项组件
// ============================================================================

interface StageItemProps {
  stage: WorkflowStage
  stageState: StageState
  isActive: boolean
  isClickable: boolean
  onClick?: () => void
  layout: 'vertical' | 'horizontal'
  showDescription: boolean
  showIcon: boolean
  showStatus: boolean
  compact: boolean
}

function StageItem({
  stage,
  stageState,
  isActive,
  isClickable,
  onClick,
  layout,
  showDescription,
  showIcon,
  showStatus,
  compact,
}: StageItemProps) {
  const config = STAGE_CONFIGS[stage]
  const Icon = STAGE_ICONS[stage]
  const currentIndex = getStageIndex(stage)

  // 获取状态样式
  const getStatusStyle = () => {
    switch (stageState.status) {
      case StageStatus.COMPLETED:
        return {
          bg: 'bg-green-500',
          text: 'text-white',
          border: 'border-green-500',
          bgLight: 'bg-green-50',
        }
      case StageStatus.IN_PROGRESS:
        return {
          bg: 'bg-blue-500',
          text: 'text-white',
          border: 'border-blue-500',
          bgLight: 'bg-blue-50',
        }
      case StageStatus.SKIPPED:
        return {
          bg: 'bg-gray-400',
          text: 'text-white',
          border: 'border-gray-400',
          bgLight: 'bg-gray-50',
        }
      case StageStatus.PENDING:
      default:
        return {
          bg: 'bg-gray-200',
          text: 'text-gray-600',
          border: 'border-gray-300',
          bgLight: 'bg-white',
        }
    }
  }

  // 获取状态图标
  const getStatusIcon = () => {
    switch (stageState.status) {
      case StageStatus.COMPLETED:
        return <Check className="w-4 h-4" />
      case StageStatus.IN_PROGRESS:
        return <Loader2 className="w-4 h-4 animate-spin" />
      case StageStatus.SKIPPED:
        return <SkipForward className="w-4 h-4" />
      case StageStatus.PENDING:
      default:
        return <Circle className="w-4 h-4" />
    }
  }

  const statusStyle = getStatusStyle()

  if (layout === 'horizontal') {
    return (
      <div className="flex items-center">
        <button
          onClick={isClickable ? onClick : undefined}
          disabled={!isClickable}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            isActive && 'ring-2 ring-blue-500 ring-offset-2',
            isClickable ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed',
            compact ? 'text-sm' : 'text-base'
          )}
        >
          {/* 状态指示器 */}
          {showStatus && (
            <div
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full',
                statusStyle.bg,
                statusStyle.text
              )}
            >
              {getStatusIcon()}
            </div>
          )}

          {/* 图标 */}
          {showIcon && (
            <Icon
              className={cn(
                'w-5 h-5',
                isActive ? 'text-blue-600' : 'text-gray-400'
              )}
            />
          )}

          {/* 名称 */}
          <span
            className={cn(
              'font-medium',
              isActive ? 'text-blue-600' : 'text-gray-700'
            )}
          >
            {config.name}
          </span>
        </button>

        {/* 箭头 */}
        {currentIndex < STAGE_ORDER.length - 1 && (
          <ChevronRight className="w-5 h-5 text-gray-300 mx-2" />
        )}
      </div>
    )
  }

  // 垂直布局
  return (
    <div className="relative">
      {/* 连接线 */}
      {currentIndex < STAGE_ORDER.length - 1 && (
        <div
          className={cn(
            'absolute left-6 top-12 w-0.5 h-full -mb-6',
            stageState.status === StageStatus.COMPLETED
              ? 'bg-green-500'
              : 'bg-gray-200'
          )}
        />
      )}

      <button
        onClick={isClickable ? onClick : undefined}
        disabled={!isClickable}
        className={cn(
          'relative flex items-start gap-3 w-full p-3 rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-blue-500',
          isActive && cn('ring-2 ring-blue-500', statusStyle.bgLight),
          isClickable ? 'cursor-pointer hover:bg-gray-50' : 'cursor-not-allowed',
          compact && 'p-2'
        )}
      >
        {/* 状态指示器 */}
        {showStatus && (
          <div
            className={cn(
              'flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0',
              statusStyle.bg,
              statusStyle.text,
              isActive && 'ring-4 ring-blue-100'
            )}
          >
            {getStatusIcon()}
          </div>
        )}

        {/* 内容 */}
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            {showIcon && (
              <Icon
                className={cn(
                  'w-5 h-5',
                  isActive ? 'text-blue-600' : 'text-gray-400'
                )}
              />
            )}
            <h3
              className={cn(
                'font-semibold',
                isActive ? 'text-blue-600' : 'text-gray-900',
                compact ? 'text-sm' : 'text-base'
              )}
            >
              {config.name}
            </h3>
          </div>

          {showDescription && !compact && (
            <p className="mt-1 text-sm text-gray-500 line-clamp-2">
              {config.description}
            </p>
          )}

          {/* 状态标签 */}
          {stageState.status !== StageStatus.PENDING && (
            <span
              className={cn(
                'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-2',
                stageState.status === StageStatus.COMPLETED &&
                  'bg-green-100 text-green-800',
                stageState.status === StageStatus.IN_PROGRESS &&
                  'bg-blue-100 text-blue-800',
                stageState.status === StageStatus.SKIPPED &&
                  'bg-gray-100 text-gray-800'
              )}
            >
              {stageState.status === StageStatus.COMPLETED && '已完成'}
              {stageState.status === StageStatus.IN_PROGRESS && '进行中'}
              {stageState.status === StageStatus.SKIPPED && '已跳过'}
            </span>
          )}
        </div>
      </button>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export default function StageNavigation({
  currentStage,
  stages,
  onStageClick,
  layout = 'vertical',
  showDescription = true,
  showIcon = true,
  showStatus = true,
  className,
  compact = false,
}: StageNavigationProps) {
  // 计算是否可以点击某个阶段
  const canClickStage = useMemo(() => {
    return (stage: WorkflowStage): boolean => {
      // 已完成的阶段可以点击（允许返回）
      if (stages[stage]?.status === 'completed') {
        return true
      }
      
      // 当前阶段可以点击
      if (stage === currentStage) {
        return true
      }
      
      // 检查是否是当前阶段的下一个阶段
      const currentIndex = STAGE_ORDER.indexOf(currentStage)
      const stageIndex = STAGE_ORDER.indexOf(stage)
      
      // 允许点击下一个阶段（前进）
      if (stageIndex === currentIndex + 1) {
        return true
      }
      
      // 其他情况不允许点击（需要按顺序完成）
      return false
    }
  }, [stages, currentStage])

  return (
    <nav
      className={cn(
        layout === 'vertical' ? 'space-y-2' : 'flex items-center gap-2 overflow-x-auto',
        className
      )}
      aria-label="工作流阶段导航"
    >
      {STAGE_ORDER.map((stage) => (
        <StageItem
          key={stage}
          stage={stage}
          stageState={stages[stage]}
          isActive={stage === currentStage}
          isClickable={canClickStage(stage)}
          onClick={() => onStageClick?.(stage)}
          layout={layout}
          showDescription={showDescription}
          showIcon={showIcon}
          showStatus={showStatus}
          compact={compact}
        />
      ))}
    </nav>
  )
}

// ============================================================================
// 导出
// ============================================================================

export { StageNavigation }
export type { StageNavigationProps }
