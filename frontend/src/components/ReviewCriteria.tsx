import React, { useState, useEffect, useCallback } from 'react'
import { createReviewCriteria, getReviewCriteria, updateReviewCriteria, deleteReviewCriteria } from '../services/api'

interface ReviewCriteriaProps {
  novelId: string
}

interface Criteria {
  id: string
  name: string
  description: string
  type: string
  threshold: number
}

const ReviewCriteria: React.FC<ReviewCriteriaProps> = ({ novelId }) => {
  const [criteriaList, setCriteriaList] = useState<Criteria[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [selectedCriteria, setSelectedCriteria] = useState<Criteria | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'character',
    threshold: 80
  })
  const [isLoading, setIsLoading] = useState(false)

  const loadCriteria = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await getReviewCriteria(novelId)
      setCriteriaList(data)
    } catch (error) {
      console.error('加载审核标准失败:', error)
    } finally {
      setIsLoading(false)
    }
  }, [novelId])

  useEffect(() => {
    loadCriteria()
  }, [loadCriteria])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'threshold' ? parseInt(value) : value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setIsLoading(true)
      if (isEditing && selectedCriteria) {
        await updateReviewCriteria(selectedCriteria.id, formData)
      } else {
        await createReviewCriteria(novelId, formData.name, formData.description, formData.type, formData.threshold)
      }
      loadCriteria()
      resetForm()
    } catch (error) {
      console.error('保存审核标准失败:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEdit = (criteria: Criteria) => {
    setSelectedCriteria(criteria)
    setFormData({
      name: criteria.name,
      description: criteria.description,
      type: criteria.type,
      threshold: criteria.threshold
    })
    setIsEditing(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这个审核标准吗？')) {
      try {
        setIsLoading(true)
        await deleteReviewCriteria(id)
        loadCriteria()
      } catch (error) {
        console.error('删除审核标准失败:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: 'character',
      threshold: 80
    })
    setSelectedCriteria(null)
    setIsEditing(false)
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">关键节点审核标准设置</h2>
      
      {/* 审核标准表单 */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h3 className="text-lg font-semibold mb-2">{isEditing ? '编辑审核标准' : '创建审核标准'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标准名称</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标准类型</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="character">角色一致性</option>
                <option value="worldview">世界观一致性</option>
                <option value="plot">情节一致性</option>
                <option value="style">风格一致性</option>
                <option value="pacing">节奏控制</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">标准描述</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border rounded"
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">阈值分数</label>
              <input
                type="number"
                name="threshold"
                value={formData.threshold}
                onChange={(e) => {
                  const val = e.target.value
                  if (val === '') {
                    setFormData(prev => ({ ...prev, threshold: '' as unknown as number }))
                  } else {
                    const num = parseInt(val)
                    if (!isNaN(num)) {
                      setFormData(prev => ({ ...prev, threshold: num }))
                    }
                  }
                }}
                onBlur={(e) => {
                  let num = parseInt(e.target.value) || 80
                  num = Math.max(0, Math.min(100, num))
                  setFormData(prev => ({ ...prev, threshold: num }))
                }}
                min="0"
                max="100"
                step="5"
                className="w-full px-3 py-2 border rounded"
                required
              />
            </div>
          </div>
          
          <div className="mt-4 flex space-x-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded"
              disabled={isLoading}
            >
              {isLoading ? '保存中...' : (isEditing ? '更新标准' : '创建标准')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 bg-gray-500 text-white rounded"
            >
              取消
            </button>
          </div>
        </form>
      </div>
      
      {/* 审核标准列表 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="text-lg font-semibold mb-2">审核标准列表</h3>
        {isLoading ? (
          <p>加载中...</p>
        ) : criteriaList.length === 0 ? (
          <p>还没有设置审核标准</p>
        ) : (
          <div className="space-y-3">
            {criteriaList.map(criteria => (
              <div key={criteria.id} className="p-3 border rounded hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{criteria.name}</h4>
                    <p className="text-sm text-gray-600">{criteria.type}</p>
                    <p className="text-sm">{criteria.description}</p>
                    <p className="text-sm font-medium">阈值: {criteria.threshold}/100</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleEdit(criteria)}
                      className="text-sm bg-blue-500 text-white px-2 py-1 rounded"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(criteria.id)}
                      className="text-sm bg-red-500 text-white px-2 py-1 rounded"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default ReviewCriteria
