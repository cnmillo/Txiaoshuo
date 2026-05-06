// 回顾分析相关类型

export interface ConsistencySection {
  score: number
  issues: string[]
}

export interface ReviewReportData {
  id: string
  consistencyScore: number
  characterConsistency: ConsistencySection
  plotConsistency: ConsistencySection
  styleConsistency: ConsistencySection
  pacing: ConsistencySection
  suggestions: string[]
  createdAt: string
  wordCount: number
}

export interface ReviewCriteria {
  id: string
  novelId: string
  name: string
  description: string
  type: string
  threshold: number
  createdAt: string
  updatedAt: string
}
