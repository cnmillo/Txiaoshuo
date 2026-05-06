import { Router, type Request, type Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { query, queryOne, run } from '../database/index.js'
import { asyncHandler, createError } from '../middleware/errorHandler.js'
import { exportService } from '../services/exportService.js'
import { aiService } from '../services/aiService.js'
import { settingsService } from '../services/settingsService.js'
import logger from '../utils/logger.js'

import type { Novel, GenerateNovelRequest } from '../types/shared.js'

const router = Router()

function mapNovelToResponse(novel: Record<string, unknown>) {
  return {
    id: novel.id,
    title: novel.title,
    type: novel.type,
    status: novel.status,
    wordCount: novel.word_count ?? 0,
    targetWordCount: novel.target_word_count,
    prompt: novel.prompt,
    content: novel.content,
    outline: novel.outline,
    description: novel.description,
    style: novel.style,
    styleConfig: novel.styleConfig ? JSON.parse(novel.styleConfig as string) : undefined,
    error: novel.error,
    totalChapterCount: novel.totalChapterCount,
    generatedChapterCount: novel.generatedChapterCount,
    lastFailedChapterIndex: novel.lastFailedChapterIndex,
    lastFailureReason: novel.lastFailureReason,
    createdAt: novel.created_at,
    updatedAt: novel.updated_at
  }
}

function mapChapterToResponse(chapter: Record<string, unknown>) {
  return {
    id: chapter.id,
    novelId: chapter.novel_id,
    title: chapter.title,
    content: chapter.content,
    description: chapter.description,
    orderIndex: chapter.order_index,
    wordCount: chapter.word_count ?? 0,
    createdAt: chapter.created_at,
    updatedAt: chapter.updated_at
  }
}

router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const novels = await query<Record<string, unknown>>(`
    SELECT * FROM novels
    ORDER BY created_at DESC
  `)

  res.json({
    success: true,
    data: novels.map(mapNovelToResponse)
  })
}))

router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const novel = await queryOne<Record<string, unknown>>('SELECT * FROM novels WHERE id = ?', [id])

  if (!novel) {
    throw createError('小说不存在', 404, 'NOT_FOUND')
  }

  const chapters = await query<Record<string, unknown>>(`
    SELECT * FROM chapters
    WHERE novel_id = ?
    ORDER BY order_index ASC
  `, [id])

  res.json({
    success: true,
    data: { 
      ...mapNovelToResponse(novel), 
      chapters: chapters.map(mapChapterToResponse)
    }
  })
}))

router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { title, prompt, style } = req.body

  if (!title) {
    throw createError('标题不能为空', 400, 'VALIDATION_ERROR')
  }

  const id = uuidv4()
  const now = new Date().toISOString()

  await run(`
    INSERT INTO novels (id, title, prompt, style, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'draft', ?, ?)
  `, [id, title, prompt || '', style || '', now, now])

  logger.info('小说草稿已创建', { id, title })

  res.status(201).json({
    success: true,
    message: '小说创建成功',
    data: { id }
  })
}))

router.post('/generate', asyncHandler(async (req: Request, res: Response) => {
  const { title, prompt, style, wordCount, outline, structuredOutline } = req.body as GenerateNovelRequest

  if (!title || !prompt) {
    throw createError('标题和提示不能为空', 400, 'VALIDATION_ERROR')
  }

  const id = uuidv4()
  const now = new Date().toISOString()

  await run(`
    INSERT INTO novels (id, title, prompt, style, target_word_count, outline, structuredOutline, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, title, prompt, style || 'fantasy', wordCount || 10000, outline || null, structuredOutline ? JSON.stringify(structuredOutline) : null, 'generating', now, now])

  console.log('小说生成任务已创建，ID:', id)

  res.status(201).json({
    success: true,
    message: '小说生成任务已创建',
    data: { id }
  })
}))

router.patch('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const updates = req.body

  const novel = await queryOne<Novel>('SELECT * FROM novels WHERE id = ?', [id])
  if (!novel) {
    throw createError('小说不存在', 404, 'NOT_FOUND')
  }

  const allowedFields = ['title', 'content', 'description', 'status']
  const setClause: string[] = []
  const values: unknown[] = []

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      setClause.push(`${key} = ?`)
      values.push(value)
    }
  }

  if (setClause.length === 0) {
    throw createError('没有可更新的字段', 400, 'VALIDATION_ERROR')
  }

  setClause.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(id)

  await run(`
    UPDATE novels
    SET ${setClause.join(', ')}
    WHERE id = ?
  `, values)

  const updatedNovel = await queryOne<Novel>('SELECT * FROM novels WHERE id = ?', [id])

  res.json({
    success: true,
    message: '小说更新成功',
    data: updatedNovel
  })
}))

router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params

  const novel = await queryOne<Novel>('SELECT * FROM novels WHERE id = ?', [id])
  if (!novel) {
    throw createError('小说不存在', 404, 'NOT_FOUND')
  }

  await run('DELETE FROM novels WHERE id = ?', [id])

  res.json({
    success: true,
    message: '小说删除成功'
  })
}))

// 更新章节
router.patch('/:novelId/chapters/:chapterId', asyncHandler(async (req: Request, res: Response) => {
  const { novelId, chapterId } = req.params
  const { title, content, description } = req.body

  const chapter = await queryOne<Record<string, unknown>>('SELECT * FROM chapters WHERE id = ? AND novel_id = ?', [chapterId, novelId])
  if (!chapter) {
    throw createError('章节不存在', 404, 'NOT_FOUND')
  }

  const setClause: string[] = []
  const values: unknown[] = []

  if (title !== undefined) {
    setClause.push('title = ?')
    values.push(title)
  }
  if (content !== undefined) {
    setClause.push('content = ?')
    values.push(content)
    setClause.push('word_count = ?')
    values.push(content?.length || 0)
  }
  if (description !== undefined) {
    setClause.push('description = ?')
    values.push(description)
  }

  if (setClause.length === 0) {
    throw createError('没有可更新的字段', 400, 'VALIDATION_ERROR')
  }

  setClause.push('updated_at = ?')
  values.push(new Date().toISOString())
  values.push(chapterId)

  await run(`
    UPDATE chapters
    SET ${setClause.join(', ')}
    WHERE id = ?
  `, values)

  const updatedChapter = await queryOne<Record<string, unknown>>('SELECT * FROM chapters WHERE id = ?', [chapterId])

  res.json({
    success: true,
    message: '章节更新成功',
    data: mapChapterToResponse(updatedChapter!)
  })
}))

router.get('/:id/export', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params
  const { format = 'txt' } = req.query as { format: 'txt' | 'pdf' | 'epub' }

  const novel = await queryOne<Novel>('SELECT * FROM novels WHERE id = ?', [id])

  if (!novel) {
    throw createError('小说不存在', 404, 'NOT_FOUND')
  }

  try {
    let result
    switch (format) {
      case 'txt':
        result = await exportService.exportToTxt(id)
        break
      case 'pdf':
        result = await exportService.exportToPdf(id)
        break
      case 'epub':
        result = await exportService.exportToEpub(id)
        break
      default:
        result = await exportService.exportToTxt(id)
    }

    res.download(result.filePath, result.fileName, (err) => {
      if (err) {
        console.error('下载文件失败:', err)
      }
    })
  } catch (error) {
    throw createError(
      error instanceof Error ? error.message : '导出失败',
      400,
      'EXPORT_FAILED'
    )
  }
}))

router.post('/:id/regenerate-stream', async (req: Request, res: Response) => {
  const { id } = req.params
  
  try {
    const novel = await queryOne<Novel>('SELECT * FROM novels WHERE id = ?', [id])
    
    if (!novel) {
      res.status(404).json({ success: false, message: '小说不存在' })
      return
    }

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')

    const systemPrompt = `你是一位专业的小说作家。请根据以下信息创作小说内容：

小说标题：${novel.title}
创作提示：${novel.prompt}
${novel.outline ? `大纲：${novel.outline}` : ''}

请创作精彩的小说内容，注意：
1. 内容要连贯、有逻辑
2. 人物性格要鲜明
3. 情节要引人入胜
4. 语言要生动优美`

    const prompt = `请为小说《${novel.title}》创作内容。${novel.prompt}`

    let fullContent = ''

    const healthyModels = await settingsService.getHealthyModels()
    
    if (healthyModels.length > 0) {
      logger.info('使用自定义模型进行流式生成', { modelCount: healthyModels.length })
      
      const generator = aiService.generateTextStreamWithFailover(prompt, {
        systemPrompt,
        maxTokens: 4000
      })

      for await (const chunk of generator) {
        if (chunk.error) {
          res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`)
          break
        }
        if (chunk.done) {
          await run(
            'UPDATE novels SET content = ?, status = ?, word_count = ?, updated_at = ? WHERE id = ?',
            [fullContent, 'completed', fullContent.length, new Date().toISOString(), id]
          )
          res.write('data: [DONE]\n\n')
          break
        }
        if (chunk.content) {
          fullContent += chunk.content
          res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`)
        }
      }
    } else {
      const generator = aiService.generateTextStream(prompt, {
        systemPrompt,
        maxTokens: 4000
      })

      for await (const chunk of generator) {
        if (chunk.error) {
          res.write(`data: ${JSON.stringify({ error: chunk.error })}\n\n`)
          break
        }
        if (chunk.done) {
          await run(
            'UPDATE novels SET content = ?, status = ?, word_count = ?, updated_at = ? WHERE id = ?',
            [fullContent, 'completed', fullContent.length, new Date().toISOString(), id]
          )
          res.write('data: [DONE]\n\n')
          break
        }
        if (chunk.content) {
          fullContent += chunk.content
          res.write(`data: ${JSON.stringify({ content: chunk.content })}\n\n`)
        }
      }
    }

    res.end()
  } catch (error) {
    logger.error('流式重新生成失败', error)
    res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : '生成失败' })}\n\n`)
    res.end()
  }
})

export { router as novelRoutes }
