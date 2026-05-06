/**
 * 角色准备阶段展示组件
 * 
 * 用于展示和编辑角色阵容，包括：
 * - 主角团、配角、龙套等不同重要性的角色
 * - 角色卡片展示（头像、姓名、角色、性格、背景等）
 * - 角色关系图谱可视化
 * - 筛选和搜索角色
 * - 角色审核与修改功能
 * 
 * 集成工作流状态管理，支持在线编辑和保存
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import {
  Users,
  UserPlus,
  Search,
  Grid,
  List,
  Network,
  Edit3,
  Trash2,
  Save,
  X,
  Check,
  Loader2,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  Star,
  Heart,
  User,
  Link,
  Plus,
} from 'lucide-react'
import { useWorkflowStore } from '../stores/workflowStore'
import {
  WorkflowStage,
  type CharacterPreparationStageData,
  type VolumeResponsibility,
} from '../types/workflow'
import type { Character, Relationship } from '@shared/types'
import { generateCharacterCast } from '../services/api'

// ============================================================================
// 工具函数
// ============================================================================

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 生成唯一ID
function generateId(): string {
  return `char_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

// 获取角色重要性配置
function getImportanceConfig(importance: Character['importance']) {
  const configs = {
    main: {
      label: '主角',
      color: 'bg-gradient-to-r from-yellow-400 to-orange-500',
      textColor: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: Star,
    },
    supporting: {
      label: '配角',
      color: 'bg-gradient-to-r from-blue-400 to-indigo-500',
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: Heart,
    },
    minor: {
      label: '龙套',
      color: 'bg-gradient-to-r from-gray-400 to-gray-500',
      textColor: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      icon: User,
    },
  }
  return configs[importance] || configs.minor
}

// 获取关系类型配置
function getRelationshipConfig(type: Relationship['type']) {
  const configs = {
    family: { label: '家人', color: 'text-red-500', bgColor: 'bg-red-100' },
    friend: { label: '朋友', color: 'text-green-500', bgColor: 'bg-green-100' },
    enemy: { label: '敌人', color: 'text-red-600', bgColor: 'bg-red-100' },
    lover: { label: '恋人', color: 'text-pink-500', bgColor: 'bg-pink-100' },
    colleague: { label: '同事', color: 'text-blue-500', bgColor: 'bg-blue-100' },
    other: { label: '其他', color: 'text-gray-500', bgColor: 'bg-gray-100' },
  }
  return configs[type] || configs.other
}

// ============================================================================
// 组件属性
// ============================================================================

interface CharacterPreparationViewProps {
  /** 初始数据（用于编辑模式） */
  initialData?: Partial<CharacterPreparationStageData>
  /** 保存回调 */
  onSave?: (data: CharacterPreparationStageData) => Promise<void> | void
  /** 保存成功回调 */
  onSaveSuccess?: () => void
  /** 保存失败回调 */
  onSaveError?: (error: Error) => void
  /** 是否显示保存按钮 */
  showSaveButton?: boolean
  /** 是否禁用表单 */
  disabled?: boolean
  /** 自定义类名 */
  className?: string
  /** 是否自动生成 */
  autoGenerate?: boolean
}

// ============================================================================
// 角色卡片组件
// ============================================================================

interface CharacterCardProps {
  character: Character
  onEdit?: (character: Character) => void
  onDelete?: (id: string) => void
  onToggleImportance?: (id: string, importance: Character['importance']) => void
  disabled?: boolean
  compact?: boolean
}

function CharacterCard({
  character,
  onEdit,
  onDelete,
  onToggleImportance,
  disabled,
  compact = false,
}: CharacterCardProps) {
  const config = getImportanceConfig(character.importance)
  const IconComponent = config.icon

  if (compact) {
    return (
      <div
        className={cn(
          'flex items-center gap-3 p-3 rounded-lg border transition-all duration-200',
          config.bgColor,
          config.borderColor,
          'hover:shadow-md'
        )}
      >
        <div
          className={cn(
            'flex items-center justify-center w-10 h-10 rounded-full text-white font-bold',
            config.color
          )}
        >
          {character.name.charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{character.name}</h4>
          <p className="text-sm text-gray-500 truncate">{character.role}</p>
        </div>
        <span
          className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            config.bgColor,
            config.textColor
          )}
        >
          {config.label}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'bg-white rounded-xl border transition-all duration-200 overflow-hidden',
        config.borderColor,
        'hover:shadow-lg hover:border-gray-300'
      )}
    >
      {/* 头部 */}
      <div className={cn('p-4', config.bgColor)}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex items-center justify-center w-12 h-12 rounded-full text-white font-bold text-lg',
                config.color
              )}
            >
              {character.name.charAt(0)}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900">{character.name}</h4>
              <p className="text-sm text-gray-600">{character.role}</p>
            </div>
          </div>
          <span
            className={cn(
              'px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1',
              config.bgColor,
              config.textColor
            )}
          >
            <IconComponent className="w-3 h-3" />
            {config.label}
          </span>
        </div>
      </div>

      {/* 内容 */}
      <div className="p-4 space-y-3">
        {/* 基本信息 */}
        <div className="flex items-center gap-4 text-sm text-gray-600">
          <span>{character.gender === 'male' ? '男' : character.gender === 'female' ? '女' : '其他'}</span>
          <span>{character.age}岁</span>
        </div>

        {/* 性格 */}
        <div>
          <h5 className="text-xs font-medium text-gray-500 mb-1">性格</h5>
          <p className="text-sm text-gray-700 line-clamp-2">{character.personality}</p>
        </div>

        {/* 背景 */}
        <div>
          <h5 className="text-xs font-medium text-gray-500 mb-1">背景</h5>
          <p className="text-sm text-gray-700 line-clamp-2">{character.background}</p>
        </div>

        {/* 目标 */}
        {character.goals.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-gray-500 mb-1">目标</h5>
            <div className="flex flex-wrap gap-1">
              {character.goals.slice(0, 3).map((goal, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs"
                >
                  {goal}
                </span>
              ))}
              {character.goals.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                  +{character.goals.length - 3}
                </span>
              )}
            </div>
          </div>
        )}

        {/* 技能 */}
        {character.skills.length > 0 && (
          <div>
            <h5 className="text-xs font-medium text-gray-500 mb-1">技能</h5>
            <div className="flex flex-wrap gap-1">
              {character.skills.slice(0, 3).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs"
                >
                  {skill}
                </span>
              ))}
              {character.skills.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                  +{character.skills.length - 3}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      {!disabled && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onToggleImportance?.(character.id, 'main')}
              disabled={character.importance === 'main'}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                character.importance === 'main'
                  ? 'bg-yellow-100 text-yellow-600'
                  : 'text-gray-400 hover:bg-yellow-50 hover:text-yellow-600'
              )}
              title="设为主角"
            >
              <Star className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleImportance?.(character.id, 'supporting')}
              disabled={character.importance === 'supporting'}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                character.importance === 'supporting'
                  ? 'bg-blue-100 text-blue-600'
                  : 'text-gray-400 hover:bg-blue-50 hover:text-blue-600'
              )}
              title="设为配角"
            >
              <Heart className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onToggleImportance?.(character.id, 'minor')}
              disabled={character.importance === 'minor'}
              className={cn(
                'p-1.5 rounded-lg transition-colors',
                character.importance === 'minor'
                  ? 'bg-gray-200 text-gray-600'
                  : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
              )}
              title="设为龙套"
            >
              <User className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onEdit?.(character)}
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="编辑"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => onDelete?.(character.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="删除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 角色编辑器组件
// ============================================================================

interface CharacterEditorProps {
  character?: Character | null
  onSave: (character: Character) => void
  onCancel: () => void
}

function CharacterEditor({
  character,
  onSave,
  onCancel,
}: CharacterEditorProps) {
  const [formData, setFormData] = useState<Omit<Character, 'id'>>({
    name: character?.name || '',
    age: character?.age || 18,
    gender: character?.gender || 'male',
    personality: character?.personality || '',
    background: character?.background || '',
    appearance: character?.appearance || '',
    goals: character?.goals || [],
    fears: character?.fears || [],
    skills: character?.skills || [],
    relationships: character?.relationships || [],
    role: character?.role || '',
    importance: character?.importance || 'supporting',
  })

  const [newGoal, setNewGoal] = useState('')
  const [newFear, setNewFear] = useState('')
  const [newSkill, setNewSkill] = useState('')

  const handleAddGoal = () => {
    if (newGoal.trim()) {
      setFormData((prev) => ({ ...prev, goals: [...prev.goals, newGoal.trim()] }))
      setNewGoal('')
    }
  }

  const handleRemoveGoal = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.filter((_, i) => i !== index),
    }))
  }

  const handleAddFear = () => {
    if (newFear.trim()) {
      setFormData((prev) => ({ ...prev, fears: [...prev.fears, newFear.trim()] }))
      setNewFear('')
    }
  }

  const handleRemoveFear = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      fears: prev.fears.filter((_, i) => i !== index),
    }))
  }

  const handleAddSkill = () => {
    if (newSkill.trim()) {
      setFormData((prev) => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }))
      setNewSkill('')
    }
  }

  const handleRemoveSkill = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index),
    }))
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      return
    }

    const charData: Character = {
      id: character?.id || generateId(),
      ...formData,
    }

    onSave(charData)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">
          {character ? '编辑角色' : '添加角色'}
        </h3>
      </div>

      <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              姓名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className="input-field"
              placeholder="角色姓名"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">年龄</label>
            <input
              type="number"
              min={0}
              max={1000}
              value={formData.age}
              onChange={(e) => setFormData((prev) => ({ ...prev, age: Number(e.target.value) }))}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">性别</label>
            <select
              value={formData.gender}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, gender: e.target.value as Character['gender'] }))
              }
              className="input-field"
            >
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">重要性</label>
            <select
              value={formData.importance}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  importance: e.target.value as Character['importance'],
                }))
              }
              className="input-field"
            >
              <option value="main">主角</option>
              <option value="supporting">配角</option>
              <option value="minor">龙套</option>
            </select>
          </div>
        </div>

        {/* 角色定位 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">角色定位</label>
          <input
            type="text"
            value={formData.role}
            onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
            className="input-field"
            placeholder="如：男主角、反派、导师等"
          />
        </div>

        {/* 性格 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">性格特点</label>
          <textarea
            value={formData.personality}
            onChange={(e) => setFormData((prev) => ({ ...prev, personality: e.target.value }))}
            className="textarea-field"
            rows={3}
            placeholder="描述角色的性格特点"
          />
        </div>

        {/* 背景 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">背景故事</label>
          <textarea
            value={formData.background}
            onChange={(e) => setFormData((prev) => ({ ...prev, background: e.target.value }))}
            className="textarea-field"
            rows={3}
            placeholder="描述角色的背景故事"
          />
        </div>

        {/* 外貌 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">外貌描述</label>
          <textarea
            value={formData.appearance}
            onChange={(e) => setFormData((prev) => ({ ...prev, appearance: e.target.value }))}
            className="textarea-field"
            rows={2}
            placeholder="描述角色的外貌特征"
          />
        </div>

        {/* 目标 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">目标</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.goals.map((goal, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {goal}
                <button
                  type="button"
                  onClick={() => handleRemoveGoal(idx)}
                  className="ml-2 text-green-600 hover:text-green-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newGoal}
              onChange={(e) => setNewGoal(e.target.value)}
              className="input-field flex-1"
              placeholder="添加目标"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddGoal()
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddGoal}
              className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              添加
            </button>
          </div>
        </div>

        {/* 恐惧 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">恐惧</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.fears.map((fear, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm"
              >
                {fear}
                <button
                  type="button"
                  onClick={() => handleRemoveFear(idx)}
                  className="ml-2 text-red-600 hover:text-red-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newFear}
              onChange={(e) => setNewFear(e.target.value)}
              className="input-field flex-1"
              placeholder="添加恐惧"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddFear()
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddFear}
              className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              添加
            </button>
          </div>
        </div>

        {/* 技能 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">技能</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.skills.map((skill, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {skill}
                <button
                  type="button"
                  onClick={() => handleRemoveSkill(idx)}
                  className="ml-2 text-blue-600 hover:text-blue-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              className="input-field flex-1"
              placeholder="添加技能"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleAddSkill()
                }
              }}
            />
            <button
              type="button"
              onClick={handleAddSkill}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              添加
            </button>
          </div>
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          取消
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!formData.name.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {character ? '保存修改' : '添加角色'}
        </button>
      </div>
    </div>
  )
}

// ============================================================================
// 关系图谱组件
// ============================================================================

interface RelationshipGraphProps {
  characters: Character[]
  relationships: Relationship[]
  onAddRelationship?: (relationship: Omit<Relationship, 'id' | 'createdAt' | 'updatedAt'>) => void
  onDeleteRelationship?: (id: string) => void
  disabled?: boolean
}

function RelationshipGraph({
  characters,
  relationships,
  onAddRelationship,
  onDeleteRelationship,
  disabled,
}: RelationshipGraphProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedChar, setSelectedChar] = useState<string | null>(null)
  const [hoveredRel, setHoveredRel] = useState<string | null>(null)
  const [isAddingRel, setIsAddingRel] = useState(false)
  const [newRel, setNewRel] = useState({
    character1Id: '',
    character2Id: '',
    type: 'friend' as Relationship['type'],
    description: '',
    strength: 5,
  })

  // 计算角色位置（圆形布局）
  const charPositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {}
    const centerX = 300
    const centerY = 250
    const radius = 200

    characters.forEach((char, index) => {
      const angle = (2 * Math.PI * index) / characters.length - Math.PI / 2
      positions[char.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      }
    })

    return positions
  }, [characters])

  // 绘制图谱
  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 绘制关系线
    relationships.forEach((rel) => {
      const pos1 = charPositions[rel.character1Id]
      const pos2 = charPositions[rel.character2Id]
      if (!pos1 || !pos2) return

      const config = getRelationshipConfig(rel.type)
      const isHovered = hoveredRel === rel.id

      ctx.beginPath()
      ctx.moveTo(pos1.x, pos1.y)
      ctx.lineTo(pos2.x, pos2.y)
      ctx.strokeStyle = isHovered ? '#3b82f6' : config.color.replace('text-', '').replace('-500', '')
      ctx.lineWidth = isHovered ? 3 : rel.strength / 3
      ctx.stroke()

      // 绘制关系标签
      const midX = (pos1.x + pos2.x) / 2
      const midY = (pos1.y + pos2.y) / 2
      ctx.fillStyle = '#374151'
      ctx.font = '12px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(config.label, midX, midY)
    })

    // 绘制角色节点
    characters.forEach((char) => {
      const pos = charPositions[char.id]
      if (!pos) return

      const config = getImportanceConfig(char.importance)
      const isSelected = selectedChar === char.id

      // 绘制节点
      ctx.beginPath()
      ctx.arc(pos.x, pos.y, isSelected ? 30 : 25, 0, 2 * Math.PI)
      ctx.fillStyle = isSelected ? '#3b82f6' : config.color.replace('bg-gradient-to-r from-', '').split(' ')[0]
      ctx.fill()

      // 绘制姓名
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(char.name.charAt(0), pos.x, pos.y)

      // 绘制姓名标签
      ctx.fillStyle = '#1f2937'
      ctx.font = '12px sans-serif'
      ctx.fillText(char.name, pos.x, pos.y + 40)
    })
  }, [characters, relationships, charPositions, selectedChar, hoveredRel])

  // 处理点击
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    // 检查是否点击了角色
    for (const char of characters) {
      const pos = charPositions[char.id]
      if (!pos) continue

      const distance = Math.sqrt((x - pos.x) ** 2 + (y - pos.y) ** 2)
      if (distance < 25) {
        setSelectedChar(selectedChar === char.id ? null : char.id)
        return
      }
    }

    setSelectedChar(null)
  }

  // 添加关系
  const handleAddRelationship = () => {
    if (!newRel.character1Id || !newRel.character2Id || newRel.character1Id === newRel.character2Id) {
      return
    }

    onAddRelationship?.({
      character1Id: newRel.character1Id,
      character2Id: newRel.character2Id,
      type: newRel.type,
      description: newRel.description,
      strength: newRel.strength,
    })

    setNewRel({
      character1Id: '',
      character2Id: '',
      type: 'friend',
      description: '',
      strength: 5,
    })
    setIsAddingRel(false)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Network className="w-5 h-5 text-purple-600" />
          角色关系图谱
        </h3>
        {!disabled && (
          <button
            type="button"
            onClick={() => setIsAddingRel(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            添加关系
          </button>
        )}
      </div>

      <div ref={containerRef} className="p-4">
        {/* 图谱画布 */}
        <div className="flex justify-center">
          <canvas
            ref={canvasRef}
            width={600}
            height={500}
            onClick={handleCanvasClick}
            className="border border-gray-100 rounded-lg cursor-pointer"
          />
        </div>

        {/* 图例 */}
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm text-gray-600">
          {Object.entries(getRelationshipConfig('family')).length > 0 &&
            Object.entries({
              family: { label: '家人', color: 'bg-red-500' },
              friend: { label: '朋友', color: 'bg-green-500' },
              enemy: { label: '敌人', color: 'bg-red-600' },
              lover: { label: '恋人', color: 'bg-pink-500' },
              colleague: { label: '同事', color: 'bg-blue-500' },
            }).map(([key, value]) => (
              <div key={key} className="flex items-center gap-1">
                <div className={cn('w-3 h-3 rounded-full', value.color)} />
                <span>{value.label}</span>
              </div>
            ))}
        </div>

        {/* 关系列表 */}
        {relationships.length > 0 && (
          <div className="mt-4 space-y-2">
            <h4 className="text-sm font-medium text-gray-700">关系列表</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {relationships.map((rel) => {
                const char1 = characters.find((c) => c.id === rel.character1Id)
                const char2 = characters.find((c) => c.id === rel.character2Id)
                const config = getRelationshipConfig(rel.type)

                return (
                  <div
                    key={rel.id}
                    className={cn(
                      'flex items-center justify-between p-2 rounded-lg border',
                      config.bgColor,
                      'border-gray-200'
                    )}
                    onMouseEnter={() => setHoveredRel(rel.id)}
                    onMouseLeave={() => setHoveredRel(null)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{char1?.name || '未知'}</span>
                      <span className={cn('text-xs', config.color)}>{config.label}</span>
                      <span className="font-medium text-gray-900">{char2?.name || '未知'}</span>
                    </div>
                    {!disabled && (
                      <button
                        type="button"
                        onClick={() => onDeleteRelationship?.(rel.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* 添加关系弹窗 */}
      {isAddingRel && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">添加角色关系</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色1</label>
                <select
                  value={newRel.character1Id}
                  onChange={(e) => setNewRel((prev) => ({ ...prev, character1Id: e.target.value }))}
                  className="input-field"
                >
                  <option value="">选择角色</option>
                  {characters.map((char) => (
                    <option key={char.id} value={char.id}>
                      {char.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关系类型</label>
                <select
                  value={newRel.type}
                  onChange={(e) =>
                    setNewRel((prev) => ({ ...prev, type: e.target.value as Relationship['type'] }))
                  }
                  className="input-field"
                >
                  <option value="family">家人</option>
                  <option value="friend">朋友</option>
                  <option value="enemy">敌人</option>
                  <option value="lover">恋人</option>
                  <option value="colleague">同事</option>
                  <option value="other">其他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">角色2</label>
                <select
                  value={newRel.character2Id}
                  onChange={(e) => setNewRel((prev) => ({ ...prev, character2Id: e.target.value }))}
                  className="input-field"
                >
                  <option value="">选择角色</option>
                  {characters
                    .filter((c) => c.id !== newRel.character1Id)
                    .map((char) => (
                      <option key={char.id} value={char.id}>
                        {char.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">关系描述</label>
                <input
                  type="text"
                  value={newRel.description}
                  onChange={(e) => setNewRel((prev) => ({ ...prev, description: e.target.value }))}
                  className="input-field"
                  placeholder="描述两人之间的关系"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  关系强度: {newRel.strength}
                </label>
                <input
                  type="range"
                  min={1}
                  max={10}
                  value={newRel.strength}
                  onChange={(e) => setNewRel((prev) => ({ ...prev, strength: Number(e.target.value) }))}
                  className="w-full"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsAddingRel(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddRelationship}
                disabled={!newRel.character1Id || !newRel.character2Id}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                添加
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// 质量检查提示组件
// ============================================================================

interface QualityCheckProps {
  characters: Character[]
  relationships: Relationship[]
}

function QualityCheck({ characters, relationships }: QualityCheckProps) {
  const issues = useMemo(() => {
    const result: { type: 'warning' | 'error'; message: string; characterId?: string }[] = []

    // 检查主角
    const mainChars = characters.filter((c) => c.importance === 'main')
    if (mainChars.length === 0) {
      result.push({ type: 'error', message: '缺少主角，至少需要一个主角' })
    }

    // 检查角色名
    characters.forEach((char) => {
      if (char.name.length < 2) {
        result.push({
          type: 'warning',
          message: `角色"${char.name}"姓名过短，建议使用2个字以上的名字`,
          characterId: char.id,
        })
      }

      // 检查功能位角色名
      const functionalNames = ['路人甲', '路人乙', '配角A', '配角B', '龙套1', '龙套2']
      if (functionalNames.some((n) => char.name.includes(n))) {
        result.push({
          type: 'warning',
          message: `角色"${char.name}"使用了功能位名称，建议使用更有特色的名字`,
          characterId: char.id,
        })
      }

      // 检查身份锚点
      if (!char.role) {
        result.push({
          type: 'warning',
          message: `角色"${char.name}"缺少身份锚点，建议添加角色定位`,
          characterId: char.id,
        })
      }

      // 检查性格
      if (!char.personality) {
        result.push({
          type: 'warning',
          message: `角色"${char.name}"缺少性格描述`,
          characterId: char.id,
        })
      }

      // 检查背景
      if (!char.background) {
        result.push({
          type: 'warning',
          message: `角色"${char.name}"缺少背景故事`,
          characterId: char.id,
        })
      }
    })

    // 检查关系
    const charsWithRelations = new Set<string>()
    relationships.forEach((rel) => {
      charsWithRelations.add(rel.character1Id)
      charsWithRelations.add(rel.character2Id)
    })

    characters.forEach((char) => {
      if (!charsWithRelations.has(char.id) && characters.length > 1) {
        result.push({
          type: 'warning',
          message: `角色"${char.name}"没有与其他角色的关系`,
          characterId: char.id,
        })
      }
    })

    return result
  }, [characters, relationships])

  if (issues.length === 0) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2 text-green-700">
          <Check className="w-5 h-5" />
          <span className="font-medium">角色阵容质量检查通过</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-center gap-2 text-amber-700 mb-3">
        <AlertTriangle className="w-5 h-5" />
        <span className="font-medium">角色阵容质量检查 ({issues.length}个问题)</span>
      </div>
      <ul className="space-y-1">
        {issues.map((issue, idx) => (
          <li
            key={idx}
            className={cn(
              'text-sm flex items-start gap-2',
              issue.type === 'error' ? 'text-red-600' : 'text-amber-600'
            )}
          >
            {issue.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <span>{issue.message}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ============================================================================
// 主组件
// ============================================================================

export default function CharacterPreparationView({
  initialData,
  onSave,
  onSaveSuccess,
  onSaveError,
  showSaveButton = true,
  disabled = false,
  className,
  autoGenerate = false,
}: CharacterPreparationViewProps) {
  // 从工作流 store 获取数据
  const { updateStageData, getStageData, completeStage } = useWorkflowStore()
  const existingData = getStageData(WorkflowStage.CHARACTER_PREPARATION)
  const macroPlanningData = getStageData(WorkflowStage.MACRO_PLANNING)
  const projectSettingData = getStageData(WorkflowStage.PROJECT_SETTING)

  // 状态
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'graph'>('grid')
  const [activeTab, setActiveTab] = useState<'characters' | 'relationships'>('characters')
  const [searchQuery, setSearchQuery] = useState('')
  const [filterImportance, setFilterImportance] = useState<Character['importance'] | 'all'>('all')
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null)
  const [isAddingCharacter, setIsAddingCharacter] = useState(false)

  // 表单数据
  const [mainCharacters, setMainCharacters] = useState<Character[]>([])
  const [supportingCharacters, setSupportingCharacters] = useState<Character[]>([])
  const [relationships, setRelationships] = useState<Relationship[]>([])
  const [volumeResponsibilities, setVolumeResponsibilities] = useState<VolumeResponsibility[]>([])
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  // 从 workflowStore 加载数据
  useEffect(() => {
    if (isDataLoaded) return
    
    const store = useWorkflowStore.getState()
    const freshData = store.getStageData(WorkflowStage.CHARACTER_PREPARATION) as CharacterPreparationStageData | null
    
    if (freshData) {
      setMainCharacters(freshData.mainCharacters || [])
      setSupportingCharacters(freshData.supportingCharacters || [])
      setRelationships(freshData.relationships || [])
      setVolumeResponsibilities(freshData.volumeResponsibilities || [])
      console.log('从 workflowStore 加载角色数据:', {
        main: freshData.mainCharacters?.length || 0,
        supporting: freshData.supportingCharacters?.length || 0,
        relationships: freshData.relationships?.length || 0
      })
    } else if (initialData || existingData) {
      // 如果没有从 store 获取到数据，使用传入的数据
      setMainCharacters(initialData?.mainCharacters || existingData?.mainCharacters || [])
      setSupportingCharacters(initialData?.supportingCharacters || existingData?.supportingCharacters || [])
      setRelationships(initialData?.relationships || existingData?.relationships || [])
      setVolumeResponsibilities(initialData?.volumeResponsibilities || existingData?.volumeResponsibilities || [])
    }
    
    setIsDataLoaded(true)
  }, [isDataLoaded, initialData, existingData])

  // 所有角色
  const allCharacters = useMemo(() => [...mainCharacters, ...supportingCharacters], [mainCharacters, supportingCharacters])

  // 筛选后的角色
  const filteredCharacters = useMemo(() => {
    let result = allCharacters

    if (filterImportance !== 'all') {
      result = result.filter((c) => c.importance === filterImportance)
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.role.toLowerCase().includes(query) ||
          c.personality.toLowerCase().includes(query)
      )
    }

    return result
  }, [allCharacters, filterImportance, searchQuery])

  // 自动生成
  useEffect(() => {
    if (autoGenerate && !existingData && macroPlanningData && projectSettingData) {
      handleGenerate()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 生成角色阵容
  const handleGenerate = async () => {
    if (!macroPlanningData || !projectSettingData) {
      console.error('缺少宏观规划或项目设定数据')
      return
    }

    setIsGenerating(true)

    try {
      const response = await generateCharacterCast({
        title: projectSettingData.title,
        genre: projectSettingData.genre,
        coreSellingPoint: projectSettingData.coreSellingPoint,
        targetReaderFeeling: projectSettingData.targetReaderFeeling,
        overallDirection: macroPlanningData.overallDirection,
        coreConflict: macroPlanningData.coreConflict,
        theme: macroPlanningData.theme,
        worldviewSummary: macroPlanningData.worldviewSummary,
      })

      const newMainCharacters = response.mainCharacters || []
      const newSupportingCharacters = response.supportingCharacters || []
      const newRelationships = response.relationships || []
      const newVolumeResponsibilities = response.volumeResponsibilities || []

      setMainCharacters(newMainCharacters)
      setSupportingCharacters(newSupportingCharacters)
      setRelationships(newRelationships)
      setVolumeResponsibilities(newVolumeResponsibilities)

      // 自动保存到 workflowStore
      const charData: CharacterPreparationStageData = {
        mainCharacters: newMainCharacters,
        supportingCharacters: newSupportingCharacters,
        relationships: newRelationships,
        volumeResponsibilities: newVolumeResponsibilities,
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      updateStageData(WorkflowStage.CHARACTER_PREPARATION, charData)
      setSaveSuccess(true)
      
    } catch (error) {
      console.error('生成角色阵容失败:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // 添加更多角色（合并现有角色）
  const handleAddMoreCharacters = async () => {
    if (!macroPlanningData || !projectSettingData) {
      console.error('缺少宏观规划或项目设定数据')
      return
    }

    setIsGenerating(true)

    try {
      const response = await generateCharacterCast({
        title: projectSettingData.title,
        genre: projectSettingData.genre,
        coreSellingPoint: projectSettingData.coreSellingPoint,
        targetReaderFeeling: projectSettingData.targetReaderFeeling,
        overallDirection: macroPlanningData.overallDirection,
        coreConflict: macroPlanningData.coreConflict,
        theme: macroPlanningData.theme,
        worldviewSummary: macroPlanningData.worldviewSummary,
      })

      const newMainCharacters = response.mainCharacters || []
      const newSupportingCharacters = response.supportingCharacters || []
      const newRelationships = response.relationships || []
      const newVolumeResponsibilities = response.volumeResponsibilities || []

      // 合并现有角色和新角色（去重）
      const existingIds = new Set([...mainCharacters, ...supportingCharacters].map(c => c.id))
      const filteredNewMain = newMainCharacters.filter(c => !existingIds.has(c.id))
      const filteredNewSupporting = newSupportingCharacters.filter(c => !existingIds.has(c.id))

      const mergedMainCharacters = [...mainCharacters, ...filteredNewMain]
      const mergedSupportingCharacters = [...supportingCharacters, ...filteredNewSupporting]
      
      // 合并关系（去重）
      const existingRelIds = new Set(relationships.map(r => r.id))
      const filteredNewRelationships = newRelationships.filter(r => !existingRelIds.has(r.id))
      const mergedRelationships = [...relationships, ...filteredNewRelationships]

      setMainCharacters(mergedMainCharacters)
      setSupportingCharacters(mergedSupportingCharacters)
      setRelationships(mergedRelationships)
      setVolumeResponsibilities(prev => [...prev, ...newVolumeResponsibilities])

      // 自动保存到 workflowStore
      const charData: CharacterPreparationStageData = {
        mainCharacters: mergedMainCharacters,
        supportingCharacters: mergedSupportingCharacters,
        relationships: mergedRelationships,
        volumeResponsibilities: [...volumeResponsibilities, ...newVolumeResponsibilities],
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      updateStageData(WorkflowStage.CHARACTER_PREPARATION, charData)
      setSaveSuccess(true)
      
    } catch (error) {
      console.error('添加更多角色失败:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  // 保存数据
  const handleSave = useCallback(async () => {
    setIsSaving(true)
    setSaveSuccess(false)

    try {
      const charData: CharacterPreparationStageData = {
        mainCharacters,
        supportingCharacters,
        relationships,
        volumeResponsibilities,
        createdAt: existingData?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // 更新工作流状态
      updateStageData(WorkflowStage.CHARACTER_PREPARATION, charData)

      // 调用外部保存回调
      if (onSave) {
        await onSave(charData)
      }

      setSaveSuccess(true)
      onSaveSuccess?.()
    } catch (error) {
      console.error('保存角色准备数据失败:', error)
      onSaveError?.(error instanceof Error ? error : new Error('保存失败'))
    } finally {
      setIsSaving(false)
    }
  }, [mainCharacters, supportingCharacters, relationships, volumeResponsibilities, existingData, updateStageData, onSave, onSaveSuccess, onSaveError])

  // 完成阶段
  const handleComplete = useCallback(async () => {
    await handleSave()
    completeStage(WorkflowStage.CHARACTER_PREPARATION)
  }, [handleSave, completeStage])

  // 添加角色
  const handleAddCharacter = useCallback((character: Character) => {
    if (character.importance === 'main') {
      setMainCharacters((prev) => [...prev, character])
    } else {
      setSupportingCharacters((prev) => [...prev, character])
    }
    setIsAddingCharacter(false)
    setEditingCharacter(null)
  }, [])

  // 更新角色
  const handleUpdateCharacter = useCallback((character: Character) => {
    // 先从原列表中移除
    setMainCharacters((prev) => prev.filter((c) => c.id !== character.id))
    setSupportingCharacters((prev) => prev.filter((c) => c.id !== character.id))

    // 根据新的重要性添加到对应列表
    if (character.importance === 'main') {
      setMainCharacters((prev) => [...prev, character])
    } else {
      setSupportingCharacters((prev) => [...prev, character])
    }

    setEditingCharacter(null)
  }, [])

  // 删除角色
  const handleDeleteCharacter = useCallback((id: string) => {
    setMainCharacters((prev) => prev.filter((c) => c.id !== id))
    setSupportingCharacters((prev) => prev.filter((c) => c.id !== id))
    // 同时删除相关的关系
    setRelationships((prev) =>
      prev.filter((r) => r.character1Id !== id && r.character2Id !== id)
    )
  }, [])

  // 切换角色重要性
  const handleToggleImportance = useCallback(
    (id: string, newImportance: Character['importance']) => {
      const char = allCharacters.find((c) => c.id === id)
      if (!char) return

      const updatedChar = { ...char, importance: newImportance }
      handleUpdateCharacter(updatedChar)
    },
    [allCharacters, handleUpdateCharacter]
  )

  // 添加关系
  const handleAddRelationship = useCallback(
    (rel: Omit<Relationship, 'id'>) => {
      const newRel: Relationship = {
        ...rel,
        id: generateId(),
      }
      setRelationships((prev) => [...prev, newRel])
    },
    []
  )

  // 删除关系
  const handleDeleteRelationship = useCallback((id: string) => {
    setRelationships((prev) => prev.filter((r) => r.id !== id))
  }, [])

  return (
    <div className={cn('space-y-6', className)}>
      {/* 标题区域 */}
      <div className="border-b border-gray-200 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-600" />
              角色准备
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              生成主角团、关系网和卷级职责分配
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={allCharacters.length > 0 ? handleAddMoreCharacters : handleGenerate}
              disabled={isGenerating || !macroPlanningData}
              className={cn(
                'flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : allCharacters.length > 0 ? (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  添加更多角色
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 生成角色
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* 生成中状态 */}
      {isGenerating && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
          <p className="text-gray-600">正在生成角色阵容...</p>
          <p className="text-sm text-gray-400 mt-2">这可能需要一些时间，请耐心等待</p>
        </div>
      )}

      {/* 加载数据中状态 */}
      {!isDataLoaded && !isGenerating && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mb-4" />
          <p className="text-gray-600">正在加载角色数据...</p>
        </div>
      )}

      {/* 主要内容 */}
      {isDataLoaded && !isGenerating && (
        <div className="space-y-6">
          {/* 统计信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{mainCharacters.length}</p>
                  <p className="text-sm text-gray-500">主角</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Heart className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{supportingCharacters.length}</p>
                  <p className="text-sm text-gray-500">配角</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Link className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{relationships.length}</p>
                  <p className="text-sm text-gray-500">关系</p>
                </div>
              </div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{allCharacters.length}</p>
                  <p className="text-sm text-gray-500">总角色</p>
                </div>
              </div>
            </div>
          </div>

          {/* 质量检查 */}
          <QualityCheck characters={allCharacters} relationships={relationships} />

          {/* 标签页 */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8">
              <button
                type="button"
                onClick={() => setActiveTab('characters')}
                className={cn(
                  'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                  activeTab === 'characters'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                角色阵容 ({allCharacters.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('relationships')}
                className={cn(
                  'py-3 px-1 border-b-2 font-medium text-sm transition-colors',
                  activeTab === 'relationships'
                    ? 'border-purple-500 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                关系图谱 ({relationships.length})
              </button>
            </nav>
          </div>

          {/* 角色阵容 */}
          {activeTab === 'characters' && (
            <div className="space-y-4">
              {/* 工具栏 */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  {/* 搜索 */}
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="搜索角色..."
                      className="input-field pl-10"
                    />
                  </div>

                  {/* 筛选 */}
                  <select
                    value={filterImportance}
                    onChange={(e) =>
                      setFilterImportance(e.target.value as Character['importance'] | 'all')
                    }
                    className="input-field w-auto"
                  >
                    <option value="all">全部角色</option>
                    <option value="main">主角</option>
                    <option value="supporting">配角</option>
                    <option value="minor">龙套</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {/* 视图切换 */}
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setViewMode('grid')}
                      className={cn(
                        'p-2 transition-colors',
                        viewMode === 'grid' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
                      )}
                      title="网格视图"
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode('list')}
                      className={cn(
                        'p-2 transition-colors',
                        viewMode === 'list' ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:text-gray-700'
                      )}
                      title="列表视图"
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>

                  {/* 添加按钮 */}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => setIsAddingCharacter(true)}
                      className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <UserPlus className="w-4 h-4" />
                      添加角色
                    </button>
                  )}
                </div>
              </div>

              {/* 角色列表 */}
              {filteredCharacters.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">
                    {searchQuery || filterImportance !== 'all'
                      ? '没有找到匹配的角色'
                      : '暂无角色，点击"添加角色"或"AI 生成角色"开始'}
                  </p>
                </div>
              ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredCharacters.map((character) => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      onEdit={setEditingCharacter}
                      onDelete={handleDeleteCharacter}
                      onToggleImportance={handleToggleImportance}
                      disabled={disabled}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredCharacters.map((character) => (
                    <CharacterCard
                      key={character.id}
                      character={character}
                      onEdit={setEditingCharacter}
                      onDelete={handleDeleteCharacter}
                      onToggleImportance={handleToggleImportance}
                      disabled={disabled}
                      compact
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 关系图谱 */}
          {activeTab === 'relationships' && (
            <RelationshipGraph
              characters={allCharacters}
              relationships={relationships}
              onAddRelationship={handleAddRelationship}
              onDeleteRelationship={handleDeleteRelationship}
              disabled={disabled}
            />
          )}
        </div>
      )}

      {/* 角色编辑器 */}
      {(editingCharacter || isAddingCharacter) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CharacterEditor
              character={editingCharacter}
              onSave={editingCharacter ? handleUpdateCharacter : handleAddCharacter}
              onCancel={() => {
                setEditingCharacter(null)
                setIsAddingCharacter(false)
              }}
            />
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      {showSaveButton && !isGenerating && (
        <div className="flex items-center justify-between pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-2">
            {saveSuccess && (
              <div className="flex items-center text-sm text-green-600">
                <Check className="w-4 h-4 mr-1" />
                <span>保存成功</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={disabled || isGenerating || !macroPlanningData || !projectSettingData}
              className={cn(
                'flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600',
                'disabled:bg-gray-300 disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed'
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  AI 辅助生成
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={disabled || isSaving}
              className={cn(
                'flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                'bg-purple-600 text-white hover:bg-purple-700',
                'disabled:bg-gray-300 disabled:cursor-not-allowed'
              )}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存角色
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleComplete}
              disabled={disabled || isSaving}
              className={cn(
                'flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200',
                'bg-green-600 text-white hover:bg-green-700',
                'disabled:bg-gray-300 disabled:cursor-not-allowed'
              )}
            >
              完成并继续
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
