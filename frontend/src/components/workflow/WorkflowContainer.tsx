/**
 * 多阶段工作流容器组件
 * 
 * 提供统一的工作流容器，管理所有阶段的切换、状态和布局
 * 集成所有已创建的阶段组件，提供一致的用户体验
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { useWorkflowStore } from '../../stores/workflowStore'
import {
  WorkflowStage,
  type WorkflowState,
} from '../../types/workflow'
import { STAGE_CONFIGS, STAGE_ORDER } from '../../config/workflowConfig'
import StageNavigation from './StageNavigation'
import ProgressIndicator from './ProgressIndicator'
import WorkflowControls from './WorkflowControls'

import InspirationInput from '../InspirationInput'
import ProjectSettingForm from '../ProjectSettingForm'
import MacroPlanningView from '../MacroPlanningView'
import CharacterPreparationView from '../CharacterPreparationView'
import VolumeStrategyView from '../VolumeStrategyView'
import RhythmBreakdownView from '../RhythmBreakdownView'
import ChapterExecutionPage from '../../pages/ChapterExecutionPage'

// ============================================================================
// 工具函数
// ============================================================================

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// 组件属性
// ============================================================================

interface WorkflowContainerProps {
  /** 初始工作流状态（用于恢复） */
  initialState?: WorkflowState
  /** 是否自动初始化 */
  autoInitialize?: boolean
  /** 是否显示导航栏 */
  showNavigation?: boolean
  /** 是否显示进度指示器 */
  showProgress?: boolean
  /** 是否显示控制按钮 */
  showControls?: boolean
  /** 是否启用自动保存 */
  autoSave?: boolean
  /** 自动保存间隔（毫秒） */
  autoSaveInterval?: number
  /** 工作流完成回调 */
  onWorkflowComplete?: (state: WorkflowState) => void
  /** 阶段切换回调 */
  onStageChange?: (stage: WorkflowStage) => void
  /** 自定义类名 */
  className?: string
  /** 是否显示侧边栏 */
  showSidebar?: boolean
  /** 布局模式 */
  layoutMode?: 'horizontal' | 'vertical'
}

// ============================================================================
// 阶段组件映射
// ============================================================================

interface StageComponentProps {
  onSave?: (data: unknown) => Promise<void>
  onComplete?: () => Promise<void>
}

const STAGE_COMPONENTS: Record<WorkflowStage, React.ComponentType<StageComponentProps>> = {
  [WorkflowStage.INSPIRATION]: InspirationInput as React.ComponentType<StageComponentProps>,
  [WorkflowStage.PROJECT_SETTING]: ProjectSettingForm as React.ComponentType<StageComponentProps>,
  [WorkflowStage.MACRO_PLANNING]: MacroPlanningView as React.ComponentType<StageComponentProps>,
  [WorkflowStage.CHARACTER_PREPARATION]: CharacterPreparationView as React.ComponentType<StageComponentProps>,
  [WorkflowStage.VOLUME_STRATEGY]: VolumeStrategyView as React.ComponentType<StageComponentProps>,
  [WorkflowStage.RHYTHM_BREAKDOWN]: RhythmBreakdownView as React.ComponentType<StageComponentProps>,
  [WorkflowStage.CHAPTER_EXECUTION]: ChapterExecutionPage as React.ComponentType<StageComponentProps>,
}

// ============================================================================
// 主组件
// ============================================================================

export default function WorkflowContainer({
  initialState,
  autoInitialize = true,
  showNavigation = true,
  showProgress = true,
  showControls = true,
  autoSave = true,
  autoSaveInterval = 5000,
  onWorkflowComplete,
  onStageChange,
  className,
  showSidebar = true,
  layoutMode = 'horizontal',
}: WorkflowContainerProps) {
  // 工作流状态
  const {
    workflowState,
    initialize,
    restore,
    completeStage,
    goToStage,
    save,
    getProgress,
    isInitialized,
    updateStageData,
  } = useWorkflowStore()

  // 本地状态
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward'>('forward')

  // 初始化工作流
  useEffect(() => {
    if (autoInitialize && !isInitialized) {
      if (initialState) {
        restore(initialState)
      } else {
        initialize()
      }
    }
  }, [autoInitialize, isInitialized, initialState, initialize, restore])

  // 自动保存
  useEffect(() => {
    if (!autoSave || !isInitialized) return

    const interval = setInterval(() => {
      save()
    }, autoSaveInterval)

    return () => clearInterval(interval)
  }, [autoSave, autoSaveInterval, isInitialized, save])

  // 监听阶段变化
  useEffect(() => {
    if (workflowState.currentStage && onStageChange) {
      onStageChange(workflowState.currentStage)
    }
  }, [workflowState.currentStage, onStageChange])

  // 处理阶段切换
  const handleStageChange = useCallback(
    async (targetStage: WorkflowStage) => {
      if (isTransitioning) return

      const currentIndex = STAGE_ORDER.indexOf(workflowState.currentStage)
      const targetIndex = STAGE_ORDER.indexOf(targetStage)

      setTransitionDirection(targetIndex > currentIndex ? 'forward' : 'backward')
      setIsTransitioning(true)

      try {
        const result = goToStage(targetStage)
        if (!result.success) {
          console.error('阶段切换失败:', result.error)
        }
      } catch (error) {
        console.error('阶段切换异常:', error)
      } finally {
        setTimeout(() => setIsTransitioning(false), 300)
      }
    },
    [workflowState.currentStage, goToStage, isTransitioning]
  )

  // 处理下一阶段
  const handleNext = useCallback(async () => {
    const currentConfig = STAGE_CONFIGS[workflowState.currentStage]
    if (currentConfig.nextStage) {
      await handleStageChange(currentConfig.nextStage)
    }
  }, [workflowState.currentStage, handleStageChange])

  // 处理上一阶段
  const handlePrevious = useCallback(async () => {
    const currentConfig = STAGE_CONFIGS[workflowState.currentStage]
    if (currentConfig.previousStage) {
      await handleStageChange(currentConfig.previousStage)
    }
  }, [workflowState.currentStage, handleStageChange])

  // 获取当前阶段组件
  const CurrentStageComponent = useMemo(() => {
    return STAGE_COMPONENTS[workflowState.currentStage]
  }, [workflowState.currentStage])

  // 计算进度
  const progress = useMemo(() => {
    return getProgress()
  }, [getProgress])

  const renderStageContent = () => {
    if (!CurrentStageComponent) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">未找到阶段组件</p>
        </div>
      )
    }

    const isChapterExecution = workflowState.currentStage === WorkflowStage.CHAPTER_EXECUTION

    if (isChapterExecution) {
      return (
        <div
          className={cn(
            'transition-all duration-300 ease-in-out',
            isTransitioning && 'opacity-0 transform',
            transitionDirection === 'forward'
              ? isTransitioning
                ? 'translate-x-4'
                : 'translate-x-0'
              : isTransitioning
              ? '-translate-x-4'
              : 'translate-x-0'
          )}
        >
          <ChapterExecutionPage
            key={workflowState.currentStage}
            embedded={true}
          />
        </div>
      )
    }

    return (
      <div
        className={cn(
          'transition-all duration-300 ease-in-out',
          isTransitioning && 'opacity-0 transform',
          transitionDirection === 'forward'
            ? isTransitioning
              ? 'translate-x-4'
              : 'translate-x-0'
            : isTransitioning
            ? '-translate-x-4'
            : 'translate-x-0'
        )}
      >
        <CurrentStageComponent
          key={workflowState.currentStage}
          onSave={async (data: unknown) => {
            updateStageData(workflowState.currentStage, data as Record<string, unknown>)
            save()
          }}
          onComplete={async () => {
            const result = completeStage(workflowState.currentStage)
            if (!result.success) {
              console.error('阶段完成失败:', result.error)
            }
            if (result.success && result.targetStage) {
              if (!STAGE_CONFIGS[result.targetStage].nextStage) {
                onWorkflowComplete?.(workflowState)
              }
            }
          }}
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'h-full bg-gray-50 flex',
        layoutMode === 'vertical' && 'flex-col',
        className
      )}
    >
      {/* 侧边栏导航 */}
      {showSidebar && showNavigation && (
        <aside
          className={cn(
            'w-56 bg-white border-r border-gray-200 flex flex-col shrink-0',
            layoutMode === 'vertical' && 'w-full border-r-0 border-b'
          )}
        >
          <div className="p-4 border-b border-gray-200">
            <h1 className="text-base font-bold text-gray-900">故事规划工作流</h1>
            <p className="mt-0.5 text-xs text-gray-500">创建你的小说故事框架</p>
          </div>

          {/* 进度指示器 */}
          {showProgress && (
            <div className="px-3 py-2 border-b border-gray-200">
              <ProgressIndicator progress={progress} showLabel />
            </div>
          )}

          {/* 阶段导航 */}
          <div className="flex-1 overflow-y-auto p-3">
            <StageNavigation
              currentStage={workflowState.currentStage}
              stages={workflowState.stages}
              onStageClick={handleStageChange}
              layout={layoutMode === 'vertical' ? 'horizontal' : 'vertical'}
            />
          </div>

          {/* 工作流控制 - 底部 */}
          {showControls && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <WorkflowControls
                currentStage={workflowState.currentStage}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onSave={() => save()}
                onReset={() => {
                  if (confirm('确定要重置工作流吗？所有进度将丢失。')) {
                    useWorkflowStore.getState().reset()
                  }
                }}
                showClearAll={true}
                layout="vertical"
                size="sm"
              />
            </div>
          )}
        </aside>
      )}

      {/* 主内容区域 */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="h-full p-4 lg:p-6">
          {/* 阶段标题 */}
          <div className="mb-3">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs font-bold">
                {STAGE_ORDER.indexOf(workflowState.currentStage) + 1}
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900">
                  {STAGE_CONFIGS[workflowState.currentStage]?.name}
                </h2>
                <p className="text-xs text-gray-500">
                  {STAGE_CONFIGS[workflowState.currentStage]?.description}
                </p>
              </div>
            </div>
          </div>

          {/* 阶段内容 */}
          {renderStageContent()}
        </div>
      </main>
    </div>
  )
}

// ============================================================================
// 导出
// ============================================================================

export { WorkflowContainer }
export type { WorkflowContainerProps }
