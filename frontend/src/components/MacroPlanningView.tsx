/**
 * 故事宏观规划展示组件
 * 
 * 用于展示和编辑故事宏观规划，包括：
 * - 整本走向
 * - 阶段升级节点
 * - 长线兑现承诺
 * - 核心冲突和主题
 * 
 * 集成工作流状态管理，支持在线编辑和保存
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  GitBranch,
  TrendingUp,
  Target,
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Check,
  Loader2,
  BookOpen,
  Clock,
  Zap,
  ArrowRight,
} from 'lucide-react'
import { useWorkflowStore } from '../stores/workflowStore'
import { WorkflowStage, type MacroPlanningStageData, type UpgradeNode, type LongTermPromise } from '../types/workflow'
import { generateMacroPlanning } from '../services/api'
import { cleanWorkflowData } from '../utils/cleanWorkflowData'

// ============================================================================
// 工具函数
// ============================================================================

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成唯一ID
function generateId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// ============================================================================
// 组件属性
// ============================================================================

interface MacroPlanningViewProps {
  initialData?: Partial<MacroPlanningStageData>
  onSave?: (data: MacroPlanningStageData) => Promise<void> | void
  onSaveSuccess?: () => void
  onSaveError?: (error: Error) => void
  showSaveButton?: boolean
  disabled?: boolean
  className?: string
  autoGenerate?: boolean
}

// ============================================================================
// 升级节点编辑器组件
// ============================================================================

interface UpgradeNodeEditorProps {
  nodes: UpgradeNode[]
  onChange: (nodes: UpgradeNode[]) => void
  disabled?: boolean
}

function UpgradeNodeEditor({ nodes, onChange, disabled }: UpgradeNodeEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<UpgradeNode>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [newNode, setNewNode] = useState<Partial<UpgradeNode>>({
    name: '',
    upgradeContent: '',
    chapterRange: { start: 1, end: 10 },
    keyEvents: [],
  })
  const [newEvent, setNewEvent] = useState('')

  // 开始编辑节点
  const handleStartEdit = (node: UpgradeNode) => {
    setEditingId(node.id)
    setEditData({ ...node })
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingId || !editData.name) return

    const updatedNodes = nodes.map((node) =>
      node.id === editingId ? { ...node, ...editData } as UpgradeNode : node
    )
    onChange(updatedNodes)
    setEditingId(null)
    setEditData({})
  }

  // 删除节点
  const handleDelete = (id: string) => {
    onChange(nodes.filter((node) => node.id !== id))
  }

  // 添加新节点
  const handleAddNode = () => {
    if (!newNode.name || !newNode.upgradeContent) return

    const node: UpgradeNode = {
      id: generateId(),
      name: newNode.name,
      upgradeContent: newNode.upgradeContent,
      chapterRange: newNode.chapterRange || { start: 1, end: 10 },
      keyEvents: newNode.keyEvents || [],
    }

    onChange([...nodes, node])
    setNewNode({
      name: '',
      upgradeContent: '',
      chapterRange: { start: 1, end: 10 },
      keyEvents: [],
    })
    setIsAdding(false)
  }

  // 添加关键事件
  const handleAddEvent = (isEdit: boolean, nodeId?: string) => {
    if (!newEvent.trim()) return

    if (isEdit && nodeId) {
      const currentEvents = editData.keyEvents || []
      setEditData({
        ...editData,
        keyEvents: [...currentEvents, newEvent.trim()],
      })
    } else {
      const currentEvents = newNode.keyEvents || []
      setNewNode({
        ...newNode,
        keyEvents: [...currentEvents, newEvent.trim()],
      })
    }
    setNewEvent('')
  }

  // 删除关键事件
  const handleRemoveEvent = (index: number, isEdit: boolean, nodeId?: string) => {
    if (isEdit && nodeId) {
      const events = [...(editData.keyEvents || [])]
      events.splice(index, 1)
      setEditData({ ...editData, keyEvents: events })
    } else {
      const events = [...(newNode.keyEvents || [])]
      events.splice(index, 1)
      setNewNode({ ...newNode, keyEvents: events })
    }
  }

  return (
    <div className="space-y-4">
      {/* 节点列表 */}
      <div className="space-y-3">
        {nodes.map((node, index) => (
          <div
            key={node.id}
            className={cn(
              'border rounded-xl transition-all duration-200',
              editingId === node.id
                ? 'border-blue-500 bg-blue-50/50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            )}
          >
            {editingId === node.id ? (
              // 编辑模式
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      节点名称
                    </label>
                    <input
                      type="text"
                      value={editData.name || ''}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="input-field"
                      placeholder="如：初入江湖"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      章节范围
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min={1}
                        value={editData.chapterRange?.start || 1}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            chapterRange: {
                              ...(editData.chapterRange || { start: 1, end: 10 }),
                              start: Number(e.target.value),
                            },
                          })
                        }
                        className="input-field w-24"
                      />
                      <span className="text-gray-500">-</span>
                      <input
                        type="number"
                        min={1}
                        value={editData.chapterRange?.end || 10}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            chapterRange: {
                              ...(editData.chapterRange || { start: 1, end: 10 }),
                              end: Number(e.target.value),
                            },
                          })
                        }
                        className="input-field w-24"
                      />
                      <span className="text-gray-500">章</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    升级内容
                  </label>
                  <textarea
                    value={editData.upgradeContent || ''}
                    onChange={(e) => setEditData({ ...editData, upgradeContent: e.target.value })}
                    className="textarea-field"
                    rows={2}
                    placeholder="描述主角在这个阶段的成长和变化"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    关键事件
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(editData.keyEvents || []).map((event, idx) => {
                      // 防御性代码：确保 event 是字符串
                      const eventText = typeof event === 'string' 
                        ? event 
                        : typeof event === 'object' && event !== null
                        ? JSON.stringify(event)
                        : String(event)
                      
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {eventText}
                          <button
                            type="button"
                            onClick={() => handleRemoveEvent(idx, true, node.id)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      )
                    })}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newEvent}
                      onChange={(e) => setNewEvent(e.target.value)}
                      className="input-field flex-1"
                      placeholder="添加关键事件"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddEvent(true, node.id)
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => handleAddEvent(true, node.id)}
                      className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      添加
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              // 展示模式
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{node.name}</h4>
                      <p className="text-sm text-gray-500">
                        第 {node.chapterRange?.start || 1} - {node.chapterRange?.end || 10} 章
                      </p>
                    </div>
                  </div>
                  {!disabled && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(node)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(node.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <p className="mt-3 text-gray-600 text-sm">{node.upgradeContent}</p>
                {node.keyEvents.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {node.keyEvents.map((event, idx) => {
                      // 防御性代码：确保 event 是字符串
                      const eventText = typeof event === 'string' 
                        ? event 
                        : typeof event === 'object' && event !== null
                        ? JSON.stringify(event)
                        : String(event)
                      
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                        >
                          <Zap className="w-3 h-3 mr-1 text-yellow-500" />
                          {eventText}
                        </span>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 添加新节点 */}
      {!disabled && (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4">
          {isAdding ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    节点名称 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newNode.name || ''}
                    onChange={(e) => setNewNode({ ...newNode, name: e.target.value })}
                    className="input-field"
                    placeholder="如：初入江湖"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    章节范围
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      min={1}
                      value={newNode.chapterRange?.start || 1}
                      onChange={(e) =>
                        setNewNode({
                          ...newNode,
                          chapterRange: {
                            ...(newNode.chapterRange || { start: 1, end: 10 }),
                            start: Number(e.target.value),
                          },
                        })
                      }
                      className="input-field w-24"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                      type="number"
                      min={1}
                      value={newNode.chapterRange?.end || 10}
                      onChange={(e) =>
                        setNewNode({
                          ...newNode,
                          chapterRange: {
                            ...(newNode.chapterRange || { start: 1, end: 10 }),
                            end: Number(e.target.value),
                          },
                        })
                      }
                      className="input-field w-24"
                    />
                    <span className="text-gray-500">章</span>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  升级内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newNode.upgradeContent || ''}
                  onChange={(e) => setNewNode({ ...newNode, upgradeContent: e.target.value })}
                  className="textarea-field"
                  rows={2}
                  placeholder="描述主角在这个阶段的成长和变化"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  关键事件
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {(newNode.keyEvents || []).map((event, idx) => {
                    // 防御性代码：确保 event 是字符串
                    const eventText = typeof event === 'string' 
                      ? event 
                      : typeof event === 'object' && event !== null
                      ? JSON.stringify(event)
                      : String(event)
                    
                    return (
                      <span
                        key={idx}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {eventText}
                        <button
                          type="button"
                          onClick={() => handleRemoveEvent(idx, false)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newEvent}
                    onChange={(e) => setNewEvent(e.target.value)}
                    className="input-field flex-1"
                    placeholder="添加关键事件"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddEvent(false)
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleAddEvent(false)}
                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    添加
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleAddNode}
                  disabled={!newNode.name || !newNode.upgradeContent}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  添加节点
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              添加升级节点
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 长线承诺编辑器组件
// ============================================================================

interface LongTermPromiseEditorProps {
  promises: LongTermPromise[]
  onChange: (promises: LongTermPromise[]) => void
  disabled?: boolean
}

function LongTermPromiseEditor({ promises, onChange, disabled }: LongTermPromiseEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<LongTermPromise>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [newPromise, setNewPromise] = useState<Partial<LongTermPromise>>({
    content: '',
    setupChapter: undefined,
    payoffChapter: undefined,
    status: 'setup',
  })

  // 开始编辑
  const handleStartEdit = (promise: LongTermPromise) => {
    setEditingId(promise.id)
    setEditData({ ...promise })
  }

  // 取消编辑
  const handleCancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }

  // 保存编辑
  const handleSaveEdit = () => {
    if (!editingId || !editData.content) return

    const updatedPromises = promises.map((promise) =>
      promise.id === editingId ? { ...promise, ...editData } as LongTermPromise : promise
    )
    onChange(updatedPromises)
    setEditingId(null)
    setEditData({})
  }

  // 删除承诺
  const handleDelete = (id: string) => {
    onChange(promises.filter((promise) => promise.id !== id))
  }

  // 添加新承诺
  const handleAddPromise = () => {
    if (!newPromise.content) return

    const promise: LongTermPromise = {
      id: generateId(),
      content: newPromise.content,
      setupChapter: newPromise.setupChapter,
      payoffChapter: newPromise.payoffChapter,
      status: newPromise.status || 'setup',
    }

    onChange([...promises, promise])
    setNewPromise({
      content: '',
      setupChapter: undefined,
      payoffChapter: undefined,
      status: 'setup',
    })
    setIsAdding(false)
  }

  // 获取状态标签样式
  const getStatusStyle = (status: LongTermPromise['status']) => {
    switch (status) {
      case 'setup':
        return 'bg-yellow-100 text-yellow-800'
      case 'payoff':
        return 'bg-green-100 text-green-800'
      case 'both':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 获取状态标签文字
  const getStatusLabel = (status: LongTermPromise['status']) => {
    switch (status) {
      case 'setup':
        return '已铺设'
      case 'payoff':
        return '已兑现'
      case 'both':
        return '铺设+兑现'
      default:
        return '未知'
    }
  }

  return (
    <div className="space-y-4">
      {/* 承诺列表 */}
      <div className="space-y-3">
        {promises.map((promise) => (
          <div
            key={promise.id}
            className={cn(
              'border rounded-xl transition-all duration-200',
              editingId === promise.id
                ? 'border-purple-500 bg-purple-50/50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            )}
          >
            {editingId === promise.id ? (
              // 编辑模式
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    承诺内容 <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={editData.content || ''}
                    onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                    className="textarea-field"
                    rows={2}
                    placeholder="描述要向读者承诺的内容"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      铺设章节
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editData.setupChapter || ''}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          setupChapter: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="input-field"
                      placeholder="如：第5章"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      兑现章节
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={editData.payoffChapter || ''}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          payoffChapter: e.target.value ? Number(e.target.value) : undefined,
                        })
                      }
                      className="input-field"
                      placeholder="如：第50章"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      状态
                    </label>
                    <select
                      value={editData.status || 'setup'}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          status: e.target.value as LongTermPromise['status'],
                        })
                      }
                      className="input-field"
                    >
                      <option value="setup">已铺设</option>
                      <option value="payoff">已兑现</option>
                      <option value="both">铺设+兑现</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    保存
                  </button>
                </div>
              </div>
            ) : (
              // 展示模式
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full text-xs font-medium',
                          getStatusStyle(promise.status)
                        )}
                      >
                        {getStatusLabel(promise.status)}
                      </span>
                    </div>
                    <p className="text-gray-900">{promise.content}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {promise.setupChapter && (
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-4 h-4" />
                          铺设: 第{promise.setupChapter}章
                        </span>
                      )}
                      {promise.payoffChapter && (
                        <span className="flex items-center gap-1">
                          <Target className="w-4 h-4" />
                          兑现: 第{promise.payoffChapter}章
                        </span>
                      )}
                    </div>
                  </div>
                  {!disabled && (
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(promise)}
                        className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(promise.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 添加新承诺 */}
      {!disabled && (
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-4">
          {isAdding ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  承诺内容 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={newPromise.content || ''}
                  onChange={(e) => setNewPromise({ ...newPromise, content: e.target.value })}
                  className="textarea-field"
                  rows={2}
                  placeholder="描述要向读者承诺的内容"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    铺设章节
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newPromise.setupChapter || ''}
                    onChange={(e) =>
                      setNewPromise({
                        ...newPromise,
                        setupChapter: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="input-field"
                    placeholder="如：第5章"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    兑现章节
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={newPromise.payoffChapter || ''}
                    onChange={(e) =>
                      setNewPromise({
                        ...newPromise,
                        payoffChapter: e.target.value ? Number(e.target.value) : undefined,
                      })
                    }
                    className="input-field"
                    placeholder="如：第50章"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    状态
                  </label>
                  <select
                    value={newPromise.status || 'setup'}
                    onChange={(e) =>
                      setNewPromise({
                        ...newPromise,
                        status: e.target.value as LongTermPromise['status'],
                      })
                    }
                    className="input-field"
                  >
                    <option value="setup">已铺设</option>
                    <option value="payoff">已兑现</option>
                    <option value="both">铺设+兑现</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleAddPromise}
                  disabled={!newPromise.content}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  添加承诺
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setIsAdding(true)}
              className="w-full py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              添加长线承诺
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 时间线可视化组件
// ============================================================================

interface TimelineViewProps {
  upgradeNodes: UpgradeNode[]
  promises: LongTermPromise[]
}

function TimelineView({ upgradeNodes, promises }: TimelineViewProps) {
  // 计算最大章节数
  const maxChapter = useMemo(() => {
    const nodeMax = Math.max(...upgradeNodes.map((n) => n.chapterRange?.end || 0), 0)
    const promiseMax = Math.max(
      ...promises.map((p) => Math.max(p.setupChapter || 0, p.payoffChapter || 0)),
      0
    )
    return Math.max(nodeMax, promiseMax, 100)
  }, [upgradeNodes, promises])

  return (
    <div className="bg-gray-50 rounded-xl p-6 overflow-x-auto">
      <h4 className="text-sm font-medium text-gray-700 mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4" />
        故事时间线
      </h4>

      {/* 时间线 */}
      <div className="relative min-w-[600px]">
        {/* 刻度线 */}
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>第1章</span>
          <span>第{Math.round(maxChapter / 4)}章</span>
          <span>第{Math.round(maxChapter / 2)}章</span>
          <span>第{Math.round((maxChapter * 3) / 4)}章</span>
          <span>第{maxChapter}章</span>
        </div>

        {/* 主时间线 */}
        <div className="h-2 bg-gray-200 rounded-full relative">
          {/* 升级节点标记 */}
          {upgradeNodes.map((node) => {
            const startPercent = ((node.chapterRange?.start || 1) / maxChapter) * 100
            const endPercent = ((node.chapterRange?.end || 10) / maxChapter) * 100
            const width = endPercent - startPercent

            return (
              <div
                key={node.id}
                className="absolute top-0 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{
                  left: `${startPercent}%`,
                  width: `${width}%`,
                }}
                title={`${node.name}: 第${node.chapterRange?.start || 1}-${node.chapterRange?.end || 10}章`}
              />
            )
          })}

          {/* 承诺标记 */}
          {promises.map((promise) => (
            <div key={promise.id}>
              {promise.setupChapter && (
                <div
                  className="absolute top-0 w-3 h-3 -mt-0.5 rounded-full bg-yellow-500 border-2 border-white shadow-sm"
                  style={{ left: `${(promise.setupChapter / maxChapter) * 100}%` }}
                  title={`铺设: ${promise.content}`}
                />
              )}
              {promise.payoffChapter && (
                <div
                  className="absolute top-0 w-3 h-3 -mt-0.5 rounded-full bg-green-500 border-2 border-white shadow-sm"
                  style={{ left: `${(promise.payoffChapter / maxChapter) * 100}%` }}
                  title={`兑现: ${promise.content}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* 图例 */}
        <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 rounded-full bg-gradient-to-r from-blue-500 to-purple-500" />
            <span>升级节点</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>承诺铺设</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>承诺兑现</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

// ============================================================================
// 数据清理工具函数
// ============================================================================

/**
 * 清理升级节点数据，确保格式正确
 */
interface RawUpgradeNode {
  id?: string
  name?: string
  chapterRange?: { start?: number; end?: number }
  upgradeContent?: string
  keyEvents?: unknown[]
}

function cleanUpgradeNodes(nodes: RawUpgradeNode[] | undefined): UpgradeNode[] {
  if (!Array.isArray(nodes)) return []
  
  return nodes.map(node => {
    // 确保 keyEvents 是字符串数组
    let keyEvents: string[] = []
    if (Array.isArray(node.keyEvents)) {
      keyEvents = node.keyEvents.map((event: unknown) => {
        if (typeof event === 'string') return event
        if (typeof event === 'object' && event !== null) return JSON.stringify(event)
        return String(event)
      })
    }
    
    // 确保 chapterRange 格式正确
    let chapterRange = { start: 1, end: 10 }
    if (node.chapterRange && typeof node.chapterRange === 'object') {
      chapterRange = {
        start: typeof node.chapterRange.start === 'number' ? node.chapterRange.start : 1,
        end: typeof node.chapterRange.end === 'number' ? node.chapterRange.end : 10
      }
    }
    
    return {
      id: node.id || generateId(),
      name: node.name || '未命名节点',
      chapterRange,
      upgradeContent: node.upgradeContent || '',
      keyEvents
    }
  })
}

/**
 * 清理长线承诺数据，确保格式正确
 */
interface RawLongTermPromise {
  id?: string
  content?: string
  setupChapter?: number
  payoffChapter?: number
  status?: string
}

function cleanLongTermPromises(promises: RawLongTermPromise[] | undefined): LongTermPromise[] {
  if (!Array.isArray(promises)) return []
  
  return promises.map(promise => ({
    id: promise.id || generateId(),
    content: typeof promise.content === 'string' ? promise.content : '未命名承诺',
    setupChapter: typeof promise.setupChapter === 'number' ? promise.setupChapter : undefined,
    payoffChapter: typeof promise.payoffChapter === 'number' ? promise.payoffChapter : undefined,
    status: ['setup', 'payoff', 'both'].includes(promise.status || '') ? promise.status as LongTermPromise['status'] : 'setup'
  }))
}

// ============================================================================
// 主组件
// ============================================================================

export default function MacroPlanningView({
  initialData,
  onSave,
  onSaveSuccess,
  onSaveError,
  showSaveButton = true,
  disabled = false,
  className,
  autoGenerate = false,
}: MacroPlanningViewProps) {
  // 从工作流 store 获取数据
  const { updateStageData, getStageData, completeStage, getStageData: getStageDataFromStore } = useWorkflowStore()
  const existingData = getStageData(WorkflowStage.MACRO_PLANNING)
  const projectSettingData = getStageDataFromStore(WorkflowStage.PROJECT_SETTING)

  // 状态
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [activeSection, setActiveSection] = useState<'overview' | 'nodes' | 'promises'>('overview')

  // 辅助函数：解析可能是 JSON 字符串的数据
  const parseFieldValue = (value: unknown): string => {
    if (!value) return ''
    if (typeof value === 'string') {
      // 尝试解析 JSON 字符串
      try {
        const parsed = JSON.parse(value)
        if (typeof parsed === 'object' && parsed !== null) {
          // 格式化对象为文本
          const record = parsed as Record<string, unknown>
          if (record.beginning || record.development || record.climax || record.ending) {
            const parts: string[] = []
            if (record.beginning) parts.push(`【开篇】${record.beginning}`)
            if (record.development) parts.push(`【发展】${record.development}`)
            if (record.climax) parts.push(`【高潮】${record.climax}`)
            if (record.ending) parts.push(`【结局】${record.ending}`)
            return parts.join('\n\n')
          }
          if (record.mainChallenge || record.antagonist || record.originAndDevelopment) {
            const parts: string[] = []
            if (record.mainChallenge) parts.push(`【主要困境】${record.mainChallenge}`)
            if (record.antagonist) parts.push(`【反派势力】${record.antagonist}`)
            if (record.originAndDevelopment) parts.push(`【冲突发展】${record.originAndDevelopment}`)
            return parts.join('\n\n')
          }
          return Object.entries(record)
            .map(([k, v]) => `【${k}】${v}`)
            .join('\n\n')
        }
        return value
      } catch {
        return value
      }
    }
    return ''
  }

  // 表单数据 - 清理数据格式
  const [formData, setFormData] = useState<{
    overallDirection: string
    coreConflict: string
    theme: string
    worldviewSummary: string
    upgradeNodes: UpgradeNode[]
    longTermPromises: LongTermPromise[]
  }>({
    overallDirection: parseFieldValue(initialData?.overallDirection || existingData?.overallDirection),
    coreConflict: parseFieldValue(initialData?.coreConflict || existingData?.coreConflict),
    theme: parseFieldValue(initialData?.theme || existingData?.theme),
    worldviewSummary: parseFieldValue(initialData?.worldviewSummary || existingData?.worldviewSummary),
    upgradeNodes: cleanUpgradeNodes(initialData?.upgradeNodes || existingData?.upgradeNodes || []),
    longTermPromises: cleanLongTermPromises(initialData?.longTermPromises || existingData?.longTermPromises || []),
  })

  // 自动生成
  useEffect(() => {
    // 清理工作流数据，修复可能的格式问题
    cleanWorkflowData()
    
    if (autoGenerate && !existingData && projectSettingData) {
      handleGenerate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 生成宏观规划
  const handleGenerate = async () => {
    if (!projectSettingData) {
      console.error('缺少项目设定数据')
      return
    }

    setIsGenerating(true)

    try {
      const response = await generateMacroPlanning({
        title: projectSettingData.title,
        genre: projectSettingData.genre,
        coreSellingPoint: projectSettingData.coreSellingPoint,
        targetReaderFeeling: projectSettingData.targetReaderFeeling,
        first30ChaptersPromise: projectSettingData.first30ChaptersPromise,
      })

      setFormData({
        overallDirection: parseFieldValue(response.overallDirection),
        coreConflict: parseFieldValue(response.coreConflict),
        theme: parseFieldValue(response.theme),
        worldviewSummary: parseFieldValue(response.worldviewSummary),
        upgradeNodes: cleanUpgradeNodes(response.upgradeNodes || []),
        longTermPromises: cleanLongTermPromises(response.longTermPromises || []),
      })
    } catch (error) {
      console.error('生成宏观规划失败:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // 保存数据
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const macroData: MacroPlanningStageData = {
        overallDirection: formData.overallDirection,
        coreConflict: formData.coreConflict,
        theme: formData.theme,
        worldviewSummary: formData.worldviewSummary || undefined,
        upgradeNodes: formData.upgradeNodes,
        longTermPromises: formData.longTermPromises,
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // 更新工作流状态
      updateStageData(WorkflowStage.MACRO_PLANNING, macroData)

      // 调用外部保存回调
      if (onSave) {
        await onSave(macroData)
      }

      setSaveSuccess(true)
      onSaveSuccess?.()
    } catch (error) {
      console.error('保存宏观规划失败:', error)
      onSaveError?.(error instanceof Error ? error : new Error('保存失败'))
    } finally {
      setIsSaving(false)
    }
  }, [formData, existingData, updateStageData, onSave, onSaveSuccess, onSaveError])

  // 完成阶段
  const handleComplete = useCallback(async () => {
    await handleSave()
    completeStage(WorkflowStage.MACRO_PLANNING)
  }, [handleSave, completeStage])

  // 更新升级节点
  const handleNodesChange = useCallback((nodes: UpgradeNode[]) => {
    setFormData((prev) => ({ ...prev, upgradeNodes: nodes }))
  }, [])

  // 更新长线承诺
  const handlePromisesChange = useCallback((promises: LongTermPromise[]) => {
    setFormData((prev) => ({ ...prev, longTermPromises: promises }))
  }, [])

  const [basicSettingsExpanded, setBasicSettingsExpanded] = useState(true)

  return (
    <div className={cn('flex flex-col h-full', className)}>
      <div className="flex-1 overflow-y-auto space-y-3 pb-2">
        {/* 标题区域 */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-blue-600" />
              故事宏观规划
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              规划整本走向、阶段升级节点和长线兑现承诺
            </p>
          </div>
          {!disabled && !existingData && (
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating || !projectSettingData}
              className={cn(
                'flex items-center px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-200',
                'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  AI 生成规划
                </>
              )}
            </button>
          )}
        </div>

        {/* 生成中状态 */}
        {isGenerating && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-600">正在生成宏观规划...</p>
            <p className="text-sm text-gray-400 mt-2">这可能需要一些时间，请耐心等待</p>
          </div>
        )}

        {/* 主要内容 */}
        {!isGenerating && (
          <div className="space-y-3">
            {/* 基础信息 - 可折叠 */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setBasicSettingsExpanded(!basicSettingsExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors"
              >
                <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-green-600" />
                  基础设定
                  <span className="text-xs text-gray-400 font-normal">
                    ({[
                      formData.overallDirection && '走向',
                      formData.coreConflict && '冲突',
                      formData.theme && '主题',
                      formData.worldviewSummary && '世界观',
                    ].filter(Boolean).length}/4 已填写)
                  </span>
                </h3>
                <svg
                  className={cn('w-4 h-4 text-gray-400 transition-transform', basicSettingsExpanded && 'rotate-180')}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {basicSettingsExpanded && (
                <div className="px-3 pb-3 space-y-3 border-t border-gray-100">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      整本走向 <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={formData.overallDirection}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, overallDirection: e.target.value }))
                      }
                      disabled={disabled}
                      placeholder="描述故事的整体走向和发展脉络"
                      rows={4}
                      className="textarea-field"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        核心冲突 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.coreConflict}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, coreConflict: e.target.value }))
                        }
                        disabled={disabled}
                        placeholder="描述故事的核心矛盾和冲突"
                        rows={3}
                        className="textarea-field"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        主题 <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.theme}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, theme: e.target.value }))
                        }
                        disabled={disabled}
                        placeholder="描述故事的核心主题和思想"
                        rows={3}
                        className="textarea-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      世界观概要
                    </label>
                    <textarea
                      value={formData.worldviewSummary}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, worldviewSummary: e.target.value }))
                      }
                      disabled={disabled}
                      placeholder="简要描述故事发生的世界观设定（可选）"
                      rows={2}
                      className="textarea-field"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 时间线可视化 */}
            {(formData.upgradeNodes.length > 0 || formData.longTermPromises.length > 0) && (
              <TimelineView
                upgradeNodes={formData.upgradeNodes}
                promises={formData.longTermPromises}
              />
            )}

            {/* 分区导航 */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setActiveSection('overview')}
                  className={cn(
                    'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeSection === 'overview'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  概览
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('nodes')}
                  className={cn(
                    'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeSection === 'nodes'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  升级节点 ({formData.upgradeNodes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('promises')}
                  className={cn(
                    'py-2 px-1 border-b-2 font-medium text-sm transition-colors',
                    activeSection === 'promises'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  )}
                >
                  长线承诺 ({formData.longTermPromises.length})
                </button>
              </nav>
            </div>

            {/* 分区内容 */}
            <div className="bg-white border border-gray-200 rounded-lg p-3">
              {activeSection === 'overview' && (
                <div className="space-y-3">
                  {/* 升级节点概览 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      升级节点概览
                    </h4>
                    {formData.upgradeNodes.length === 0 ? (
                      <p className="text-gray-400 text-sm">暂无升级节点，请添加或生成</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {formData.upgradeNodes.map((node, index) => (
                          <div
                            key={node.id}
                            className="bg-gray-50 rounded-lg p-2 border border-gray-100"
                          >
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-xs font-bold">
                                {index + 1}
                              </span>
                              <span className="font-medium text-gray-900 text-sm">{node.name}</span>
                            </div>
                            <p className="text-xs text-gray-400 mb-0.5">
                              第 {node.chapterRange?.start || 1} - {node.chapterRange?.end || 10} 章
                            </p>
                            <p className="text-sm text-gray-600 line-clamp-2">
                              {node.upgradeContent}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 长线承诺概览 */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-purple-600" />
                      长线承诺概览
                    </h4>
                    {formData.longTermPromises.length === 0 ? (
                      <p className="text-gray-400 text-sm">暂无长线承诺，请添加或生成</p>
                    ) : (
                      <div className="space-y-1.5">
                        {formData.longTermPromises.map((promise) => (
                          <div
                            key={promise.id}
                            className="flex items-center justify-between bg-gray-50 rounded-lg p-2 border border-gray-100"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 truncate">{promise.content}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                                {promise.setupChapter && (
                                  <span>铺设: 第{promise.setupChapter}章</span>
                                )}
                                {promise.payoffChapter && (
                                  <span>兑现: 第{promise.payoffChapter}章</span>
                                )}
                              </div>
                            </div>
                            <span
                              className={cn(
                                'ml-2 px-2 py-0.5 rounded-full text-xs font-medium shrink-0',
                                promise.status === 'setup' && 'bg-yellow-100 text-yellow-800',
                                promise.status === 'payoff' && 'bg-green-100 text-green-800',
                                promise.status === 'both' && 'bg-blue-100 text-blue-800'
                              )}
                            >
                              {promise.status === 'setup' && '已铺设'}
                              {promise.status === 'payoff' && '已兑现'}
                              {promise.status === 'both' && '完成'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeSection === 'nodes' && (
                <UpgradeNodeEditor
                  nodes={formData.upgradeNodes}
                  onChange={handleNodesChange}
                  disabled={disabled}
                />
              )}

              {activeSection === 'promises' && (
                <LongTermPromiseEditor
                  promises={formData.longTermPromises}
                  onChange={handlePromisesChange}
                  disabled={disabled}
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 - 固定底部 */}
      {showSaveButton && !isGenerating && (
        <div className="shrink-0 bg-white border-t border-gray-200 py-2 px-1 -mx-1 mt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {saveSuccess && (
                <div className="flex items-center text-xs text-green-600">
                  <Check className="w-3.5 h-3.5 mr-1" />
                  <span>保存成功</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={disabled || isGenerating || !projectSettingData}
                className={cn(
                  'flex items-center px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-200',
                  'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600',
                  'disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed'
                )}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1" />
                    AI 辅助生成
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={disabled || isSaving}
                className={cn(
                  'flex items-center px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-200',
                  'bg-blue-600 text-white hover:bg-blue-700',
                  'disabled:bg-gray-300 disabled:cursor-not-allowed'
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-1" />
                    保存规划
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleComplete}
                disabled={disabled || isSaving}
                className={cn(
                  'flex items-center px-2.5 py-1 rounded-lg text-xs font-medium transition-colors duration-200',
                  'bg-green-600 text-white hover:bg-green-700',
                  'disabled:bg-gray-300 disabled:cursor-not-allowed'
                )}
              >
                完成并继续
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
