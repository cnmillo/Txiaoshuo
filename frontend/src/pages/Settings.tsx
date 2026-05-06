import { useState, useEffect } from 'react'
import { Server, Plus, Edit2, Trash2, Zap, Check, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { aiModelApi } from '../services'
import type { AIModel } from '../types/aiModel'
import { useAppStore } from '../stores/appStore'

function Settings() {
  const { aiModels, activeModel, setAIModels, setActiveModel } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingModel, setEditingModel] = useState<AIModel | null>(null)
  const [modelForm, setModelForm] = useState({
    name: '',
    baseUrl: '',
    apiKey: '',
    modelId: ''
  })
  const [testing, setTesting] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AIModel | null>(null)

  const loadModels = async () => {
    try {
      const res = await aiModelApi.getAll()
      setAIModels(res.data)
      const active = res.data.find((m: AIModel) => m.isActive)
      if (active) {
        setActiveModel(active)
      }
    } catch (error) {
      toast.error('加载模型配置失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadModels()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleOpenModal = (model?: AIModel) => {
    if (model) {
      setEditingModel(model)
      setModelForm({
        name: model.name,
        baseUrl: model.baseUrl,
        apiKey: model.apiKey,
        modelId: model.modelId
      })
    } else {
      setEditingModel(null)
      setModelForm({ name: '', baseUrl: '', apiKey: '', modelId: '' })
    }
    setShowModal(true)
  }

  const handleSaveModel = async () => {
    if (!modelForm.name || !modelForm.baseUrl || !modelForm.modelId) {
      toast.error('请填写完整信息')
      return
    }

    try {
      if (editingModel) {
        await aiModelApi.update(editingModel.id, modelForm)
        toast.success('模型已更新')
      } else {
        await aiModelApi.create(modelForm)
        toast.success('模型已添加')
      }
      setShowModal(false)
      loadModels()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('保存模型失败:', error)
      const errorMsg = error.response?.data?.error || error.message || '保存失败'
      toast.error(errorMsg)
    }
  }

  const handleDeleteModel = async (model: AIModel) => {
    setDeleteTarget(model)
    setShowDeleteConfirm(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return

    try {
      await aiModelApi.delete(deleteTarget.id)
      toast.success('删除成功')
      if (activeModel?.id === deleteTarget.id) {
        setActiveModel(null)
      }
      loadModels()
    } catch (error) {
      toast.error('删除失败')
    } finally {
      setShowDeleteConfirm(false)
      setDeleteTarget(null)
    }
  }

  const cancelDelete = () => {
    setShowDeleteConfirm(false)
    setDeleteTarget(null)
  }

  const handleTestModel = async (model: AIModel) => {
    setTesting(model.id)
    try {
      const res = await aiModelApi.test(model.id)
      if (res.data.success) {
        toast.success(`✅ ${res.data.message} (${res.data.latency}ms)`)
      } else {
        toast.error(`❌ ${res.data.message}`)
      }
      loadModels()
    } catch (error) {
      toast.error('测试失败')
    } finally {
      setTesting(null)
    }
  }

  const handleSetActive = async (model: AIModel) => {
    try {
      await aiModelApi.setActive(model.id)
      setActiveModel(model)
      toast.success(`已切换到 ${model.name}`)
      loadModels()
    } catch (error) {
      toast.error('切换失败')
    }
  }

  const maskApiKey = (key: string) => {
    if (!key || key.length < 8) return key
    return key.substring(0, 4) + '...' + key.substring(key.length - 4)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">设置</h1>
        <p className="text-gray-600 mt-1">配置AI模型和系统设置</p>
      </div>

      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Server className="w-5 h-5 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">AI模型配置</h2>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="btn-primary flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>添加模型</span>
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">支持的模型类型</p>
              <p>支持所有OpenAI兼容的API，包括：OpenAI、Claude、智谱AI、文心一言、通义千问、DeepSeek等</p>
            </div>
          </div>
        </div>

        {aiModels.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            暂无AI模型配置，点击上方按钮添加
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {aiModels.map((model: AIModel) => (
              <div
                key={model.id}
                className={`relative border rounded-lg p-4 transition-all cursor-pointer ${
                  activeModel?.id === model.id
                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                    : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                }`}
                onClick={() => handleSetActive(model)}
              >
                {activeModel?.id === model.id && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary-600 text-white">
                      <Check className="w-3 h-3 mr-1" />
                      当前使用
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      model.testStatus === 'success' ? 'bg-green-500' :
                      model.testStatus === 'failed' ? 'bg-red-500' : 'bg-yellow-400'
                    }`} />
                    <h3 className="font-semibold text-gray-900">{model.name}</h3>
                  </div>
                  <div className="flex space-x-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleTestModel(model)}
                      disabled={testing === model.id}
                      className="p-1.5 text-gray-400 hover:text-yellow-600 hover:bg-yellow-50 rounded transition-colors"
                      title="测试连接"
                    >
                      {testing === model.id ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
                      ) : (
                        <Zap className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleOpenModal(model)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteModel(model)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-500 truncate mb-1">{model.baseUrl}</p>
                <p className="text-xs text-gray-400">{model.modelId}</p>
                <p className="text-xs text-gray-400 mt-1">
                  API Key: {maskApiKey(model.apiKey)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">
              {editingModel ? '编辑模型' : '添加模型'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模型名称 *
                </label>
                <input
                  type="text"
                  value={modelForm.name}
                  onChange={(e) => setModelForm({ ...modelForm, name: e.target.value })}
                  placeholder="例如：GPT-4、GLM-4"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API地址 *
                </label>
                <input
                  type="text"
                  value={modelForm.baseUrl}
                  onChange={(e) => setModelForm({ ...modelForm, baseUrl: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API密钥
                </label>
                <input
                  type="password"
                  value={modelForm.apiKey}
                  onChange={(e) => setModelForm({ ...modelForm, apiKey: e.target.value })}
                  placeholder="sk-..."
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模型ID *
                </label>
                <input
                  type="text"
                  value={modelForm.modelId}
                  onChange={(e) => setModelForm({ ...modelForm, modelId: e.target.value })}
                  placeholder="gpt-4、glm-4、deepseek-chat"
                  className="input-field"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleSaveModel}
                className="btn-primary"
              >
                {editingModel ? '更新' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-fade-in">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">确认删除</h3>
            </div>
            
            <p className="text-gray-600 mb-2">
              确定要删除模型 <span className="font-semibold text-gray-900">"{deleteTarget.name}"</span> 吗？
            </p>
            <p className="text-sm text-red-600 mb-6 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
              此操作不可撤销，删除后配置将无法恢复
            </p>

            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>确认删除</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Settings
