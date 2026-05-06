import React, { useState, useCallback, DragEvent } from 'react'
import type { OutlineNode } from '@shared/types'

interface OutlineManagerProps {
  outline: OutlineNode[]
  onOutlineChange: (outline: OutlineNode[]) => void
}

const OutlineManager: React.FC<OutlineManagerProps> = ({ outline, onOutlineChange }) => {
  const [editingNode, setEditingNode] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // 生成唯一ID
  const generateId = useCallback(() => {
    return `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])

  // 添加节点
  const addNode = useCallback((parentId: string | null, position: 'before' | 'after' | 'child') => {
    const newNode: OutlineNode = {
      id: generateId(),
      title: '新节点',
      children: [],
      orderIndex: 0
    }

    const addNodeRecursive = (nodes: OutlineNode[]): OutlineNode[] => {
      return nodes.map(node => {
        if (node.id === parentId) {
          if (position === 'child') {
            return {
              ...node,
              children: [...node.children, newNode]
            }
          } else if (position === 'before') {
            return node
          } else if (position === 'after') {
            return node
          }
        }
        
        return {
          ...node,
          children: addNodeRecursive(node.children)
        }
      }).flatMap(node => {
        if (node.id === parentId) {
          if (position === 'before') {
            return [newNode, node]
          } else if (position === 'after') {
            return [node, newNode]
          }
        }
        return [node]
      })
    }

    if (parentId === null) {
      onOutlineChange([...outline, newNode])
    } else {
      onOutlineChange(addNodeRecursive(outline))
    }
  }, [outline, onOutlineChange, generateId])

  // 删除节点
  const deleteNode = useCallback((nodeId: string) => {
    const deleteNodeRecursive = (nodes: OutlineNode[]): OutlineNode[] => {
      return nodes
        .filter(node => node.id !== nodeId)
        .map(node => ({
          ...node,
          children: deleteNodeRecursive(node.children)
        }))
    }

    onOutlineChange(deleteNodeRecursive(outline))
  }, [outline, onOutlineChange])

  // 更新节点标题
  const updateNodeTitle = useCallback((nodeId: string, title: string) => {
    const updateNodeRecursive = (nodes: OutlineNode[]): OutlineNode[] => {
      return nodes.map(node => {
        if (node.id === nodeId) {
          return { ...node, title }
        }
        return {
          ...node,
          children: updateNodeRecursive(node.children)
        }
      })
    }

    onOutlineChange(updateNodeRecursive(outline))
  }, [outline, onOutlineChange])

  // 开始编辑节点
  const startEditing = useCallback((nodeId: string, currentTitle: string) => {
    setEditingNode(nodeId)
    setEditValue(currentTitle)
  }, [])

  // 保存编辑
  const saveEditing = useCallback((nodeId: string) => {
    if (editValue.trim()) {
      updateNodeTitle(nodeId, editValue.trim())
    }
    setEditingNode(null)
    setEditValue('')
  }, [editValue, updateNodeTitle])

  // 处理拖拽开始
  const handleDragStart = (e: DragEvent<HTMLDivElement>, nodeId: string) => {
    e.dataTransfer.setData('nodeId', nodeId)
  }

  // 处理拖拽结束
  const handleDragEnd = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.clearData()
  }

  // 处理拖拽放置
  const handleDrop = (e: DragEvent<HTMLDivElement>, targetNodeId: string, position: 'before' | 'after' | 'child') => {
    e.preventDefault()
    const draggedNodeId = e.dataTransfer.getData('nodeId')
    if (draggedNodeId === targetNodeId) return

    // 找到被拖拽的节点
    const findNode = (nodes: OutlineNode[]): OutlineNode | null => {
      for (const node of nodes) {
        if (node.id === draggedNodeId) return node
        const found = findNode(node.children)
        if (found) return found
      }
      return null
    }

    // 从原位置移除节点
    const removeNode = (nodes: OutlineNode[]): OutlineNode[] => {
      return nodes
        .filter(node => node.id !== draggedNodeId)
        .map(node => ({
          ...node,
          children: removeNode(node.children)
        }))
    }

    // 添加节点到新位置
    const addNodeToNewPosition = (nodes: OutlineNode[], nodeToAdd: OutlineNode): OutlineNode[] => {
      return nodes.map(node => {
        if (node.id === targetNodeId) {
          if (position === 'child') {
            return {
              ...node,
              children: [...node.children, nodeToAdd]
            }
          } else if (position === 'before') {
            return node
          } else if (position === 'after') {
            return node
          }
        }
        
        return {
          ...node,
          children: addNodeToNewPosition(node.children, nodeToAdd)
        }
      }).flatMap(node => {
        if (node.id === targetNodeId) {
          if (position === 'before') {
            return [nodeToAdd, node]
          } else if (position === 'after') {
            return [node, nodeToAdd]
          }
        }
        return [node]
      })
    }

    const draggedNode = findNode(outline)
    if (draggedNode) {
      const outlineWithoutNode = removeNode(outline)
      const newOutline = addNodeToNewPosition(outlineWithoutNode, draggedNode)
      onOutlineChange(newOutline)
    }
  }

  // 处理拖拽经过
  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
  }

  // 渲染节点
  const renderNode = (node: OutlineNode, level: number = 0) => {
    return (
      <div key={node.id} className="mb-2">
        <div 
          className="flex items-center gap-2 p-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
          draggable
          onDragStart={(e) => handleDragStart(e, node.id)}
          onDragEnd={handleDragEnd}
        >
          {/* 拖拽指示器 */}
          <div className="cursor-move text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="5 9 2 12 5 15"></polyline>
              <polyline points="9 5 12 2 15 5"></polyline>
              <polyline points="15 19 12 22 9 19"></polyline>
              <polyline points="19 9 22 12 19 15"></polyline>
            </svg>
          </div>

          {/* 缩进 */}
          <div style={{ width: `${level * 20}px` }}></div>

          {/* 节点标题 */}
          {editingNode === node.id ? (
            <div className="flex-1">
              <input
                type="text"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => saveEditing(node.id)}
                onKeyPress={(e) => e.key === 'Enter' && saveEditing(node.id)}
                className="w-full p-1 border rounded"
                autoFocus
              />
            </div>
          ) : (
            <div 
              className="flex-1 font-medium"
              onClick={() => startEditing(node.id, node.title)}
            >
              {node.title}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex gap-1">
            <button
              className="p-1 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
              onClick={() => addNode(node.id, 'child')}
              title="添加子节点"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button
              className="p-1 text-sm text-gray-600 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400"
              onClick={() => addNode(node.id, 'after')}
              title="在后面添加节点"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </button>
            <button
              className="p-1 text-sm text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
              onClick={() => deleteNode(node.id)}
              title="删除节点"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </button>
          </div>

          {/* 拖拽放置区域 */}
          <div
            className="w-2 h-8 bg-transparent hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, node.id, 'before')}
            title="拖放到此位置前面"
          ></div>
          <div
            className="w-2 h-8 bg-transparent hover:bg-blue-200 dark:hover:bg-blue-800 rounded"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, node.id, 'after')}
            title="拖放到此位置后面"
          ></div>
        </div>

        {/* 子节点 */}
        {node.children.length > 0 && (
          <div className="ml-6 mt-1">
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="outline-manager">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">大纲管理</h3>
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          onClick={() => addNode(null, 'after')}
        >
          添加顶层节点
        </button>
      </div>

      <div className="outline-content">
        {outline.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p>暂无大纲内容，点击上方按钮添加第一个节点</p>
          </div>
        ) : (
          outline.map(node => renderNode(node))
        )}
      </div>
    </div>
  )
}

export default OutlineManager