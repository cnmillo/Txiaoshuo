import { v4 as uuidv4 } from 'uuid'
import { run, queryOne } from '../database/index.js'
import { novelService } from './novelService.js'
import { aiService } from './aiService.js'
import { styleService } from './styleService.js'
import { writingTemplateService } from './writingTemplateService.js'
import { settingsService } from './settingsService.js'
import { ContentDeduplicationService } from './contentDeduplicationService.js'
import type { GenerateProgress, NovelGenre, NovelLength, StyleConfig } from '../types/index.js'
import {
  generateSystemPrompt,
  generateOutlinePrompt,
  generateChapterPrompt,
  generateContextAwareChapterPrompt,
  generateChapterSummaryPrompt,
  generateChapterDescriptionPrompt,
  generateOneSentencePrompt,
  optimizePrompt,
  type NovelGenre as PromptNovelGenre
} from '../utils/prompts.js'
import logger from '../utils/logger.js'

const activeTasks = new Map<string, AbortController>()

async function generateTextWithFailover(
  prompt: string,
  options: {
    systemPrompt?: string
    temperature?: number
    maxTokens?: number
  } = {}
): Promise<string> {
  const healthyModels = await settingsService.getHealthyModels()
  
  if (healthyModels.length > 0) {
    logger.info('使用自定义模型进行故障转移生成', { modelCount: healthyModels.length })
    
    // 按模型优先级排序（可以根据实际情况调整排序策略）
    const sortedModels = [...healthyModels].sort((a, b) => {
      // 简单的优先级排序：基于模型名称或其他指标
      return a.name.localeCompare(b.name)
    })
    
    const errors: Array<{ modelId: string; error: string }> = []
    
    for (const model of sortedModels) {
      try {
        // 为每个模型添加重试机制
        let modelRetryCount = 0
        const maxModelRetries = 1
        
        while (modelRetryCount < maxModelRetries) {
          try {
            const content = await aiService.generateTextWithCustomModel(model, prompt, options)
            await settingsService.updateModelHealth(model.id, true)
            logger.info('模型生成成功', { modelId: model.id, modelName: model.name })
            return content
          } catch (error) {
            modelRetryCount++
            const errorMessage = error instanceof Error ? error.message : String(error)
            logger.warn(`模型生成失败，正在重试... (${modelRetryCount}/${maxModelRetries})`, { 
              modelId: model.id, 
              modelName: model.name, 
              error: errorMessage 
            })
            
            // 重试前短暂休息
            if (modelRetryCount < maxModelRetries) {
              await new Promise(resolve => setTimeout(resolve, 500))
            }
          }
        }
        
        // 所有重试都失败
        const errorMessage = `模型${model.name}所有重试都失败`
        logger.error('模型生成失败，尝试下一个模型', { 
          modelId: model.id, 
          modelName: model.name, 
          error: errorMessage 
        })
        errors.push({ modelId: model.id, error: errorMessage })
        await settingsService.updateModelHealth(model.id, false)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        logger.error('模型生成失败，尝试下一个模型', { 
          modelId: model.id, 
          modelName: model.name, 
          error: errorMessage 
        })
        errors.push({ modelId: model.id, error: errorMessage })
        await settingsService.updateModelHealth(model.id, false)
      }
    }
    
    const errorDetails = errors.map(e => `${e.modelId}: ${e.error}`).join('; ')
    logger.warn('所有自定义模型都失败，回退到主配置', { errors: errorDetails })
  }
  
  // 主配置也添加重试机制
  let mainConfigRetryCount = 0
  const maxMainConfigRetries = 1
  
  while (mainConfigRetryCount < maxMainConfigRetries) {
    try {
      return await aiService.generateText(prompt, options)
    } catch (error) {
      mainConfigRetryCount++
      const errorMessage = error instanceof Error ? error.message : String(error)
      logger.warn(`主配置生成失败，正在重试... (${mainConfigRetryCount}/${maxMainConfigRetries})`, { error: errorMessage })
      
      // 重试前短暂休息
      if (mainConfigRetryCount < maxMainConfigRetries) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }
  }
  
  // 所有尝试都失败
  throw new Error('所有模型生成都失败，请检查API配置和网络连接')
}

const deduplicationService = new ContentDeduplicationService(generateTextWithFailover)




/**
 * 解析带摘要的大纲
 * 支持多种章节标题格式：
 * - 第1章 标题 / 第一章 标题
 * - **第1章 标题** / **第一章 标题** (Markdown加粗)
 * - ## 第1章 标题 (Markdown标题)
 * - 1. 标题 / 1．标题 (数字编号)
 * - [1] 标题 (方括号编号)
 * - Chapter 1: 标题 (英文格式)
 * - 第一部分/第二部分 标题
 */
function parseOutlineWithSummary(outline: string): { title: string; summary: string }[] {
  const chapters: { title: string; summary: string }[] = []
  const lines = outline.split('\n')

  let currentChapter: { title: string; summary: string } | null = null
  let currentSection: string[] = []

  // 预处理：移除Markdown加粗符号和标题符号
  const cleanLine = (line: string): string => {
    return line
      .replace(/^\*+/, '')  // 移除开头的*
      .replace(/\*+$/, '')  // 移除结尾的*
      .replace(/^#+\s*/, '') // 移除开头的#
      .trim()
  }

  // 检测章节标题的各种模式
  const chapterPatterns = [
    // 第X章/回/节 标题 (支持中文数字和阿拉伯数字)
    /^第([一二三四五六七八九十百千万\d]+)[章回节]\s*[：:]?\s*(.+)$/,
    // 第X部分 标题
    /^第([一二三四五六七八九十百千万\d]+)部分\s*[：:]?\s*(.+)$/,
    // 数字编号 1. 标题 或 1．标题
    /^(\d+)[.．]\s*(.+)$/,
    // 方括号编号 [1] 标题
    /^\[(\d+)\]\s*(.+)$/,
    // 英文格式 Chapter 1: 标题 或 Chapter 1 - 标题
    /^Chapter\s*(\d+)\s*[:：\-—]\s*(.+)$/i,
    // 纯数字章节 1 标题 (数字后跟空格和标题)
    /^(\d+)\s+(.+)$/,
  ]

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    // 先清理Markdown格式
    const cleanedLine = cleanLine(line)
    
    let isChapterTitle = false
    let chapterTitle = ''

    // 尝试匹配各种章节格式
    for (const pattern of chapterPatterns) {
      const match = cleanedLine.match(pattern)
      if (match) {
        isChapterTitle = true
        chapterTitle = match[2].trim()
        break
      }
    }

    if (isChapterTitle && chapterTitle) {
      // 保存之前的章节
      if (currentChapter) {
        currentChapter.summary = currentSection.join('\n').trim()
        chapters.push(currentChapter)
        currentSection = []
      }
      currentChapter = {
        title: chapterTitle,
        summary: ''
      }
    } else if (currentChapter) {
      // 跳过部分标题（如"第一部分：相遇与心动"）
      if (cleanedLine.match(/^第[一二三四五六七八九十百千万\d]+部分/)) {
        continue
      }
      // 跳过空行和纯符号行
      if (cleanedLine && !cleanedLine.match(/^[#*\-—─]+$/)) {
        currentSection.push(cleanedLine)
      }
    }
  }

  // 保存最后一个章节
  if (currentChapter) {
    currentChapter.summary = currentSection.join('\n').trim()
    chapters.push(currentChapter)
  }

  return chapters
}

/**
 * 计算字数
 */
function countWords(text: string): number {
  // 中文字符计数
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length
  // 英文单词计数
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length
  return chineseChars + englishWords
}

/**
 * 生成服务
 */
export const generateService = {
  /**
   * 创建生成任务
   */
  createTask(novelId?: string): GenerateProgress {
    const id = uuidv4()
    const now = new Date().toISOString()

    const task: GenerateProgress = {
      id,
      novelId: novelId || '',
      status: 'pending',
      progress: 0,
      createdAt: now,
      updatedAt: now
    }

    run(
      `INSERT INTO generate_tasks (id, novel_id, status, progress, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [task.id, task.novelId, task.status, task.progress, task.createdAt, task.updatedAt]
    )

    logger.info('生成任务创建成功', { id, novelId })
    return task
  },

  /**
   * 获取生成任务
   */
  async getTask(id: string): Promise<(GenerateProgress & { estimatedTimeRemaining?: number }) | null> {
    const task = await queryOne<{
      id: string;
      novel_id: string | null;
      status: string;
      progress: number;
      current_chapter: number | null;
      total_chapters: number | null;
      message: string | null;
      error: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM generate_tasks WHERE id = ?', [id])

    if (!task) return null

    const result: (GenerateProgress & { estimatedTimeRemaining?: number }) | null = {
      id: task.id,
      novelId: task.novel_id || '',
      status: task.status as GenerateProgress['status'],
      progress: task.progress,
      currentChapter: task.current_chapter || undefined,
      totalChapters: task.total_chapters || undefined,
      message: task.message || undefined,
      error: task.error || undefined,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }

    if (task.status === 'generating' && task.progress > 0 && task.progress < 100) {
      const startTime = new Date(task.created_at).getTime()
      const currentTime = Date.now()
      const elapsedTime = currentTime - startTime
      const estimatedTotalTime = elapsedTime / (task.progress / 100)
      const estimatedTimeRemaining = Math.max(0, Math.round((estimatedTotalTime - elapsedTime) / 1000))
      result.estimatedTimeRemaining = estimatedTimeRemaining
    }

    return result
  },

  async getTaskByNovelId(novelId: string): Promise<(GenerateProgress & { estimatedTimeRemaining?: number }) | null> {
    const task = await queryOne<{
      id: string;
      novel_id: string | null;
      status: string;
      progress: number;
      current_chapter: number | null;
      total_chapters: number | null;
      message: string | null;
      error: string | null;
      created_at: string;
      updated_at: string;
    }>('SELECT * FROM generate_tasks WHERE novel_id = ? ORDER BY created_at DESC LIMIT 1', [novelId])

    if (!task) return null

    const result: (GenerateProgress & { estimatedTimeRemaining?: number }) | null = {
      id: task.id,
      novelId: task.novel_id || '',
      status: task.status as GenerateProgress['status'],
      progress: task.progress,
      currentChapter: task.current_chapter || undefined,
      totalChapters: task.total_chapters || undefined,
      message: task.message || undefined,
      error: task.error || undefined,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    }

    if (task.status === 'generating' && task.progress > 0 && task.progress < 100) {
      const startTime = new Date(task.created_at).getTime()
      const currentTime = Date.now()
      const elapsedTime = currentTime - startTime
      const estimatedTotalTime = elapsedTime / (task.progress / 100)
      const estimatedTimeRemaining = Math.max(0, Math.round((estimatedTotalTime - elapsedTime) / 1000))
      result.estimatedTimeRemaining = estimatedTimeRemaining
    }

    return result
  },

  /**
   * 更新生成任务
   */
  updateTask(id: string, updates: Partial<GenerateProgress>): void {
    const sets: string[] = []
    const params: unknown[] = []

    if (updates.status !== undefined) {
      sets.push('status = ?')
      params.push(updates.status)
    }
    if (updates.progress !== undefined) {
      sets.push('progress = ?')
      params.push(updates.progress)
    }
    if (updates.currentChapter !== undefined) {
      sets.push('current_chapter = ?')
      params.push(updates.currentChapter)
    }
    if (updates.totalChapters !== undefined) {
      sets.push('total_chapters = ?')
      params.push(updates.totalChapters)
    }
    if (updates.message !== undefined) {
      sets.push('message = ?')
      params.push(updates.message)
    }
    if (updates.error !== undefined) {
      sets.push('error = ?')
      params.push(updates.error)
    }

    sets.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(id)

    run(`UPDATE generate_tasks SET ${sets.join(', ')} WHERE id = ?`, params)
  },

  /**
   * 取消生成任务
   */
  async cancelTask(id: string): Promise<boolean> {
    const task = await this.getTask(id)
    if (!task) return false

    // 如果任务正在进行中，中止它
    if (task.status === 'generating' && activeTasks.has(id)) {
      const controller = activeTasks.get(id)
      controller?.abort()
      activeTasks.delete(id)
    }

    // 更新任务状态
    this.updateTask(id, {
      status: 'cancelled',
      message: '生成任务已取消'
    })

    // 如果有关联的小说，更新小说状态
    if (task.novelId) {
      await novelService.updateNovel(task.novelId, { status: 'failed' })
    }

    logger.info('生成任务已取消', { id })
    return true
  },

  /**
   * 生成大纲
   */
  async generateOutline(
    title: string,
    prompt: string,
    genre: NovelGenre = 'general',
    length: NovelLength = 'medium',
    styleId?: string,
    styleConfig?: StyleConfig,
    imageDescriptions: string[] = [],
    templateId?: string,
    wordCount?: number,
    logicRequirements?: string
  ): Promise<string> {
    let systemPrompt = generateSystemPrompt(genre as PromptNovelGenre)
    
    // 如果有风格，添加风格提示
    if (styleId) {
      try {
        const stylePrompt = await styleService.generateStylePrompt(styleId, prompt)
        systemPrompt += '\n\n' + stylePrompt
      } catch (error) {
        logger.warn('风格不存在，使用默认风格', { styleId, error })
      }
    } else if (styleConfig) {
      const stylePrompt = styleService.generatePromptFromConfig(styleConfig, prompt)
      systemPrompt += '\n\n' + stylePrompt
    }
    
    // 如果有图片描述，添加到系统提示中
    if (imageDescriptions.length > 0) {
      systemPrompt += '\n\n以下是用户提供的图片描述，这些图片与小说内容相关，请在生成大纲时参考：\n'
      imageDescriptions.forEach((desc, index) => {
        systemPrompt += `${index + 1}. ${desc}\n`
      })
    }
    
    // 如果有模板，添加模板结构和指南
    if (templateId) {
      const template = writingTemplateService.getTemplateById(templateId)
      if (template) {
        systemPrompt += '\n\n写作模板信息：\n'
        systemPrompt += `模板名称：${template.name}\n`
        systemPrompt += `模板类型：${template.type}\n`
        systemPrompt += '\n模板结构：\n'
        if (template.structure.title) {
          systemPrompt += `标题：${template.structure.title}\n`
        }
        if (template.structure.chapters) {
          template.structure.chapters.forEach((chapter, index) => {
            systemPrompt += `${index + 1}. ${chapter.title}\n`
            chapter.sections.forEach((section, secIndex) => {
              systemPrompt += `   ${secIndex + 1}. ${section}\n`
            })
          })
        } else if (template.structure.sections) {
          template.structure.sections.forEach((section, index) => {
            systemPrompt += `${index + 1}. ${section}\n`
          })
        }
        if (template.guidelines && template.guidelines.length > 0) {
          systemPrompt += '\n写作指南：\n'
          template.guidelines.forEach((guideline, index) => {
            systemPrompt += `${index + 1}. ${guideline}\n`
          })
        }
        systemPrompt += '\n请根据以上模板结构和指南生成符合要求的大纲。\n'
      }
    }
    
    // 如果有逻辑要求，添加到系统提示中
    if (logicRequirements) {
      systemPrompt += '\n\n逻辑要求：\n'
      systemPrompt += '请严格遵守以下逻辑限制条件，确保生成的内容符合现实逻辑：\n'
      systemPrompt += logicRequirements + '\n'
    }
    
    const outlinePrompt = generateOutlinePrompt(title, prompt, genre as PromptNovelGenre, length, wordCount)
    const optimizedPrompt = optimizePrompt(outlinePrompt)

    const outline = await generateTextWithFailover(optimizedPrompt, {
      systemPrompt,
      temperature: 0.8,
      maxTokens: 4000
    })

    return outline
  },

  async generateOutlineFromSentence(
    sentence: string,
    genre: NovelGenre = 'general',
    length: NovelLength = 'medium'
  ): Promise<string> {
    const systemPrompt = generateSystemPrompt(genre as PromptNovelGenre)
    const prompt = generateOneSentencePrompt(sentence, genre as PromptNovelGenre, length)
    const optimizedPrompt = optimizePrompt(prompt)

    const outline = await generateTextWithFailover(optimizedPrompt, {
      systemPrompt,
      temperature: 0.9,
      maxTokens: 4000
    })

    return outline
  },

  /**
   * 生成单章内容
   */
  async generateChapter(
    title: string,
    chapterNumber: number,
    chapterTitle: string,
    outline: string,
    previousContent: string,
    targetWords: number,
    genre: NovelGenre = 'general',
    styleId?: string,
    styleConfig?: StyleConfig,
    imageDescriptions: string[] = [],
    templateId?: string,
    logicRequirements?: string
  ): Promise<string> {
    let systemPrompt = generateSystemPrompt(genre as PromptNovelGenre)
    
    // 如果有风格，添加风格提示
    if (styleId) {
      try {
        const stylePrompt = await styleService.generateStylePrompt(styleId)
        systemPrompt += '\n\n' + stylePrompt
      } catch (error) {
        logger.warn('风格不存在，使用默认风格', { styleId, error })
      }
    } else if (styleConfig) {
      const stylePrompt = styleService.generatePromptFromConfig(styleConfig)
      systemPrompt += '\n\n' + stylePrompt
    }
    
    // 如果有图片描述，添加到系统提示中
    if (imageDescriptions.length > 0) {
      systemPrompt += '\n\n以下是用户提供的图片描述，这些图片与小说内容相关，请在生成章节内容时参考：\n'
      imageDescriptions.forEach((desc, index) => {
        systemPrompt += `${index + 1}. ${desc}\n`
      })
    }
    
    // 如果有模板，添加模板结构和指南
    if (templateId) {
      const template = writingTemplateService.getTemplateById(templateId)
      if (template) {
        systemPrompt += '\n\n写作模板信息：\n'
        systemPrompt += `模板名称：${template.name}\n`
        systemPrompt += `模板类型：${template.type}\n`
        if (template.guidelines && template.guidelines.length > 0) {
          systemPrompt += '\n写作指南：\n'
          template.guidelines.forEach((guideline, index) => {
            systemPrompt += `${index + 1}. ${guideline}\n`
          })
        }
        systemPrompt += '\n请根据以上模板指南生成符合要求的章节内容。\n'
      }
    }
    
    // 如果有逻辑要求，添加到系统提示中
    if (logicRequirements) {
      systemPrompt += '\n\n逻辑要求：\n'
      systemPrompt += '请严格遵守以下逻辑限制条件，确保生成的内容符合现实逻辑：\n'
      systemPrompt += logicRequirements + '\n'
    }
    
    // 对于长篇小说，增加更详细的系统提示
    systemPrompt += '\n\n' + `
长篇小说写作特别要求：
1. 保持情节的连贯性和逻辑性
2. 确保人物性格的一致性
3. 注意伏笔的埋设和回收
4. 保持叙事节奏的稳定
5. 避免前后矛盾的情节
6. 适当回顾前文重要情节
7. 为后续章节埋下合理的线索
`
    
    const chapterPrompt = generateChapterPrompt(
      title,
      chapterNumber,
      chapterTitle,
      outline,
      previousContent,
      targetWords,
      genre as PromptNovelGenre
    )
    const optimizedPrompt = optimizePrompt(chapterPrompt)

    // 根据目标字数动态调整maxTokens
    const maxTokens = Math.min(targetWords * 2, 10000) // 增加最大token数以支持更长的章节

    const content = await generateTextWithFailover(optimizedPrompt, {
      systemPrompt,
      temperature: 0.7,
      maxTokens
    })

    return content
  },

  /**
   * 生成章节摘要（用于长篇小说上下文记忆）
   */
  async generateChapterSummary(
    chapterTitle: string,
    chapterNumber: number,
    content: string
  ): Promise<string> {
    const prompt = generateChapterSummaryPrompt(chapterTitle, chapterNumber, content)

    try {
      const summary = await generateTextWithFailover(prompt, {
        systemPrompt: '你是一位专业的小说编辑，擅长提炼章节核心内容。请为每章生成100-200字的简明摘要。',
        temperature: 0.3,
        maxTokens: 500
      })
      return summary.trim()
    } catch (error) {
      logger.error('生成章节摘要失败', { chapterNumber, error })
      // 返回简单的摘要作为后备
      return `${chapterTitle}：${content.substring(0, 150)}...`
    }
  },

  /**
   * 生成章节描述（介于大纲和正文之间的详细写作指导）
   */
  async generateChapterDescription(
    title: string,
    chapterNumber: number,
    chapterTitle: string,
    totalChapters: number,
    outline: string,
    previousDescription?: string
  ): Promise<string> {
    const prompt = generateChapterDescriptionPrompt(
      title,
      chapterNumber,
      chapterTitle,
      totalChapters,
      outline,
      previousDescription
    )

    try {
      const description = await generateTextWithFailover(prompt, {
        systemPrompt: '你是一位经验丰富的小说策划编辑，擅长将大纲细化为可执行的章节写作指南。请为每章生成300-500字的详细描述。',
        temperature: 0.8,
        maxTokens: 1000
      })
      return description.trim()
    } catch (error) {
      logger.error('生成章节描述失败', { chapterNumber, chapterTitle, error })
      throw error
    }
  },

  /**
   * 批量生成所有章节的描述
   * 为每个章节生成详细的写作指导，确保章节间的连贯性
   */
  async generateAllChapterDescriptions(
    taskId: string,
    novelId: string,
    chapters: Array<{ title: string; summary: string }>,
    outline: string,
    title: string,
    abortSignal?: AbortSignal
  ): Promise<void> {
    // 获取数据库中已有的章节
    const existingChapters = await novelService.getChapters(novelId)

    // 检查哪些章节已有 description（跳过这些）
    const chaptersWithoutDescription = chapters.filter((_, index) => {
      const existingChapter = existingChapters[index]
      return !existingChapter?.description || existingChapter.description.trim() === ''
    })

    if (chaptersWithoutDescription.length === 0) {
      logger.info('所有章节已有描述，无需生成', { novelId })
      this.updateTask(taskId, {
        message: '所有章节已有描述'
      })
      return
    }

    const totalToGenerate = chaptersWithoutDescription.length
    const progressRange = 25 // 进度范围：10%-35%
    let generatedCount = 0

    logger.info('开始批量生成章节描述', { novelId, totalToGenerate })

    // 更新任务状态
    this.updateTask(taskId, {
      progress: 10,
      message: `开始为${totalToGenerate}章生成描述...`
    })

    let previousDescription: string | undefined

    // 逐章串行生成 description
    for (let i = 0; i < chapters.length; i++) {
      // 检查是否被取消
      if (abortSignal?.aborted) {
        logger.info('章节描述生成已取消', { novelId, currentChapter: i + 1 })
        throw new Error('生成任务已取消')
      }

      const chapter = chapters[i]
      const existingChapter = existingChapters[i]

      // 如果已有 description，则跳过并记录上一章的描述用于上下文
      if (existingChapter?.description && existingChapter.description.trim() !== '') {
        previousDescription = existingChapter.description
        continue
      }

      try {
        // 生成当前章节的描述
        const description = await this.generateChapterDescription(
          title,
          i + 1,
          chapter.title,
          chapters.length,
          outline,
          previousDescription
        )

        // 再次检查是否被取消（AI调用后）
        if (abortSignal?.aborted) {
          logger.info('章节描述生成已取消', { novelId, currentChapter: i + 1 })
          throw new Error('生成任务已取消')
        }

        // 立即更新数据库对应章节的 description 字段
        if (existingChapter) {
          await novelService.updateChapter(novelId, existingChapter.id, {
            description
          })
        }

        // 记录当前描述作为下一章的上下文
        previousDescription = description

        generatedCount++

        // 更新任务进度（10%-35%范围）
        const currentProgress = 10 + Math.floor((generatedCount / totalToGenerate) * progressRange)
        this.updateTask(taskId, {
          progress: currentProgress,
          message: `正在生成第${i + 1}章描述：${chapter.title}... (${generatedCount}/${totalToGenerate})`
        })

        logger.info(`第${i + 1}章描述生成成功`, {
          chapterNumber: i + 1,
          chapterTitle: chapter.title,
          descriptionLength: description.length
        })
      } catch (error) {
        // 如果是取消错误，直接抛出
        if (error instanceof Error && error.message === '生成任务已取消') {
          throw error
        }
        
        // 失败处理：用 chapter.summary 构建默认描述
        const defaultDescription = `【本章概要】${chapter.summary}`
        logger.warn(`第${i + 1}章描述生成失败，使用默认描述`, {
          chapterNumber: i + 1,
          chapterTitle: chapter.title,
          error: error instanceof Error ? error.message : error
        })

        // 使用默认描述更新数据库
        if (existingChapter) {
          await novelService.updateChapter(novelId, existingChapter.id, {
            description: defaultDescription
          })
        }

        // 仍然将默认描述作为上下文传递给下一章
        previousDescription = defaultDescription

        generatedCount++
      }

      // 每章间休息 1000ms 避免 API 限流
      if (i < chapters.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // 完成批量生成
    this.updateTask(taskId, {
      message: `章节描述生成完成！共处理${chapters.length}章`
    })

    logger.info('批量生成章节描述完成', {
      taskId,
      novelId,
      totalChapters: chapters.length,
      generatedCount
    })
  },

  /**
   * 构建上下文记忆（用于长篇小说续写）
   */
  buildContextMemory(
    generatedChapters: Array<{ title: string; content: string; wordCount: number; summary?: string }>,
    currentChapterIndex: number,
    totalChapters: number,
    _outline: string
  ): { chaptersSummary: string; recentContent: string; contextTracking: string } {
    const completedChapters = generatedChapters.slice(0, currentChapterIndex)
    
    // 1. 已完成章节的摘要列表
    const chaptersWithSummary = completedChapters.filter(ch => ch.summary)
    const chaptersWithoutSummary = completedChapters.filter(ch => !ch.summary)
    
    let chaptersSummary = ''
    if (chaptersWithSummary.length > 0) {
      chaptersSummary = '已完成章节摘要：\n'
      chaptersWithSummary.forEach((ch, idx) => {
        chaptersSummary += `第${idx + 1}章 ${ch.title}：${ch.summary}\n`
      })
    }
    if (chaptersWithoutSummary.length > 0) {
      chaptersSummary += '\n其他已完成章节标题：\n'
      chaptersWithoutSummary.forEach((ch, idx) => {
        chaptersSummary += `- 第${idx + 1}章 ${ch.title}\n`
      })
    }

    // 2. 最近章节的详细内容（最近2-3章）
    const recentChapterCount = Math.min(3, completedChapters.length)
    const recentChapters = completedChapters.slice(-recentChapterCount)
    let recentContent = ''
    if (recentChapters.length > 0) {
      recentContent = '最近章节详细内容：\n'
      recentChapters.forEach(ch => {
        recentContent += `\n--- ${ch.title} ---\n`
        recentContent += ch.content.substring(0, 800)
        if (ch.content.length > 800) {
          recentContent += '...'
        }
        recentContent += '\n'
      })
    }

    // 3. 关键信息追踪（从所有已完成内容中提取）
    let contextTracking = '关键信息追踪：\n'
    
    // 收集最近章节的内容用于分析
    const allRecentContent = recentChapters.map(ch => ch.content).join('\n')
    if (allRecentContent.length > 0) {
      contextTracking += `- 当前情节进展：已写到第${currentChapterIndex}章，共${totalChapters}章\n`
      
      if (currentChapterIndex > 5) {
        contextTracking += `- 注意：这是长篇小说的中后段，请注意回顾前文的伏笔和设定\n`
      }
    } else {
      contextTracking += '- 这是小说的开篇部分\n'
    }

    return { chaptersSummary, recentContent, contextTracking }
  },

  /**
   * 使用完整上下文生成单章内容（用于长篇小说）
   */
  async generateChapterWithContext(
    title: string,
    chapterNumber: number,
    totalChapters: number,
    chapterTitle: string,
    outline: string,
    chaptersSummary: string,
    recentContent: string,
    contextTracking: string,
    targetWords: number,
    genre: NovelGenre = 'general',
    styleId?: string,
    styleConfig?: StyleConfig,
    imageDescriptions: string[] = [],
    templateId?: string,
    logicRequirements?: string
  ): Promise<string> {
    let systemPrompt = generateSystemPrompt(genre as PromptNovelGenre)
    
    if (styleId) {
      try {
        const stylePrompt = await styleService.generateStylePrompt(styleId)
        systemPrompt += '\n\n' + stylePrompt
      } catch (error) {
        logger.warn('风格不存在，使用默认风格', { styleId, error })
      }
    } else if (styleConfig) {
      const stylePrompt = styleService.generatePromptFromConfig(styleConfig)
      systemPrompt += '\n\n' + stylePrompt
    }
    
    if (imageDescriptions.length > 0) {
      systemPrompt += '\n\n以下是用户提供的图片描述，这些图片与小说内容相关，请在生成章节内容时参考：\n'
      imageDescriptions.forEach((desc, index) => {
        systemPrompt += `${index + 1}. ${desc}\n`
      })
    }
    
    if (templateId) {
      const template = writingTemplateService.getTemplateById(templateId)
      if (template) {
        systemPrompt += '\n\n写作模板信息：\n'
        systemPrompt += `模板名称：${template.name}\n`
        if (template.guidelines && template.guidelines.length > 0) {
          systemPrompt += '\n写作指南：\n'
          template.guidelines.forEach((guideline, index) => {
            systemPrompt += `${index + 1}. ${guideline}\n`
          })
        }
      }
    }
    
    // 如果有逻辑要求，添加到系统提示中
    if (logicRequirements) {
      systemPrompt += '\n\n逻辑要求：\n'
      systemPrompt += '请严格遵守以下逻辑限制条件，确保生成的内容符合现实逻辑：\n'
      systemPrompt += logicRequirements + '\n'
    }
    
    systemPrompt += '\n\n【长篇小说上下文模式】\n'
    systemPrompt += `你正在创作一部${totalChapters}章的长篇小说，当前是第${chapterNumber}章。\n`
    systemPrompt += '系统已为你提供了完整的上下文信息，包括：\n'
    systemPrompt += '- 所有已完成章节的摘要\n'
    systemPrompt += '- 最近几章的详细内容\n'
    systemPrompt += '- 关键的情节追踪信息\n\n'
    systemPrompt += '请务必：\n'
    systemPrompt += '1. 与前面的章节保持完全连贯\n'
    systemPrompt += '2. 保持角色性格的一致性\n'
    systemPrompt += '3. 回顾并延续前面埋下的伏笔\n'
    systemPrompt += '4. 为后续章节合理铺垫\n'
    
    const chapterPrompt = generateContextAwareChapterPrompt(
      title,
      chapterNumber,
      totalChapters,
      chapterTitle,
      outline,
      chaptersSummary,
      recentContent,
      contextTracking,
      targetWords,
      genre as PromptNovelGenre
    )
    const optimizedPrompt = optimizePrompt(chapterPrompt)

    const maxTokens = Math.min(targetWords * 2, 12000)

    const content = await generateTextWithFailover(optimizedPrompt, {
      systemPrompt,
      temperature: 0.7,
      maxTokens
    })

    return content
  },

  /**
   * 生成小说内容 - 一句话生成完整小说
   */
  async generateNovel(
    taskId: string,
    params: {
      title: string
      prompt: string
      templateId?: string
      style?: string
      styleConfig?: StyleConfig
      wordCount?: number
      type?: NovelGenre
      length?: NovelLength
      images?: string[]
      imageDescriptions?: string[]
      logicRequirements?: string
    }
  ): Promise<void> {
    const { title, prompt, templateId, style, styleConfig, wordCount = 50000, type = 'general', length = 'medium', imageDescriptions: _imageDescriptions = [], logicRequirements } = params

    // 创建小说
    const novel = await novelService.createNovel({
      title,
      type: type || 'general',
      prompt,
      style,
      styleConfig,
      targetWordCount: wordCount,
      status: 'generating'
    })

    // 更新任务关联的小说ID
    this.updateTask(taskId, {
      novelId: novel.id,
      status: 'generating',
      message: '开始生成小说...'
    })

    // 创建中止控制器
    const controller = new AbortController()
    activeTasks.set(taskId, controller)

    try {
      // 步骤1：生成大纲
      this.updateTask(taskId, {
        progress: 5,
        message: '正在构思大纲...'
      })

      // 对于长篇小说，使用更详细的大纲生成
      const outlineLength = wordCount > 100000 ? 'epic' : wordCount > 50000 ? 'long' : length
      let outline
      try {
        outline = await this.generateOutline(title, prompt, type, outlineLength, style, styleConfig, _imageDescriptions, templateId, wordCount, logicRequirements)
      } catch (outlineError) {
        const errorMessage = `大纲生成失败: ${outlineError instanceof Error ? outlineError.message : '未知错误'}`
        logger.error('大纲生成失败', { error: outlineError })
        this.updateTask(taskId, {
          status: 'failed',
          error: errorMessage
        })
        novelService.updateNovel(novel.id, { status: 'failed', error: errorMessage })
        throw outlineError
      }

      // 更新小说大纲
      novelService.updateNovel(novel.id, { outline })

      // 步骤2：解析大纲并生成章节
      let chapters
      try {
        chapters = parseOutlineWithSummary(outline)
      } catch (parseError) {
        const errorMessage = `大纲解析失败: ${parseError instanceof Error ? parseError.message : '未知错误'}`
        logger.error('大纲解析失败', { error: parseError })
        this.updateTask(taskId, {
          status: 'failed',
          error: errorMessage
        })
        novelService.updateNovel(novel.id, { status: 'failed', error: errorMessage })
        throw parseError
      }
      const totalChapters = chapters.length || Math.ceil(wordCount / 3000)

      // 记录总章节数到小说表
      await novelService.updateNovel(novel.id, { totalChapterCount: totalChapters })

      this.updateTask(taskId, {
        progress: 10,
        totalChapters,
        message: `大纲生成完成，共${totalChapters}章，开始生成章节内容...`
      })

      // 如果没有解析到章节，创建默认章节
      if (chapters.length === 0) {
        const defaultChapterCount = Math.min(20, Math.ceil(wordCount / 3000))
        for (let i = 1; i <= defaultChapterCount; i++) {
          chapters.push({
            title: `第${i}章`,
            summary: ''
          })
        }
      }

      // ===== 阶段二：生成章节描述 (10%-35%) =====
      // 先创建所有章节骨架（只有标题和摘要），确保描述生成时可以立即保存
      this.updateTask(taskId, {
        progress: 10,
        message: '正在创建章节骨架...'
      })

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i]
        await novelService.createChapter(novel.id, {
          title: chapter.title,
          content: '',
          description: chapter.summary || '',
          orderIndex: i
        })
      }

      logger.info('章节骨架创建完成', { novelId: novel.id, count: chapters.length })

      this.updateTask(taskId, {
        message: '正在为每章生成详细描述（规划内容走向）...'
      })

      try {
        await this.generateAllChapterDescriptions(
          taskId,
          novel.id,
          chapters,
          outline,
          title,
          controller.signal
        )
        logger.info('所有章节描述生成完成', { taskId, novelId: novel.id })
      } catch (descError) {
        // 检查是否是取消错误
        if (controller.signal.aborted) {
          throw descError
        }
        logger.warn('部分章节描述生成失败，将使用默认描述继续', { error: descError })
        // 不中断流程，继续用默认描述进行正文生成
      }

      // 重新获取带description的章节信息用于后续生成
      const chaptersWithDescriptions = await novelService.getChapters(novel.id)

      // 逐章生成
      const generatedChapters: Array<{ title: string; content: string; wordCount: number; summary?: string }> = []
      const targetWordsPerChapter = Math.floor(wordCount / chapters.length)
      const batchSize = 2 // 进一步减少每批生成章节数，降低API调用频率
      const batchDelay = 10000 // 增加批次之间的延迟时间，从5000ms增加到10000ms
      const chapterDelay = 5000 // 增加章节之间的延迟时间，从1000ms增加到5000ms
      const maxChaptersInMemory = 2 // 进一步减少内存中保存的章节数
      let failedChapters = 0 // 记录失败的章节数
      const isLongNovel = chapters.length > 10 // 超过10章视为长篇小说

      for (let batchStart = 0; batchStart < chapters.length; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, chapters.length)
        const batchNumber = Math.floor(batchStart / batchSize) + 1
        const totalBatches = Math.ceil(chapters.length / batchSize)
        
        // 批次开始时更新进度
        this.updateTask(taskId, {
          message: `开始第${batchNumber}批生成（${isLongNovel ? '长篇模式-带上下文记忆' : '普通模式'}），共${totalBatches}批...`
        })
        
        for (let i = batchStart; i < batchEnd; i++) {
          // 检查是否被取消
          if (controller.signal.aborted) {
            throw new Error('生成任务已取消')
          }

          const chapter = chapters[i]
          const progress = 35 + Math.floor((i / chapters.length) * 65)

          const chapterStartTime = Date.now()
          
          this.updateTask(taskId, {
            progress,
            currentChapter: i + 1,
            message: `正在撰写第${i + 1}章：${chapter.title}${isLongNovel ? '（已记忆前' + i + '章）' : ''}...`
          })
          
          logger.info('开始生成章节', { 
            chapter: i + 1, 
            title: chapter.title, 
            batch: batchNumber, 
            totalBatches: totalBatches,
            mode: isLongNovel ? '长篇模式' : '普通模式'
          })

          try {
            let content: string
            
            // 增加重试机制，最多尝试3次
            let retryCount = 0
            const maxRetries = 3
            let generationError: Error | null = null
            
            while (retryCount < maxRetries) {
              try {
                if (isLongNovel && i > 0) {
                  // 长篇小说模式：使用完整上下文
                  const contextMemory = this.buildContextMemory(
                    generatedChapters,
                    i,
                    chapters.length,
                    outline
                  )
                  
                  content = await this.generateChapterWithContext(
                    title,
                    i + 1,
                    chapters.length,
                    chapter.title,
                    outline,
                    contextMemory.chaptersSummary,
                    contextMemory.recentContent,
                    contextMemory.contextTracking,
                    targetWordsPerChapter,
                    type,
                    style,
                    styleConfig,
                    _imageDescriptions,
                    templateId,
                    logicRequirements
                  )
                  
                  // 内容去重检测（长篇模式）
                  if (generatedChapters.length > 0) {
                    const existingContents = generatedChapters.map(c => c.content)
                    const dedupResult = await deduplicationService.processChapter(
                      content,
                      existingContents,
                      chapter.title,
                      i + 1
                    )
                    
                    if (dedupResult.rewritten || dedupResult.openingRewritten) {
                      content = dedupResult.content
                      logger.info('章节内容去重处理完成（长篇模式）', {
                        chapter: i + 1,
                        rewritten: dedupResult.rewritten,
                        openingRewritten: dedupResult.openingRewritten,
                        originalSimilarity: dedupResult.originalSimilarity.toFixed(4),
                        newSimilarity: dedupResult.newSimilarity.toFixed(4)
                      })
                    }
                  }
                  
                  // 为每章生成摘要（用于后续章节的上下文）
                  try {
                    const summary = await this.generateChapterSummary(
                      chapter.title,
                      i + 1,
                      content
                    )
                    
                    generatedChapters.push({
                      title: chapter.title,
                      content: content.trim(),
                      wordCount: countWords(content),
                      summary
                    })
                    
                    logger.info(`第${i + 1}章摘要生成完成`, { 
                      chapter: i + 1, 
                      summaryLength: summary.length 
                    })
                  } catch (summaryError) {
                    logger.warn(`第${i + 1}章摘要生成失败，使用简单摘要`, { error: summaryError })
                    generatedChapters.push({
                      title: chapter.title,
                      content: content.trim(),
                      wordCount: countWords(content),
                      summary: `${chapter.title}：${content.substring(0, 100)}...`
                    })
                  }
                } else {
                  // 普通模式或第一章
                  const previousChapters = generatedChapters.slice(-3)
                  const previousSummary = i > 0
                    ? previousChapters.map(c =>
                        `${c.title}: ${c.content.substring(0, 300)}...`
                      ).join('\n')
                    : ''

                  const contextInfo = i > 0 && i < chapters.length - 1
                    ? `\n\n下一章预告：${chapters[i + 1]?.summary || ''}`
                    : ''

                  content = await this.generateChapter(
                    title,
                    i + 1,
                    chapter.title,
                    outline,
                    previousSummary + contextInfo,
                    targetWordsPerChapter,
                    type,
                    style,
                    styleConfig,
                    _imageDescriptions,
                    templateId,
                    logicRequirements
                  )

                  // 内容去重检测
                  if (i > 0 && generatedChapters.length > 0) {
                    const existingContents = generatedChapters.map(c => c.content)
                    const dedupResult = await deduplicationService.processChapter(
                      content,
                      existingContents,
                      chapter.title,
                      i + 1
                    )
                    
                    if (dedupResult.rewritten || dedupResult.openingRewritten) {
                      content = dedupResult.content
                      logger.info('章节内容去重处理完成', {
                        chapter: i + 1,
                        rewritten: dedupResult.rewritten,
                        openingRewritten: dedupResult.openingRewritten,
                        originalSimilarity: dedupResult.originalSimilarity.toFixed(4),
                        newSimilarity: dedupResult.newSimilarity.toFixed(4)
                      })
                    }
                  }

                  const chapterWordCount = countWords(content)

                  generatedChapters.push({
                    title: chapter.title,
                    content: content.trim(),
                    wordCount: chapterWordCount
                  })
                }
                
                // 生成成功，跳出循环
                break
              } catch (error) {
                retryCount++
                generationError = error instanceof Error ? error : new Error('未知错误')
                logger.warn(`第${i + 1}章生成失败，正在重试... (${retryCount}/${maxRetries})`, { error: generationError })
                
                // 重试前短暂休息
                if (retryCount < maxRetries) {
                  await new Promise(resolve => setTimeout(resolve, 3000 * retryCount))
                }
              }
            }
            
            // 检查是否生成成功
            if (retryCount >= maxRetries || !generatedChapters[generatedChapters.length - 1]) {
              throw generationError || new Error('章节生成失败')
            }

            // 更新章节内容（章节骨架已在描述阶段创建）
            const currentContent = generatedChapters[generatedChapters.length - 1]?.content || ''
            const chapterToUpdate = chaptersWithDescriptions[i]
            if (chapterToUpdate) {
              await novelService.updateChapter(novel.id, chapterToUpdate.id, {
                content: currentContent.trim()
              })
            }

            // 记录章节生成完成时间
            const chapterEndTime = Date.now()
            const chapterDuration = chapterEndTime - chapterStartTime
            
            // 更新小说字数和已生成章节数
            const currentNovel = await novelService.getNovelById(novel.id)
            if (currentNovel) {
              const lastChapter = generatedChapters[generatedChapters.length - 1]
              await novelService.updateNovel(novel.id, {
                wordCount: (currentNovel.wordCount || 0) + (lastChapter?.wordCount || 0),
                generatedChapterCount: i + 1,
                lastFailedChapterIndex: null, // 清除失败记录
                lastFailureReason: null
              })
            }
            
            logger.info('章节生成完成', { 
              chapter: i + 1, 
              title: chapter.title, 
              duration: `${chapterDuration}ms`,
              wordCount: generatedChapters[generatedChapters.length - 1]?.wordCount || 0
            })
          } catch (chapterError) {
            // 记录章节生成错误，但继续生成其他章节
            failedChapters++
            const errorMessage = chapterError instanceof Error ? chapterError.message : '未知错误'
            logger.error('章节生成失败', { chapter: i + 1, error: chapterError })
            
            // 记录失败信息到小说表
            await novelService.updateNovel(novel.id, {
              lastFailedChapterIndex: i + 1,
              lastFailureReason: errorMessage
            })
            
            this.updateTask(taskId, {
              message: `第${i + 1}章生成失败，继续生成下一章节...`
            })
            
            // 更新章节为失败占位内容
            const chapterToUpdate = chaptersWithDescriptions[i]
            if (chapterToUpdate) {
              await novelService.updateChapter(novel.id, chapterToUpdate.id, {
                content: `[章节生成失败，请手动编辑]\n\n失败原因：${errorMessage}`
              })
            }
            
            // 为失败的章节添加占位符到generatedChapters，确保数组长度正确
            generatedChapters.push({
              title: chapter.title,
              content: `[章节生成失败，请手动编辑]`,
              wordCount: 0
            })
          }

          // 每章生成后短暂休息
          await new Promise(resolve => setTimeout(resolve, chapterDelay))

          // 内存管理：只保留最近的章节内容
          if (generatedChapters.length > maxChaptersInMemory) {
            // 对于超过内存限制的章节，只保留标题和字数，清除内容以节省内存
            for (let j = 0; j < generatedChapters.length - maxChaptersInMemory; j++) {
              if (generatedChapters[j]) {
                generatedChapters[j] = {
                  title: generatedChapters[j].title,
                  content: '', // 清空内容以节省内存
                  wordCount: generatedChapters[j].wordCount
                }
              }
            }
          }
        }

        // 每批生成后短暂休息，避免API调用过于频繁
        if (batchEnd < chapters.length) {
          this.updateTask(taskId, {
            message: `批次生成完成，休息${batchDelay / 1000}秒后继续...`
          })
          await new Promise(resolve => setTimeout(resolve, batchDelay))
        }
      }

      // 完成生成
      const totalWordCount = generatedChapters.reduce((sum, c) => sum + c.wordCount, 0)
      const status = failedChapters > 0 ? 'completed_with_errors' : 'completed'
      const completionMessage = failedChapters > 0 
        ? `小说生成完成，但有${failedChapters}章生成失败，请手动编辑。共${generatedChapters.length}章，总字数${totalWordCount}字`
        : `小说生成完成！共${generatedChapters.length}章，总字数${totalWordCount}字`

      // 合并章节内容到novel.content字段
      const fullContent = generatedChapters.map(ch => `# ${ch.title}\n\n${ch.content}`).join('\n\n')

      await novelService.updateNovel(novel.id, { 
        status: status as 'completed',
        wordCount: totalWordCount,
        content: fullContent
      })

      this.updateTask(taskId, {
        status: status as 'completed',
        progress: 100,
        message: completionMessage
      })

      logger.info('小说生成完成', { 
        taskId, 
        novelId: novel.id, 
        chapters: generatedChapters.length, 
        totalWordCount,
        failedChapters
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成失败'
      
      await novelService.updateNovel(novel.id, { 
        status: 'failed',
        error: errorMessage
      })

      this.updateTask(taskId, {
        status: 'failed',
        error: errorMessage
      })

      activeTasks.delete(taskId)
      throw error
    } finally {
      activeTasks.delete(taskId)
    }
  },

  /**
   * 根据大纲生成小说
   */
  async generateFromOutline(
    taskId: string,
    params: {
      novelId?: string
      title: string
      outline: string
      templateId?: string
      style?: string
      styleConfig?: StyleConfig
      wordCount?: number
      type?: NovelGenre
    }
  ): Promise<void> {
    const { novelId, title, outline, templateId, style, styleConfig, wordCount = 50000, type = 'general' } = params

    // 使用现有小说或创建新小说
    let novel
    if (novelId) {
      const existingNovel = await novelService.getNovelById(novelId)
      if (!existingNovel) {
        throw new Error('小说不存在')
      }
      novel = await novelService.updateNovel(novelId, {
        status: 'generating',
        outline
      })
    } else {
      novel = await novelService.createNovel({
        title,
        type: type || 'general',
        outline,
        style,
        styleConfig,
        targetWordCount: wordCount,
        status: 'generating'
      })
    }

    if (!novel) {
      throw new Error('创建或更新小说失败')
    }

    // 更新任务
    this.updateTask(taskId, {
      novelId: novel.id,
      status: 'generating',
      message: '开始根据大纲生成小说...'
    })

    // 创建中止控制器
    const controller = new AbortController()
    activeTasks.set(taskId, controller)

    try {
      // 解析大纲
      const chapters = parseOutlineWithSummary(outline)
      const totalChapters = chapters.length || Math.ceil(wordCount / 3000)

      // 记录总章节数到小说表
      await novelService.updateNovel(novel.id, { totalChapterCount: totalChapters })

      this.updateTask(taskId, {
        progress: 5,
        totalChapters,
        message: `解析大纲完成，共${totalChapters}章，开始生成章节内容...`
      })

      // 如果没有解析到章节，创建默认章节
      if (chapters.length === 0) {
        const defaultChapterCount = Math.min(20, Math.ceil(wordCount / 3000))
        for (let i = 1; i <= defaultChapterCount; i++) {
          chapters.push({
            title: `第${i}章`,
            summary: ''
          })
        }
      }

      // 逐章生成
      const generatedChapters: { title: string; content: string; wordCount: number }[] = []
      const targetWordsPerChapter = Math.floor(wordCount / chapters.length)
      const batchSize = 5 // 每批生成5章

      for (let batchStart = 0; batchStart < chapters.length; batchStart += batchSize) {
        const batchEnd = Math.min(batchStart + batchSize, chapters.length)
        
        for (let i = batchStart; i < batchEnd; i++) {
          // 检查是否被取消
          if (controller.signal.aborted) {
            throw new Error('生成任务已取消')
          }

          const chapter = chapters[i]
          const progress = 5 + Math.floor((i / chapters.length) * 90)

          this.updateTask(taskId, {
            progress,
            currentChapter: i + 1,
            message: `正在生成第${i + 1}章：${chapter.title}...`
          })

          // 构建更详细的前文概要
          const previousChapters = generatedChapters.slice(-3) // 考虑前三章的内容
          const previousSummary = i > 0
            ? previousChapters.map(c =>
                `${c.title}: ${c.content.substring(0, 300)}...`
              ).join('\n')
            : ''

          // 对于长篇小说，增加上下文信息
          const contextInfo = i > 0 && i < chapters.length - 1
            ? `\n\n下一章预告：${chapters[i + 1]?.summary || ''}`
            : ''

          const content = await this.generateChapter(
            title,
            i + 1,
            chapter.title,
            outline,
            previousSummary + contextInfo,
            targetWordsPerChapter,
            type,
            style,
            styleConfig,
            [],
            templateId
          )

          const chapterWordCount = countWords(content)

          generatedChapters.push({
            title: chapter.title,
            content: content.trim(),
            wordCount: chapterWordCount
          })

          // 创建章节
          await novelService.createChapter(novel.id, {
            title: chapter.title,
            content: content.trim()
          })

          // 更新小说字数和已生成章节数
          const currentNovel = await novelService.getNovelById(novel.id)
          if (currentNovel) {
            await novelService.updateNovel(novel.id, {
              wordCount: (currentNovel.wordCount || 0) + chapterWordCount,
              generatedChapterCount: i + 1
            })
          }
        }

        // 每批生成后短暂休息，避免API调用过于频繁
        if (batchEnd < chapters.length) {
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }

      // 完成生成
      await novelService.updateNovel(novel.id, { status: 'completed' })

      const totalWordCount = generatedChapters.reduce((sum, c) => sum + c.wordCount, 0)
      this.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        message: `小说生成完成！共${generatedChapters.length}章，总字数${totalWordCount}字`
      })

      logger.info('根据大纲生成小说完成', { taskId, novelId: novel.id, chapters: generatedChapters.length, totalWordCount })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成失败'
      
      await novelService.updateNovel(novel.id, { status: 'failed', error: errorMessage })

      this.updateTask(taskId, {
        status: 'failed',
        error: errorMessage
      })

      activeTasks.delete(taskId)
      throw error
    } finally {
      activeTasks.delete(taskId)
    }
  },

  /**
   * 批量生成章节
   */
  async batchGenerateChapters(
    taskId: string,
    params: {
      novelId: string
      startChapter: number
      endChapter: number
      outline: string
      contentBlockSize?: number // 内容块大小，默认5000-10000字
      templateId?: string
    }
  ): Promise<void> {
    const { novelId, startChapter, endChapter, outline, contentBlockSize = 7500, templateId } = params

    const novel = await novelService.getNovelById(novelId)
    if (!novel) {
      throw new Error('小说不存在')
    }

    const chapters = parseOutlineWithSummary(outline)
    if (chapters.length === 0) {
      throw new Error('无法解析大纲')
    }

    // 确保内容块大小在5000-10000字之间
    const adjustedBlockSize = Math.max(5000, Math.min(10000, contentBlockSize))

    // 更新任务
    this.updateTask(taskId, {
      novelId,
      status: 'generating',
      totalChapters: endChapter - startChapter + 1,
      message: `开始批量生成第${startChapter}章到第${endChapter}章...`
    })

    // 创建中止控制器
    const controller = new AbortController()
    activeTasks.set(taskId, controller)

    try {
      const existingChapters = await novelService.getChapters(novelId)
      const totalChapters = Math.min(endChapter, chapters.length)
      const targetWordsPerChapter = Math.floor((novel.targetWordCount || 50000) / chapters.length)

      // 如果小说还没有设置总章节数，则设置它
      if (!novel.totalChapterCount || novel.totalChapterCount === 0) {
        await novelService.updateNovel(novelId, { totalChapterCount: chapters.length })
      }

      for (let i = startChapter - 1; i < totalChapters; i++) {
        // 检查是否被取消
        if (controller.signal.aborted) {
          throw new Error('生成任务已取消')
        }

        const chapter = chapters[i]
        const progress = Math.floor(((i - startChapter + 1) / (totalChapters - startChapter + 1)) * 100)

        this.updateTask(taskId, {
          progress,
          currentChapter: i + 1,
          message: `正在生成第${i + 1}章：${chapter.title}...`
        })

        // 构建前文概要
        const previousChapters = existingChapters.slice(-3)
        const previousSummary = previousChapters.length > 0
          ? previousChapters.map(c => `${c.title}: ${c.content?.substring(0, 300)}...`).join('\n')
          : ''

        // 生成连贯性检查提示
        let coherencePrompt = ''
        if (i > 0) {
          const lastChapter = i > 0 ? chapters[i - 1] : null
          coherencePrompt = `

连贯性要求：
1. 确保本章内容与《${lastChapter?.title || '前文'}》的结尾保持连贯
2. 保持人物性格和设定的一致性
3. 延续之前的情节发展脉络
4. 避免出现与前文矛盾的内容
5. 适当呼应前文的伏笔或线索`
        }

        // 对于长篇小说，增加上下文信息
        const contextInfo = i < totalChapters - 1
          ? `\n\n下一章预告：${chapters[i + 1]?.summary || ''}`
          : ''

        // 计算当前章节的目标字数
        const chapterTargetWords = Math.max(adjustedBlockSize, targetWordsPerChapter)

        // 生成章节内容
        const content = await this.generateChapter(
          novel.title,
          i + 1,
          chapter.title,
          outline,
          previousSummary + coherencePrompt + contextInfo,
          chapterTargetWords,
          novel.type as NovelGenre,
          novel.style,
          novel.styleConfig,
          [],
          templateId
        )

        // 验证生成内容的质量
        const chapterWordCount = countWords(content)
        let finalContent = content.trim()

        // 如果生成的内容字数不足，进行补写
        if (chapterWordCount < chapterTargetWords * 0.8) {
          this.updateTask(taskId, {
            message: `第${i + 1}章内容不足，正在补写...`
          })

          const rewritePrompt = `请为小说《${novel.title}》的第${i + 1}章《${chapter.title}》补写内容，使章节更加丰富完整。\n\n现有内容：\n${finalContent}\n\n补写要求：\n- 保持与现有内容的风格一致\n- 补充细节描写和情节发展\n- 确保逻辑连贯\n- 使章节字数达到约${chapterTargetWords}字\n\n请直接输出补写后的完整章节内容。`

          const rewrittenContent = await generateTextWithFailover(optimizePrompt(rewritePrompt), {
            systemPrompt: generateSystemPrompt(novel.type as PromptNovelGenre),
            temperature: 0.7,
            maxTokens: chapterTargetWords * 2
          })

          finalContent = rewrittenContent.trim()
        }

        // 创建章节
        await novelService.createChapter(novelId, {
          title: chapter.title,
          content: finalContent
        })

        // 更新小说字数和已生成章节数
        const currentNovel = await novelService.getNovelById(novelId)
        if (currentNovel) {
          const currentGeneratedCount = currentNovel.generatedChapterCount || 0
          await novelService.updateNovel(novelId, {
            wordCount: (currentNovel.wordCount || 0) + countWords(finalContent),
            generatedChapterCount: Math.max(currentGeneratedCount, i + 1)
          })
        }

        // 每章生成后短暂休息
        await new Promise(resolve => setTimeout(resolve, 1000))
      }

      this.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        message: `批量生成完成！已生成第${startChapter}章到第${totalChapters}章`
      })

      logger.info('批量生成章节完成', { taskId, novelId, startChapter, endChapter: totalChapters })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '批量生成失败'
      
      // 记录失败信息到小说表
      await novelService.updateNovel(novelId, {
        lastFailureReason: errorMessage
      })
      
      this.updateTask(taskId, {
        status: 'failed',
        error: errorMessage
      })

      activeTasks.delete(taskId)
      throw error
    } finally {
      activeTasks.delete(taskId)
    }
  },

  /**
   * 续写小说
   */
  async continueNovel(
    taskId: string,
    params: {
      novelId: string
      chaptersToAdd: number
    }
  ): Promise<void> {
    const { novelId, chaptersToAdd } = params

    const novel = await novelService.getNovelById(novelId)
    if (!novel) {
      throw new Error('小说不存在')
    }

    const existingChapters = await novelService.getChapters(novelId)
    const lastChapter = existingChapters[existingChapters.length - 1]

    // 更新任务
    this.updateTask(taskId, {
      novelId,
      status: 'generating',
      totalChapters: chaptersToAdd,
      message: '开始续写小说...'
    })

    // 创建中止控制器
    const controller = new AbortController()
    activeTasks.set(taskId, controller)

    try {
      const systemPrompt = generateSystemPrompt(novel.type as PromptNovelGenre)

      for (let i = 0; i < chaptersToAdd; i++) {
        // 检查是否被取消
        if (controller.signal.aborted) {
          throw new Error('生成任务已取消')
        }

        const chapterNumber = existingChapters.length + i + 1
        const progress = Math.floor((i / chaptersToAdd) * 100)

        this.updateTask(taskId, {
          progress,
          currentChapter: i + 1,
          message: `正在续写第${chapterNumber}章...`
        })

        // 构建续写提示词
        const continuePrompt = `请为小说《${novel.title}》续写第${chapterNumber}章。

前文最后一章内容概要：
${lastChapter?.content?.substring(-500) || '无'}

续写要求：
- 承接前文情节，保持故事连贯性
- 发展新的情节线索
- 字数约3000字
- 保持原有的写作风格

请直接输出续写内容。`

        const content = await generateTextWithFailover(optimizePrompt(continuePrompt), {
          systemPrompt,
          temperature: 0.7,
          maxTokens: 6000
        })

        // 创建章节
        await novelService.createChapter(novelId, {
          title: `第${chapterNumber}章`,
          content: content.trim()
        })
      }

      this.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        message: `续写完成！已添加${chaptersToAdd}章新内容`
      })

      logger.info('续写小说完成', { taskId, novelId, chaptersAdded: chaptersToAdd })
    } catch (error) {
      this.updateTask(taskId, {
        status: 'failed',
        error: error instanceof Error ? error.message : '续写失败'
      })

      activeTasks.delete(taskId)
      throw error
    } finally {
      activeTasks.delete(taskId)
    }
  },

  /**
   * 从失败章节继续生成（SubTask 2.2, 2.4, 2.5）
   * 实现从指定章节继续生成的逻辑，包含上下文传递和智能记忆
   */
  async continueGeneration(
    taskId: string,
    novelId: string
  ): Promise<void> {
    const novel = await novelService.getNovelById(novelId)
    if (!novel) {
      throw new Error('小说不存在')
    }

    if (!novel.outline) {
      throw new Error('小说没有大纲，无法继续生成')
    }

    // 解析大纲
    const chapters = parseOutlineWithSummary(novel.outline)
    if (chapters.length === 0) {
      throw new Error('无法解析大纲')
    }

    // 确定起始章节索引
    // 优先从lastFailedChapterIndex开始，否则从generatedChapterCount+1开始
    let startChapterIndex = 0
    if (novel.lastFailedChapterIndex && novel.lastFailedChapterIndex > 0) {
      startChapterIndex = novel.lastFailedChapterIndex - 1 // 转换为0-based索引
      logger.info('从失败章节继续生成', { 
        novelId, 
        lastFailedChapterIndex: novel.lastFailedChapterIndex,
        startChapterIndex 
      })
    } else if (novel.generatedChapterCount && novel.generatedChapterCount > 0) {
      startChapterIndex = novel.generatedChapterCount // 从下一章开始
      logger.info('从已生成章节后继续生成', { 
        novelId, 
        generatedChapterCount: novel.generatedChapterCount,
        startChapterIndex 
      })
    }

    // 如果已经完成所有章节，提示用户
    if (startChapterIndex >= chapters.length) {
      this.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        message: '小说已全部生成完成，无需继续生成'
      })
      return
    }

    const totalChaptersToGenerate = chapters.length - startChapterIndex

    // 更新任务
    this.updateTask(taskId, {
      novelId,
      status: 'generating',
      totalChapters: totalChaptersToGenerate,
      message: `开始从第${startChapterIndex + 1}章继续生成，共${totalChaptersToGenerate}章...`
    })

    // 创建中止控制器
    const controller = new AbortController()
    activeTasks.set(taskId, controller)

    try {
      // 获取已生成的章节内容（用于上下文传递）
      const existingChapters = await novelService.getChapters(novelId)
      const targetWordsPerChapter = Math.floor((novel.targetWordCount || 50000) / chapters.length)
      
      // 构建已生成章节的信息（用于上下文记忆）
      const generatedChapters: Array<{ title: string; content: string; wordCount: number; summary?: string; description?: string }> = 
        existingChapters.map(ch => ({
          title: ch.title || '',
          content: ch.content || '',
          wordCount: countWords(ch.content || ''),
          description: ch.description || undefined
        }))

      // 判断是否为长篇小说（超过10章）
      const isLongNovel = chapters.length > 10

      // 清除之前的失败状态
      await novelService.updateNovel(novelId, {
        lastFailedChapterIndex: null,
        lastFailureReason: null,
        status: 'generating'
      })

      // 逐章生成
      for (let i = startChapterIndex; i < chapters.length; i++) {
        // 检查是否被取消
        if (controller.signal.aborted) {
          throw new Error('生成任务已取消')
        }

        const chapter = chapters[i]
        const progress = Math.floor(((i - startChapterIndex + 1) / totalChaptersToGenerate) * 100)

        this.updateTask(taskId, {
          progress,
          currentChapter: i + 1,
          message: `正在生成第${i + 1}章：${chapter.title}${isLongNovel ? '（智能上下文记忆模式）' : ''}...`
        })

        try {
          let content: string
          let chapterDesc: string | undefined

          // 检查并补生成章节描述（基于 description 的三阶段流水线）
          if (i >= startChapterIndex) {
            // 获取当前章节的 description（从 existingChapters 中获取）
            chapterDesc = existingChapters[i]?.description

            if (!chapterDesc || chapterDesc.trim() === '') {
              // 如果没有 description，先生成
              this.updateTask(taskId, {
                message: `正在补充第${i + 1}章的描述...`
              })

              // 获取上一章的 description 用于上下文
              const previousDescription = i > 0
                ? (generatedChapters[generatedChapters.length - 1]?.description ||
                   existingChapters[i - 1]?.description)
                : undefined

              chapterDesc = await this.generateChapterDescription(
                novel.title,
                i + 1,
                chapter.title,
                chapters.length,
                novel.outline || '',
                previousDescription
              )

              // 写入数据库
              if (existingChapters[i]?.id) {
                await novelService.updateChapter(novelId, existingChapters[i].id, { description: chapterDesc })
              }

              logger.info(`第${i + 1}章描述补充完成`, { chapter: i + 1, descriptionLength: chapterDesc.length })
            }
          }

          if (isLongNovel && i > 0) {
            // 长篇小说模式：使用完整上下文记忆（SubTask 2.5）
            const contextMemory = this.buildContextMemory(
              generatedChapters,
              i,
              chapters.length,
              novel.outline || ''
            )

            // 将章节描述融入大纲，作为正文生成的核心引导信息
            const enrichedOutline = chapterDesc
              ? `${novel.outline || ''}\n\n【第${i + 1}章详细写作指导】\n${chapterDesc}`
              : novel.outline || ''

            content = await this.generateChapterWithContext(
              novel.title,
              i + 1,
              chapters.length,
              chapter.title,
              enrichedOutline,
              contextMemory.chaptersSummary,
              contextMemory.recentContent,
              contextMemory.contextTracking,
              targetWordsPerChapter,
              novel.type as NovelGenre,
              novel.style,
              novel.styleConfig,
              [],
              (novel as { templateId?: string }).templateId
            )

            // 为每章生成摘要（用于后续章节的上下文）
            try {
              const summary = await this.generateChapterSummary(
                chapter.title,
                i + 1,
                content
              )

              generatedChapters.push({
                title: chapter.title,
                content: content.trim(),
                wordCount: countWords(content),
                summary,
                description: chapterDesc
              })

              logger.info(`第${i + 1}章摘要生成完成`, {
                chapter: i + 1,
                summaryLength: summary.length
              })
            } catch (summaryError) {
              logger.warn(`第${i + 1}章摘要生成失败，使用简单摘要`, { error: summaryError })
              generatedChapters.push({
                title: chapter.title,
                content: content.trim(),
                wordCount: countWords(content),
                summary: `${chapter.title}：${content.substring(0, 100)}...`,
                description: chapterDesc
              })
            }
          } else {
            // 普通模式或第一章：使用上下文传递（SubTask 2.4）
            // 获取最后3章内容构建前文概要
            const recentChapters = generatedChapters.slice(-3)
            const previousSummary = recentChapters.length > 0
              ? recentChapters.map(c =>
                  `${c.title}: ${c.content.substring(0, 300)}...`
                ).join('\n')
              : ''

            const contextInfo = i > 0 && i < chapters.length - 1
              ? `\n\n下一章预告：${chapters[i + 1]?.summary || ''}`
              : ''

            // 将章节描述作为正文生成的核心引导信息（优先于 previousSummary）
            const descriptionGuidance = chapterDesc
              ? `\n\n【第${i + 1}章详细写作指导】\n${chapterDesc}`
              : ''

            content = await this.generateChapter(
              novel.title,
              i + 1,
              chapter.title,
              novel.outline || '',
              descriptionGuidance + (previousSummary + contextInfo),
              targetWordsPerChapter,
              novel.type as NovelGenre,
              novel.style,
              novel.styleConfig,
              [],
              (novel as { templateId?: string }).templateId
            )

            generatedChapters.push({
              title: chapter.title,
              content: content.trim(),
              wordCount: countWords(content),
              description: chapterDesc
            })
          }

          // 更新或创建章节（包含描述信息）
          const existingChapter = existingChapters[i]
          if (existingChapter) {
            await novelService.updateChapter(novelId, existingChapter.id, {
              content: content.trim(),
              ...(chapterDesc ? { description: chapterDesc } : {})
            })
          } else {
            await novelService.createChapter(novelId, {
              title: chapter.title,
              content: content.trim(),
              description: chapterDesc || chapter.summary,
              orderIndex: i
            })
          }

          // 更新小说字数和已生成章节数
          const currentNovel = await novelService.getNovelById(novelId)
          if (currentNovel) {
            const lastChapter = generatedChapters[generatedChapters.length - 1]
            await novelService.updateNovel(novelId, {
              wordCount: (currentNovel.wordCount || 0) + (lastChapter?.wordCount || 0),
              generatedChapterCount: i + 1
            })
          }

          // 每章生成后短暂休息
          await new Promise(resolve => setTimeout(resolve, 1000))

        } catch (chapterError) {
          // 记录章节生成错误
          const errorMessage = chapterError instanceof Error ? chapterError.message : '未知错误'
          logger.error('章节生成失败', { chapter: i + 1, error: chapterError })

          // 记录失败信息到小说表
          await novelService.updateNovel(novelId, {
            lastFailedChapterIndex: i + 1,
            lastFailureReason: errorMessage
          })

          this.updateTask(taskId, {
            message: `第${i + 1}章生成失败：${errorMessage}，任务已暂停`
          })

          // 更新章节为失败占位内容
          const existingChapter = existingChapters[i]
          if (existingChapter) {
            await novelService.updateChapter(novelId, existingChapter.id, {
              content: `[章节生成失败，请手动编辑]`
            })
          }

          // 抛出错误，停止生成
          throw new Error(`第${i + 1}章生成失败：${errorMessage}`)
        }
      }

      // 完成生成
      const totalWordCount = generatedChapters.reduce((sum, c) => sum + c.wordCount, 0)
      
      await novelService.updateNovel(novelId, {
        status: 'completed',
        wordCount: totalWordCount,
        lastFailedChapterIndex: null,
        lastFailureReason: null
      })

      this.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        message: `小说生成完成！共${chapters.length}章，总字数${totalWordCount}字`
      })

      logger.info('继续生成小说完成', {
        taskId,
        novelId,
        startChapter: startChapterIndex + 1,
        totalChapters: chapters.length,
        totalWordCount
      })

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '生成失败'

      await novelService.updateNovel(novelId, {
        status: 'failed',
        error: errorMessage
      })

      this.updateTask(taskId, {
        status: 'failed',
        error: errorMessage
      })

      activeTasks.delete(taskId)
      throw error
    } finally {
      activeTasks.delete(taskId)
    }
  },

  /**
   * 重新生成单章内容（基于description）
   */
  async regenerateChapter(
    taskId: string,
    novelId: string,
    chapterId: string,
    chapterIndex: number,
    chapterTitle: string
  ): Promise<void> {
    const novel = await novelService.getNovelById(novelId)
    if (!novel) {
      throw new Error('小说不存在')
    }

    if (!novel.outline) {
      throw new Error('小说没有大纲，无法重新生成')
    }

    const chapters = await novelService.getChapters(novelId)
    const targetChapter = chapters.find(ch => ch.id === chapterId)

    if (!targetChapter) {
      throw new Error('章节不存在')
    }

    if (!targetChapter.description || targetChapter.description.trim() === '') {
      throw new Error('该章节缺少描述，无法重新生成')
    }

    this.updateTask(taskId, {
      novelId,
      status: 'generating',
      totalChapters: 1,
      currentChapter: chapterIndex + 1,
      progress: 10,
      message: `正在重新生成第${chapterIndex + 1}章：${chapterTitle}...`
    })

    const controller = new AbortController()
    activeTasks.set(taskId, controller)

    try {
      if (controller.signal.aborted) {
        throw new Error('生成任务已取消')
      }

      const targetWordsPerChapter = Math.floor((novel.targetWordCount || 50000) / Math.max(chapters.length, 1))
      const isLongNovel = chapters.length > 10

      let content: string

      if (isLongNovel) {
        const contextMemory = this.buildContextMemory(
          chapters.slice(0, chapterIndex).map(ch => ({
            title: ch.title || '',
            content: ch.content || '',
            wordCount: countWords(ch.content || '')
          })),
          chapterIndex,
          chapters.length,
          novel.outline
        )

        content = await this.generateChapterWithContext(
          novel.title,
          chapterIndex + 1,
          chapters.length,
          chapterTitle,
          novel.outline,
          contextMemory.chaptersSummary,
          contextMemory.recentContent,
          contextMemory.contextTracking,
          targetWordsPerChapter,
          novel.type as NovelGenre,
          novel.style,
          novel.styleConfig,
          [],
          (novel as { templateId?: string }).templateId
        )
      } else {
        const previousChapters = chapters.slice(Math.max(0, chapterIndex - 3), chapterIndex)
        const previousSummary = previousChapters.length > 0
          ? previousChapters.map(c => `${c.title}: ${c.content?.substring(0, 300)}...`).join('\n')
          : ''

        content = await this.generateChapter(
          novel.title,
          chapterIndex + 1,
          chapterTitle,
          novel.outline,
          previousSummary,
          targetWordsPerChapter,
          novel.type as NovelGenre,
          novel.style,
          novel.styleConfig,
          [],
          (novel as { templateId?: string }).templateId
        )
      }

      await novelService.updateChapter(novelId, chapterId, {
        content: content.trim()
      })

      const currentNovel = await novelService.getNovelById(novelId)
      if (currentNovel) {
        const oldWordCount = targetChapter.content ? countWords(targetChapter.content) : 0
        const newWordCount = countWords(content)
        await novelService.updateNovel(novelId, {
          wordCount: Math.max(0, (currentNovel.wordCount || 0) - oldWordCount + newWordCount)
        })
      }

      this.updateTask(taskId, {
        status: 'completed',
        progress: 100,
        message: `第${chapterIndex + 1}章《${chapterTitle}》重新生成完成！`
      })

      logger.info('单章重新生成完成', { taskId, novelId, chapterId, chapterIndex, chapterTitle })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '重新生成失败'

      this.updateTask(taskId, {
        status: 'failed',
        error: errorMessage
      })

      activeTasks.delete(taskId)
      throw error
    } finally {
      activeTasks.delete(taskId)
    }
  },

  /**
   * 清理已完成的任务
   */
  cleanupTasks(): void {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    run('DELETE FROM generate_tasks WHERE status IN ("completed", "cancelled", "failed") AND updated_at < ?', [
      sevenDaysAgo.toISOString()
    ])

    logger.info('清理旧生成任务完成')
  }
}

export default generateService
