/**
 * 特征提取组件
 *
 * 从参考文本中提取写法特征
 */

import React, { useState } from 'react'
import { useWritingStyleStore } from '../../stores/writingStyleStore'
import type { WritingStyleFeature, ExtractFeaturesRequest } from '@shared/types'

interface FeatureExtractorProps {
  onExtracted?: (features: WritingStyleFeature[]) => void
  initialText?: string
}

export const FeatureExtractor: React.FC<FeatureExtractorProps> = ({
  onExtracted,
  initialText = '',
}) => {
  const [text, setText] = useState(initialText)
  const [extractedFeatures, setExtractedFeatures] = useState<WritingStyleFeature[]>([])
  const [selectedFeatures, setSelectedFeatures] = useState<Set<number>>(new Set())
  const [extractOptions, setExtractOptions] = useState({
    extractSentence: true,
    extractVocabulary: true,
    extractEmotion: true,
    extractRhythm: true,
    extractPerspective: true,
  })

  const { extractFeatures, addToFeaturePool, isLoading } = useWritingStyleStore()

  // 提取特征
  const handleExtract = async () => {
    if (!text.trim()) {
      alert('请输入参考文本')
      return
    }

    try {
      const request: ExtractFeaturesRequest = {
        text: text.trim(),
        options: extractOptions,
      }

      const response = await extractFeatures(request)
      setExtractedFeatures(response.result.features)
      setSelectedFeatures(new Set(response.result.features.map((_, i) => i)))

      if (onExtracted) {
        onExtracted(response.result.features)
      }
    } catch (error) {
      console.error('特征提取失败:', error)
    }
  }

  // 切换特征选择
  const toggleFeatureSelection = (index: number) => {
    const newSelected = new Set(selectedFeatures)
    if (newSelected.has(index)) {
      newSelected.delete(index)
    } else {
      newSelected.add(index)
    }
    setSelectedFeatures(newSelected)
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedFeatures.size === extractedFeatures.length) {
      setSelectedFeatures(new Set())
    } else {
      setSelectedFeatures(new Set(extractedFeatures.map((_, i) => i)))
    }
  }

  // 添加选中的特征到特征池
  const handleAddToPool = () => {
    extractedFeatures.forEach((feature, index) => {
      if (selectedFeatures.has(index)) {
        addToFeaturePool(feature, 'extracted')
      }
    })

    // 清空
    setExtractedFeatures([])
    setSelectedFeatures(new Set())
    setText('')
  }

  // 渲染特征详情
  const renderFeatureDetail = (feature: WritingStyleFeature) => {
    switch (feature.type) {
      case 'sentence':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">长短句比例:</span>
              <span>长句 {(feature.longSentenceRatio * 100).toFixed(1)}% / 短句 {(feature.shortSentenceRatio * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">平均句子长度:</span>
              <span>{feature.averageSentenceLength.toFixed(1)} 字</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">句式多样性:</span>
              <span>{feature.sentenceVariety.toFixed(1)}%</span>
            </div>
          </div>
        )

      case 'vocabulary':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">词汇丰富度:</span>
              <span>{feature.vocabularyRichness.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">古典/现代词汇:</span>
              <span>{(feature.classicalRatio * 100).toFixed(1)}% / {(feature.modernRatio * 100).toFixed(1)}%</span>
            </div>
            {feature.frequentWords.length > 0 && (
              <div>
                <span className="text-gray-600">常用词:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {feature.frequentWords.slice(0, 5).map((word, i) => (
                    <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs">
                      {word.word} ({word.frequency})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )

      case 'emotion':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">情感基调:</span>
              <span className="capitalize">{feature.emotionalTone}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">情感强度:</span>
              <span>{feature.emotionalIntensity.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">表达方式:</span>
              <span className="capitalize">{feature.expressionStyle}</span>
            </div>
          </div>
        )

      case 'rhythm':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">整体节奏:</span>
              <span className="capitalize">{feature.overallPacing}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">平均段落长度:</span>
              <span>{feature.paragraphRhythm.averageParagraphLength.toFixed(1)} 字</span>
            </div>
          </div>
        )

      case 'perspective':
        return (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">主要视角:</span>
              <span className="capitalize">{feature.primaryPerspective.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">视角切换:</span>
              <span>{feature.perspectiveSwitching ? '是' : '否'}</span>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="feature-extractor">
      {/* 输入区域 */}
      <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
        <h2 className="text-lg font-semibold mb-4">特征提取</h2>
        <p className="text-sm text-gray-600 mb-4">
          输入参考文本，系统将自动提取写法特征
        </p>

        {/* 文本输入 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            参考文本
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="粘贴参考文本，建议至少500字以获得更准确的提取结果..."
          />
          <p className="mt-1 text-sm text-gray-500">
            当前字数: {text.length}
          </p>
        </div>

        {/* 提取选项 */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            提取选项
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {Object.entries(extractOptions).map(([key, value]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setExtractOptions({ ...extractOptions, [key]: e.target.checked })
                  }
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">
                  {key.replace('extract', '').replace(/([A-Z])/g, ' $1').trim()}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* 提取按钮 */}
        <button
          onClick={handleExtract}
          disabled={isLoading || !text.trim()}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              提取中...
            </span>
          ) : (
            '开始提取'
          )}
        </button>
      </div>

      {/* 提取结果 */}
      {extractedFeatures.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">提取结果</h2>
            <div className="flex gap-2">
              <button
                onClick={toggleSelectAll}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {selectedFeatures.size === extractedFeatures.length ? '取消全选' : '全选'}
              </button>
              <button
                onClick={handleAddToPool}
                disabled={selectedFeatures.size === 0}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                添加到特征池 ({selectedFeatures.size})
              </button>
            </div>
          </div>

          {/* 特征列表 */}
          <div className="space-y-4">
            {extractedFeatures.map((feature, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 transition-colors ${
                  selectedFeatures.has(index)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedFeatures.has(index)}
                    onChange={() => toggleFeatureSelection(index)}
                    className="mt-1 rounded border-gray-300"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                        {feature.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{feature.description}</p>
                    {renderFeatureDetail(feature)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default FeatureExtractor
