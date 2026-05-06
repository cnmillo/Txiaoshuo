import { useState, useEffect } from 'react'
import { Check } from 'lucide-react'
import { getTemplates } from '../services/api'
import Loading from './Loading'

interface TemplateSelectorProps {
  value?: string
  onChange?: (templateId: string) => void
  className?: string
}

interface Template {
  id: string
  name: string
  description?: string
  isDefault?: boolean
}

export default function TemplateSelector({
  value,
  onChange,
  className = ''
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(value || '')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // 加载模板数据
  useEffect(() => {
    loadTemplates()
  }, [])

  // 同步外部 value
  useEffect(() => {
    if (value !== undefined) {
      setSelectedTemplateId(value)
    }
  }, [value])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      setError('')
      const response = await getTemplates()
      setTemplates(response?.items || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载模板数据失败')
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }

  // 处理模板选择
  const handleTemplateSelect = (template: Template) => {
    setSelectedTemplateId(template.id)
    onChange?.(template.id)
  }

  if (loading) {
    return <Loading message="加载模板配置..." />
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadTemplates}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          重试
        </button>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-700">选择写作模板</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {templates.map(template => (
          <button
            key={template.id}
            type="button"
            onClick={() => handleTemplateSelect(template)}
            className={`relative p-4 text-left rounded-lg border transition-all ${
              selectedTemplateId === template.id
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
            }`}
          >
            {selectedTemplateId === template.id && (
              <Check className="absolute top-2 right-2 w-4 h-4 text-primary-600" />
            )}
            <div className="font-medium text-sm">{template.name}</div>
            {template.description && (
              <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                {template.description}
              </div>
            )}
            {template.isDefault && (
              <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">
                默认
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
