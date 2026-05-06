/**
 * 工作流相关 Hooks
 * 
 * 提供便捷的工作流状态访问和操作方法
 */

import { useCallback, useMemo } from 'react'
import { useWorkflowStore } from '../stores/workflowStore'
import {
  WorkflowStage,
  StageStatus,
  type StageDataMap,
  type StageValidationResult,
} from '../types/workflow'
import {
  STAGE_CONFIGS,
  STAGE_ORDER,
  getStageDisplayName,
  getStageDescription,
  getStageProgress,
  getStageEstimatedDuration,
} from '../config/workflowConfig'

// ============================================================================
// 基础 Hooks
// ============================================================================

/**
 * 获取当前工作流状态
 */
export function useWorkflowState() {
  return useWorkflowStore((state) => state.workflowState)
}

/**
 * 获取当前阶段
 */
export function useCurrentStage(): WorkflowStage {
  return useWorkflowStore((state) => state.workflowState.currentStage)
}

/**
 * 获取工作流进度
 */
export function useWorkflowProgress(): number {
  return useWorkflowStore((state) => state.getProgress())
}

/**
 * 检查工作流是否已初始化
 */
export function useWorkflowInitialized(): boolean {
  return useWorkflowStore((state) => state.isInitialized)
}

// ============================================================================
// 阶段 Hooks
// ============================================================================

/**
 * 获取指定阶段的状态
 */
export function useStageState(stage: WorkflowStage) {
  return useWorkflowStore((state) => state.workflowState.stages[stage])
}

/**
 * 获取指定阶段的数据
 */
export function useStageData<T extends WorkflowStage>(stage: T): StageDataMap[T] | null {
  return useWorkflowStore((state) => state.workflowState.stages[stage].data as StageDataMap[T] | null)
}

/**
 * 获取当前阶段的数据
 */
export function useCurrentStageData() {
  const currentStage = useCurrentStage()
  return useStageData(currentStage)
}

/**
 * 获取所有阶段的状态列表
 */
export function useAllStages() {
  const workflowState = useWorkflowStore((state) => state.workflowState)
  
  return useMemo(() => {
    return STAGE_ORDER.map((stage) => ({
      stage,
      config: STAGE_CONFIGS[stage],
      state: workflowState.stages[stage],
      displayName: getStageDisplayName(stage),
      description: getStageDescription(stage),
      progress: getStageProgress(stage),
      estimatedDuration: getStageEstimatedDuration(stage),
    }))
  }, [workflowState.stages])
}

/**
 * 获取已完成的阶段列表
 */
export function useCompletedStages(): WorkflowStage[] {
  return useWorkflowStore((state) => state.getCompletedStages())
}

/**
 * 获取待处理的阶段列表
 */
export function usePendingStages(): WorkflowStage[] {
  return useWorkflowStore((state) => state.getPendingStages())
}

// ============================================================================
// 操作 Hooks
// ============================================================================

/**
 * 获取工作流操作方法
 */
export function useWorkflowActions() {
  const store = useWorkflowStore()
  
  return useMemo(() => ({
    initialize: store.initialize,
    reset: store.reset,
    restore: store.restore,
    startStage: store.startStage,
    completeStage: store.completeStage,
    skipStage: store.skipStage,
    goToStage: store.goToStage,
    goBack: store.goBack,
    goNext: store.goNext,
    updateStageData: store.updateStageData,
    setStageData: store.setStageData,
    clearStageData: store.clearStageData,
    validateStage: store.validateStage,
    save: store.save,
    load: store.load,
    clearStorage: store.clearStorage,
  }), [
    store.initialize,
    store.reset,
    store.restore,
    store.startStage,
    store.completeStage,
    store.skipStage,
    store.goToStage,
    store.goBack,
    store.goNext,
    store.updateStageData,
    store.setStageData,
    store.clearStageData,
    store.validateStage,
    store.save,
    store.load,
    store.clearStorage,
  ])
}

/**
 * 获取阶段操作方法
 */
export function useStageActions(stage: WorkflowStage) {
  const { startStage, completeStage, skipStage, updateStageData, setStageData, clearStageData, validateStage } = useWorkflowActions()
  
  return useMemo(() => ({
    start: () => startStage(stage),
    complete: () => completeStage(stage),
    skip: () => skipStage(stage),
    updateData: <T extends WorkflowStage>(data: Partial<StageDataMap[T]>) => 
      updateStageData(stage as T, data),
    setData: <T extends WorkflowStage>(data: StageDataMap[T]) => 
      setStageData(stage as T, data),
    clearData: () => clearStageData(stage),
    validate: (): StageValidationResult => validateStage(stage),
  }), [stage, startStage, completeStage, skipStage, updateStageData, setStageData, clearStageData, validateStage])
}

// ============================================================================
// 导航 Hooks
// ============================================================================

/**
 * 获取导航信息
 */
export function useWorkflowNavigation() {
  const currentStage = useCurrentStage()
  const { goBack, goNext, goToStage } = useWorkflowActions()
  
  const currentConfig = STAGE_CONFIGS[currentStage]
  const currentIndex = STAGE_ORDER.indexOf(currentStage)
  
  const previousStage = currentConfig.previousStage
  const nextStage = currentConfig.nextStage
  
  const canGoBack = currentConfig.canGoBack && previousStage !== undefined
  const canGoNext = nextStage !== undefined
  
  return {
    currentStage,
    currentIndex,
    previousStage,
    nextStage,
    canGoBack,
    canGoNext,
    goBack,
    goNext,
    goToStage,
    totalStages: STAGE_ORDER.length,
    isFirstStage: currentIndex === 0,
    isLastStage: currentIndex === STAGE_ORDER.length - 1,
  }
}

// ============================================================================
// 验证 Hooks
// ============================================================================

/**
 * 验证阶段数据
 */
export function useStageValidation(stage: WorkflowStage) {
  const validateStage = useWorkflowStore((state) => state.validateStage)
  
  const validation = useMemo(() => {
    return validateStage(stage)
  }, [stage, validateStage])
  
  return {
    isValid: validation.isValid,
    errors: validation.errors,
    warnings: validation.warnings,
    canProceed: validation.isValid,
  }
}

/**
 * 验证当前阶段
 */
export function useCurrentStageValidation() {
  const currentStage = useCurrentStage()
  return useStageValidation(currentStage)
}

// ============================================================================
// 状态检查 Hooks
// ============================================================================

/**
 * 检查阶段是否已完成
 */
export function useIsStageCompleted(stage: WorkflowStage): boolean {
  const stageState = useStageState(stage)
  return stageState.status === StageStatus.COMPLETED
}

/**
 * 检查阶段是否正在进行
 */
export function useIsStageInProgress(stage: WorkflowStage): boolean {
  const stageState = useStageState(stage)
  return stageState.status === StageStatus.IN_PROGRESS
}

/**
 * 检查阶段是否被跳过
 */
export function useIsStageSkipped(stage: WorkflowStage): boolean {
  const stageState = useStageState(stage)
  return stageState.status === StageStatus.SKIPPED
}

/**
 * 检查阶段是否可以跳过
 */
export function useCanStageBeSkipped(stage: WorkflowStage): boolean {
  return STAGE_CONFIGS[stage].canSkip
}

/**
 * 检查是否可以进入下一阶段
 */
export function useCanProceedToNext(): boolean {
  const currentStage = useCurrentStage()
  const { isValid } = useCurrentStageValidation()
  const currentStageState = useStageState(currentStage)
  
  return isValid && currentStageState.status === StageStatus.IN_PROGRESS
}

// ============================================================================
// 事件 Hooks
// ============================================================================

/**
 * 获取工作流事件列表
 */
export function useWorkflowEvents() {
  return useWorkflowStore((state) => state.events)
}

/**
 * 获取最近的工作流事件
 */
export function useRecentWorkflowEvents(count: number = 10) {
  const events = useWorkflowEvents()
  
  return useMemo(() => {
    return events.slice(-count)
  }, [events, count])
}

// ============================================================================
// 工具 Hooks
// ============================================================================

/**
 * 获取阶段显示信息
 */
export function useStageDisplayInfo(stage: WorkflowStage) {
  const stageState = useStageState(stage)
  
  return useMemo(() => ({
    name: getStageDisplayName(stage),
    description: getStageDescription(stage),
    status: stageState.status,
    statusText: getStatusText(stageState.status),
    progress: getStageProgress(stage),
    estimatedDuration: getStageEstimatedDuration(stage),
    icon: STAGE_CONFIGS[stage].icon,
  }), [stage, stageState.status])
}

/**
 * 获取状态显示文本
 */
function getStatusText(status: StageStatus): string {
  switch (status) {
    case StageStatus.PENDING:
      return '待处理'
    case StageStatus.IN_PROGRESS:
      return '进行中'
    case StageStatus.COMPLETED:
      return '已完成'
    case StageStatus.SKIPPED:
      return '已跳过'
    default:
      return '未知'
  }
}

/**
 * 使用工作流初始化
 * 在应用启动时调用，自动加载保存的状态
 */
export function useWorkflowInitializer() {
  const { initialize, isInitialized } = useWorkflowStore()
  
  return useCallback(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [initialize, isInitialized])
}
