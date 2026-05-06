import { useState, useEffect, useCallback } from 'react'
import { getStyleGuide } from '../services/api'
import Loading from './Loading'

interface StyleGuideProps {
  templateId: string
  styleId?: string
  className?: string
}

interface StyleGuideData {
  templateName: string
  structureGuide: string[]
  writingTips: string[]
  styleSuggestions: string[]
  examples: string[]
}

export default function StyleGuide({
  templateId,
  styleId,
  className = ''
}: StyleGuideProps) {
  const [styleGuide, setStyleGuide] = useState<StyleGuideData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  // 加载风格指南
  const loadStyleGuide = useCallback(async () => {
    try {
      setLoading(true)
      setError('')
      const guide = await getStyleGuide(templateId, styleId)
      setStyleGuide(guide)
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载风格指南失败')
    } finally {
      setLoading(false)
    }
  }, [templateId, styleId])

  useEffect(() => {
    if (templateId) {
      loadStyleGuide()
    }
  }, [loadStyleGuide, templateId])

  if (loading) {
    return <Loading message="生成风格指南..." />
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadStyleGuide}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          重试
        </button>
      </div>
    )
  }

  if (!styleGuide) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-gray-600">请选择一个模板以生成风格指南</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      <h3 className="text-lg font-medium text-gray-900">{styleGuide.templateName} - 风格指南</h3>

      {/* 结构指南 */}
      {styleGuide.structureGuide && styleGuide.structureGuide.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">结构指南</h4>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
            <pre className="text-xs text-gray-700 whitespace-pre-wrap">
              {styleGuide.structureGuide.join('\n')}
            </pre>
          </div>
        </div>
      )}

      {/* 写作技巧 */}
      {styleGuide.writingTips && styleGuide.writingTips.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">写作技巧</h4>
          <ul className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
            {styleGuide.writingTips.map((tip: string, index: number) => (
              <li key={index} className="text-xs text-gray-700 flex items-start">
                <span className="inline-block w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-center leading-4 mr-2 flex-shrink-0">
                  {index + 1}
                </span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 风格建议 */}
      {styleGuide.styleSuggestions && styleGuide.styleSuggestions.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">风格建议</h4>
          <ul className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-1">
            {styleGuide.styleSuggestions.map((suggestion: string, index: number) => (
              <li key={index} className="text-xs text-gray-700 flex items-start">
                <span className="inline-block w-4 h-4 rounded-full bg-green-100 text-green-700 text-center leading-4 mr-2 flex-shrink-0">
                  {index + 1}
                </span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 示例 */}
      {styleGuide.examples && styleGuide.examples.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">写作示例</h4>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            {styleGuide.examples.map((example: string, index: number) => (
              <div key={index} className="text-xs text-gray-700">
                <p className="font-medium mb-1">示例 {index + 1}:</p>
                <p className="whitespace-pre-wrap">{example}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
