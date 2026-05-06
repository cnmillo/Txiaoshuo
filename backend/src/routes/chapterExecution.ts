import { Router, type Request, type Response } from 'express'
import { chapterExecutionService } from '../services/chapterExecutionService.js'
import { aiService } from '../services/aiService.js'
import { generateChapterContentService } from '../services/storyPlanService.js'
import { sendSuccess, sendError, ErrorMessages, HttpStatus } from '../utils/response.js'
import logger from '../utils/logger.js'

const router = Router()

const activeGenerationTasks = new Map<string, { status: string; progress: number; currentChapter: number; totalChapters: number; message: string; abortController: AbortController; _timeout?: NodeJS.Timeout }>()

function addGenerationTask(taskId: string, data: { status: string; progress: number; currentChapter: number; totalChapters: number; message: string; abortController: AbortController }) {
  const _timeout = setTimeout(() => {
    const task = activeGenerationTasks.get(taskId)
    if (task) {
      task.abortController.abort()
      activeGenerationTasks.delete(taskId)
    }
  }, 30 * 60 * 1000)
  activeGenerationTasks.set(taskId, { ...data, _timeout })
}

function deleteGenerationTask(taskId: string) {
  const task = activeGenerationTasks.get(taskId)
  if (task?._timeout) clearTimeout(task._timeout)
  activeGenerationTasks.delete(taskId)
}

const fixHistoryStore = new Map<string, Array<{ id: string; chapterId: string; suggestionIds: string[]; appliedAt: string; appliedCount: number }>>()

router.get('/chapter/:chapterId/content', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params

    if (!chapterId) {
      sendError(res, '缺少章节ID', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await chapterExecutionService.getChapterContent(chapterId)

    if (!result) {
      sendError(res, '章节内容不存在', HttpStatus.NOT_FOUND)
      return
    }

    sendSuccess(res, result)
  } catch (error) {
    logger.error('获取章节内容失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

router.put('/chapter/:chapterId/content', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params
    const { content, title, chapterNumber } = req.body

    if (!chapterId) {
      sendError(res, '缺少章节ID', HttpStatus.BAD_REQUEST)
      return
    }

    if (content === undefined || content === null) {
      sendError(res, '内容不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    const meta: { title?: string; chapterNumber?: number } = {}
    if (title) meta.title = title
    if (chapterNumber !== undefined && chapterNumber !== null) meta.chapterNumber = Number(chapterNumber)

    const result = await chapterExecutionService.saveChapterContent(chapterId, content, meta)

    sendSuccess(res, result, '章节内容保存成功')
  } catch (error) {
    logger.error('保存章节内容失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

router.get('/chapters/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params

    if (!workflowId) {
      sendError(res, '缺少工作流ID', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await chapterExecutionService.getChaptersByWorkflowId(workflowId)

    sendSuccess(res, result)
  } catch (error) {
    logger.error('获取章节列表失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

router.post('/chapter', async (req: Request, res: Response) => {
  try {
    const { id, workflowId, title, chapterNumber, content } = req.body

    if (!id || !workflowId || !title) {
      sendError(res, '缺少必要参数', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await chapterExecutionService.createChapter({
      id,
      workflowId,
      title,
      chapterNumber: chapterNumber || 0,
      content
    })

    sendSuccess(res, result, '章节创建成功')
  } catch (error) {
    logger.error('创建章节失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

router.delete('/chapter/:chapterId', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params

    if (!chapterId) {
      sendError(res, '缺少章节ID', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await chapterExecutionService.deleteChapter(chapterId)

    if (!result) {
      sendError(res, '章节不存在', HttpStatus.NOT_FOUND)
      return
    }

    sendSuccess(res, { deleted: true }, '章节删除成功')
  } catch (error) {
    logger.error('删除章节失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

router.post('/batch-create/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params
    const { chapters } = req.body

    if (!workflowId) {
      sendError(res, '缺少工作流ID', HttpStatus.BAD_REQUEST)
      return
    }

    if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
      sendError(res, '缺少章节列表', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await chapterExecutionService.batchCreateChapters(workflowId, chapters)

    sendSuccess(res, result, '批量创建章节成功')
  } catch (error) {
    logger.error('批量创建章节失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

router.post('/audit', async (req: Request, res: Response) => {
  try {
    const { chapterId, content, options } = req.body

    if (!chapterId || !content) {
      sendError(res, '缺少章节ID或内容', HttpStatus.BAD_REQUEST)
      return
    }

    const plainContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

    const referenceSection = options?.referenceContent
      ? `【参考内容】
${options.referenceContent.previousChapters?.length ? `前文概要：${options.referenceContent.previousChapters.join('\n')}` : ''}
${options.referenceContent.characterProfiles?.length ? `角色设定：${options.referenceContent.characterProfiles.join('\n')}` : ''}
${options.referenceContent.outline ? `大纲：${options.referenceContent.outline}` : ''}`
      : ''

    const auditPrompt = `你是一个资深小说编辑，请对以下章节内容进行专业审计。

请从以下5个维度评分（0-100分）并给出具体问题：
1. 内容质量（contentQuality）：情节是否合理、是否有逻辑漏洞
2. 角色一致性（characterConsistency）：角色言行是否符合设定
3. 情节连贯性（plotContinuity）：与前文是否衔接、是否有矛盾
4. 风格一致性（styleConsistency）：文风是否统一、是否有突兀变化
5. 节奏（pacing）：叙事节奏是否合理、是否有拖沓或仓促

${referenceSection}

【章节内容】
${plainContent.substring(0, 6000)}

请严格按以下JSON格式返回，不要返回其他内容：
{
  "overallScore": 数字,
  "dimensionScores": {
    "contentQuality": 数字,
    "characterConsistency": 数字,
    "plotContinuity": 数字,
    "styleConsistency": 数字,
    "pacing": 数字
  },
  "issues": [
    {
      "id": "issue-1",
      "type": "CHARACTER_CONSISTENCY或PACING或CONTENT_QUALITY或STYLE_CONSISTENCY或PLOT_CONTINUITY",
      "description": "问题描述",
      "severity": "HIGH或MEDIUM或LOW",
      "location": {
        "paragraphIndex": 段落索引,
        "originalText": "原文片段"
      },
      "suggestedFix": "修复建议",
      "relatedCharacters": ["角色名"]
    }
  ],
  "overallSuggestions": ["建议1", "建议2", "建议3"],
  "strengths": ["优点1", "优点2", "优点3"]
}`

    const auditResult = await aiService.generateText(auditPrompt, {
      temperature: 0.3,
      maxTokens: 4000,
    })

    let parsedResult
    try {
      const jsonMatch = auditResult.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      parsedResult = JSON.parse(jsonMatch[0])
    } catch {
      parsedResult = {
        overallScore: 70,
        dimensionScores: {
          contentQuality: 70,
          characterConsistency: 70,
          plotContinuity: 70,
          styleConsistency: 70,
          pacing: 70,
        },
        issues: [],
        overallSuggestions: ['审计结果解析失败，请重试'],
        strengths: [],
      }
    }

    const result = {
      id: `audit-${Date.now()}`,
      chapterId,
      auditedAt: new Date().toISOString(),
      overallScore: parsedResult.overallScore || 70,
      dimensionScores: parsedResult.dimensionScores || {
        contentQuality: 70,
        characterConsistency: 70,
        plotContinuity: 70,
        styleConsistency: 70,
        pacing: 70,
      },
      issues: (parsedResult.issues || []).map((issue: Record<string, unknown>, idx: number) => ({
        id: issue.id || `issue-${idx + 1}`,
        type: issue.type || 'CONTENT_QUALITY',
        description: issue.description || '',
        severity: issue.severity || 'MEDIUM',
        location: issue.location || {},
        suggestedFix: issue.suggestedFix || '',
        relatedCharacters: issue.relatedCharacters || [],
      })),
      overallSuggestions: parsedResult.overallSuggestions || [],
      strengths: parsedResult.strengths || [],
    }

    sendSuccess(res, { result })
  } catch (error) {
    logger.error('章节审计失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

router.post('/fix-suggestions', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.body

    if (!chapterId) {
      sendError(res, '缺少章节ID', HttpStatus.BAD_REQUEST)
      return
    }

    const chapter = await chapterExecutionService.getChapterContent(chapterId)
    if (!chapter) {
      sendError(res, '章节不存在', HttpStatus.NOT_FOUND)
      return
    }

    const plainContent = chapter.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

    const fixPrompt = `你是一个小说编辑，请为以下章节内容提供具体的修复建议。

【章节内容】
${plainContent.substring(0, 6000)}

请给出3-5条最关键的修复建议，每条包含：
1. 问题描述
2. 原文片段（必须是从章节内容中精确摘录的原文，不要改写）
3. 建议修改为（必须是完整的替换文本，直接可以替换原文片段，不能只是修改建议描述）
4. 修改原因

【重要规则】
- suggestedText必须是完整的、可直接替换原文的文本，不能是"合并重复对话"这样的描述性建议
- 如果建议删除某段，suggestedText留空字符串
- 如果建议修改某段，suggestedText必须是改写后的完整文本
- originalText必须精确匹配章节内容中的原文

请严格按以下JSON格式返回：
{
  "suggestions": [
    {
      "id": "fix-1",
      "issueId": "issue-1",
      "type": "auto",
      "description": "问题描述",
      "originalText": "原文片段（精确匹配）",
      "suggestedText": "修改后的完整文本（可直接替换）",
      "reason": "修改原因"
    }
  ]
}`

    const fixResult = await aiService.generateText(fixPrompt, {
      temperature: 0.3,
      maxTokens: 3000,
    })

    let parsedFixes
    try {
      const jsonMatch = fixResult.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('No JSON found')
      parsedFixes = JSON.parse(jsonMatch[0])
    } catch {
      parsedFixes = { suggestions: [] }
    }

    sendSuccess(res, {
      suggestions: (parsedFixes.suggestions || []).map((s: Record<string, unknown>, idx: number) => ({
        id: s.id || `fix-${idx + 1}`,
        issueId: s.issueId || `issue-${idx + 1}`,
        type: 'auto',
        description: s.description || '',
        originalText: s.originalText || '',
        suggestedText: s.suggestedText || '',
        reason: s.reason || '',
        status: 'pending',
      })),
    })
  } catch (error) {
    logger.error('获取修复建议失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

router.post('/ai-fix', async (req: Request, res: Response) => {
  try {
    const { chapterId, content, issues } = req.body

    if (!chapterId || !content || !issues || issues.length === 0) {
      sendError(res, '缺少必要参数', HttpStatus.BAD_REQUEST)
      return
    }

    const plainContent = content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

    const issuesDescription = issues.map((issue: { description: string; originalText?: string; suggestedFix?: string }, idx: number) =>
      `${idx + 1}. 问题：${issue.description}${issue.originalText ? `\n   原文：${issue.originalText}` : ''}${issue.suggestedFix ? `\n   建议：${issue.suggestedFix}` : ''}`
    ).join('\n')

    const aiFixPrompt = `你是一个资深小说编辑，请根据以下问题列表，对章节内容进行修复。

【章节内容】
${plainContent.substring(0, 6000)}

【需要修复的问题】
${issuesDescription}

请直接输出修复后的完整章节内容，不要输出任何解释或标记。保持原文的整体结构和风格，只针对上述问题进行修改。`

    const fixedContent = await aiService.generateText(aiFixPrompt, {
      temperature: 0.3,
      maxTokens: 8000,
    })

    sendSuccess(res, { fixedContent: fixedContent.trim() })
  } catch (error) {
    logger.error('AI修复失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// ============================================================================
// 生成章节内容 - 对齐前端 /chapter-execution/generate
// ============================================================================

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { title, genre, chapterTitle, chapterSummary, previousChapterSummary, characters, styleHint, targetWordCount, rhythmType, writingStyle, emotionalTone, specialRequirements, autoPolish, polishIntensity, perspective } = req.body

    if (!title || !chapterTitle || !chapterSummary) {
      sendError(res, '缺少必要参数', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await generateChapterContentService({
      title,
      genre,
      chapterTitle,
      chapterSummary,
      previousChapterSummary,
      characters,
      styleHint,
      targetWordCount: targetWordCount || 3000,
      rhythmType,
      writingStyle,
      emotionalTone,
      specialRequirements,
      autoPolish,
      polishIntensity,
      perspective
    })

    sendSuccess(res, result)
  } catch (error) {
    logger.error('生成章节内容失败', error)
    sendError(res, error instanceof Error ? error.message : ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// ============================================================================
// 批量生成章节 - 对齐前端 /chapter-execution/batch-generate/:workflowId
// ============================================================================

router.post('/batch-generate/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params
    const { startChapter, endChapter, generationParams, title, genre, characters, styleHint, chapterSummaries } = req.body

    if (!workflowId) {
      sendError(res, '缺少工作流ID', HttpStatus.BAD_REQUEST)
      return
    }

    if (!startChapter || !endChapter) {
      sendError(res, '缺少起始和结束章节号', HttpStatus.BAD_REQUEST)
      return
    }

    const taskId = `batch-${Date.now()}`
    const totalChapters = endChapter - startChapter + 1

    addGenerationTask(taskId, {
      status: 'generating',
      progress: 0,
      currentChapter: startChapter,
      totalChapters,
      message: '开始批量生成',
      abortController: new AbortController()
    })

    sendSuccess(res, { taskId, message: `开始批量生成第 ${startChapter} 到 ${endChapter} 章` })

    const { signal } = activeGenerationTasks.get(taskId)!.abortController

    ;(async () => {
      try {
        const generatedContentsMap: Record<string, string> = {}

        for (let i = startChapter; i <= endChapter; i++) {
          if (signal.aborted) break

          const task = activeGenerationTasks.get(taskId)
          if (!task) break

          task.currentChapter = i
          task.progress = Math.round(((i - startChapter) / totalChapters) * 100)
          task.message = `正在生成第 ${i} 章`

          const chaptersData = await chapterExecutionService.getChaptersByWorkflowId(workflowId)
          const chapter = chaptersData.chapters.find(c => c.chapterNumber === i)

          if (!chapter) continue

          const recentChapters = chaptersData.chapters
            .filter(c => c.chapterNumber < i && (c.status === 'completed' || generatedContentsMap[c.id]))
            .sort((a, b) => a.chapterNumber - b.chapterNumber)
            .slice(-3)

          let previousChapterSummary: string | undefined
          let previousChapterOpenings: string[] | undefined
          if (recentChapters.length > 0) {
            const summaryParts: string[] = []
            const openings: string[] = []
            for (const rc of recentChapters) {
              const content = generatedContentsMap[rc.id] || (await chapterExecutionService.getChapterContent(rc.id))?.content || ''
              if (content) {
                generatedContentsMap[rc.id] = content
                const plainContent = content.replace(/<[^>]*>/g, '').trim()
                const tail = plainContent.length > 800 ? plainContent.substring(plainContent.length - 800) : plainContent
                const head = plainContent.length > 300 ? plainContent.substring(0, 300) : plainContent
                summaryParts.push(`【${rc.title}（开篇）】\n${head}\n【${rc.title}（结尾）】\n${tail}`)
                const firstPara = plainContent.split('\n\n')[0] || ''
                if (firstPara.length > 0) openings.push(firstPara.substring(0, 200))
              }
            }
            previousChapterSummary = summaryParts.length > 0 ? summaryParts.join('\n\n') : undefined
            previousChapterOpenings = openings.length > 0 ? openings : undefined
          }

          const chapterSummary = (chapterSummaries && chapterSummaries[i]) || chapter.title || '本章内容待生成'

          const result = await generateChapterContentService({
            title: title || '未命名小说',
            genre: genre || '玄幻',
            chapterTitle: chapter.title || `第${i}章`,
            chapterSummary,
            previousChapterSummary,
            previousChapterOpenings,
            characters: characters || [],
            styleHint,
            targetWordCount: generationParams?.targetWordCount || 3000,
            rhythmType: generationParams?.rhythmType,
            writingStyle: generationParams?.writingStyle,
            emotionalTone: generationParams?.emotionalTone,
            specialRequirements: generationParams?.specialRequirements,
            autoPolish: generationParams?.autoPolish,
            polishIntensity: generationParams?.polishIntensity,
            perspective: generationParams?.perspective,
          })

          if (result?.content) {
            await chapterExecutionService.saveChapterContent(chapter.id, result.content, { title: chapter.title, chapterNumber: chapter.chapterNumber })
            generatedContentsMap[chapter.id] = result.content
          }
        }

        const task = activeGenerationTasks.get(taskId)
        if (task && !signal.aborted) {
          task.status = 'completed'
          task.progress = 100
          task.message = '批量生成完成'
        }
      } catch (error) {
        const task = activeGenerationTasks.get(taskId)
        if (task) {
          task.status = 'failed'
          task.message = error instanceof Error ? error.message : '批量生成失败'
        }
        logger.error('批量生成章节失败', error)
      }
    })()
  } catch (error) {
    logger.error('启动批量生成失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// ============================================================================
// 查询生成进度 - 对齐前端 /chapter-execution/progress/:taskId
// ============================================================================

router.get('/progress/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params

    const task = activeGenerationTasks.get(taskId)
    if (!task) {
      sendError(res, '任务不存在', HttpStatus.NOT_FOUND)
      return
    }

    sendSuccess(res, {
      taskId,
      status: task.status,
      progress: task.progress,
      currentChapter: task.currentChapter,
      totalChapters: task.totalChapters,
      message: task.message,
    })

    if (task.status === 'completed' || task.status === 'failed') {
      deleteGenerationTask(taskId)
    }
  } catch (error) {
    logger.error('查询生成进度失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// ============================================================================
// 取消生成任务 - 对齐前端 /chapter-execution/cancel/:taskId
// ============================================================================

router.post('/cancel/:taskId', async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params

    const task = activeGenerationTasks.get(taskId)
    if (!task) {
      sendError(res, '任务不存在', HttpStatus.NOT_FOUND)
      return
    }

    task.abortController.abort()
    task.status = 'cancelled'
    task.message = '任务已取消'

    sendSuccess(res, { cancelled: true })
    deleteGenerationTask(taskId)
  } catch (error) {
    logger.error('取消生成任务失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// ============================================================================
// 批量审计章节 - 对齐前端 /chapter-execution/batch-audit/:workflowId
// ============================================================================

router.post('/batch-audit/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params
    const { chapterIds } = req.body

    if (!workflowId || !chapterIds || !Array.isArray(chapterIds)) {
      sendError(res, '缺少必要参数', HttpStatus.BAD_REQUEST)
      return
    }

    const taskId = `audit-${Date.now()}`

    sendSuccess(res, { taskId, message: `开始批量审计 ${chapterIds.length} 个章节` })

    ;(async () => {
      try {
        for (const chapterId of chapterIds) {
          const chapter = await chapterExecutionService.getChapterContent(chapterId)
          if (!chapter?.content) continue

          const plainContent = chapter.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

          const auditPrompt = `你是一个资深小说编辑，请对以下章节内容进行专业审计，从内容质量、角色一致性、情节连贯性、风格一致性、节奏5个维度评分（0-100分）并给出具体问题。

【章节内容】
${plainContent.substring(0, 6000)}

请严格按以下JSON格式返回：
{
  "overallScore": 数字,
  "dimensionScores": { "contentQuality": 数字, "characterConsistency": 数字, "plotContinuity": 数字, "styleConsistency": 数字, "pacing": 数字 },
  "issues": [{ "id": "issue-1", "type": "CONTENT_QUALITY", "description": "问题描述", "severity": "HIGH或MEDIUM或LOW", "location": { "paragraphIndex": 0, "originalText": "原文片段" }, "suggestedFix": "修复建议" }]
}`

          const auditResult = await aiService.generateText(auditPrompt, { temperature: 0.3, maxTokens: 2000 })

          let parsedResult: Record<string, unknown> = {}
          try {
            const jsonMatch = auditResult.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              parsedResult = JSON.parse(jsonMatch[0])
            }
          } catch {
            parsedResult = {}
          }

          await chapterExecutionService.saveChapterContent(chapterId, chapter.content, {
            title: chapter.title,
            chapterNumber: chapter.chapterNumber,
            auditResult: {
              overallScore: parsedResult.overallScore || 0,
              dimensionScores: parsedResult.dimensionScores || {},
              issues: parsedResult.issues || [],
              auditedAt: new Date().toISOString(),
            },
          })
        }
      } catch (error) {
        logger.error('批量审计执行失败', error)
      }
    })()
  } catch (error) {
    logger.error('启动批量审计失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// ============================================================================
// 批量修复 - 对齐前端 /chapter-execution/batch-fix/:chapterId
// ============================================================================

router.post('/batch-fix/:chapterId', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params
    const { suggestionIds } = req.body

    if (!chapterId) {
      sendError(res, '缺少章节ID', HttpStatus.BAD_REQUEST)
      return
    }

    const appliedIds = suggestionIds || []
    const record = {
      id: `fix-${Date.now()}`,
      chapterId,
      suggestionIds: appliedIds,
      appliedAt: new Date().toISOString(),
      appliedCount: appliedIds.length,
    }

    const existing = fixHistoryStore.get(chapterId) || []
    existing.push(record)
    fixHistoryStore.set(chapterId, existing)

    sendSuccess(res, { success: true, appliedCount: appliedIds.length, record })
  } catch (error) {
    logger.error('批量修复失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

// ============================================================================
// 修复历史 - 对齐前端 /chapter-execution/fix-history/:chapterId
// ============================================================================

router.get('/fix-history/:chapterId', async (req: Request, res: Response) => {
  try {
    const { chapterId } = req.params

    if (!chapterId) {
      sendError(res, '缺少章节ID', HttpStatus.BAD_REQUEST)
      return
    }

    const records = fixHistoryStore.get(chapterId) || []
    const totalFixes = records.reduce((sum, r) => sum + r.appliedCount, 0)

    sendSuccess(res, { chapterId, records, totalFixes })
  } catch (error) {
    logger.error('获取修复历史失败', error)
    sendError(res, ErrorMessages.INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

export default router
