/**
 * 写法预览组件
 *
 * 预览写法资产的应用效果
 */

import React, { useState } from 'react'
import type { WritingStyleAsset } from '@shared/types'

interface WritingStylePreviewProps {
  asset?: WritingStyleAsset | null
  sampleText?: string
  onApply?: (result: string) => void
}

export const WritingStylePreview: React.FC<WritingStylePreviewProps> = ({
  asset,
  sampleText: initialSampleText = '',
  onApply,
}) => {
  const [sampleText, setSampleText] = useState(initialSampleText)
  const [intensity, setIntensity] = useState<'light' | 'medium' | 'strong'>('medium')
  const [previewResult, setPreviewResult] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)

  // 生成预览
  const handleGeneratePreview = async () => {
    if (!asset) {
      alert('请先选择写法资产')
      return
    }

    if (!sampleText.trim()) {
      alert('请输入示例文本')
      return
    }

    setIsGenerating(true)
    setPreviewResult('')

    try {
      // 这里应该调用后端API生成预览
      // 模拟API调用
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // 模拟生成结果
      const mockResult = `【应用写法资产：${asset.name}】\n\n${sampleText}\n\n[这是模拟的预览结果，实际应用时会根据写法特征调整文本风格]`

      setPreviewResult(mockResult)
    } catch (error) {
      console.error('生成预览失败:', error)
      alert('生成预览失败，请重试')
    } finally {
      setIsGenerating(false)
    }
  }

  // 应用结果
  const handleApply = () => {
    if (previewResult && onApply) {
      onApply(previewResult)
    }
  }

  // 复制结果
  const handleCopy = () => {
    if (previewResult) {
      navigator.clipboard.writeText(previewResult)
      alert('已复制到剪贴板')
    }
  }

  return (
    <div className="writing-style-preview">
      {/* 写法资产信息 */}
      {asset && (
        <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-2">{asset.name}</h2>
          <p className="text-sm text-gray-600 mb-4">{asset.description}</p>

          {/* 特征标签 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {asset.styleTags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* 特征数量 */}
          <div className="text-sm text-gray-500">
            包含 {asset.featurePool.length} 个写法特征
          </div>
        </div>
      )}

      {/* 输入区域 */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <h3 className="text-md font-semibold mb-4">示例文本</h3>

        <div className="mb-4">
          <textarea
            value={sampleText}
            onChange={(e) => setSampleText(e.target.value)}
            rows={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="输入示例文本，预览写法应用效果..."
          />
          <p className="mt-1 text-sm text-gray-500">
            当前字数: {sampleText.length}
          </p>
        </div>

        {/* 应用强度 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            应用强度
          </label>
          <div className="flex gap-2">
            {(['light', 'medium', 'strong'] as const).map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => setIntensity(level)}
                className={`flex-1 px-4 py-2 text-sm rounded-lg ${
                  intensity === level
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {level === 'light' ? '轻度' : level === 'medium' ? '中度' : '强度'}
              </button>
            ))}
          </div>
        </div>

        {/* 生成按钮 */}
        <button
          onClick={handleGeneratePreview}
          disabled={isGenerating || !asset || !sampleText.trim()}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              生成预览中...
            </span>
          ) : (
            '生成预览'
          )}
        </button>
      </div>

      {/* 预览结果 */}
      {previewResult && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-md font-semibold">预览结果</h3>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                复制
              </button>
              {onApply && (
                <button
                  onClick={handleApply}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  应用
                </button>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-800 font-sans">
              {previewResult}
            </pre>
          </div>

          {/* 变化说明 */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">应用说明</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• 应用强度: {intensity === 'light' ? '轻度' : intensity === 'medium' ? '中度' : '强度'}</li>
              <li>• 写法特征已应用到文本中</li>
              <li>• 实际应用时会根据AI模型生成更自然的结果</li>
            </ul>
          </div>
        </div>
      )}

      {/* 未选择资产提示 */}
      {!asset && (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400 mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="text-gray-600">请先选择一个写法资产</p>
        </div>
      )}
    </div>
  )
}

export default WritingStylePreview
