import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../database/index.js'
import logger from '../utils/logger.js'

// 工作流阶段枚举
export enum WorkflowStage {
  INSPIRATION = 'inspiration',
  PROJECT_SETTING = 'project_setting',
  MACRO_PLANNING = 'macro_planning',
  CHARACTER_PREPARATION = 'character_preparation',
  VOLUME_STRATEGY = 'volume_strategy',
  RHYTHM_BREAKDOWN = 'rhythm_breakdown',
  CHAPTER_EXECUTION = 'chapter_execution',
}

// 阶段状态枚举
export enum StageStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

// 工作流状态接口
export interface WorkflowState {
  id: string
  novelId?: string
  currentStage: WorkflowStage
  stages: Record<string, StageState>
  version: number
  createdAt: string
  updatedAt: string
}

// 阶段状态接口
export interface StageState {
  stage: WorkflowStage
  status: StageStatus
  data: unknown
  startedAt?: string
  completedAt?: string
  error?: string
  retryCount: number
}

// 工作流快照接口
export interface WorkflowSnapshot {
  id: string
  workflowId: string
  version: number
  state: string // JSON string
  createdAt: string
}

// 数据库工作流记录
interface DatabaseWorkflow {
  id: string
  novel_id: string | null
  current_stage: string
  stages: string // JSON string
  version: number
  created_at: string
  updated_at: string
}

// 数据库快照记录
interface DatabaseSnapshot {
  id: string
  workflow_id: string
  version: number
  state: string
  created_at: string
}

// 保存工作流参数
interface SaveWorkflowParams {
  workflowId?: string
  novelId?: string
  state: WorkflowState
}

// 加载工作流参数
interface LoadWorkflowParams {
  workflowId?: string
  novelId?: string
}

// 列表查询参数
interface ListWorkflowsParams {
  page: number
  limit: number
  status?: string
}

/**
 * 工作流服务
 */
export const workflowService = {
  /**
   * 初始化工作流表
   */
  async initWorkflowTables(): Promise<void> {
    // 创建工作流状态表
    await run(`
      CREATE TABLE IF NOT EXISTS workflow_states (
        id TEXT PRIMARY KEY,
        novel_id TEXT,
        current_stage TEXT NOT NULL,
        stages TEXT NOT NULL,
        version INTEGER DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (novel_id) REFERENCES novels(id) ON DELETE CASCADE
      )
    `)

    // 创建工作流快照表
    await run(`
      CREATE TABLE IF NOT EXISTS workflow_snapshots (
        id TEXT PRIMARY KEY,
        workflow_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (workflow_id) REFERENCES workflow_states(id) ON DELETE CASCADE
      )
    `)

    logger.info('工作流表初始化完成')
  },

  /**
   * 保存工作流状态
   */
  async saveWorkflow(params: SaveWorkflowParams): Promise<{ workflowId: string; state: WorkflowState }> {
    const { workflowId, novelId, state } = params
    const now = new Date().toISOString()
    
    // 更新时间戳
    const updatedState: WorkflowState = {
      ...state,
      updatedAt: now
    }

    if (workflowId) {
      // 更新现有工作流
      const existing = await queryOne<DatabaseWorkflow>(
        'SELECT * FROM workflow_states WHERE id = ?',
        [workflowId]
      )

      if (!existing) {
        throw new Error(`工作流不存在: ${workflowId}`)
      }

      await run(
        `UPDATE workflow_states 
         SET current_stage = ?, stages = ?, version = ?, updated_at = ?, novel_id = ?
         WHERE id = ?`,
        [
          updatedState.currentStage,
          JSON.stringify(updatedState.stages),
          updatedState.version,
          now,
          novelId || existing.novel_id,
          workflowId
        ]
      )

      // 创建快照
      await this.createSnapshot(workflowId, updatedState)

      return { workflowId, state: updatedState }
    } else {
      // 创建新工作流
      const newWorkflowId = uuidv4()
      const newState: WorkflowState = {
        ...updatedState,
        id: newWorkflowId,
        novelId,
        createdAt: now,
        updatedAt: now
      }

      await run(
        `INSERT INTO workflow_states (id, novel_id, current_stage, stages, version, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          newWorkflowId,
          novelId || null,
          newState.currentStage,
          JSON.stringify(newState.stages),
          newState.version,
          now,
          now
        ]
      )

      // 创建初始快照
      await this.createSnapshot(newWorkflowId, newState)

      return { workflowId: newWorkflowId, state: newState }
    }
  },

  /**
   * 加载工作流状态
   */
  async loadWorkflow(params: LoadWorkflowParams): Promise<WorkflowState | null> {
    const { workflowId, novelId } = params

    let dbWorkflow: DatabaseWorkflow | undefined

    if (workflowId) {
      dbWorkflow = await queryOne<DatabaseWorkflow>(
        'SELECT * FROM workflow_states WHERE id = ?',
        [workflowId]
      )
    } else if (novelId) {
      dbWorkflow = await queryOne<DatabaseWorkflow>(
        'SELECT * FROM workflow_states WHERE novel_id = ?',
        [novelId]
      )
    }

    if (!dbWorkflow) {
      return null
    }

    return {
      id: dbWorkflow.id,
      novelId: dbWorkflow.novel_id || undefined,
      currentStage: dbWorkflow.current_stage as WorkflowStage,
      stages: JSON.parse(dbWorkflow.stages),
      version: dbWorkflow.version,
      createdAt: dbWorkflow.created_at,
      updatedAt: dbWorkflow.updated_at
    }
  },

  /**
   * 清除工作流状态
   */
  async clearWorkflow(params: LoadWorkflowParams): Promise<boolean> {
    const { workflowId, novelId } = params

    let result: { changes: number }

    if (workflowId) {
      // 先删除快照
      await run('DELETE FROM workflow_snapshots WHERE workflow_id = ?', [workflowId])
      result = await run('DELETE FROM workflow_states WHERE id = ?', [workflowId])
    } else if (novelId) {
      // 先获取工作流ID
      const workflow = await queryOne<DatabaseWorkflow>(
        'SELECT id FROM workflow_states WHERE novel_id = ?',
        [novelId]
      )
      if (workflow) {
        await run('DELETE FROM workflow_snapshots WHERE workflow_id = ?', [workflow.id])
      }
      result = await run('DELETE FROM workflow_states WHERE novel_id = ?', [novelId])
    } else {
      return false
    }

    return result.changes > 0
  },

  /**
   * 创建工作流快照
   */
  async createSnapshot(workflowId: string, state: WorkflowState): Promise<WorkflowSnapshot> {
    const snapshotId = uuidv4()
    const now = new Date().toISOString()

    await run(
      `INSERT INTO workflow_snapshots (id, workflow_id, version, state, created_at)
       VALUES (?, ?, ?, ?, ?)`,
      [snapshotId, workflowId, state.version, JSON.stringify(state), now]
    )

    return {
      id: snapshotId,
      workflowId,
      version: state.version,
      state: JSON.stringify(state),
      createdAt: now
    }
  },

  /**
   * 获取工作流快照列表
   */
  async getWorkflowSnapshots(workflowId: string): Promise<WorkflowSnapshot[]> {
    const snapshots = await query<DatabaseSnapshot>(
      `SELECT * FROM workflow_snapshots 
       WHERE workflow_id = ? 
       ORDER BY created_at DESC 
       LIMIT 50`,
      [workflowId]
    )

    return snapshots.map(s => ({
      id: s.id,
      workflowId: s.workflow_id,
      version: s.version,
      state: s.state,
      createdAt: s.created_at
    }))
  },

  /**
   * 恢复工作流到指定快照
   */
  async restoreWorkflow(workflowId: string, snapshotId: string): Promise<WorkflowState> {
    const snapshot = await queryOne<DatabaseSnapshot>(
      'SELECT * FROM workflow_snapshots WHERE id = ? AND workflow_id = ?',
      [snapshotId, workflowId]
    )

    if (!snapshot) {
      throw new Error(`快照不存在: ${snapshotId}`)
    }

    const state: WorkflowState = JSON.parse(snapshot.state)
    const now = new Date().toISOString()

    // 更新工作流状态
    await run(
      `UPDATE workflow_states 
       SET current_stage = ?, stages = ?, version = ?, updated_at = ?
       WHERE id = ?`,
      [
        state.currentStage,
        JSON.stringify(state.stages),
        state.version,
        now,
        workflowId
      ]
    )

    // 创建恢复快照
    await this.createSnapshot(workflowId, {
      ...state,
      updatedAt: now
    })

    return state
  },

  /**
   * 获取工作流列表
   */
  async listWorkflows(params: ListWorkflowsParams): Promise<{
    data: WorkflowState[]
    total: number
    page: number
    limit: number
  }> {
    const { page, limit, status } = params
    const offset = (page - 1) * limit

    let whereClause = ''
    const queryParams: unknown[] = []

    if (status) {
      whereClause = 'WHERE current_stage = ?'
      queryParams.push(status)
    }

    // 获取总数
    const countResult = await queryOne<{ count: number }>(
      `SELECT COUNT(*) as count FROM workflow_states ${whereClause}`,
      queryParams
    )
    const total = countResult?.count || 0

    // 获取列表
    const workflows = await query<DatabaseWorkflow>(
      `SELECT * FROM workflow_states ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`,
      [...queryParams, limit, offset]
    )

    return {
      data: workflows.map(w => ({
        id: w.id,
        novelId: w.novel_id || undefined,
        currentStage: w.current_stage as WorkflowStage,
        stages: JSON.parse(w.stages),
        version: w.version,
        createdAt: w.created_at,
        updatedAt: w.updated_at
      })),
      total,
      page,
      limit
    }
  },

  /**
   * 创建初始工作流状态
   */
  createInitialWorkflowState(): WorkflowState {
    const now = new Date().toISOString()
    const initialStages: Record<string, StageState> = {}

    // 初始化所有阶段状态
    Object.values(WorkflowStage).forEach(stage => {
      initialStages[stage] = {
        stage,
        status: StageStatus.PENDING,
        data: null,
        retryCount: 0
      }
    })

    return {
      id: uuidv4(),
      currentStage: WorkflowStage.INSPIRATION,
      stages: initialStages,
      version: 1,
      createdAt: now,
      updatedAt: now
    }
  },

  /**
   * 更新阶段状态
   */
  async updateStageStatus(
    workflowId: string,
    stage: WorkflowStage,
    status: StageStatus,
    data?: unknown
  ): Promise<WorkflowState> {
    const workflow = await this.loadWorkflow({ workflowId })

    if (!workflow) {
      throw new Error(`工作流不存在: ${workflowId}`)
    }

    const now = new Date().toISOString()
    const stages = { ...workflow.stages }

    stages[stage] = {
      ...stages[stage],
      status,
      data: data !== undefined ? data : stages[stage].data,
      startedAt: status === StageStatus.IN_PROGRESS ? now : stages[stage].startedAt,
      completedAt: status === StageStatus.COMPLETED ? now : stages[stage].completedAt,
      retryCount: status === StageStatus.IN_PROGRESS ? stages[stage].retryCount + 1 : stages[stage].retryCount
    }

    // 如果阶段完成，自动切换到下一阶段
    let currentStage = workflow.currentStage
    if (status === StageStatus.COMPLETED) {
      currentStage = this.getNextStage(stage) || currentStage
    }

    const updatedState: WorkflowState = {
      ...workflow,
      currentStage,
      stages,
      updatedAt: now
    }

    return (await this.saveWorkflow({ workflowId, state: updatedState })).state
  },

  /**
   * 获取下一个阶段
   */
  getNextStage(currentStage: WorkflowStage): WorkflowStage | null {
    const stageOrder = [
      WorkflowStage.INSPIRATION,
      WorkflowStage.PROJECT_SETTING,
      WorkflowStage.MACRO_PLANNING,
      WorkflowStage.CHARACTER_PREPARATION,
      WorkflowStage.VOLUME_STRATEGY,
      WorkflowStage.RHYTHM_BREAKDOWN,
      WorkflowStage.CHAPTER_EXECUTION,
    ]

    const currentIndex = stageOrder.indexOf(currentStage)
    if (currentIndex < stageOrder.length - 1) {
      return stageOrder[currentIndex + 1]
    }
    return null
  },

  /**
   * 获取上一个阶段
   */
  getPreviousStage(currentStage: WorkflowStage): WorkflowStage | null {
    const stageOrder = [
      WorkflowStage.INSPIRATION,
      WorkflowStage.PROJECT_SETTING,
      WorkflowStage.MACRO_PLANNING,
      WorkflowStage.CHARACTER_PREPARATION,
      WorkflowStage.VOLUME_STRATEGY,
      WorkflowStage.RHYTHM_BREAKDOWN,
      WorkflowStage.CHAPTER_EXECUTION,
    ]

    const currentIndex = stageOrder.indexOf(currentStage)
    if (currentIndex > 0) {
      return stageOrder[currentIndex - 1]
    }
    return null
  }
}

export default workflowService
