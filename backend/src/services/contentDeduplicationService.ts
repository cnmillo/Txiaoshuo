import logger from '../utils/logger.js'

const SIMILARITY_THRESHOLD = 0.3
const NGRAM_SIZE = 5
const OPENING_SIMILARITY_THRESHOLD = 0.4
const OPENING_LENGTH = 200

function normalizeForSimilarity(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/[，。！？；：、""''（）《》【】[\]()!?,.:;'"`~\-_/\\|@#$%^&*+=<>]/g, '')
    .trim()
}

function buildNGramSet(source: string, n = NGRAM_SIZE): Set<string> {
  const normalized = normalizeForSimilarity(source)
  if (!normalized) {
    return new Set<string>()
  }
  if (normalized.length <= n) {
    return new Set<string>([normalized])
  }
  const grams = new Set<string>()
  for (let i = 0; i <= normalized.length - n; i += 1) {
    grams.add(normalized.slice(i, i + n))
  }
  return grams
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0
  }
  let intersection = 0
  for (const item of a) {
    if (b.has(item)) {
      intersection += 1
    }
  }
  const union = a.size + b.size - intersection
  return union === 0 ? 0 : intersection / union
}

function getOpening(text: string): string {
  const normalized = text.trim().replace(/\s+/g, '')
  return normalized.slice(0, OPENING_LENGTH)
}

function dedupeNonEmpty(items: string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const normalized = item.replace(/\s+/g, ' ').trim()
    if (!normalized || seen.has(normalized)) {
      continue
    }
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

export interface SimilarityCheckResult {
  isDuplicate: boolean
  maxSimilarity: number
  mostSimilarSnippet: string
  similarChapterIndex: number
}

export interface OpeningCheckResult {
  isSimilar: boolean
  maxSimilarity: number
  similarOpening: string
  similarChapterIndex: number
}

export interface DeduplicationResult {
  content: string
  rewritten: boolean
  originalSimilarity: number
  newSimilarity: number
  openingRewritten: boolean
  openingSimilarity: number
}

export class ContentDeduplicationService {
  private generateTextWithFailover: (prompt: string, options?: {
    systemPrompt?: string
    temperature?: number
    maxTokens?: number
  }) => Promise<string>

  constructor(generateTextFn: (prompt: string, options?: {
    systemPrompt?: string
    temperature?: number
    maxTokens?: number
  }) => Promise<string>) {
    this.generateTextWithFailover = generateTextFn
  }

  checkContentSimilarity(
    newContent: string,
    existingContents: string[]
  ): SimilarityCheckResult {
    const targetNgrams = buildNGramSet(newContent)
    let maxSimilarity = 0
    let mostSimilarSnippet = ''
    let similarChapterIndex = -1

    for (let i = 0; i < existingContents.length; i++) {
      const existing = existingContents[i]
      if (!existing || existing.trim().length < 50) continue

      const similarity = jaccardSimilarity(targetNgrams, buildNGramSet(existing))
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity
        mostSimilarSnippet = existing.slice(0, 500)
        similarChapterIndex = i
      }
    }

    return {
      isDuplicate: maxSimilarity >= SIMILARITY_THRESHOLD,
      maxSimilarity,
      mostSimilarSnippet,
      similarChapterIndex
    }
  }

  checkOpeningSimilarity(
    newContent: string,
    existingContents: string[]
  ): OpeningCheckResult {
    const newOpening = getOpening(newContent)
    if (!newOpening) {
      return { isSimilar: false, maxSimilarity: 0, similarOpening: '', similarChapterIndex: -1 }
    }

    const newOpeningNgrams = buildNGramSet(newOpening)
    let maxSimilarity = 0
    let similarOpening = ''
    let similarChapterIndex = -1

    for (let i = 0; i < existingContents.length; i++) {
      const existing = existingContents[i]
      if (!existing || existing.trim().length < 50) continue

      const existingOpening = getOpening(existing)
      const similarity = jaccardSimilarity(newOpeningNgrams, buildNGramSet(existingOpening))
      if (similarity > maxSimilarity) {
        maxSimilarity = similarity
        similarOpening = existingOpening
        similarChapterIndex = i
      }
    }

    return {
      isSimilar: maxSimilarity >= OPENING_SIMILARITY_THRESHOLD,
      maxSimilarity,
      similarOpening,
      similarChapterIndex
    }
  }

  async rewriteDuplicateContent(
    content: string,
    mostSimilarSnippet: string,
    chapterTitle: string,
    chapterNumber: number
  ): Promise<string> {
    const rewritePrompt = `你是一位专业的小说编辑，发现以下章节内容与已有内容存在较高相似度，请进行改写以避免重复。

【章节信息】
- 第${chapterNumber}章：${chapterTitle}

【需要改写的内容】
${content}

【相似内容参考】（请避免使用相似的表述和情节）
${mostSimilarSnippet}

【改写要求】
1. 保持原有的情节走向和核心内容不变
2. 改变叙述方式和表达风格
3. 使用不同的场景描写和对话方式
4. 调整段落结构和节奏
5. 确保改写后的内容与相似内容有明显区别
6. 保持人物性格的一致性
7. 字数与原文相近

请直接输出改写后的完整章节内容：`

    try {
      const rewritten = await this.generateTextWithFailover(rewritePrompt, {
        systemPrompt: '你是一位经验丰富的小说编辑，擅长在保持原意的基础上进行内容改写，避免重复和雷同。',
        temperature: 0.8,
        maxTokens: Math.min(content.length * 2, 10000)
      })
      return rewritten.trim() || content
    } catch (error) {
      logger.error('内容改写失败', { chapterNumber, error })
      return content
    }
  }

  async rewriteOpening(
    content: string,
    similarOpening: string,
    chapterTitle: string,
    chapterNumber: number
  ): Promise<string> {
    const currentOpening = content.slice(0, 500)
    const rewritePrompt = `你是一位专业的小说编辑，发现以下章节的开头与已有章节开头过于相似，请改写开头部分。

【章节信息】
- 第${chapterNumber}章：${chapterTitle}

【当前开头】
${currentOpening}

【相似的开头参考】（请避免使用类似的开头方式）
${similarOpening}

【改写要求】
1. 使用完全不同的开头方式（如：从对话开始、从场景描写开始、从动作开始等）
2. 保持与后续内容的连贯性
3. 创造独特的阅读体验
4. 保持原有的叙事风格

请直接输出改写后的开头部分（约200-300字）：`

    try {
      const newOpening = await this.generateTextWithFailover(rewritePrompt, {
        systemPrompt: '你是一位经验丰富的小说编辑，擅长创作独特且吸引人的章节开头。',
        temperature: 0.9,
        maxTokens: 500
      })

      if (newOpening.trim()) {
        const restContent = content.slice(500)
        return `${newOpening.trim()}\n\n${restContent}`.trim()
      }
      return content
    } catch (error) {
      logger.error('开头改写失败', { chapterNumber, error })
      return content
    }
  }

  async processChapter(
    newContent: string,
    existingContents: string[],
    chapterTitle: string,
    chapterNumber: number
  ): Promise<DeduplicationResult> {
    let content = newContent
    let rewritten = false
    let originalSimilarity = 0
    let newSimilarity = 0
    let openingRewritten = false
    let openingSimilarity = 0

    const contentCheck = this.checkContentSimilarity(newContent, existingContents)
    originalSimilarity = contentCheck.maxSimilarity

    if (contentCheck.isDuplicate) {
      logger.info('检测到内容重复，正在进行改写', {
        chapterNumber,
        similarity: contentCheck.maxSimilarity.toFixed(4),
        similarChapter: contentCheck.similarChapterIndex + 1
      })

      content = await this.rewriteDuplicateContent(
        newContent,
        contentCheck.mostSimilarSnippet,
        chapterTitle,
        chapterNumber
      )

      if (content !== newContent) {
        rewritten = true
        const recheck = this.checkContentSimilarity(content, existingContents)
        newSimilarity = recheck.maxSimilarity
        logger.info('内容改写完成', {
          chapterNumber,
          originalSimilarity: originalSimilarity.toFixed(4),
          newSimilarity: newSimilarity.toFixed(4)
        })
      }
    }

    const openingCheck = this.checkOpeningSimilarity(content, existingContents)
    openingSimilarity = openingCheck.maxSimilarity

    if (openingCheck.isSimilar && !rewritten) {
      logger.info('检测到开头相似，正在进行改写', {
        chapterNumber,
        similarity: openingCheck.maxSimilarity.toFixed(4),
        similarChapter: openingCheck.similarChapterIndex + 1
      })

      content = await this.rewriteOpening(
        content,
        openingCheck.similarOpening,
        chapterTitle,
        chapterNumber
      )

      if (content !== newContent) {
        openingRewritten = true
        logger.info('开头改写完成', { chapterNumber })
      }
    }

    return {
      content,
      rewritten,
      originalSimilarity,
      newSimilarity,
      openingRewritten,
      openingSimilarity
    }
  }

  buildAntiDuplicateContext(
    existingContents: string[],
    maxSnippets: number = 5
  ): string {
    if (existingContents.length === 0) {
      return ''
    }

    const snippets = existingContents
      .filter(c => c && c.trim().length > 100)
      .slice(-maxSnippets)
      .map((content, index) => {
        const excerpt = content.trim().slice(0, 300)
        return `【第${existingContents.length - maxSnippets + index + 1}章片段】\n${excerpt}...`
      })

    if (snippets.length === 0) {
      return ''
    }

    return `
【已生成章节参考 - 请勿重复以下内容】
${snippets.join('\n\n')}

重要提示：
1. 请确保本章内容与上述已生成章节有明显区别
2. 避免使用相似的情节展开方式和表达方式
3. 章节开头要独特，不要与已有章节开头雷同
4. 场景描写和对话方式要有所变化
`
  }

  extractKeyPhrases(content: string, maxPhrases: number = 10): string[] {
    const normalized = content.replace(/\s+/g, ' ').trim()
    const sentences = normalized.split(/[。！？；]/).filter(s => s.trim().length > 10)
    
    const phrases: string[] = []
    for (const sentence of sentences) {
      const words = sentence.trim().split(/[，、]/).filter(w => w.trim().length >= 4)
      phrases.push(...words.map(w => w.trim()))
    }

    return dedupeNonEmpty(phrases).slice(0, maxPhrases)
  }
}

export default ContentDeduplicationService
