/**
 * 写法资产列表组件
 *
 * 展示写法资产列表，支持搜索、筛选、创建、编辑、删除等操作
 */

import React, { useState, useEffect, useMemo } from 'react'
import { useWritingStyleStore, selectFilteredAssets, selectIsLoading } from '../../stores/writingStyleStore'
import type { WritingStyleAsset, WritingStyleFilter } from '@shared/types'

interface WritingStyleListProps {
  onSelect?: (asset: WritingStyleAsset) => void
  onCreate?: () => void
  onEdit?: (asset: WritingStyleAsset) => void
  onDelete?: (asset: WritingStyleAsset) => void
  onDuplicate?: (asset: WritingStyleAsset) => void
  showActions?: boolean
  selectable?: boolean
}

export const WritingStyleList: React.FC<WritingStyleListProps> = ({
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onDuplicate,
  showActions = true,
  selectable = false,
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedScenes, setSelectedScenes] = useState<string[]>([])
  const [showCustomOnly, setShowCustomOnly] = useState<boolean | undefined>(undefined)

  const {
    assets,
    fetchAssets,
    deleteAsset,
    duplicateAsset,
    setFilter,
  } = useWritingStyleStore()

  const filteredAssets = useWritingStyleStore(selectFilteredAssets)
  const loading = useWritingStyleStore(selectIsLoading)

  // 获取所有唯一的标签和场景
  const allTags = useMemo(() => {
    const tags = new Set<string>()
    assets.forEach((asset) => {
      asset.styleTags.forEach((tag) => tags.add(tag))
    })
    return Array.from(tags).sort()
  }, [assets])

  const allScenes = useMemo(() => {
    const scenes = new Set<string>()
    assets.forEach((asset) => {
      asset.applicableScenes.forEach((scene) => scenes.add(scene))
    })
    return Array.from(scenes).sort()
  }, [assets])

  // 初始化加载
  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  // 更新筛选条件
  useEffect(() => {
    const filter: WritingStyleFilter = {}
    if (searchQuery) filter.search = searchQuery
    if (selectedTags.length > 0) filter.styleTags = selectedTags
    if (selectedScenes.length > 0) filter.applicableScenes = selectedScenes
    if (showCustomOnly !== undefined) filter.isCustom = showCustomOnly

    setFilter(filter)
  }, [searchQuery, selectedTags, selectedScenes, showCustomOnly, setFilter])

  // 处理删除
  const handleDelete = async (asset: WritingStyleAsset) => {
    if (!window.confirm(`确定要删除写法资产"${asset.name}"吗？`)) return

    try {
      await deleteAsset(asset.id)
      onDelete?.(asset)
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  // 处理复制
  const handleDuplicate = async (asset: WritingStyleAsset) => {
    try {
      await duplicateAsset(asset.id)
      onDuplicate?.(asset)
    } catch (error) {
      console.error('复制失败:', error)
    }
  }

  // 切换标签筛选
  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  // 切换场景筛选
  const toggleScene = (scene: string) => {
    setSelectedScenes((prev) =>
      prev.includes(scene) ? prev.filter((s) => s !== scene) : [...prev, scene]
    )
  }

  return (
    <div className="writing-style-list">
      {/* 搜索和筛选栏 */}
      <div className="mb-6 space-y-4">
        {/* 搜索框 */}
        <div className="flex gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="搜索写法资产..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          {onCreate && (
            <button
              onClick={onCreate}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              创建写法资产
            </button>
          )}
        </div>

        {/* 筛选器 */}
        <div className="flex flex-wrap gap-4">
          {/* 自定义筛选 */}
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showCustomOnly === true}
              onChange={(e) => setShowCustomOnly(e.target.checked ? true : undefined)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">仅显示自定义</span>
          </label>

          {/* 标签筛选 */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">标签:</span>
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* 场景筛选 */}
          {allScenes.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">场景:</span>
              {allScenes.map((scene) => (
                <button
                  key={scene}
                  onClick={() => toggleScene(scene)}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedScenes.includes(scene)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {scene}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 加载状态 */}
      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* 空状态 */}
      {!loading && filteredAssets.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
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
          </div>
          <p className="text-gray-600 mb-4">暂无写法资产</p>
          {onCreate && (
            <button
              onClick={onCreate}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              创建第一个写法资产
            </button>
          )}
        </div>
      )}

      {/* 资产列表 */}
      {!loading && filteredAssets.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className={`bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow ${
                selectable ? 'cursor-pointer hover:border-blue-500' : ''
              }`}
              onClick={() => selectable && onSelect?.(asset)}
            >
              {/* 头部 */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {asset.name}
                    {asset.isDefault && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        默认
                      </span>
                    )}
                    {asset.isCustom && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                        自定义
                      </span>
                    )}
                  </h3>
                </div>
              </div>

              {/* 描述 */}
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {asset.description}
              </p>

              {/* 标签 */}
              {asset.styleTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {asset.styleTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 适用场景 */}
              {asset.applicableScenes.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">适用场景:</p>
                  <div className="flex flex-wrap gap-1">
                    {asset.applicableScenes.slice(0, 3).map((scene) => (
                      <span
                        key={scene}
                        className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                      >
                        {scene}
                      </span>
                    ))}
                    {asset.applicableScenes.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                        +{asset.applicableScenes.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 特征数量 */}
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                <span>{asset.featurePool.length} 个特征</span>
                <span>使用 {asset.usageStats.totalUsage} 次</span>
              </div>

              {/* 操作按钮 */}
              {showActions && (
                <div className="flex gap-2 pt-3 border-t">
                  {onEdit && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(asset)
                      }}
                      className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      编辑
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDuplicate(asset)
                      }}
                      className="flex-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      复制
                    </button>
                  )}
                  {onDelete && !asset.isDefault && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(asset)
                      }}
                      className="px-3 py-1.5 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      删除
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default WritingStyleList
