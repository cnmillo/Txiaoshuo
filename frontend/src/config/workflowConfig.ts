/**
 * 工作流配置文件
 * 
 * 定义故事规划工作流的阶段配置、转换规则和默认设置
 */

import {
  WorkflowStage,
  type StageConfig,
  type WorkflowConfig,
} from '../types/workflow'

// ============================================================================
// 阶段配置
// ============================================================================

/**
 * 阶段配置映射
 */
export const STAGE_CONFIGS: Record<WorkflowStage, StageConfig> = {
  [WorkflowStage.INSPIRATION]: {
    stage: WorkflowStage.INSPIRATION,
    name: '灵感输入',
    description: '输入初始创意，AI自动生成多套整本方向候选',
    optional: false,
    canSkip: false,
    canGoBack: false,
    prerequisites: [],
    nextStage: WorkflowStage.PROJECT_SETTING,
    previousStage: undefined,
    estimatedDuration: 5,
    icon: 'Lightbulb',
  },
  [WorkflowStage.PROJECT_SETTING]: {
    stage: WorkflowStage.PROJECT_SETTING,
    name: '项目设定',
    description: '明确题材、卖点、目标读者感受和前30章承诺',
    optional: false,
    canSkip: false,
    canGoBack: true,
    prerequisites: [WorkflowStage.INSPIRATION],
    nextStage: WorkflowStage.MACRO_PLANNING,
    previousStage: WorkflowStage.INSPIRATION,
    estimatedDuration: 10,
    icon: 'Settings',
  },
  [WorkflowStage.MACRO_PLANNING]: {
    stage: WorkflowStage.MACRO_PLANNING,
    name: '故事宏观规划',
    description: '规划整本走向、阶段升级节点和长线兑现承诺',
    optional: false,
    canSkip: false,
    canGoBack: true,
    prerequisites: [WorkflowStage.PROJECT_SETTING],
    nextStage: WorkflowStage.CHARACTER_PREPARATION,
    previousStage: WorkflowStage.PROJECT_SETTING,
    estimatedDuration: 15,
    icon: 'GitBranch',
  },
  [WorkflowStage.CHARACTER_PREPARATION]: {
    stage: WorkflowStage.CHARACTER_PREPARATION,
    name: '角色准备',
    description: '生成主角团、关系网和卷级职责分配',
    optional: false,
    canSkip: false,
    canGoBack: true,
    prerequisites: [WorkflowStage.MACRO_PLANNING],
    nextStage: WorkflowStage.VOLUME_STRATEGY,
    previousStage: WorkflowStage.MACRO_PLANNING,
    estimatedDuration: 20,
    icon: 'Users',
  },
  [WorkflowStage.VOLUME_STRATEGY]: {
    stage: WorkflowStage.VOLUME_STRATEGY,
    name: '卷战略',
    description: '规划分卷、卷级使命、升级节点和卷尾钩子',
    optional: false,
    canSkip: false,
    canGoBack: true,
    prerequisites: [WorkflowStage.CHARACTER_PREPARATION],
    nextStage: WorkflowStage.RHYTHM_BREAKDOWN,
    previousStage: WorkflowStage.CHARACTER_PREPARATION,
    estimatedDuration: 15,
    icon: 'BookOpen',
  },
  [WorkflowStage.RHYTHM_BREAKDOWN]: {
    stage: WorkflowStage.RHYTHM_BREAKDOWN,
    name: '节奏拆章',
    description: '将当前卷节奏落实成章节列表和单章细化',
    optional: false,
    canSkip: false,
    canGoBack: true,
    prerequisites: [WorkflowStage.VOLUME_STRATEGY],
    nextStage: WorkflowStage.CHAPTER_EXECUTION,
    previousStage: WorkflowStage.VOLUME_STRATEGY,
    estimatedDuration: 10,
    icon: 'List',
  },
  [WorkflowStage.CHAPTER_EXECUTION]: {
    stage: WorkflowStage.CHAPTER_EXECUTION,
    name: '章节执行',
    description: '逐章推进、审计和修复',
    optional: false,
    canSkip: false,
    canGoBack: true,
    prerequisites: [WorkflowStage.RHYTHM_BREAKDOWN],
    nextStage: undefined,
    previousStage: WorkflowStage.RHYTHM_BREAKDOWN,
    estimatedDuration: 60, // 每章约1小时
    icon: 'PenTool',
  },
}

// ============================================================================
// 阶段顺序
// ============================================================================

/**
 * 阶段执行顺序
 */
export const STAGE_ORDER: WorkflowStage[] = [
  WorkflowStage.INSPIRATION,
  WorkflowStage.PROJECT_SETTING,
  WorkflowStage.MACRO_PLANNING,
  WorkflowStage.CHARACTER_PREPARATION,
  WorkflowStage.VOLUME_STRATEGY,
  WorkflowStage.RHYTHM_BREAKDOWN,
  WorkflowStage.CHAPTER_EXECUTION,
]

// ============================================================================
// 状态转换规则
// ============================================================================

/**
 * 检查是否可以转换到目标阶段
 */
export function canTransitionTo(
  currentStage: WorkflowStage,
  targetStage: WorkflowStage,
  stagesState: Record<WorkflowStage, { status: string; data: unknown }>
): { canTransition: boolean; reason?: string } {
  const currentIndex = STAGE_ORDER.indexOf(currentStage)
  const targetIndex = STAGE_ORDER.indexOf(targetStage)

  // 目标阶段不存在
  if (targetIndex === -1) {
    return { canTransition: false, reason: '目标阶段不存在' }
  }

  // 当前阶段不存在
  if (currentIndex === -1) {
    return { canTransition: false, reason: '当前阶段不存在' }
  }

  // 检查目标阶段是否已完成（允许返回已完成的阶段）
  const targetState = stagesState[targetStage]
  if (targetState?.status === 'completed') {
    return { canTransition: true }
  }

  // 检查是否跳过阶段（只能前进到下一阶段或返回已完成阶段）
  const isForward = targetIndex > currentIndex
  if (isForward && targetIndex > currentIndex + 1) {
    // 检查中间阶段是否都已完成
    for (let i = currentIndex; i < targetIndex; i++) {
      const intermediateStage = STAGE_ORDER[i]
      const intermediateState = stagesState[intermediateStage]
      if (intermediateState?.status !== 'completed') {
        return { 
          canTransition: false, 
          reason: `请先完成"${STAGE_CONFIGS[intermediateStage].name}"阶段` 
        }
      }
    }
  }

  return { canTransition: true }
}

/**
 * 获取下一个阶段
 */
export function getNextStage(currentStage: WorkflowStage): WorkflowStage | undefined {
  return STAGE_CONFIGS[currentStage].nextStage
}

/**
 * 获取上一个阶段
 */
export function getPreviousStage(currentStage: WorkflowStage): WorkflowStage | undefined {
  return STAGE_CONFIGS[currentStage].previousStage
}

/**
 * 获取阶段进度百分比
 */
export function getStageProgress(stage: WorkflowStage): number {
  const index = STAGE_ORDER.indexOf(stage)
  if (index === -1) return 0
  return Math.round((index / (STAGE_ORDER.length - 1)) * 100)
}

/**
 * 获取阶段索引
 */
export function getStageIndex(stage: WorkflowStage): number {
  return STAGE_ORDER.indexOf(stage)
}

// ============================================================================
// 默认工作流配置
// ============================================================================

/**
 * 默认工作流配置
 */
export const DEFAULT_WORKFLOW_CONFIG: WorkflowConfig = {
  version: 1,
  stages: Object.values(STAGE_CONFIGS),
  defaultTimeout: 30000, // 30秒
  maxRetryCount: 3,
  autoSave: true,
  autoSaveInterval: 5000, // 5秒
}

// ============================================================================
// 持久化配置
// ============================================================================

/**
 * localStorage 键名
 */
export const STORAGE_KEYS = {
  WORKFLOW_STATE: 'story_workflow_state',
  WORKFLOW_VERSION: 'story_workflow_version',
  WORKFLOW_BACKUP: 'story_workflow_backup',
} as const

/**
 * 当前工作流版本（用于数据迁移）
 */
export const CURRENT_WORKFLOW_VERSION = 1

// ============================================================================
// 验证配置
// ============================================================================

/**
 * 阶段验证规则类型
 */
export interface StageValidationRule {
  requiredFields: string[]
  minLength?: Record<string, number>
  minItems?: Record<string, number>
}

/**
 * 阶段数据验证规则
 */
export const STAGE_VALIDATION_RULES: Record<WorkflowStage, StageValidationRule> = {
  [WorkflowStage.INSPIRATION]: {
    requiredFields: ['inspiration'],
    minLength: {
      inspiration: 10,
    },
  },
  [WorkflowStage.PROJECT_SETTING]: {
    requiredFields: ['title', 'genre', 'coreSellingPoint', 'targetReaderFeeling', 'first30ChaptersPromise'],
    minLength: {
      title: 2,
      coreSellingPoint: 10,
      targetReaderFeeling: 10,
      first30ChaptersPromise: 10,
    },
  },
  [WorkflowStage.MACRO_PLANNING]: {
    requiredFields: ['overallDirection', 'coreConflict', 'theme'],
    minLength: {
      overallDirection: 20,
      coreConflict: 10,
      theme: 2,
    },
    minItems: {
      upgradeNodes: 1,
    },
  },
  [WorkflowStage.CHARACTER_PREPARATION]: {
    requiredFields: [],
    minItems: {
      mainCharacters: 1,
    },
  },
  [WorkflowStage.VOLUME_STRATEGY]: {
    requiredFields: [],
    minItems: {
      volumes: 1,
    },
  },
  [WorkflowStage.RHYTHM_BREAKDOWN]: {
    requiredFields: [],
    minItems: {
      chapters: 1,
    },
  },
  [WorkflowStage.CHAPTER_EXECUTION]: {
    requiredFields: [],
  },
} as const

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取阶段显示名称
 */
export function getStageDisplayName(stage: WorkflowStage): string {
  return STAGE_CONFIGS[stage]?.name ?? stage
}

/**
 * 获取阶段描述
 */
export function getStageDescription(stage: WorkflowStage): string {
  return STAGE_CONFIGS[stage]?.description ?? ''
}

/**
 * 检查阶段是否可选
 */
export function isStageOptional(stage: WorkflowStage): boolean {
  return STAGE_CONFIGS[stage]?.optional ?? false
}

/**
 * 检查阶段是否可跳过
 */
export function canStageBeSkipped(stage: WorkflowStage): boolean {
  return STAGE_CONFIGS[stage]?.canSkip ?? false
}

/**
 * 检查阶段是否可回退
 */
export function canStageGoBack(stage: WorkflowStage): boolean {
  return STAGE_CONFIGS[stage]?.canGoBack ?? false
}

/**
 * 获取阶段估计完成时间
 */
export function getStageEstimatedDuration(stage: WorkflowStage): number {
  return STAGE_CONFIGS[stage]?.estimatedDuration ?? 0
}

/**
 * 获取所有阶段配置列表
 */
export function getAllStageConfigs(): StageConfig[] {
  return Object.values(STAGE_CONFIGS)
}
