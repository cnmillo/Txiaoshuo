import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'
import { settingsService } from './settingsService.js'
import { aiModelService } from './aiModelService.js'
import type { AIConfig, AIProvider, CurlConfig, CustomModel } from '../types/index.js'
import logger from '../utils/logger.js'
import {
  parseCurlCommand,
  convertToAxiosConfig,
  validateCurlCommand,
  extractContentFromResponse,
  extractStreamContent,
  cleanAIContent,
  extractContentFromRawResponse,
  generateExampleCurl,
  type ParsedCurlCommand
} from '../utils/curlParser.js'

/**
 * 小说生成专用参数配置
 * 优化参数以增加文本的人类化特征，使生成内容更加自然、多样
 */
const novelGenerationConfig = {
  /**
   * 温度参数 (0.8-0.9)
   * 控制输出的随机性和创造性
   * 较高的值(0.8-0.9)使输出更加随机和多样化，适合创意写作
   */
  temperature: 0.85,
  
  /**
   * 核采样参数 (0.9-0.95)
   * 限制模型只考虑概率最高的词汇，在保持质量的同时增加多样性
   * 较高的值(0.9-0.95)允许更多的词汇选择，增加文本丰富度
   */
  top_p: 0.92,
  
  /**
   * 频率惩罚 (0.3-0.5)
   * 降低重复使用相同词汇的概率
   * 适中的值(0.3-0.5)可以有效减少重复，同时不影响语义连贯性
   */
  frequency_penalty: 0.4,
  
  /**
   * 存在惩罚 (0.3-0.5)
   * 鼓励模型引入新话题和新概念
   * 适中的值(0.3-0.5)可以促进话题多样性，避免内容单调
   */
  presence_penalty: 0.35
}

/**
 * 默认AI生成参数配置
 * 用于一般性文本生成任务
 */
const defaultGenerationConfig = {
  temperature: 0.8,
  top_p: 0.9,
  frequency_penalty: 0.3,
  presence_penalty: 0.3
}

/**
 * 导出配置对象，供其他模块使用
 */
export { novelGenerationConfig, defaultGenerationConfig }

/**
 * AI提供商配置
 */
const AI_PROVIDERS: Record<string, AIProvider> = {
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'gpt-4o', 'gpt-4o-mini'],
    defaultModel: 'gpt-4',
    apiKeyFormat: 'sk-...',
    docsUrl: 'https://platform.openai.com/docs'
  },
  claude: {
    name: 'Claude (Anthropic)',
    baseUrl: 'https://api.anthropic.com/v1',
    models: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    defaultModel: 'claude-3-opus-20240229',
    apiKeyFormat: 'sk-ant-...',
    docsUrl: 'https://docs.anthropic.com'
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: ['gemini-pro', 'gemini-pro-vision', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    defaultModel: 'gemini-pro',
    apiKeyFormat: 'AIza...',
    docsUrl: 'https://ai.google.dev/docs'
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: ['deepseek-chat', 'deepseek-coder'],
    defaultModel: 'deepseek-chat',
    apiKeyFormat: 'sk-...',
    docsUrl: 'https://platform.deepseek.com/docs'
  },
  siliconflow: {
    name: 'SiliconFlow',
    baseUrl: 'https://api.siliconflow.cn/v1',
    models: ['Qwen/Qwen2.5-72B-Instruct', 'meta-llama/Meta-Llama-3.1-70B-Instruct', 'deepseek-ai/DeepSeek-V2.5'],
    defaultModel: 'Qwen/Qwen2.5-72B-Instruct',
    apiKeyFormat: 'sk-...',
    docsUrl: 'https://docs.siliconflow.cn'
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: ['anthropic/claude-3-opus', 'anthropic/claude-3-sonnet', 'openai/gpt-4', 'google/gemini-pro'],
    defaultModel: 'anthropic/claude-3-opus',
    apiKeyFormat: 'sk-or-...',
    docsUrl: 'https://openrouter.ai/docs'
  },
  modelscope: {
    name: 'ModelScope',
    baseUrl: 'https://api-inference.modelscope.cn/v1',
    models: [
      'ZhipuAI/GLM-4.7-Flash',
      'Qwen/Qwen3-8B',
      'Qwen/Qwen3-32B',
      'Qwen/Qwen2.5-72B-Instruct',
      'meta-llama/Meta-Llama-3.1-70B-Instruct'
    ],
    defaultModel: 'ZhipuAI/GLM-4.7-Flash',
    apiKeyFormat: 'ms-...',
    docsUrl: 'https://modelscope.cn/docs'
  },
  gitcode: {
    name: 'GitCode',
    baseUrl: 'https://api-ai.gitcode.com/v1',
    models: ['zai/glm-5', 'zai/glm-4', 'zai/gpt-3.5-turbo'],
    defaultModel: 'zai/glm-5',
    apiKeyFormat: 'kN-...',
    docsUrl: 'https://gitcode.com/ai'
  },
  baidu: {
    name: '百度文心一言',
    baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions',
    models: ['ernie-bot-4', 'ernie-bot-3.5', 'ernie-bot-turbo'],
    defaultModel: 'ernie-bot-4',
    apiKeyFormat: 'API Key',
    docsUrl: 'https://cloud.baidu.com/doc/WENXINWORKSHOP/s/alj562vvu'
  },
  alibaba: {
    name: '阿里云通义千问',
    baseUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
    models: ['qwen-max', 'qwen-plus', 'qwen-turbo'],
    defaultModel: 'qwen-plus',
    apiKeyFormat: 'API Key',
    docsUrl: 'https://help.aliyun.com/zh/dashscope/developer-reference/api-details'
  },
  tencent: {
    name: '腾讯混元大模型',
    baseUrl: 'https://api.tencentcloudapi.com',
    models: ['hunyuan-pro', 'hunyuan-standard', 'hunyuan-light'],
    defaultModel: 'hunyuan-pro',
    apiKeyFormat: 'SecretId/SecretKey',
    docsUrl: 'https://cloud.tencent.com/document/api/1729/1010374'
  },
  custom: {
    name: '自定义',
    baseUrl: '',
    models: [],
    defaultModel: '',
    apiKeyFormat: '任意格式',
    docsUrl: ''
  }
}

/**
 * 错误信息映射
 */
const ERROR_MESSAGES: Record<number, string> = {
  400: '请求参数错误，请检查配置',
  401: 'API密钥无效，请检查密钥配置',
  403: '没有权限访问该资源',
  404: '模型不存在，请检查模型名称',
  429: '请求过于频繁，请稍后再试',
  500: 'AI服务内部错误，请稍后再试',
  502: 'AI服务暂时不可用，请稍后再试',
  503: 'AI服务过载，请稍后再试',
  504: 'AI服务响应超时，请稍后再试'
}

/**
 * 获取友好的错误信息
 */
function getErrorMessage(error: AxiosError): string {
  const status = error.response?.status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const responseData = error.response?.data as Record<string, any> | undefined
  let apiMessage: string | undefined

  // 尝试获取错误信息
  if (responseData?.error?.message) {
    apiMessage = String(responseData.error.message)
  } else if (responseData?.message) {
    apiMessage = String(responseData.message)
  } else if (responseData?.error) {
    if (typeof responseData.error === 'string') {
      apiMessage = responseData.error
    } else {
      try {
        apiMessage = JSON.stringify(responseData.error)
      } catch {
        apiMessage = 'AI服务返回错误对象'
      }
    }
  }

  // 确保 error.message 是字符串
  let errorMessage: string
  if (error.message) {
    if (typeof error.message === 'string') {
      errorMessage = error.message
    } else {
      try {
        errorMessage = JSON.stringify(error.message)
      } catch {
        errorMessage = '未知错误'
      }
    }
  } else {
    errorMessage = '未知错误'
  }

  if (status && ERROR_MESSAGES[status]) {
    return apiMessage ? `${ERROR_MESSAGES[status]}: ${apiMessage}` : ERROR_MESSAGES[status]
  }

  if (error.code === 'ECONNABORTED') {
    return '请求超时，请检查网络连接或稍后重试'
  }

  if (error.code === 'ECONNREFUSED') {
    return '无法连接到AI服务，请检查API地址配置'
  }

  if (error.code === 'ENOTFOUND') {
    return '找不到AI服务地址，请检查网络连接或API地址配置'
  }

  return apiMessage ? `AI服务错误: ${apiMessage}` : `请求失败: ${errorMessage}`
}

/**
 * AI服务
 */
export const aiService = {
  /**
   * 获取所有支持的AI提供商
   */
  getProviders(): AIProvider[] {
    return Object.entries(AI_PROVIDERS).map(([id, provider]) => ({
      ...provider,
      id
    }))
  },

  /**
   * 获取当前AI配置
   */
  async getSettings(): Promise<AIConfig> {
    const activeModel = await aiModelService.getActive()
    if (activeModel) {
      return {
        apiKey: activeModel.apiKey,
        baseUrl: activeModel.baseUrl,
        model: activeModel.modelId,
        customModelName: activeModel.modelId,
        temperature: defaultGenerationConfig.temperature,
        maxTokens: 4000
      }
    }
    return await settingsService.getAIConfig()
  },

  /**
   * 获取CURL配置
   */
  async getCurlConfig(): Promise<CurlConfig> {
    return await settingsService.getCurlConfig()
  },

  /**
   * 生成文本 - 支持标准API和自定义CURL
   */
  async generateText(
    prompt: string,
    options: {
      systemPrompt?: string
      temperature?: number
      maxTokens?: number
      customConfig?: Partial<AIConfig>
      retryCount?: number
    } = {}
  ): Promise<string> {
    const { systemPrompt, temperature, maxTokens, customConfig, retryCount = 0 } = options

    // CURL功能已废弃，直接使用API配置
    const config = { ...(await this.getSettings()), ...customConfig }

    // 调试日志：打印完整配置
    logger.info('AI配置详情', {
      apiKey: config.apiKey ? `${config.apiKey.substring(0, 10)}...` : '未配置',
      baseUrl: config.baseUrl,
      model: config.model,
      customModelName: config.customModelName,
      temperature: config.temperature,
      maxTokens: config.maxTokens
    })

    if (!config.apiKey) {
      throw new Error('AI API密钥未配置，请先在设置页面配置API密钥。路径：设置 -> AI模型配置 -> API密钥')
    }

    if (!config.baseUrl) {
      throw new Error('AI API地址未配置，请先在设置页面配置API地址。路径：设置 -> AI模型配置 -> API基础URL')
    }

    // 使用自定义模型名称（如果模型类型为custom且设置了customModelName）
    const modelName = config.model === 'custom' && config.customModelName ? config.customModelName : config.model

    logger.info('使用的模型名称', { modelName, configModel: config.model, customModelName: config.customModelName })

    if (!modelName) {
      throw new Error('模型名称未配置，请先在设置页面配置模型名称')
    }

    const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`

    const messages: Array<{ role: string; content: string }> = []

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      })
    }

    messages.push({
      role: 'user',
      content: prompt
    })

    try {
      logger.info('调用AI API', { url, model: modelName, retryCount, configModel: config.model, customModelName: config.customModelName })

      // 使用OpenAI API格式（GitCode API实际上支持OpenAI格式）
      // 应用优化后的参数配置，增加文本人类化特征
      const effectiveTemperature = temperature ?? config.temperature ?? defaultGenerationConfig.temperature
      const requestBody = {
        model: modelName,
        messages: messages as Array<{ role: string; content: string }>,
        temperature: effectiveTemperature,
        max_tokens: maxTokens ?? config.maxTokens ?? 4000,
        // 核采样：在保持质量的同时增加多样性
        top_p: defaultGenerationConfig.top_p,
        // 频率惩罚：减少重复词汇的使用
        frequency_penalty: defaultGenerationConfig.frequency_penalty,
        // 存在惩罚：鼓励引入新话题和概念
        presence_penalty: defaultGenerationConfig.presence_penalty,
        stream: false
      }
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      }
      const apiUrl = url

      logger.debug('请求参数', { url: apiUrl, headers: { ...headers, Authorization: 'Bearer ***' }, requestBody })

      const startTime = Date.now()
      
      const response = await axios.post(
        apiUrl,
        requestBody,
        {
          headers,
          responseType: 'json' // 使用JSON响应，避免流式处理的问题
        }
      )
      
      const endTime = Date.now()
      const duration = endTime - startTime
      logger.info('AI API调用成功', { 
        url, 
        model: modelName, 
        duration: `${duration}ms`,
        status: response.status,
        retryCount
      })

      logger.debug('响应数据', { responseType: typeof response.data, responseData: response.data })

      let content: string | null = null

      if (typeof response.data === 'string') {
        if (response.data.includes('data:')) {
          const lines = response.data.split('\n')
          const contents: string[] = []

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue
            const dataStr = trimmed.substring(6)
            if (dataStr === '[DONE]') continue

            try {
              const data = JSON.parse(dataStr)
              if (data.error) {
                logger.error('AI服务返回错误', { data })
                throw new Error('AI服务配置错误：请检查API密钥和基础URL是否正确')
              }
              if (data.choices && data.choices.length > 0) {
                const choice = data.choices[0]
                const deltaContent = choice.delta?.content
                const messageContent = choice.message?.content
                if (typeof deltaContent === 'string' && deltaContent.length > 0) {
                  contents.push(deltaContent)
                } else if (typeof messageContent === 'string' && messageContent.length > 0) {
                  contents.push(messageContent)
                }
              }
            } catch (error) {
              if (error instanceof Error && error.message.includes('AI服务配置错误')) {
                throw error
              }
            }
          }

          if (contents.length > 0) {
            content = contents.join('')
          } else {
            try {
              const dataStart = response.data.indexOf('data:')
              if (dataStart !== -1) {
                let jsonStart = dataStart + 5
                while (jsonStart < response.data.length && /\s/.test(response.data[jsonStart])) {
                  jsonStart++
                }
                const jsonEnd = response.data.lastIndexOf('}')
                if (jsonEnd > jsonStart) {
                  const jsonStr = response.data.substring(jsonStart, jsonEnd + 1)
                  const data = JSON.parse(jsonStr)
                  if (data.choices && data.choices.length > 0) {
                    const choice = data.choices[0]
                    const extracted = choice.message?.content || choice.delta?.content
                    if (extracted) content = extracted
                  }
                }
              }
            } catch (error) {
              logger.debug('直接提取JSON失败', { error })
            }
          }
        } else {
          content = response.data
        }
      } else {
        if (response.data && typeof response.data === 'object') {
          const dataObj = response.data as Record<string, unknown>
          if (dataObj.choices && Array.isArray(dataObj.choices) && dataObj.choices.length > 0) {
            const firstChoice = dataObj.choices[0] as Record<string, unknown>
            const messageContent = (firstChoice.message as Record<string, unknown>)?.content
            const deltaContent = (firstChoice.delta as Record<string, unknown>)?.content
            if (typeof messageContent === 'string') {
              content = messageContent
            } else if (typeof deltaContent === 'string') {
              content = deltaContent
            }
          }
        }
        if (!content) {
          content = extractContentFromResponse(response.data)
        }
      }

      if (!content && response.data) {
        if (typeof response.data === 'object' && response.data !== null) {
          const dataObj = response.data as Record<string, unknown>
          if (Array.isArray(dataObj.choices) && dataObj.choices.length > 0) {
            const firstChoice = dataObj.choices[0] as Record<string, unknown>
            const msg = firstChoice.message as Record<string, unknown>
            const delta = firstChoice.delta as Record<string, unknown>
            if (msg && typeof msg.content === 'string') {
              content = msg.content
            } else if (delta && typeof delta.content === 'string') {
              content = delta.content
            }
          }

          if (!content && (dataObj.choices === null || dataObj.choices === undefined)) {
            for (const field of ['content', 'output', 'text', 'result', 'reasoning_content', 'reasoning']) {
              if (typeof dataObj[field] === 'string' && (dataObj[field] as string).length > 0) {
                content = dataObj[field] as string
                break
              }
            }
          }
        } else if (typeof response.data === 'string') {
          try {
            const data = JSON.parse(response.data)
            if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
              const choice = data.choices[0]
              content = choice.message?.content || choice.delta?.content
            }
            if (!content && (data.choices === null || data.choices === undefined)) {
              for (const field of ['content', 'output', 'text', 'result']) {
                if (typeof data[field] === 'string' && data[field].length > 0) {
                  content = data[field]
                  break
                }
              }
            }
          } catch (error) {
            logger.debug('直接解析字符串失败', { error })
          }
        }
      }

      if (!content) {
        let responsePreview = ''
        if (typeof response.data === 'string') {
          responsePreview = response.data.substring(0, 1000)
        } else if (response.data && typeof response.data === 'object' && 'pipe' in response.data) {
          responsePreview = '流式响应对象'
        } else {
          try {
            responsePreview = JSON.stringify(response.data).substring(0, 1000)
          } catch {
            responsePreview = '无法序列化的响应对象'
          }
        }

        if (response.data && typeof response.data === 'object') {
          const dataObj = response.data as Record<string, unknown>
          if (dataObj.choices === null || dataObj.choices === undefined) {
            logger.warn('非流式调用返回空 choices，尝试流式调用回退')
            let streamContent = ''
            let streamError: Error | null = null
            try {
              for await (const chunk of this.generateTextStream(prompt, {
                systemPrompt,
                temperature,
                maxTokens,
                retryCount
              })) {
                if (chunk.content) {
                  streamContent += chunk.content
                }
                if (chunk.error) {
                  streamError = new Error(chunk.error)
                  break
                }
              }
            } catch (e) {
              streamError = e instanceof Error ? e : new Error(String(e))
            }

            if (streamContent && streamContent.trim().length > 0) {
              logger.info('流式调用回退成功', { contentLength: streamContent.length })
              return cleanAIContent(streamContent.trim())
            }

            logger.error('流式调用回退也未能获取内容', {
              streamError: streamError?.message,
              streamLength: streamContent.length,
              responsePreview: responsePreview.substring(0, 500)
            })
          }
        }

        if (typeof response.data === 'string') {
          const rawExtracted = extractContentFromRawResponse(response.data)
          if (rawExtracted && rawExtracted.length > 10) {
            logger.info('从原始响应中提取到内容（兜底）', { length: rawExtracted.length })
            return cleanAIContent(rawExtracted)
          }
        } else if (response.data && typeof response.data === 'object') {
          const rawStr = JSON.stringify(response.data)
          const rawExtracted = extractContentFromRawResponse(rawStr)
          if (rawExtracted && rawExtracted.length > 10) {
            logger.info('从原始响应JSON中提取到内容（兜底）', { length: rawExtracted.length })
            return cleanAIContent(rawExtracted)
          }
        }

        logger.error('无法从响应中提取内容', {
          responseType: typeof response.data,
          responsePreview
        })
        throw new Error('无法从响应中提取内容，请检查响应格式是否正确。响应预览: ' + responsePreview.substring(0, 200))
      }

      logger.debug('AI API调用成功')
      return cleanAIContent(content.trim())
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = getErrorMessage(error)
        logger.error('AI API调用失败', { status: error.response?.status, message, retryCount, error: message })

        // 增强的重试机制：针对更多错误类型进行最多3次重试，使用指数退避策略
        const retryableStatuses = [429, 502, 503, 504] // 增加502错误
        const retryableCodes = ['ECONNABORTED', 'ETIMEDOUT', 'ENOTFOUND'] // 增加更多网络错误
        const maxRetries = error.response?.status === 429 ? 3 : 2
        
        const shouldRetry = 
          retryCount < maxRetries && 
          (retryableStatuses.includes(error.response?.status as number) || 
           retryableCodes.includes(error.code as string))
        
        if (shouldRetry) {
          // 指数退避策略：基础时间 * (2^重试次数) + 随机抖动
          const baseWaitTime = error.response?.status === 429 ? 15000 : 5000
          const waitTime = Math.min(
            baseWaitTime * Math.pow(2, retryCount) + Math.random() * 1000, // 增加随机抖动
            error.response?.status === 429 ? 120000 : 30000 // 最大等待时间
          )
          
          logger.info(`等待重试... (${retryCount + 1}/${maxRetries})，等待时间: ${Math.round(waitTime)}ms`)
          await new Promise(resolve => setTimeout(resolve, waitTime))
          return this.generateText(prompt, { ...options, retryCount: retryCount + 1 })
        }
        
        // 尝试使用备用 API
        const config = { ...(await this.getSettings()), ...customConfig }
        if (config.fallback && retryCount < 1) {
          logger.warn('主 API 失败，尝试备用 API', { 
            mainApi: config.baseUrl, 
            fallbackApi: config.fallback.baseUrl 
          })
          try {
            return await this.generateText(prompt, { 
              ...options, 
              customConfig: {
                apiKey: config.fallback.apiKey,
                baseUrl: config.fallback.baseUrl,
                model: config.fallback.model
              },
              retryCount: 100 // 防止无限循环
            })
          } catch (fallbackError) {
            logger.error('备用 API 也失败', { error: fallbackError })
          }
        }

        throw new Error(message)
      }

      throw error
    }
  },

  /**
   * 流式生成文本
   */
  async *generateTextStream(
    prompt: string,
    options: {
      systemPrompt?: string
      temperature?: number
      maxTokens?: number
      customConfig?: Partial<AIConfig>
      retryCount?: number
    } = {}
  ): AsyncGenerator<{ content?: string; error?: string; done?: boolean }, void, unknown> {
    const { systemPrompt, temperature, maxTokens, customConfig } = options

    // CURL功能已废弃，直接使用API配置
    const config = { ...(await this.getSettings()), ...customConfig }

    if (!config.apiKey) {
      yield { error: 'AI API密钥未配置，请先在设置页面配置API密钥。路径：设置 -> AI模型配置 -> API密钥' }
      return
    }

    if (!config.baseUrl) {
      yield { error: 'AI API地址未配置，请先在设置页面配置API地址。路径：设置 -> AI模型配置 -> API基础URL' }
      return
    }

    // 使用自定义模型名称（如果模型类型为custom且设置了customModelName）
    const modelName = config.model === 'custom' && config.customModelName ? config.customModelName : config.model

    if (!modelName) {
      yield { error: '模型名称未配置，请先在设置页面配置模型名称' }
      return
    }

    const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`

    const messages: Array<{ role: string; content: string }> = []

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      })
    }

    messages.push({
      role: 'user',
      content: prompt
    })

    // 应用优化后的参数配置，增加文本人类化特征
    const effectiveTemperature = temperature ?? config.temperature ?? defaultGenerationConfig.temperature

    try {
      logger.debug('调用AI API流式接口', { url, model: modelName })
      const response = await axios.post(
        url,
        {
          model: modelName,
          messages,
          temperature: effectiveTemperature,
          max_tokens: maxTokens ?? config.maxTokens ?? 4000,
          // 核采样：在保持质量的同时增加多样性
          top_p: defaultGenerationConfig.top_p,
          // 频率惩罚：减少重复词汇的使用
          frequency_penalty: defaultGenerationConfig.frequency_penalty,
          // 存在惩罚：鼓励引入新话题和概念
          presence_penalty: defaultGenerationConfig.presence_penalty,
          stream: true
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
        responseType: 'stream'
        }
      )

      const stream = response.data as NodeJS.ReadableStream
      let hasContent = false

      for await (const chunk of stream) {
        const content = extractStreamContent(chunk.toString())

        if (content) {
          hasContent = true
          yield { content }
        }
      }

      if (!hasContent) {
        logger.warn('流式调用返回空内容，尝试非流式调用')
        const nonStreamResponse = await axios.post(
            url,
            {
              model: modelName,
              messages,
              temperature: effectiveTemperature,
              max_tokens: maxTokens ?? config.maxTokens ?? 4000,
              // 核采样：在保持质量的同时增加多样性
              top_p: defaultGenerationConfig.top_p,
              // 频率惩罚：减少重复词汇的使用
              frequency_penalty: defaultGenerationConfig.frequency_penalty,
              // 存在惩罚：鼓励引入新话题和概念
              presence_penalty: defaultGenerationConfig.presence_penalty,
              stream: false
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`
              }
            }
          )

        const content = extractContentFromResponse(nonStreamResponse.data)
        if (content) {
          yield { content }
        } else {
          yield { error: '无法从响应中提取内容' }
          return
        }
      }

      yield { done: true }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = getErrorMessage(error)
        logger.error('AI API流式调用失败', { status: error.response?.status, message: error.message || String(error) })
        
        // 尝试使用备用 API
        if (config.fallback && error.response?.status === 429) {
          logger.warn('主 API 请求过于频繁，尝试备用 API', {
            mainApi: config.baseUrl,
            fallbackApi: config.fallback.baseUrl
          })
          try {
            const fallbackUrl = `${config.fallback.baseUrl.replace(/\/$/, '')}/chat/completions`
            const fallbackResponse = await axios.post(
              fallbackUrl,
              {
                model: config.fallback.model,
                messages,
                temperature: effectiveTemperature,
                max_tokens: maxTokens ?? config.maxTokens ?? 4000,
                // 核采样：在保持质量的同时增加多样性
                top_p: defaultGenerationConfig.top_p,
                // 频率惩罚：减少重复词汇的使用
                frequency_penalty: defaultGenerationConfig.frequency_penalty,
                // 存在惩罚：鼓励引入新话题和概念
                presence_penalty: defaultGenerationConfig.presence_penalty,
                stream: true
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${config.fallback.apiKey}`
                },
                responseType: 'stream'
              }
            )
            
            const fallbackStream = fallbackResponse.data as NodeJS.ReadableStream
            let hasFallbackContent = false
            
            for await (const chunk of fallbackStream) {
              const chunkStr = chunk.toString()
              logger.debug('备用 API 收到块', { chunkPreview: chunkStr.substring(0, 100) })
              const content = extractStreamContent(chunkStr)
              if (content) {
                hasFallbackContent = true
                yield { content }
              }
            }
            
            if (hasFallbackContent) {
              logger.info('备用 API 流式调用成功')
              yield { done: true }
              return
            } else {
              logger.error('备用 API 返回空内容')
              yield { error: `备用 API 返回空内容` }
              return
            }
          } catch (fallbackError) {
            logger.error('备用 API 也失败', { error: fallbackError })
            yield { error: `主 API 和备用 API 都失败: ${message}` }
            return
          }
        }
        
        yield { error: message }
      } else {
        yield { error: error instanceof Error ? error.message : '流式生成失败' }
      }
    }
  },

  /**
   * 使用自定义CURL命令生成文本
   */
  async generateWithCurl(
    command: string,
    prompt: string,
    options: { retryCount?: number } = {}
  ): Promise<string> {
    const { retryCount = 0 } = options

    // 验证CURL命令
    const validation = validateCurlCommand(command)
    if (!validation.valid) {
      throw new Error(`CURL命令验证失败: ${validation.error}`)
    }

    // 解析CURL命令
    const parseResult = parseCurlCommand(command)
    if (!parseResult.success || !parseResult.data) {
      throw new Error(`解析CURL命令失败: ${parseResult.error}`)
    }

    const parsed = parseResult.data

    // 转换为axios配置
    const axiosConfig = convertToAxiosConfig(parsed, prompt)

    // 确保stream为false
    if (axiosConfig.data && typeof axiosConfig.data === 'object') {
      (axiosConfig.data as Record<string, unknown>).stream = false
    }

    try {
      logger.debug('使用自定义CURL调用', { 
        url: axiosConfig.url, 
        method: axiosConfig.method, 
        retryCount,
        requestBody: axiosConfig.data
      })

      const response = await axios.request(axiosConfig)

      let content: string | null = null

      logger.debug('响应数据', {
        responseType: typeof response.data,
        responseData: response.data
      })

      if (typeof response.data === 'string') {
        if (response.data.includes('data:')) {
          const lines = response.data.split('\n')
          const contents: string[] = []

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data: ')) continue
            const dataStr = trimmed.substring(6)
            if (dataStr === '[DONE]') continue

            try {
              const data = JSON.parse(dataStr)
              if (data.error) {
                logger.error('AI服务返回错误', { data })
                throw new Error('AI服务配置错误：请检查API密钥和基础URL是否正确')
              }
              if (data.choices && data.choices[0]?.delta?.content) {
                const deltaContent = data.choices[0].delta.content
                if (typeof deltaContent === 'string' && deltaContent.length > 0) {
                  if (deltaContent.includes('请求体须为合法JSON')) {
                    logger.error('GitCode API请求格式错误', { data })
                    throw new Error('GitCode API配置错误：请使用正确的API URL和格式')
                  }
                  contents.push(deltaContent)
                }
              } else if (data.choices && data.choices[0]?.message?.content) {
                const msgContent = data.choices[0].message.content
                if (typeof msgContent === 'string' && msgContent.length > 0) {
                  contents.push(msgContent)
                }
              }
            } catch (error) {
              if (error instanceof Error && (error.message.includes('AI服务配置错误') || error.message.includes('GitCode API配置错误'))) {
                throw error
              }
            }
          }

          if (contents.length > 0) {
            content = contents.join('')
          }
        } else {
          content = response.data
        }
      } else {
        content = extractContentFromResponse(response.data)
      }

      if (!content) {
        const responsePreview = typeof response.data === 'string'
          ? response.data.substring(0, 1000)
          : JSON.stringify(response.data).substring(0, 1000)
        logger.error('无法从响应中提取内容', {
          responseType: typeof response.data,
          responsePreview,
          responseData: response.data
        })
        throw new Error('无法从响应中提取内容，请检查响应格式是否正确。响应预览: ' + responsePreview.substring(0, 200))
      }

      logger.debug('自定义CURL调用成功')
      return cleanAIContent(content.trim())
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = getErrorMessage(error)
        logger.error('自定义CURL调用失败', { status: error.response?.status, message, retryCount })

        // 重试机制
        if (retryCount < 2 && (error.response?.status === 429 || error.response?.status === 503 || error.code === 'ECONNABORTED')) {
          logger.info(`等待重试... (${retryCount + 1}/2)`)
          await new Promise(resolve => setTimeout(resolve, 2000 * (retryCount + 1)))
          return this.generateWithCurl(command, prompt, { retryCount: retryCount + 1 })
        }

        throw new Error(message)
      }

      throw error
    }
  },

  /**
   * 流式使用自定义CURL命令
   */
  async *generateWithCurlStream(
    command: string,
    prompt: string
  ): AsyncGenerator<{ content?: string; error?: string; done?: boolean }, void, unknown> {
    // 验证CURL命令
    const validation = validateCurlCommand(command)
    if (!validation.valid) {
      yield { error: `CURL命令验证失败: ${validation.error}` }
      return
    }

    // 解析CURL命令
    const parseResult = parseCurlCommand(command)
    if (!parseResult.success || !parseResult.data) {
      yield { error: `解析CURL命令失败: ${parseResult.error}` }
      return
    }

    const parsed = parseResult.data

    // 转换为axios配置，启用流式响应
    const axiosConfig: AxiosRequestConfig = {
      ...convertToAxiosConfig(parsed, prompt),
      responseType: 'stream'
    }

    // 添加流式请求头（如果支持）
    if (!axiosConfig.headers) {
      axiosConfig.headers = {}
    }
    // 尝试添加流式支持头
    const headers = axiosConfig.headers as Record<string, string>
    headers['Accept'] = 'text/event-stream, application/json'

    try {
      logger.debug('使用自定义CURL流式调用', { url: axiosConfig.url, method: axiosConfig.method })

      const response = await axios.request(axiosConfig)
      const stream = response.data as NodeJS.ReadableStream

      for await (const chunk of stream) {
        const content = extractStreamContent(chunk.toString())

        if (content) {
          yield { content }
        }
      }

      yield { done: true }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = getErrorMessage(error)
        logger.error('自定义CURL流式调用失败', { status: error.response?.status, message })
        yield { error: message }
      } else {
        yield { error: error instanceof Error ? error.message : '自定义CURL流式调用失败' }
      }
    }
  },

  /**
   * 解析CURL命令
   */
  parseCurlCommand(command: string): {
    success: boolean
    data?: ParsedCurlCommand
    error?: string
  } {
    return parseCurlCommand(command)
  },

  /**
   * 验证CURL命令
   */
  validateCurlCommand(command: string): { valid: boolean; error?: string } {
    return validateCurlCommand(command)
  },

  /**
   * 获取示例CURL命令
   */
  getExampleCurl(provider: string): string {
    return generateExampleCurl(provider)
  },

  /**
   * 测试AI配置
   */
  async testConfig(config?: AIConfig): Promise<{ success: boolean; message: string }> {
    const testConfig = config || await this.getSettings()

    if (!testConfig.apiKey) {
      return { success: false, message: 'API密钥不能为空' }
    }

    if (!testConfig.baseUrl) {
      return { success: false, message: 'API地址不能为空' }
    }

    // 使用自定义模型名称（如果模型类型为custom且设置了customModelName）
    const modelName = testConfig.model === 'custom' && testConfig.customModelName ? testConfig.customModelName : testConfig.model

    if (!modelName) {
      return { success: false, message: '模型名称不能为空' }
    }

    try {
      const url = `${testConfig.baseUrl.replace(/\/$/, '')}/chat/completions`

      const response = await axios.post(
        url,
        {
          model: modelName,
          messages: [
            {
              role: 'user',
              content: '你好，这是一个测试消息，请回复"测试成功"。'
            }
          ],
          temperature: defaultGenerationConfig.temperature,
          max_tokens: 200, // 增加到200，支持GLM-4.7-Flash等混合思考模型
          // 核采样：在保持质量的同时增加多样性
          top_p: defaultGenerationConfig.top_p,
          // 频率惩罚：减少重复词汇的使用
          frequency_penalty: defaultGenerationConfig.frequency_penalty,
          // 存在惩罚：鼓励引入新话题和概念
          presence_penalty: defaultGenerationConfig.presence_penalty
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${testConfig.apiKey}`
          }
        }
      )

      const content = extractContentFromResponse(response.data)

      if (content) {
        return { success: true, message: 'AI配置测试成功，连接正常' }
      } else {
        return { success: false, message: 'AI返回异常，请检查配置是否正确' }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { success: false, message: getErrorMessage(error) }
      }

      return { success: false, message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}` }
    }
  },

  /**
   * 测试AI连接 - 用于AI模型配置测试
   */
  async testConnection(params: { baseUrl: string; apiKey: string; model: string }): Promise<{ success: boolean; message: string }> {
    const { baseUrl, apiKey, model } = params

    if (!apiKey) {
      return { success: false, message: 'API密钥不能为空' }
    }

    if (!baseUrl) {
      return { success: false, message: 'API地址不能为空' }
    }

    if (!model) {
      return { success: false, message: '模型名称不能为空' }
    }

    try {
      const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`

      const response = await axios.post(
        url,
        {
          model,
          messages: [
            {
              role: 'user',
              content: '你好，这是一个测试消息，请回复"测试成功"。'
            }
          ],
          temperature: defaultGenerationConfig.temperature,
          max_tokens: 200,
          // 核采样：在保持质量的同时增加多样性
          top_p: defaultGenerationConfig.top_p,
          // 频率惩罚：减少重复词汇的使用
          frequency_penalty: defaultGenerationConfig.frequency_penalty,
          // 存在惩罚：鼓励引入新话题和概念
          presence_penalty: defaultGenerationConfig.presence_penalty
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          }
        }
      )

      const content = extractContentFromResponse(response.data)

      if (content) {
        return { success: true, message: '连接成功' }
      } else {
        return { success: false, message: 'AI返回异常，请检查配置是否正确' }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return { success: false, message: getErrorMessage(error) }
      }

      return { success: false, message: `测试失败: ${error instanceof Error ? error.message : '未知错误'}` }
    }
  },

  /**
   * 测试自定义CURL配置
   */
  async testCurlConfig(command: string): Promise<{ success: boolean; message: string }> {
    const validation = validateCurlCommand(command)
    if (!validation.valid) {
      return { success: false, message: `CURL命令验证失败: ${validation.error}` }
    }

    try {
      const testPrompt = '你好，这是一个测试消息，请回复"测试成功"。'
      const content = await this.generateWithCurl(command, testPrompt)

      if (content && content.includes('测试成功')) {
        return { success: true, message: '自定义CURL配置测试成功' }
      } else {
        return { success: true, message: `自定义CURL配置测试成功，返回内容: ${content.slice(0, 50)}...` }
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : '自定义CURL测试失败'
      }
    }
  },

  async getCustomModelById(modelId: string): Promise<CustomModel | null> {
    const models = await settingsService.getCustomModels()
    return models.find(m => m.id === modelId) || null
  },

  async generateTextWithCustomModel(
    customModel: CustomModel,
    prompt: string,
    options: { systemPrompt?: string; temperature?: number; maxTokens?: number } = {}
  ): Promise<string> {
    const { systemPrompt, temperature = defaultGenerationConfig.temperature, maxTokens = 4000 } = options

    const url = `${customModel.baseUrl.replace(/\/$/, '')}/chat/completions`
    const messages: Array<{ role: string; content: string }> = []

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await axios.post(url, {
      model: customModel.modelId,
      messages,
      temperature,
      max_tokens: maxTokens,
      // 核采样：在保持质量的同时增加多样性
      top_p: defaultGenerationConfig.top_p,
      // 频率惩罚：减少重复词汇的使用
      frequency_penalty: defaultGenerationConfig.frequency_penalty,
      // 存在惩罚：鼓励引入新话题和概念
      presence_penalty: defaultGenerationConfig.presence_penalty,
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${customModel.apiKey}`
      },
    })

      let content: string | null = null
      if (typeof response.data === 'string') {
        const lines = response.data.split('\n')
        const contents: string[] = []
        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed.startsWith('data: ')) continue
          const dataStr = trimmed.substring(6)
          if (dataStr === '[DONE]') continue
          try {
            const data = JSON.parse(dataStr)
            if (data.choices && data.choices.length > 0) {
              const choice = data.choices[0]
              const deltaContent = choice.delta?.content
              const messageContent = choice.message?.content
              if (typeof deltaContent === 'string' && deltaContent.length > 0) contents.push(deltaContent)
              else if (typeof messageContent === 'string' && messageContent.length > 0) contents.push(messageContent)
            }
          } catch {
            void 0
          }
        }
        if (contents.length > 0) content = contents.join('')
        else content = response.data
      } else {
        if (response.data?.choices?.[0]?.message?.content) content = response.data.choices[0].message.content
        else if (response.data?.choices?.[0]?.delta?.content) content = response.data.choices[0].delta.content
        else content = extractContentFromResponse(response.data)
      }

      if (!content) throw new Error('无法从自定义模型响应中提取内容')
      return cleanAIContent(content.trim())
  },

  async callWithFailover<T>(
    operation: (model: CustomModel, signal: AbortSignal) => Promise<T>,
    options: { timeoutMs?: number; maxRetries?: number } = {}
  ): Promise<{ result: T; usedModel: CustomModel }> {
    const { timeoutMs = 60000, maxRetries = 1 } = options
    
    const healthyModels = await settingsService.getHealthyModels()
    
    if (healthyModels.length === 0) {
      throw new Error('没有可用的自定义模型，请先在设置中添加模型')
    }
    
    const errors: Array<{ modelId: string; error: string }> = []
    
    for (const model of healthyModels) {
      for (let retry = 0; retry <= maxRetries; retry++) {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          controller.abort()
          logger.warn('模型请求超时，准备切换下一个模型', { 
            modelId: model.id, 
            modelName: model.name,
            timeoutMs 
          })
        }, timeoutMs)
        
        try {
          logger.info('尝试使用模型', { 
            modelId: model.id, 
            modelName: model.name, 
            retry,
            baseUrl: model.baseUrl 
          })
          
          const result = await operation(model, controller.signal)
          
          clearTimeout(timeoutId)
          
          await settingsService.updateModelHealth(model.id, true)
          
          logger.info('模型调用成功', { modelId: model.id, modelName: model.name })
          
          return { result, usedModel: model }
          
        } catch (error) {
          clearTimeout(timeoutId)
          
          const errorMessage = error instanceof Error ? error.message : String(error)
          const isAbortError = error instanceof Error && error.name === 'AbortError'
          
          if (isAbortError) {
            logger.warn('模型请求超时', { modelId: model.id, modelName: model.name })
            errors.push({ modelId: model.id, error: `请求超时 (${timeoutMs}ms)` })
          } else {
            logger.error('模型调用失败', { 
              modelId: model.id, 
              modelName: model.name, 
              error: errorMessage,
              retry 
            })
            errors.push({ modelId: model.id, error: errorMessage })
          }
          
          await settingsService.updateModelHealth(model.id, false)
          
          if (retry < maxRetries && !isAbortError) {
            const waitTime = 1000 * (retry + 1)
            logger.info('等待重试', { modelId: model.id, retry, waitTime })
            await new Promise(resolve => setTimeout(resolve, waitTime))
            continue
          }
          
          break
        }
      }
    }
    
    const errorDetails = errors.map(e => `${e.modelId}: ${e.error}`).join('; ')
    throw new Error(`所有模型都调用失败: ${errorDetails}`)
  },

  async *generateTextStreamWithFailover(
    prompt: string,
    options: {
      systemPrompt?: string
      temperature?: number
      maxTokens?: number
    } = {}
  ): AsyncGenerator<{ content?: string; error?: string; done?: boolean; modelInfo?: { id: string; name: string } }, void, unknown> {
    const { systemPrompt, temperature = defaultGenerationConfig.temperature, maxTokens = 4000 } = options
    
    const healthyModels = await settingsService.getHealthyModels()
    
    if (healthyModels.length === 0) {
      yield { error: '没有可用的自定义模型，请先在设置中添加模型' }
      return
    }
    
    const errors: Array<{ modelId: string; error: string }> = []
    
    for (const model of healthyModels) {
      const controller = new AbortController()
      const timeoutMs = 60000
      const timeoutId = setTimeout(() => {
        controller.abort()
        logger.warn('流式请求超时，准备切换下一个模型', { 
          modelId: model.id, 
          modelName: model.name 
        })
      }, timeoutMs)
      
      try {
        logger.info('尝试使用模型进行流式生成', { 
          modelId: model.id, 
          modelName: model.name,
          baseUrl: model.baseUrl 
        })
        
        const url = `${model.baseUrl.replace(/\/$/, '')}/chat/completions`
        const messages: Array<{ role: string; content: string }> = []
        
        if (systemPrompt) {
          messages.push({ role: 'system', content: systemPrompt })
        }
        messages.push({ role: 'user', content: prompt })
        
        const response = await axios.post(url, {
          model: model.modelId,
          messages,
          temperature,
          max_tokens: maxTokens,
          // 核采样：在保持质量的同时增加多样性
          top_p: defaultGenerationConfig.top_p,
          // 频率惩罚：减少重复词汇的使用
          frequency_penalty: defaultGenerationConfig.frequency_penalty,
          // 存在惩罚：鼓励引入新话题和概念
          presence_penalty: defaultGenerationConfig.presence_penalty,
          stream: true
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${model.apiKey}`
          },
          responseType: 'stream',
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
        const stream = response.data as NodeJS.ReadableStream
        let hasContent = false
        
        for await (const chunk of stream) {
          const content = extractStreamContent(chunk.toString())
          
          if (content) {
            hasContent = true
            yield { content, modelInfo: { id: model.id, name: model.name } }
          }
        }
        
        if (hasContent) {
          await settingsService.updateModelHealth(model.id, true)
          logger.info('流式生成成功', { modelId: model.id, modelName: model.name })
          yield { done: true, modelInfo: { id: model.id, name: model.name } }
          return
        } else {
          logger.warn('流式调用返回空内容', { modelId: model.id })
          await settingsService.updateModelHealth(model.id, false)
          errors.push({ modelId: model.id, error: '返回空内容' })
          continue
        }
        
      } catch (error) {
        clearTimeout(timeoutId)
        
        const errorMessage = error instanceof Error ? error.message : String(error)
        const isAbortError = error instanceof Error && error.name === 'AbortError'
        
        if (isAbortError) {
          logger.warn('流式请求超时', { modelId: model.id, modelName: model.name })
          errors.push({ modelId: model.id, error: `请求超时 (${timeoutMs}ms)` })
        } else {
          logger.error('流式调用失败', { 
            modelId: model.id, 
            modelName: model.name, 
            error: errorMessage 
          })
          errors.push({ modelId: model.id, error: errorMessage })
        }
        
        await settingsService.updateModelHealth(model.id, false)
        continue
      }
    }
    
    const errorDetails = errors.map(e => `${e.modelId}: ${e.error}`).join('; ')
    yield { error: `所有模型都调用失败: ${errorDetails}` }
  },

  /**
   * 分析图片
   */
  async analyzeImage(image: string): Promise<string> {
    const config = await this.getSettings()

    if (!config.apiKey) {
      throw new Error('AI API密钥未配置，请先在设置页面配置API密钥。路径：设置 -> AI模型配置 -> API密钥')
    }

    if (!config.baseUrl) {
      throw new Error('AI API地址未配置，请先在设置页面配置API地址。路径：设置 -> AI模型配置 -> API基础URL')
    }

    // 使用自定义模型名称（如果模型类型为custom且设置了customModelName）
    const modelName = config.model === 'custom' && config.customModelName ? config.customModelName : config.model

    logger.info('使用的模型名称', { modelName, configModel: config.model, customModelName: config.customModelName })

    if (!modelName) {
      throw new Error('模型名称未配置，请先在设置页面配置模型名称')
    }

    // 检查是否支持多模态
    const provider = Object.entries(AI_PROVIDERS).find(([_, p]) => p.baseUrl === config.baseUrl)
    const isMultimodalSupported = provider && 
      (provider[0] === 'openai' || provider[0] === 'gemini' || provider[0] === 'openrouter')

    if (!isMultimodalSupported) {
      throw new Error('当前AI提供商不支持图片分析功能')
    }

    const systemPrompt = '你是一个专业的图片分析助手，请详细描述图片中的内容，包括场景、人物、物体、氛围等，以便用于小说创作。'
    const userPrompt = '请详细描述这张图片的内容，包括场景、人物、物体、颜色、氛围等细节，以便我将其用于小说创作。'

    try {
      if (provider[0] === 'openai') {
        // OpenAI API
        const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
        
        const response = await axios.post(
          url,
          {
            model: modelName,
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: userPrompt
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: image
                    }
                  }
                ]
              }
            ],
            temperature: defaultGenerationConfig.temperature,
            max_tokens: 1000,
            // 核采样：在保持质量的同时增加多样性
            top_p: defaultGenerationConfig.top_p,
            // 频率惩罚：减少重复词汇的使用
            frequency_penalty: defaultGenerationConfig.frequency_penalty,
            // 存在惩罚：鼓励引入新话题和概念
            presence_penalty: defaultGenerationConfig.presence_penalty
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`
            }
          }
        )

        const content = extractContentFromResponse(response.data)
        if (!content) {
          throw new Error('AI返回空内容')
        }
        return content.trim()
      } else if (provider[0] === 'gemini') {
        // Google Gemini API
        const url = `${config.baseUrl.replace(/\/$/, '')}/models/${modelName}:generateContent`
        
        const response = await axios.post(
          url,
          {
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: systemPrompt + '\n' + userPrompt
                  },
                  {
                    inline_data: {
                      mime_type: 'image/jpeg',
                      data: image.replace(/^data:image\/\w+;base64,/, '')
                    }
                  }
                ]
              }
            ],
            generation_config: {
              temperature: defaultGenerationConfig.temperature,
              max_output_tokens: 1000,
              // 核采样：在保持质量的同时增加多样性
              top_p: defaultGenerationConfig.top_p,
              // 频率惩罚：减少重复词汇的使用（Gemini可能不完全支持，但保留配置）
              frequency_penalty: defaultGenerationConfig.frequency_penalty,
              // 存在惩罚：鼓励引入新话题和概念（Gemini可能不完全支持，但保留配置）
              presence_penalty: defaultGenerationConfig.presence_penalty
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'x-goog-api-key': config.apiKey
            }
          }
        )

        const content = response.data?.candidates?.[0]?.content?.parts?.[0]?.text
        if (!content) {
          throw new Error('AI返回空内容')
        }
        return content.trim()
      } else {
        // 其他支持多模态的提供商
        const url = `${config.baseUrl.replace(/\/$/, '')}/chat/completions`
        
        const response = await axios.post(
          url,
          {
            model: modelName,
            messages: [
              {
                role: 'system',
                content: systemPrompt
              },
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: userPrompt
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: image
                    }
                  }
                ]
              }
            ],
            temperature: defaultGenerationConfig.temperature,
            max_tokens: 1000,
            // 核采样：在保持质量的同时增加多样性
            top_p: defaultGenerationConfig.top_p,
            // 频率惩罚：减少重复词汇的使用
            frequency_penalty: defaultGenerationConfig.frequency_penalty,
            // 存在惩罚：鼓励引入新话题和概念
            presence_penalty: defaultGenerationConfig.presence_penalty
          },
          {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`
            }
          }
        )

        const content = extractContentFromResponse(response.data)
        if (!content) {
          throw new Error('AI返回空内容')
        }
        return content.trim()
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = getErrorMessage(error)
        throw new Error(message)
      }
      throw error
    }
  }
}

export default aiService
