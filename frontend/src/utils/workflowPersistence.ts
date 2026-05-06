/**
 * 工作流持久化工具函数
 * 
 * 提供工作流状态的持久化、恢复和迁移功能
 */

import {
  type WorkflowState,
  type WorkflowSnapshot,
  StageStatus,
  WorkflowStage,
} from '../types/workflow'
import {
  STORAGE_KEYS,
  CURRENT_WORKFLOW_VERSION,
} from '../config/workflowConfig'

// ============================================================================
// 存储操作
// ============================================================================

/**
 * 保存工作流状态到 localStorage
 */
export function saveWorkflowState(state: WorkflowState): boolean {
  try {
    const snapshot: WorkflowSnapshot = {
      version: CURRENT_WORKFLOW_VERSION,
      state,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEYS.WORKFLOW_STATE, JSON.stringify(snapshot))
    localStorage.setItem(STORAGE_KEYS.WORKFLOW_VERSION, String(CURRENT_WORKFLOW_VERSION))
    return true
  } catch (error) {
    console.error('保存工作流状态失败:', error)
    return false
  }
}

/**
 * 从 localStorage 加载工作流状态
 */
export function loadWorkflowState(): WorkflowState | null {
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
export function clearWorkflowState(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.WORKFLOW_STATE)
    localStorage.removeItem(STORAGE_KEYS.WORKFLOW_VERSION)
  } catch (error) {
    console.error('清除工作流状态失败:', error)
  }
}

/**
 * 检查是否有保存的工作流状态
 */
export function hasStoredWorkflow(): boolean {
  return localStorage.getItem(STORAGE_KEYS.WORKFLOW_STATE) !== null
}

// ============================================================================
// 备份操作
// ============================================================================

/**
 * 创建工作流备份
 */
export function createWorkflowBackup(state: WorkflowState): boolean {
  try {
    const snapshot: WorkflowSnapshot = {
      version: CURRENT_WORKFLOW_VERSION,
      state,
      timestamp: new Date().toISOString(),
    }
    localStorage.setItem(STORAGE_KEYS.WORKFLOW_BACKUP, JSON.stringify(snapshot))
    return true
  } catch (error) {
    console.error('创建工作流备份失败:', error)
    return false
  }
}

/**
 * 加载工作流备份
 */
export function loadWorkflowBackup(): WorkflowState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.WORKFLOW_BACKUP)
    if (!stored) return null

    const snapshot: WorkflowSnapshot = JSON.parse(stored)
    return snapshot.state
  } catch (error) {
    console.error('加载工作流备份失败:', error)
    return null
  }
}

/**
 * 清除工作流备份
 */
export function clearWorkflowBackup(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.WORKFLOW_BACKUP)
  } catch (error) {
    console.error('清除工作流备份失败:', error)
  }
}

// ============================================================================
// 版本迁移
// ============================================================================

/**
 * 工作流状态迁移函数映射
 */
const MIGRATION_FUNCTIONS: Record<number, (state: WorkflowState) => WorkflowState> = {
  // 未来版本迁移示例：
  // 2: (state) => ({ ...state, newField: 'default' }),
}

/**
 * 迁移工作流状态到当前版本
 */
export function migrateWorkflowState(
  state: WorkflowState,
  fromVersion: number
): WorkflowState {
  let migratedState = state

  // 依次应用每个版本的迁移
  for (let version = fromVersion + 1; version <= CURRENT_WORKFLOW_VERSION; version++) {
    const migrationFn = MIGRATION_FUNCTIONS[version]
    if (migrationFn) {
      console.log(`应用工作流状态迁移: v${version - 1} -> v${version}`)
      migratedState = migrationFn(migratedState)
    }
  }

  return {
    ...migratedState,
    version: CURRENT_WORKFLOW_VERSION,
  }
}

// ============================================================================
// 数据导出/导入
// ============================================================================

/**
 * 导出工作流状态为 JSON 字符串
 */
export function exportWorkflowState(state: WorkflowState): string {
  const snapshot: WorkflowSnapshot = {
    version: CURRENT_WORKFLOW_VERSION,
    state,
    timestamp: new Date().toISOString(),
  }
  return JSON.stringify(snapshot, null, 2)
}

/**
 * 从 JSON 字符串导入工作流状态
 */
export function importWorkflowState(jsonString: string): WorkflowState | null {
  try {
    const snapshot: WorkflowSnapshot = JSON.parse(jsonString)
    
    // 验证基本结构
    if (!snapshot.version || !snapshot.state) {
      throw new Error('无效的工作流状态格式')
    }

    // 迁移版本
    if (snapshot.version < CURRENT_WORKFLOW_VERSION) {
      return migrateWorkflowState(snapshot.state, snapshot.version)
    }

    return snapshot.state
  } catch (error) {
    console.error('导入工作流状态失败:', error)
    return null
  }
}

/**
 * 下载工作流状态为文件
 */
export function downloadWorkflowState(state: WorkflowState, filename?: string): void {
  const json = exportWorkflowState(state)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  
  const link = document.createElement('a')
  link.href = url
  link.download = filename || `workflow_${state.id}_${Date.now()}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  
  URL.revokeObjectURL(url)
}

/**
 * 从文件读取工作流状态
 */
export function readWorkflowFromFile(file: File): Promise<WorkflowState | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    
    reader.onload = (event) => {
      const content = event.target?.result as string
      const state = importWorkflowState(content)
      resolve(state)
    }
    
    reader.onerror = () => {
      console.error('读取文件失败')
      resolve(null)
    }
    
    reader.readAsText(file)
  })
}

// ============================================================================
// 状态验证
// ============================================================================

/**
 * 验证工作流状态完整性
 */
export function validateWorkflowState(state: WorkflowState): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 检查必需字段
  if (!state.id) {
    errors.push('缺少工作流ID')
  }

  if (!state.currentStage) {
    errors.push('缺少当前阶段')
  }

  if (!state.stages || Object.keys(state.stages).length === 0) {
    errors.push('缺少阶段状态')
  }

  // 检查阶段状态完整性
  const requiredStages = Object.values(WorkflowStage)
  for (const stage of requiredStages) {
    if (!state.stages[stage]) {
      errors.push(`缺少阶段状态: ${stage}`)
    }
  }

  // 检查时间戳
  if (!state.createdAt) {
    errors.push('缺少创建时间')
  }

  if (!state.updatedAt) {
    errors.push('缺少更新时间')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

/**
 * 修复工作流状态
 */
export function repairWorkflowState(state: WorkflowState): WorkflowState {
  const now = new Date().toISOString()
  
  return {
    ...state,
    id: state.id || `workflow_${Date.now()}`,
    currentStage: state.currentStage || WorkflowStage.INSPIRATION,
    version: state.version || CURRENT_WORKFLOW_VERSION,
    createdAt: state.createdAt || now,
    updatedAt: state.updatedAt || now,
    stages: state.stages || createDefaultStages(),
  }
}

/**
 * 创建默认阶段状态
 */
function createDefaultStages(): Record<WorkflowStage, ReturnType<typeof createDefaultStageState>> {
  const stages = {} as Record<WorkflowStage, ReturnType<typeof createDefaultStageState>>
  
  Object.values(WorkflowStage).forEach((stage) => {
    stages[stage] = createDefaultStageState(stage)
  })
  
  return stages
}

/**
 * 创建默认阶段状态
 */
function createDefaultStageState(stage: WorkflowStage) {
  return {
    stage,
    status: StageStatus.PENDING,
    data: null,
    retryCount: 0,
  }
}

// ============================================================================
// 存储空间管理
// ============================================================================

/**
 * 获取工作流存储使用情况
 */
export function getStorageUsage(): {
  used: number
  available: number
  percentage: number
} {
  try {
    let used = 0
    
    for (const key of Object.values(STORAGE_KEYS)) {
      const item = localStorage.getItem(key)
      if (item) {
        used += item.length * 2 // UTF-16 编码，每字符2字节
      }
    }

    // localStorage 通常限制为 5MB
    const available = 5 * 1024 * 1024
    
    return {
      used,
      available,
      percentage: (used / available) * 100,
    }
  } catch (error) {
    console.error('获取存储使用情况失败:', error)
    return {
      used: 0,
      available: 5 * 1024 * 1024,
      percentage: 0,
    }
  }
}

/**
 * 清理过期的工作流数据
 */
export function cleanupExpiredData(maxAge: number = 30 * 24 * 60 * 60 * 1000): void {
  try {
    const backup = localStorage.getItem(STORAGE_KEYS.WORKFLOW_BACKUP)
    if (backup) {
      const snapshot: WorkflowSnapshot = JSON.parse(backup)
      const backupTime = new Date(snapshot.timestamp).getTime()
      const now = Date.now()
      
      if (now - backupTime > maxAge) {
        clearWorkflowBackup()
        console.log('已清理过期的备份数据')
      }
    }
  } catch (error) {
    console.error('清理过期数据失败:', error)
  }
}
