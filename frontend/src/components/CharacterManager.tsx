import React, { useState, useEffect, useCallback } from 'react'
import { Character, Relationship, Worldview } from '@shared/types'
import { createCharacter, getCharacters, updateCharacter, deleteCharacter, getRelationships, getWorldview } from '../services/api'

interface CharacterManagerProps {
  novelId: string
}

const CharacterManager: React.FC<CharacterManagerProps> = ({ novelId }) => {
  const [characters, setCharacters] = useState<Character[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [worldview, setWorldview] = useState<Worldview | undefined>(undefined)
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<Omit<Character, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    age: 0,
    gender: 'male',
    personality: '',
    background: '',
    appearance: '',
    goals: [],
    fears: [],
    skills: [],
    relationships: [],
    role: '',
    importance: 'minor'
  })

  const loadCharacters = useCallback(async () => {
    try {
      const data = await getCharacters(novelId)
      setCharacters(data)
    } catch (error) {
      console.error('加载角色失败:', error)
    }
  }, [novelId])

  const loadRelationships = useCallback(async () => {
    try {
      const data = await getRelationships(novelId)
      setRelationships(data)
    } catch (error) {
      console.error('加载关系失败:', error)
    }
  }, [novelId])

  const loadWorldview = useCallback(async () => {
    try {
      const data = await getWorldview(novelId)
      setWorldview(data)
    } catch (error) {
      console.error('加载世界观失败:', error)
    }
  }, [novelId])

  useEffect(() => {
    loadCharacters()
    loadRelationships()
    loadWorldview()
  }, [loadCharacters, loadRelationships, loadWorldview])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? '' : parseInt(value)) : value
    }))
  }

  const handleArrayChange = (field: string, index: number, value: string) => {
    setFormData(prev => {
      const newArray = [...(prev[field as keyof typeof prev] as string[])]
      newArray[index] = value
      return {
        ...prev,
        [field]: newArray
      }
    })
  }

  const handleAddArrayItem = (field: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field as keyof typeof prev] as string[]), '']
    }))
  }

  const handleRemoveArrayItem = (field: string, index: number) => {
    setFormData(prev => {
      const newArray = [...(prev[field as keyof typeof prev] as string[])]
      newArray.splice(index, 1)
      return {
        ...prev,
        [field]: newArray
      }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (isEditing && selectedCharacter) {
        await updateCharacter(selectedCharacter.id, formData)
      } else {
        await createCharacter(novelId, formData)
      }
      loadCharacters()
      resetForm()
    } catch (error) {
      console.error('保存角色失败:', error)
    }
  }

  const handleEdit = (character: Character) => {
    setSelectedCharacter(character)
    setFormData({
      name: character.name,
      age: character.age,
      gender: character.gender,
      personality: character.personality,
      background: character.background,
      appearance: character.appearance,
      goals: character.goals,
      fears: character.fears,
      skills: character.skills,
      relationships: character.relationships,
      role: character.role,
      importance: character.importance
    })
    setIsEditing(true)
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('确定要删除这个角色吗？')) {
      try {
        await deleteCharacter(id)
        loadCharacters()
      } catch (error) {
        console.error('删除角色失败:', error)
      }
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      age: 0,
      gender: 'male',
      personality: '',
      background: '',
      appearance: '',
      goals: [],
      fears: [],
      skills: [],
      relationships: [],
      role: '',
      importance: 'minor'
    })
    setSelectedCharacter(null)
    setIsEditing(false)
  }

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">角色档案管理</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 角色列表 */}
        <div className="lg:col-span-1">
          <h3 className="text-lg font-semibold mb-2">角色列表</h3>
          <div className="bg-white rounded-lg shadow p-4">
            {characters.map(character => (
              <div key={character.id} className="mb-3 p-3 border rounded">
                <h4 className="font-medium">{character.name}</h4>
                <p className="text-sm text-gray-600">{character.role} · {character.importance}</p>
                <div className="mt-2 flex space-x-2">
                  <button 
                    onClick={() => handleEdit(character)}
                    className="text-sm bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    编辑
                  </button>
                  <button 
                    onClick={() => handleDelete(character.id)}
                    className="text-sm bg-red-500 text-white px-2 py-1 rounded"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 角色编辑表单 */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold mb-2">{isEditing ? '编辑角色' : '创建角色'}</h3>
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">姓名</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">年龄</label>
                <input
                  type="number"
                  name="age"
                  min="0"
                  max="200"
                  step="1"
                  value={formData.age}
                  onChange={handleInputChange}
                  onBlur={(e) => {
                    let num = parseInt(e.target.value) || 0
                    num = Math.max(0, Math.min(200, num))
                    setFormData(prev => ({ ...prev, age: num }))
                  }}
                  className="w-full px-3 py-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="male">男</option>
                  <option value="female">女</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">重要性</label>
                <select
                  name="importance"
                  value={formData.importance}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                >
                  <option value="main">主要</option>
                  <option value="supporting">次要</option>
                  <option value="minor">配角</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">角色</label>
                <input
                  type="text"
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">性格</label>
                <textarea
                  name="personality"
                  value={formData.personality}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">背景</label>
                <textarea
                  name="background"
                  value={formData.background}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">外貌</label>
                <textarea
                  name="appearance"
                  value={formData.appearance}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded"
                  rows={3}
                />
              </div>
              
              {/* 目标 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">目标</label>
                {formData.goals.map((goal, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input
                      type="text"
                      value={goal}
                      onChange={(e) => handleArrayChange('goals', index, e.target.value)}
                      className="flex-1 px-3 py-2 border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveArrayItem('goals', index)}
                      className="ml-2 text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('goals')}
                  className="text-sm text-blue-500"
                >
                  添加目标
                </button>
              </div>
              
              {/* 恐惧 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">恐惧</label>
                {formData.fears.map((fear, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input
                      type="text"
                      value={fear}
                      onChange={(e) => handleArrayChange('fears', index, e.target.value)}
                      className="flex-1 px-3 py-2 border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveArrayItem('fears', index)}
                      className="ml-2 text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('fears')}
                  className="text-sm text-blue-500"
                >
                  添加恐惧
                </button>
              </div>
              
              {/* 技能 */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">技能</label>
                {formData.skills.map((skill, index) => (
                  <div key={index} className="flex items-center mb-2">
                    <input
                      type="text"
                      value={skill}
                      onChange={(e) => handleArrayChange('skills', index, e.target.value)}
                      className="flex-1 px-3 py-2 border rounded"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveArrayItem('skills', index)}
                      className="ml-2 text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleAddArrayItem('skills')}
                  className="text-sm text-blue-500"
                >
                  添加技能
                </button>
              </div>
            </div>
            
            <div className="mt-4 flex space-x-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                {isEditing ? '更新角色' : '创建角色'}
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
      </div>
      
      {/* 关系管理 */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">关系管理</h3>
        <div className="bg-white rounded-lg shadow p-4">
          {/* 关系列表 */}
          <div className="mb-4">
            <h4 className="font-medium mb-2">现有关系</h4>
            {relationships.map(relationship => (
              <div key={relationship.id} className="mb-2 p-2 border rounded">
                <p>{relationship.character1Id} - {relationship.type} - {relationship.character2Id}</p>
                <p className="text-sm text-gray-600">{relationship.description}</p>
              </div>
            ))}
          </div>
          
          {/* 创建关系表单 */}
          <div>
            <h4 className="font-medium mb-2">创建新关系</h4>
            {/* 这里可以添加创建关系的表单 */}
          </div>
        </div>
      </div>
      
      {/* 世界观管理 */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-2">世界观管理</h3>
        <div className="bg-white rounded-lg shadow p-4">
          {worldview ? (
            <div>
              <h4 className="font-medium">{worldview.name}</h4>
              <p className="mt-2">{worldview.description}</p>
              {/* 这里可以添加编辑世界观的表单 */}
            </div>
          ) : (
            <div>
              <p>还没有设置世界观</p>
              {/* 这里可以添加创建世界观的表单 */}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CharacterManager
