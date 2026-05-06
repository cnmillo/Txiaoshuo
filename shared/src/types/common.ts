// 通用配置类型

export interface FeatureOption {
  id: string
  name: string
  description: string
}

export interface IntensityLevel {
  value: 'light' | 'medium' | 'strong' | 'auto'
  label: string
  description: string
}

export interface GenreOption {
  value: string
  label: string
}

export interface ChapterVersion {
  id: string
  chapterId: string
  version: number
  content: string
  description: string
  createdBy?: string
  createdAt: string
}

export interface ConsistencyCheck {
  id: string
  novelId: string
  chapterId?: string
  checkType: string
  result: string
  score: number
  issues: string
  createdAt: string
}

// ============================================================================
// 审计相关枚举类型
// ============================================================================

/**
 * 审计问题类型枚举
 */
export type AuditIssueType =
  | 'character_consistency'
  | 'pacing'
  | 'dialogue'
  | 'plot_hole'
  | 'style'
  | 'grammar'

/**
 * 问题严重程度枚举
 */
export type IssueSeverity = 'low' | 'medium' | 'high' | 'critical'

/**
 * 修复状态枚举
 */
export type FixStatus = 'pending' | 'fixed' | 'ignored' | 'in_progress'
