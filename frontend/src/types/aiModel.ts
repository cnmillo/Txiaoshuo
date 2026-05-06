export interface AIModel {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  modelId: string
  isActive?: boolean
  testStatus?: 'success' | 'failed' | 'pending'
  lastTestAt?: string
  latency?: number
  createdAt?: string
  updatedAt?: string
}

export interface AIModelFormData {
  name: string
  baseUrl: string
  apiKey: string
  modelId: string
}

export interface AIModelTestResult {
  success: boolean
  message: string
  latency?: number
}
