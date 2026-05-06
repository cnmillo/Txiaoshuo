/**
 * 工作流类型导出
 * 
 * 统一导出所有工作流相关的类型定义
 */

// 枚举类型
export {
  WorkflowStage,
  StageStatus,
  WorkflowEventType,
} from '../workflow'

// 阶段数据类型
export type {
  InspirationStageData,
  ProjectSettingStageData,
  MacroPlanningStageData,
  CharacterPreparationStageData,
  VolumeStrategyStageData,
  RhythmBreakdownStageData,
  ChapterExecutionStageData,
  UpgradeNode,
  LongTermPromise,
  VolumeResponsibility,
  Volume,
  ChapterOutline,
  GeneratedChapter,
  AuditResult,
  AuditIssue,
} from '../workflow'

// 工作流状态类型
export type {
  StageState,
  StageDataMap,
  WorkflowState,
  StageTransitionResult,
  WorkflowSnapshot,
  StageValidationResult,
} from '../workflow'

// 配置类型
export type {
  StageConfig,
  WorkflowConfig,
} from '../workflow'

// 事件类型
export type {
  WorkflowEvent,
} from '../workflow'

// 工具类型
export type {
  ExtractStageData,
  AnyStageData,
  WorkflowStateUpdater,
  StageDataUpdater,
} from '../workflow'
