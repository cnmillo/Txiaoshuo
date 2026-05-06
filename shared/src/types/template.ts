// 写作模板相关类型

export interface Template {
  id: string
  name: string
  description?: string
  type?: string
  isDefault?: boolean
  content?: string
  createdAt?: string
  updatedAt?: string
}

export interface TemplateFilter {
  type?: string
  search?: string
}

export interface StyleGuideData {
  templateName: string
  structureGuide: string[]
  writingTips: string[]
  styleSuggestions: string[]
  examples: string[]
}
