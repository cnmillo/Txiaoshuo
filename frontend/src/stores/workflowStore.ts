/**
 * 工作流状态管理
 * 
 * 使用 Zustand 管理故事规划工作流的状态
 * 支持阶段转换、数据更新和状态持久化
 */

import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import {
  WorkflowStage,
  StageStatus,
  type WorkflowState,
  type StageState,
  type StageDataMap,
  type StageTransitionResult,
  type StageValidationResult,
  type WorkflowSnapshot,
  WorkflowEventType,
  type WorkflowEvent,
  type GenerationTask,
  type GenerationProgress,
} from '../types/workflow'
import {
  STAGE_ORDER,
  STAGE_CONFIGS,
  canTransitionTo,
  STORAGE_KEYS,
  CURRENT_WORKFLOW_VERSION,
  STAGE_VALIDATION_RULES,
} from '../config/workflowConfig'

// ============================================================================
// 持久化工具函数
// ============================================================================

/**
 * 保存工作流状态到 localStorage
 */
function saveWorkflowToStorage(state: WorkflowState): void {
  try {
    const snapshot: WorkflowSnapshot = {
      version: CURRENT_WORKFLOW_VERSION,
      state,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEYS.WORKFLOW_STATE, JSON.stringify(snapshot))
    localStorage.setItem(STORAGE_KEYS.WORKFLOW_VERSION, String(CURRENT_WORKFLOW_VERSION))
  } catch (error) {
    console.error('保存工作流状态失败:', error)
  }
}

/**
 * 从 localStorage 加载工作流状态
 */
function loadWorkflowFromStorage(): WorkflowState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.WORKFLOW_STATE)
    if (!stored) return null

    const snapshot: WorkflowSnapshot = JSON.parse(stored)
    
    // 版本迁移
    if (snapshot.version < CURRENT_WORKFLOW_VERSION) {
      return migrateWorkflowState(snapshot.state, snapshot.version)
    }

    return snapshot.state
  } catch (error) {
    console.error('加载工作流状态失败:', error)
    return null
  }
}

/**
 * 清除存储的工作流状态
 */
function clearWorkflowFromStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.WORKFLOW_STATE)
    localStorage.removeItem(STORAGE_KEYS.WORKFLOW_VERSION)
    localStorage.removeItem(STORAGE_KEYS.WORKFLOW_BACKUP)
  } catch (error) {
    console.error('清除工作流状态失败:', error)
  }
}

/**
 * 创建备份
 */
function createBackup(state: WorkflowState): void {
  try {
    const snapshot: WorkflowSnapshot = {
      version: CURRENT_WORKFLOW_VERSION,
      state,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEYS.WORKFLOW_BACKUP, JSON.stringify(snapshot))
  } catch (error) {
    console.error('创建备份失败:', error)
  }
}

/**
 * 工作流状态迁移
 */
function migrateWorkflowState(
  state: WorkflowState,
  fromVersion: number
): WorkflowState {
  // 未来版本迁移逻辑
  // if (fromVersion < 2) { ... }
  console.log(`迁移工作流状态从版本 ${fromVersion} 到 ${CURRENT_WORKFLOW_VERSION}`)
  return {
    ...state,
    version: CURRENT_WORKFLOW_VERSION,
  }
}

// ============================================================================
// 初始状态
// ============================================================================

/**
 * 创建初始阶段状态
 */
function createInitialStageState(stage: WorkflowStage): StageState {
  return {
    stage,
    status: StageStatus.PENDING,
    data: null,
    retryCount: 0,
  }
}

/**
 * 创建初始工作流状态
 */
function createInitialWorkflowState(): WorkflowState {
  const stages = {} as Record<WorkflowStage, StageState>
  
  STAGE_ORDER.forEach((stage) => {
    stages[stage] = createInitialStageState(stage)
  })

  return {
    id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    currentStage: WorkflowStage.INSPIRATION,
    stages,
    version: CURRENT_WORKFLOW_VERSION,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

// ============================================================================
// Store 类型定义
// ============================================================================

interface WorkflowStore {
  // 状态
  workflowState: WorkflowState
  isInitialized: boolean
  events: WorkflowEvent[]

  // 生成任务状态
  generationTask: GenerationTask | null

  // 操作
  initialize: () => void
  reset: () => void
  restore: (state: WorkflowState) => void

  // 生成任务操作
  startGeneration: (task: Omit<GenerationTask, 'startedAt'>) => void
  updateGenerationProgress: (progress: Partial<GenerationProgress>) => void
  stopGeneration: () => void
  getGenerationTask: () => GenerationTask | null
  hasActiveGeneration: () => boolean

  // 阶段操作
  startStage: (stage: WorkflowStage) => StageTransitionResult
  completeStage: (stage: WorkflowStage) => StageTransitionResult
  skipStage: (stage: WorkflowStage) => StageTransitionResult
  goToStage: (targetStage: WorkflowStage) => StageTransitionResult
  goBack: () => StageTransitionResult
  goNext: () => StageTransitionResult

  // 数据操作
  updateStageData: <T extends WorkflowStage>(
    stage: T,
    data: Partial<StageDataMap[T]>
  ) => void
  setStageData: <T extends WorkflowStage>(
    stage: T,
    data: StageDataMap[T]
  ) => void
  clearStageData: (stage: WorkflowStage) => void

  // 验证
  validateStage: (stage: WorkflowStage) => StageValidationResult
  canProceed: (stage: WorkflowStage) => boolean

  // 工具
  getStageState: (stage: WorkflowStage) => StageState | undefined
  getStageData: <T extends WorkflowStage>(stage: T) => StageDataMap[T] | null
  getProgress: () => number
  getCompletedStages: () => WorkflowStage[]
  getPendingStages: () => WorkflowStage[]

  // 事件
  addEvent: (event: WorkflowEvent) => void
  clearEvents: () => void

  // 持久化
  save: () => void
  load: () => boolean
  clearStorage: () => void
}

// ============================================================================
// Store 实现
// ============================================================================

export const useWorkflowStore = create<WorkflowStore>()(
  subscribeWithSelector((set, get) => ({
    // 初始状态
    workflowState: createInitialWorkflowState(),
    isInitialized: false,
    events: [],
    generationTask: null,

    // ========================================================================
    // 初始化操作
    // ========================================================================

    initialize: () => {
      const loaded = get().load()
      if (!loaded) {
        set({
          workflowState: createInitialWorkflowState(),
          isInitialized: true,
        })
      } else {
        set({ isInitialized: true })
      }
    },

    // ========================================================================
    // 生成任务操作
    // ========================================================================

    startGeneration: (taskData) => {
      const task: GenerationTask = {
        ...taskData,
        startedAt: new Date().toISOString(),
      }
      set({ generationTask: task })
    },

    updateGenerationProgress: (progress) => {
      const currentTask = get().generationTask
      if (currentTask) {
        set({
          generationTask: {
            ...currentTask,
            progress: {
              ...currentTask.progress,
              ...progress,
            },
          },
        })
      }
    },

    stopGeneration: () => {
      const currentTask = get().generationTask
      if (currentTask) {
        set({
          generationTask: {
            ...currentTask,
            isGenerating: false,
            progress: {
              ...currentTask.progress,
              status: 'paused',
            },
          },
        })
      }
    },

    getGenerationTask: () => {
      return get().generationTask
    },

    hasActiveGeneration: () => {
      const task = get().generationTask
      return task !== null && task.isGenerating
    },

    reset: () => {
      createBackup(get().workflowState)
      const newState = createInitialWorkflowState()
      set({
        workflowState: newState,
        events: [],
      })
      saveWorkflowToStorage(newState)
      get().addEvent({
        type: WorkflowEventType.WORKFLOW_RESET,
        timestamp: new Date().toISOString(),
      })
    },

    restore: (state: WorkflowState) => {
      set({ workflowState: state })
      saveWorkflowToStorage(state)
      get().addEvent({
        type: WorkflowEventType.WORKFLOW_RESTORED,
        timestamp: new Date().toISOString(),
      })
    },

    // ========================================================================
    // 阶段操作
    // ========================================================================

    startStage: (stage: WorkflowStage): StageTransitionResult => {
      const { workflowState, addEvent } = get()
      const stageState = workflowState.stages[stage]

      if (stageState.status === StageStatus.IN_PROGRESS) {
        return {
          success: false,
          targetStage: stage,
          error: '该阶段已在进行中',
        }
      }

      const updatedStages = {
        ...workflowState.stages,
        [stage]: {
          ...stageState,
          status: StageStatus.IN_PROGRESS,
          startedAt: new Date().toISOString(),
        },
      }

      const newState: WorkflowState = {
        ...workflowState,
        currentStage: stage,
        stages: updatedStages,
        updatedAt: new Date().toISOString(),
      }

      set({ workflowState: newState })
      saveWorkflowToStorage(newState)

      addEvent({
        type: WorkflowEventType.STAGE_STARTED,
        timestamp: new Date().toISOString(),
        stage,
      })

      return { success: true, targetStage: stage }
    },

    completeStage: (stage: WorkflowStage): StageTransitionResult => {
      const { workflowState, addEvent, validateStage } = get()
      const stageState = workflowState.stages[stage]

      // 验证阶段数据
      const validation = validateStage(stage)
      if (!validation.isValid) {
        return {
          success: false,
          targetStage: stage,
          error: `阶段数据验证失败: ${validation.errors.join(', ')}`,
        }
      }

      const updatedStages = {
        ...workflowState.stages,
        [stage]: {
          ...stageState,
          status: StageStatus.COMPLETED,
          completedAt: new Date().toISOString(),
        },
      }

      // 自动进入下一阶段
      const nextStage = STAGE_CONFIGS[stage].nextStage
      const newState: WorkflowState = {
        ...workflowState,
        currentStage: nextStage ?? stage,
        stages: updatedStages,
        updatedAt: new Date().toISOString(),
      }

      set({ workflowState: newState })
      saveWorkflowToStorage(newState)

      addEvent({
        type: WorkflowEventType.STAGE_COMPLETED,
        timestamp: new Date().toISOString(),
        stage,
      })

      return { success: true, targetStage: nextStage ?? stage }
    },

    skipStage: (stage: WorkflowStage): StageTransitionResult => {
      const { workflowState, addEvent } = get()
      const stageConfig = STAGE_CONFIGS[stage]

      if (!stageConfig.canSkip) {
        return {
          success: false,
          targetStage: stage,
          error: '该阶段不能跳过',
        }
      }

      const stageState = workflowState.stages[stage]
      const updatedStages = {
        ...workflowState.stages,
        [stage]: {
          ...stageState,
          status: StageStatus.SKIPPED,
          completedAt: new Date().toISOString(),
        },
      }

      const nextStage = stageConfig.nextStage
      const newState: WorkflowState = {
        ...workflowState,
        currentStage: nextStage ?? stage,
        stages: updatedStages,
        updatedAt: new Date().toISOString(),
      }

      set({ workflowState: newState })
      saveWorkflowToStorage(newState)

      addEvent({
        type: WorkflowEventType.STAGE_SKIPPED,
        timestamp: new Date().toISOString(),
        stage,
      })

      return { success: true, targetStage: nextStage ?? stage }
    },

    goToStage: (targetStage: WorkflowStage): StageTransitionResult => {
      const { workflowState } = get()
      const result = canTransitionTo(
        workflowState.currentStage,
        targetStage,
        workflowState.stages
      )

      if (!result.canTransition) {
        return {
          success: false,
          targetStage,
          error: result.reason,
        }
      }

      const newState: WorkflowState = {
        ...workflowState,
        currentStage: targetStage,
        updatedAt: new Date().toISOString(),
      }

      set({ workflowState: newState })
      saveWorkflowToStorage(newState)

      return { success: true, targetStage }
    },

    goBack: (): StageTransitionResult => {
      const { workflowState, addEvent } = get()
      const currentConfig = STAGE_CONFIGS[workflowState.currentStage]
      const previousStage = currentConfig.previousStage

      if (!previousStage || !currentConfig.canGoBack) {
        return {
          success: false,
          targetStage: workflowState.currentStage,
          error: '无法回退到上一阶段',
        }
      }

      const newState: WorkflowState = {
        ...workflowState,
        currentStage: previousStage,
        updatedAt: new Date().toISOString(),
      }

      set({ workflowState: newState })
      saveWorkflowToStorage(newState)

      addEvent({
        type: WorkflowEventType.STAGE_ROLLBACK,
        timestamp: new Date().toISOString(),
        stage: previousStage,
      })

      return { success: true, targetStage: previousStage }
    },

    goNext: (): StageTransitionResult => {
      const { workflowState } = get()
      const currentConfig = STAGE_CONFIGS[workflowState.currentStage]
      const nextStage = currentConfig.nextStage

      if (!nextStage) {
        return {
          success: false,
          targetStage: workflowState.currentStage,
          error: '已经是最后一个阶段',
        }
      }

      return get().goToStage(nextStage)
    },

    // ========================================================================
    // 数据操作
    // ========================================================================

    updateStageData: <T extends WorkflowStage>(
      stage: T,
      data: Partial<StageDataMap[T]>
    ) => {
      const { workflowState, addEvent } = get()
      const stageState = workflowState.stages[stage]
      const currentData = stageState.data as StageDataMap[T] | null

      const updatedData = {
        ...(currentData || {}),
        ...data,
        updatedAt: new Date().toISOString(),
      } as StageDataMap[T]

      const updatedStages = {
        ...workflowState.stages,
        [stage]: {
          ...stageState,
          data: updatedData,
        },
      }

      const newState: WorkflowState = {
        ...workflowState,
        stages: updatedStages,
        updatedAt: new Date().toISOString(),
      }

      set({ workflowState: newState })
      saveWorkflowToStorage(newState)

      addEvent({
        type: WorkflowEventType.DATA_UPDATED,
        timestamp: new Date().toISOString(),
        stage,
        data: { field: Object.keys(data).join(', ') },
      })
    },

    setStageData: <T extends WorkflowStage>(stage: T, data: StageDataMap[T]) => {
      const { workflowState, addEvent } = get()
      const stageState = workflowState.stages[stage]

      const updatedStages = {
        ...workflowState.stages,
        [stage]: {
          ...stageState,
          data: {
            ...data,
            updatedAt: new Date().toISOString(),
          },
        },
      }

      const newState: WorkflowState = {
        ...workflowState,
        stages: updatedStages,
        updatedAt: new Date().toISOString(),
      }

      set({ workflowState: newState })
      saveWorkflowToStorage(newState)

      addEvent({
        type: WorkflowEventType.DATA_UPDATED,
        timestamp: new Date().toISOString(),
        stage,
      })
    },

    clearStageData: (stage: WorkflowStage) => {
      const { workflowState } = get()
      const stageState = workflowState.stages[stage]

      const updatedStages = {
        ...workflowState.stages,
        [stage]: {
          ...stageState,
          data: null,
        },
      }

      const newState: WorkflowState = {
        ...workflowState,
        stages: updatedStages,
        updatedAt: new Date().toISOString(),
      }

      set({ workflowState: newState })
      saveWorkflowToStorage(newState)
    },

    // ========================================================================
    // 验证
    // ========================================================================

    validateStage: (stage: WorkflowStage): StageValidationResult => {
      const { workflowState } = get()
      const stageState = workflowState.stages[stage]
      const data = stageState.data as Record<string, unknown> | null
      const rules = STAGE_VALIDATION_RULES[stage]

      console.log('validateStage called for:', stage)
      console.log('Stage data:', data)
      console.log('Validation rules:', rules)

      const errors: string[] = []
      const warnings: string[] = []

      if (!data) {
        errors.push('阶段数据为空')
        return { isValid: false, errors, warnings }
      }

      // 检查必填字段
      if (rules.requiredFields) {
        for (const field of rules.requiredFields) {
          if (!data[field]) {
            errors.push(`缺少必填字段: ${field}`)
          }
        }
      }

      // 检查最小长度
      if (rules.minLength) {
        for (const [field, minLength] of Object.entries(rules.minLength)) {
          const value = data[field]
          if (typeof value === 'string' && value.length < minLength) {
            errors.push(`字段 ${field} 长度不足，至少需要 ${minLength} 个字符`)
          }
        }
      }

      // 检查数组最小项数
      if (rules.minItems) {
        for (const [field, minItems] of Object.entries(rules.minItems)) {
          const value = data[field]
          if (Array.isArray(value) && value.length < minItems) {
            errors.push(`字段 ${field} 项数不足，至少需要 ${minItems} 项`)
          }
        }
      }

      console.log('Validation result:', { isValid: errors.length === 0, errors, warnings })

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
      }
    },

    canProceed: (stage: WorkflowStage): boolean => {
      const validation = get().validateStage(stage)
      return validation.isValid
    },

    // ========================================================================
    // 工具方法
    // ========================================================================

    getStageState: (stage: WorkflowStage): StageState | undefined => {
      return get().workflowState.stages[stage]
    },

    getStageData: <T extends WorkflowStage>(stage: T): StageDataMap[T] | null => {
      return get().workflowState.stages[stage].data as StageDataMap[T] | null
    },

    getProgress: (): number => {
      const { workflowState } = get()
      const completedCount = STAGE_ORDER.filter(
        (stage) => workflowState.stages[stage].status === StageStatus.COMPLETED
      ).length
      return Math.round((completedCount / STAGE_ORDER.length) * 100)
    },

    getCompletedStages: (): WorkflowStage[] => {
      const { workflowState } = get()
      return STAGE_ORDER.filter(
        (stage) => workflowState.stages[stage].status === StageStatus.COMPLETED
      )
    },

    getPendingStages: (): WorkflowStage[] => {
      const { workflowState } = get()
      return STAGE_ORDER.filter(
        (stage) => workflowState.stages[stage].status === StageStatus.PENDING
      )
    },

    // ========================================================================
    // 事件管理
    // ========================================================================

    addEvent: (event: WorkflowEvent) => {
      set((state) => ({
        events: [...state.events.slice(-99), event], // 保留最近100条事件
      }))
    },

    clearEvents: () => {
      set({ events: [] })
    },

    // ========================================================================
    // 持久化
    // ========================================================================

    save: () => {
      saveWorkflowToStorage(get().workflowState)
    },

    load: (): boolean => {
      const savedState = loadWorkflowFromStorage()
      if (savedState) {
        set({ workflowState: savedState })
        return true
      }
      return false
    },

    clearStorage: () => {
      clearWorkflowFromStorage()
    },
  }))
)

// ============================================================================
// 选择器
// ============================================================================

/**
 * 当前阶段选择器
 */
export const selectCurrentStage = (state: WorkflowStore) =>
  state.workflowState.currentStage

/**
 * 当前阶段状态选择器
 */
export const selectCurrentStageState = (state: WorkflowStore) =>
  state.workflowState.stages[state.workflowState.currentStage]

/**
 * 工作流进度选择器
 */
export const selectProgress = (state: WorkflowStore) => state.getProgress()

/**
 * 是否已初始化选择器
 */
export const selectIsInitialized = (state: WorkflowStore) => state.isInitialized

/**
 * 所有阶段状态选择器
 */
export const selectAllStages = (state: WorkflowStore) =>
  STAGE_ORDER.map((stage) => ({
    stage,
    config: STAGE_CONFIGS[stage],
    state: state.workflowState.stages[stage],
  }))
