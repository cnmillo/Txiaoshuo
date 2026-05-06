/**
 * 写法资产管理页面
 *
 * 整合写法资产列表、创建/编辑、特征提取、特征池管理等功能
 */

import React, { useState, useEffect } from 'react'
import { useWritingStyleStore } from '../stores/writingStyleStore'
import {
  WritingStyleList,
  WritingStyleForm,
  FeatureExtractor,
  FeaturePoolManager,
  WritingStylePreview,
} from '../components/writingStyle'
import type { WritingStyleAsset } from '@shared/types'

type TabType = 'assets' | 'extract' | 'pool' | 'preview'

export const WritingStyleManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('assets')
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<WritingStyleAsset | null>(null)
  const [previewAsset, setPreviewAsset] = useState<WritingStyleAsset | null>(null)

  const { initialize, isLoading, error } = useWritingStyleStore()

  // 初始化
  useEffect(() => {
    initialize()
  }, [initialize])

  // 处理创建
  const handleCreate = () => {
    setEditingAsset(null)
    setShowForm(true)
  }

  // 处理编辑
  const handleEdit = (asset: WritingStyleAsset) => {
    setEditingAsset(asset)
    setShowForm(true)
  }

  // 处理保存
  const handleSave = () => {
    setShowForm(false)
    setEditingAsset(null)
  }

  // 处理取消
  const handleCancel = () => {
    setShowForm(false)
    setEditingAsset(null)
  }

  // 处理预览
  const handlePreview = (asset: WritingStyleAsset) => {
    setPreviewAsset(asset)
    setActiveTab('preview')
  }

  // 标签页配置
  const tabs: Array<{ id: TabType; label: string; icon: string }> = [
    { id: 'assets', label: '写法资产', icon: '📝' },
    { id: 'extract', label: '特征提取', icon: '🔍' },
    { id: 'pool', label: '特征池', icon: '🎨' },
    { id: 'preview', label: '效果预览', icon: '👁️' },
  ]

  return (
    <div className="writing-style-management bg-gray-50">
      {/* 头部 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <h1 className="text-2xl font-bold text-gray-900">写法引擎</h1>
            <p className="mt-1 text-sm text-gray-500">
              管理写法资产、提取特征、应用到小说创作
            </p>
          </div>

          {/* 标签页 */}
          <div className="flex space-x-8 border-b -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* 写法资产列表 */}
        {activeTab === 'assets' && !showForm && (
          <WritingStyleList
            onCreate={handleCreate}
            onEdit={handleEdit}
            onDuplicate={(asset) => {
              // 复制后刷新列表
              console.log('复制成功:', asset.name)
            }}
            onDelete={(asset) => {
              console.log('删除成功:', asset.name)
            }}
            onSelect={handlePreview}
            selectable
          />
        )}

        {/* 创建/编辑表单 */}
        {activeTab === 'assets' && showForm && (
          <div>
            <div className="mb-6">
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                返回列表
              </button>
            </div>

            <WritingStyleForm
              asset={editingAsset}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* 特征提取 */}
        {activeTab === 'extract' && <FeatureExtractor />}

        {/* 特征池管理 */}
        {activeTab === 'pool' && (
          <FeaturePoolManager
            onApply={(features) => {
              console.log('应用特征:', features.length)
              setActiveTab('assets')
            }}
          />
        )}

        {/* 效果预览 */}
        {activeTab === 'preview' && (
          <WritingStylePreview
            asset={previewAsset}
            onApply={(result) => {
              console.log('应用结果:', result.substring(0, 100))
            }}
          />
        )}
      </div>

      {/* 帮助信息 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">使用指南</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📝</span>
                <h4 className="font-medium">写法资产</h4>
              </div>
              <p className="text-sm text-gray-600">
                创建和管理写法资产，定义不同的写作风格和特征
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🔍</span>
                <h4 className="font-medium">特征提取</h4>
              </div>
              <p className="text-sm text-gray-600">
                从参考文本中自动提取写法特征，包括句式、用词、情感等
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🎨</span>
                <h4 className="font-medium">特征池</h4>
              </div>
              <p className="text-sm text-gray-600">
                管理提取的特征，调整权重，创建特征组合
              </p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">👁️</span>
                <h4 className="font-medium">效果预览</h4>
              </div>
              <p className="text-sm text-gray-600">
                预览写法应用效果，调整参数直到满意
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default WritingStyleManagement
