// 质量提升相关类型

export interface QualityTask {
  id: string
  novelId: string
  type: 'plot_check' | 'detail_enhance' | 'ending_improve' | 'proofread'
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  result?: string
  error?: string
  createdAt: string
  updatedAt: string
}

export interface QualityResult {
  id: string
  taskId?: string
  novelId: string
  type: string
  result?: string
  suggestions?: string[]
  issues?: string[]
  score?: number
  originalContent?: string
  improvedContent?: string
  createdAt: string
}
