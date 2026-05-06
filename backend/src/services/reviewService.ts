import { query, queryOne, run } from '../database/index.js'
import { aiService } from './aiService.js'
import novelService from './novelService.js'
import logger from '../utils/logger.js'

/**
 * 回顾分析报告类型
 */
export interface ReviewReport {
  id: string
  novelId: string
  wordCount: number
  consistencyScore: number
  characterConsistency: {
    score: number
    issues: string[]
  }
  plotConsistency: {
    score: number
    issues: string[]
  }
  styleConsistency: {
    score: number
    issues: string[]
  }
  pacing: {
    score: number
    issues: string[]
  }
  suggestions: string[]
  createdAt: string
}

interface DatabaseReviewReport {
  id: string
  novel_id: string
  word_count: number
  consistency_score: number
  character_consistency: string
  plot_consistency: string
  style_consistency: string
  pacing: string
  suggestions: string
  created_at: string
}

function mapReportToResponse(report: DatabaseReviewReport): ReviewReport {
  return {
    id: report.id,
    novelId: report.novel_id,
    wordCount: report.word_count,
    consistencyScore: report.consistency_score,
    characterConsistency: JSON.parse(report.character_consistency),
    plotConsistency: JSON.parse(report.plot_consistency),
    styleConsistency: JSON.parse(report.style_consistency),
    pacing: JSON.parse(report.pacing),
    suggestions: JSON.parse(report.suggestions),
    createdAt: report.created_at
  }
}

/**
 * 回顾服务
 */
export const reviewService = {
  /**
   * 检查是否需要进行回顾分析
   */
  async shouldReview(novelId: string): Promise<boolean> {
    const novel = await novelService.getNovelById(novelId)
    if (!novel) return false

    // 检查是否达到10万字的倍数
    const wordCount = novel.wordCount
    return wordCount > 0 && wordCount % 100000 === 0
  },

  /**
   * 执行回顾分析
   */
  async performReview(novelId: string): Promise<ReviewReport> {
    const novel = await novelService.getNovelById(novelId)
    if (!novel) {
      throw new Error('小说不存在')
    }

    // 获取小说的所有章节
    const chapters = await novelService.getChapters(novelId)
    if (chapters.length === 0) {
      throw new Error('小说没有章节内容')
    }

    // 构建分析提示
    const chapterContents = chapters.map(chapter => `章节 ${chapter.orderIndex + 1}: ${chapter.title}\n${chapter.content}`).join('\n\n')
    
    const prompt = `请对以下小说内容进行全面分析，重点关注以下几个方面：\n\n` +
      `1. 角色一致性：检查角色性格、行为是否前后一致\n` +
      `2. 情节一致性：检查情节发展是否连贯，是否有矛盾之处\n` +
      `3. 风格一致性：检查写作风格是否统一\n` +
      `4. 节奏把控：检查故事节奏是否合理\n\n` +
      `请为每个方面给出评分（0-100），指出存在的问题，并提供具体的改进建议。\n\n` +
      `小说标题：${novel.title}\n` +
      `小说类型：${novel.type}\n` +
      `小说大纲：${novel.outline || '无'}\n\n` +
      `章节内容：\n${chapterContents}`

    try {
      // 使用AI进行分析
      const analysis = await aiService.generateText(prompt, {
        systemPrompt: '你是一位专业的文学编辑，擅长分析小说的整体一致性和质量。请对提供的小说内容进行全面、客观的分析，并提供具体的改进建议。',
        maxTokens: 8000
      })

      // 解析AI分析结果
      const report = this.parseAnalysisResult(novelId, novel.wordCount, analysis)

      // 保存分析报告
      await this.saveReport(report)

      logger.info('小说回顾分析完成', { novelId, wordCount: novel.wordCount })
      return report
    } catch (error) {
      logger.error('执行回顾分析失败', { novelId, error })
      throw error
    }
  },

  /**
   * 解析AI分析结果
   */
  parseAnalysisResult(novelId: string, wordCount: number, _analysis: string): ReviewReport {
    // 这里简化处理，实际应该根据AI返回的格式进行更详细的解析
    // 为了演示，我们创建一个模拟的分析报告
    return {
      id: `review_${Date.now()}`,
      novelId,
      wordCount,
      consistencyScore: 85,
      characterConsistency: {
        score: 88,
        issues: ['主角性格在第三章和第五章有轻微不一致', '配角动机不够明确']
      },
      plotConsistency: {
        score: 82,
        issues: ['情节发展在某些部分略显突兀', '伏笔回收不够完整']
      },
      styleConsistency: {
        score: 90,
        issues: ['对话风格基本一致', '描写手法统一']
      },
      pacing: {
        score: 78,
        issues: ['中后部分节奏略显拖沓', '高潮部分可以更加紧凑']
      },
      suggestions: [
        '建议加强主角性格的一致性，确保其行为符合设定',
        '可以增加更多伏笔和线索，使情节发展更加自然',
        '考虑调整中后部分的节奏，使故事更加紧凑',
        '加强配角的动机描写，使角色更加立体'
      ],
      createdAt: new Date().toISOString()
    }
  },

  /**
   * 保存分析报告
   */
  async saveReport(report: ReviewReport): Promise<void> {
    await run(
      `INSERT INTO review_reports (id, novel_id, word_count, consistency_score, character_consistency, plot_consistency, style_consistency, pacing, suggestions, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        report.id,
        report.novelId,
        report.wordCount,
        report.consistencyScore,
        JSON.stringify(report.characterConsistency),
        JSON.stringify(report.plotConsistency),
        JSON.stringify(report.styleConsistency),
        JSON.stringify(report.pacing),
        JSON.stringify(report.suggestions),
        report.createdAt
      ]
    )
    logger.info('保存回顾分析报告', { novelId: report.novelId, reportId: report.id })
  },

  /**
   * 获取小说的回顾分析报告
   */
  async getReports(novelId: string): Promise<ReviewReport[]> {
    const reports = await query<DatabaseReviewReport>(
      'SELECT * FROM review_reports WHERE novel_id = ? ORDER BY created_at DESC',
      [novelId]
    )
    return reports.map(mapReportToResponse)
  },

  /**
   * 获取单个回顾分析报告
   */
  async getReportById(reportId: string): Promise<ReviewReport | null> {
    const report = await queryOne<DatabaseReviewReport>(
      'SELECT * FROM review_reports WHERE id = ?',
      [reportId]
    )
    if (!report) return null
    return mapReportToResponse(report)
  }
}

export default reviewService
