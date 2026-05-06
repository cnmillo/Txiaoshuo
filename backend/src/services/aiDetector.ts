/**
 * AI特征检测器
 * 用于检测AI写作模式和常见的AI生成特征
 */

import logger from '../utils/logger.js'

/**
 * AI特征检测结果
 */
export interface AIFeatureDetectionResult {
  /** AI痕迹分数 (0-100) */
  score: number
  /** 检测到的AI特征列表 */
  features: DetectedFeature[]
  /** 需要改写的段落 */
  paragraphsToRewrite: ParagraphIssue[]
  /** 总体评估 */
  assessment: string
  /** 建议 */
  suggestions: string[]
  /** 原创度评估 */
  originalityScore: number
  /** 详细分析 */
  detailedAnalysis: {
    sentenceVariety: number
    vocabularyDiversity: number
    emotionalDepth: number
    structuralComplexity: number
  }
}

/**
 * 检测到的特征
 */
export interface DetectedFeature {
  /** 特征类型 */
  type: AIFeatureType
  /** 特征描述 */
  description: string
  /** 严重程度 (1-5) */
  severity: number
  /** 出现次数 */
  count: number
  /** 示例 */
  examples: string[]
  /** 影响范围 */
  impact: 'low' | 'medium' | 'high'
}

/**
 * 段落问题
 */
export interface ParagraphIssue {
  /** 段落索引 */
  index: number
  /** 段落内容 */
  content: string
  /** 问题类型 */
  issues: string[]
  /** 建议改写 */
  suggestedRewrite?: string
  /** 问题严重程度 */
  severity: number
}

/**
 * AI特征类型
 */
export enum AIFeatureType {
  REPETITIVE_STRUCTURE = 'repetitive_structure',      // 重复句式结构
  TRANSITION_WORDS = 'transition_words',              // 生硬过渡词
  FORMAL_CONNECTORS = 'formal_connectors',            // 正式连接词
  EMPTY_PHRASES = 'empty_phrases',                    // 空洞短语
  PASSIVE_VOICE = 'passive_voice',                    // 被动语态
  UNIFORM_SENTENCE_LENGTH = 'uniform_sentence_length', // 句子长度一致
  LACK_OF_EMOTION = 'lack_of_emotion',                // 缺乏情感
  OVERLY_STRUCTURED = 'overly_structured',            // 过度结构化
  GENERIC_DESCRIPTIONS = 'generic_descriptions',      // 通用描述
  PREDICTABLE_PATTERNS = 'predictable_patterns',       // 可预测模式
  EXCESSIVE_ADVERBS = 'excessive_adverbs',            // 过度使用副词
  FORMULAIC_DIALOGUE = 'formulaic_dialogue',          // 公式化对话
  LACK_OF_SPECIFICITY = 'lack_of_specificity',        // 缺乏具体细节
  STERILE_LANGUAGE = 'sterile_language',              // 语言生硬
  UNNATURAL_FLOW = 'unnatural_flow'                   // 流畅度差
}

/**
 * AI常用短语和模式
 */
const AI_PATTERNS = {
  // 结构化连接词
  structuredConnectors: [
    '首先', '其次', '再次', '最后', '第一', '第二', '第三',
    '一方面', '另一方面', '综上所述', '总而言之', '总的来说',
    '值得注意的是', '需要指出的是', '不可否认的是', '毫无疑问',
    '换句话说', '换言之', '也就是说', '这意味着',
    '从这个角度来看', '基于以上分析', '由此可见',
    '不仅如此', '除此之外', '更重要的是', '关键在于',
    '究其原因', '究其根本', '归根结底', '一言以蔽之', '简而言之',
    '显而易见', '众所周知', '不可避免', '毋庸置疑'
  ],

  // 空洞修饰词
  emptyModifiers: [
    '非常', '十分', '极其', '相当', '特别', '格外',
    '显然', '明显', '无疑', '肯定', '绝对', '必然',
    '某种程度上', '一定程度上', '从某种意义上说',
    '众所周知', '不言而喻', '显而易见', '事实上', '实际上',
    '真的', '确实', '实在', '完全', '彻底', '极度'
  ],

  // 被动语态标志
  passiveIndicators: [
    '被', '由', '受到', '得到', '获得', '遭到', '遭受',
    '被称为', '被认为是', '被视为', '被看作', '被发现', '被创造',
    '被开发', '被设计', '被实现', '被完成', '被执行'
  ],

  // 重复句式开头
  repetitiveStarts: [
    '他', '她', '它', '他们', '我们', '这个', '那个',
    '这是', '那是', '于是', '然后', '接着', '这时', '此时',
    '突然', '忽然', '然而', '但是', '因此', '所以'
  ],

  // AI常用套话
  clichePhrases: [
    '在...的背景下', '随着...的发展', '在...的过程中',
    '这是一个', '那是一个', '这是一种', '那是一种',
    '不仅...而且', '既...又', '虽然...但是',
    '因为...所以', '如果...那么', '即使...也',
    '为了...', '以便...', '从而...', '进而...',
    '可以说', '不得不说', '必须承认', '应该说'
  ],

  // 缺乏具体性的描述
  vagueDescriptions: [
    '很多东西', '很多事情', '某种感觉', '某种情绪',
    '内心深处', '灵魂深处', '不知不觉中', '潜移默化中',
    '一些人', '一些事', '某些人', '某些事',
    '有时候', '有时候', '偶尔', '经常', '总是', '一直'
  ],

  // 过度使用的副词
  excessiveAdverbs: [
    '非常', '十分', '极其', '相当', '特别', '格外',
    '很', '太', '挺', '比较', '更加', '最',
    '真的', '确实', '实在', '完全', '彻底', '极度'
  ],

  // 公式化对话模式
  formulaicDialogue: [
    '他说', '她说', '他们说', '我们说',
    '他问道', '她问道', '他们问道', '我们问道',
    '他回答', '她回答', '他们回答', '我们回答',
    '他笑着说', '她笑着说', '他严肃地说', '她严肃地说'
  ],

  // 语言生硬标志
  sterileLanguage: [
    '进行', '实现', '完成', '执行', '开展', '实施',
    '具有', '拥有', '存在', '包含', '包括', '涉及',
    '产生', '造成', '导致', '引起', '带来', '引发'
  ]
}

/**
 * 句子结构模式
 */
const SENTENCE_PATTERNS = {
  // 过于规整的句式
  uniformPatterns: [
    /^[他她它][^，]{3,8}，[他她它][^。]{3,8}。$/,
    /^[然于由因][^，]{2,6}，[^。]{5,15}。$/,
    /^(这是|那是)[^，]{3,10}，(也是|更是)[^。]{3,10}。$/,
    /^[虽然如果因为][^，]{2,8}，[^。]{5,20}。$/,
    /^[不仅既][^，]{2,6}，[而且又][^。]{5,15}。$/
  ],

  // 过于复杂的从句
  complexClauses: /([^，。]{0,8}，){3,}[^。]{0,8}。/g,

  // 公式化对话模式
  formulaicDialogue: /(他|她|他们|我们)(说|问道|回答|笑着说|严肃地说)：["'].*?["']/g,

  // 过度使用副词
  excessiveAdverbs: /[很非常十分极其相当特别格外真的确实实在完全彻底极度][地的]/g,

  // 语言生硬模式
  sterileLanguage: /(进行|实现|完成|执行|开展|实施|具有|拥有|存在|包含|包括|涉及|产生|造成|导致|引起|带来|引发)[^，。]{0,10}/g
}

/**
 * AI特征检测器类
 */
export class AIDetector {
  private text: string
  private paragraphs: string[]

  constructor(text: string) {
    this.text = text
    this.paragraphs = this.splitParagraphs(text)
  }

  /**
   * 执行完整的AI特征检测
   */
  detect(): AIFeatureDetectionResult {
    try {
      logger.debug('开始AI特征检测', { textLength: this.text.length })

      const features: DetectedFeature[] = []

      // 检测各种AI特征
      const structuredConnectors = this.detectStructuredConnectors()
      if (structuredConnectors.count > 0) features.push(structuredConnectors)

      const emptyModifiers = this.detectEmptyModifiers()
      if (emptyModifiers.count > 0) features.push(emptyModifiers)

      const passiveVoice = this.detectPassiveVoice()
      if (passiveVoice.count > 0) features.push(passiveVoice)

      const repetitiveStructure = this.detectRepetitiveStructure()
      if (repetitiveStructure.count > 0) features.push(repetitiveStructure)

      const uniformLength = this.detectUniformSentenceLength()
      if (uniformLength.count > 0) features.push(uniformLength)

      const clichePhrases = this.detectClichePhrases()
      if (clichePhrases.count > 0) features.push(clichePhrases)

      const vagueDescriptions = this.detectVagueDescriptions()
      if (vagueDescriptions.count > 0) features.push(vagueDescriptions)

      // 新增检测方法
      const excessiveAdverbs = this.detectExcessiveAdverbs()
      if (excessiveAdverbs.count > 0) features.push(excessiveAdverbs)

      const formulaicDialogue = this.detectFormulaicDialogue()
      if (formulaicDialogue.count > 0) features.push(formulaicDialogue)

      const sterileLanguage = this.detectSterileLanguage()
      if (sterileLanguage.count > 0) features.push(sterileLanguage)

      const unnaturalFlow = this.detectUnnaturalFlow()
      if (unnaturalFlow.count > 0) features.push(unnaturalFlow)

      // 识别问题段落
      const paragraphsToRewrite = this.identifyProblemParagraphs(features)

      // 计算总体分数
      const score = this.calculateScore(features)

      // 生成评估和建议
      const assessment = this.generateAssessment(score, features)
      const suggestions = this.generateSuggestions(features)

      // 计算原创度和详细分析
      const originalityScore = this.calculateOriginalityScore(features, score)
      const detailedAnalysis = this.generateDetailedAnalysis()

      logger.debug('AI特征检测完成', { score, featureCount: features.length, originalityScore })

      return {
        score,
        features,
        paragraphsToRewrite,
        assessment,
        suggestions,
        originalityScore,
        detailedAnalysis
      }
    } catch (error) {
      logger.error('AI特征检测失败', error)
      throw new Error('AI特征检测过程中发生错误: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  /**
   * 将文本分割成段落
   */
  private splitParagraphs(text: string): string[] {
    return text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0)
  }

  /**
   * 检测结构化连接词
   */
  private detectStructuredConnectors(): DetectedFeature {
    const found: string[] = []
    let count = 0

    for (const pattern of AI_PATTERNS.structuredConnectors) {
      const regex = new RegExp(pattern.replace(/\./g, '\\.'), 'g')
      const matches = this.text.match(regex)
      if (matches) {
        count += matches.length
        if (matches.length > 0 && found.length < 5) {
          found.push(pattern)
        }
      }
    }

    // 查找上下文示例
    const examples = this.findExamples(AI_PATTERNS.structuredConnectors, 3)
    const impact = count > 10 ? 'high' : count > 5 ? 'medium' : 'low'

    return {
      type: AIFeatureType.FORMAL_CONNECTORS,
      description: '使用了过多的正式连接词和结构化表达',
      severity: Math.min(5, Math.ceil(count / 3)),
      count,
      examples,
      impact
    }
  }

  /**
   * 检测空洞修饰词
   */
  private detectEmptyModifiers(): DetectedFeature {
    const found: string[] = []
    let count = 0

    for (const pattern of AI_PATTERNS.emptyModifiers) {
      const regex = new RegExp(pattern, 'g')
      const matches = this.text.match(regex)
      if (matches) {
        count += matches.length
        if (matches.length > 0 && found.length < 5) {
          found.push(pattern)
        }
      }
    }

    const examples = this.findExamples(AI_PATTERNS.emptyModifiers, 3)
    const impact = count > 15 ? 'high' : count > 8 ? 'medium' : 'low'

    return {
      type: AIFeatureType.EMPTY_PHRASES,
      description: '使用了过多缺乏实质内容的修饰词',
      severity: Math.min(5, Math.ceil(count / 5)),
      count,
      examples,
      impact
    }
  }

  /**
   * 检测被动语态
   */
  private detectPassiveVoice(): DetectedFeature {
    let count = 0
    const examples: string[] = []

    // 检测"被"字句
    const passivePattern = /[^，。]{0,20}被[^，。]{0,30}[，。]/g
    const matches = this.text.match(passivePattern) || []
    count = matches.length

    // 提取示例
    for (let i = 0; i < Math.min(3, matches.length); i++) {
      examples.push(matches[i].trim())
    }

    const impact = count > 8 ? 'high' : count > 4 ? 'medium' : 'low'

    return {
      type: AIFeatureType.PASSIVE_VOICE,
      description: '使用了过多的被动语态，缺乏主动性和生动性',
      severity: Math.min(5, Math.ceil(count / 4)),
      count,
      examples,
      impact
    }
  }

  /**
   * 检测重复句式结构
   */
  private detectRepetitiveStructure(): DetectedFeature {
    const sentenceStarts: Record<string, number> = {}
    const sentences = this.text.match(/[^。！？]+[。！？]/g) || []

    for (const sentence of sentences) {
      const start = sentence.trim().slice(0, 2)
      sentenceStarts[start] = (sentenceStarts[start] || 0) + 1
    }

    let repetitiveCount = 0
    const repetitiveStarts: string[] = []

    for (const [start, count] of Object.entries(sentenceStarts)) {
      if (count >= 3) {
        repetitiveCount += count
        repetitiveStarts.push(start)
      }
    }

    // 查找连续重复的句式
    const examples: string[] = []
    for (let i = 0; i < sentences.length - 1; i++) {
      const current = sentences[i].trim().slice(0, 3)
      const next = sentences[i + 1].trim().slice(0, 3)
      if (current === next && examples.length < 3) {
        examples.push(`${sentences[i]} ${sentences[i + 1]}`)
      }
    }

    const impact = repetitiveCount > 10 ? 'high' : repetitiveCount > 5 ? 'medium' : 'low'

    return {
      type: AIFeatureType.REPETITIVE_STRUCTURE,
      description: '存在重复的开头句式，缺乏变化',
      severity: Math.min(5, Math.ceil(repetitiveCount / 5)),
      count: repetitiveCount,
      examples,
      impact
    }
  }

  /**
   * 检测句子长度一致性
   */
  private detectUniformSentenceLength(): DetectedFeature {
    const sentences = this.text.match(/[^。！？]+[。！？]/g) || []
    if (sentences.length < 5) {
      return {
        type: AIFeatureType.UNIFORM_SENTENCE_LENGTH,
        description: '句子数量不足以判断长度变化',
        severity: 1,
        count: 0,
        examples: [],
        impact: 'low'
      }
    }

    const lengths = sentences.map(s => s.length)
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length
    const stdDev = Math.sqrt(variance)

    // 标准差小表示句子长度过于一致
    const uniformityScore = avgLength / (stdDev + 1)
    const isUniform = uniformityScore > 3

    const examples: string[] = []
    if (isUniform) {
      // 提取几个长度相似的句子作为示例
      for (let i = 0; i < Math.min(3, sentences.length); i++) {
        examples.push(sentences[i].trim())
      }
    }

    const impact = isUniform && uniformityScore > 5 ? 'high' : isUniform ? 'medium' : 'low'

    return {
      type: AIFeatureType.UNIFORM_SENTENCE_LENGTH,
      description: '句子长度过于一致，缺乏节奏变化',
      severity: isUniform ? Math.min(5, Math.ceil(uniformityScore)) : 1,
      count: isUniform ? sentences.length : 0,
      examples,
      impact
    }
  }

  /**
   * 检测陈词滥调
   */
  private detectClichePhrases(): DetectedFeature {
    let count = 0
    const found: string[] = []

    for (const pattern of AI_PATTERNS.clichePhrases) {
      const regex = new RegExp(pattern.replace(/\./g, '\\.').replace(/\(/g, '\\(').replace(/\)/g, '\\)'), 'g')
      const matches = this.text.match(regex)
      if (matches) {
        count += matches.length
        if (matches.length > 0 && found.length < 5) {
          found.push(pattern)
        }
      }
    }

    const examples = this.findExamples(AI_PATTERNS.clichePhrases, 3)
    const impact = count > 8 ? 'high' : count > 4 ? 'medium' : 'low'

    return {
      type: AIFeatureType.GENERIC_DESCRIPTIONS,
      description: '使用了过多的套话和陈词滥调',
      severity: Math.min(5, Math.ceil(count / 2)),
      count,
      examples,
      impact
    }
  }

  /**
   * 检测模糊描述
   */
  private detectVagueDescriptions(): DetectedFeature {
    let count = 0
    const examples: string[] = []

    for (const pattern of AI_PATTERNS.vagueDescriptions) {
      const regex = new RegExp(pattern, 'g')
      const matches = this.text.match(regex)
      if (matches) {
        count += matches.length
        // 提取包含该短语的完整句子
        const contextRegex = new RegExp(`[^。！？]*${pattern}[^。！？]*[。！？]`, 'g')
        const contexts = this.text.match(contextRegex) || []
        for (const ctx of contexts.slice(0, 2)) {
          if (examples.length < 3 && !examples.includes(ctx.trim())) {
            examples.push(ctx.trim())
          }
        }
      }
    }

    const impact = count > 10 ? 'high' : count > 5 ? 'medium' : 'low'

    return {
      type: AIFeatureType.LACK_OF_EMOTION,
      description: '使用了过多抽象和模糊的描述，缺乏具体细节',
      severity: Math.min(5, Math.ceil(count / 3)),
      count,
      examples,
      impact
    }
  }

  /**
   * 检测过度使用副词
   */
  private detectExcessiveAdverbs(): DetectedFeature {
    let count = 0
    const examples: string[] = []

    // 检测过度使用的副词
    const matches = this.text.match(SENTENCE_PATTERNS.excessiveAdverbs) || []
    count = matches.length

    // 提取示例
    for (let i = 0; i < Math.min(3, matches.length); i++) {
      examples.push(matches[i].trim())
    }

    const impact = count > 15 ? 'high' : count > 8 ? 'medium' : 'low'

    return {
      type: AIFeatureType.EXCESSIVE_ADVERBS,
      description: '过度使用副词，使语言显得冗余',
      severity: Math.min(5, Math.ceil(count / 5)),
      count,
      examples,
      impact
    }
  }

  /**
   * 检测公式化对话
   */
  private detectFormulaicDialogue(): DetectedFeature {
    let count = 0
    const examples: string[] = []

    // 检测公式化对话模式
    const matches = this.text.match(SENTENCE_PATTERNS.formulaicDialogue) || []
    count = matches.length

    // 提取示例
    for (let i = 0; i < Math.min(3, matches.length); i++) {
      examples.push(matches[i].trim())
    }

    const impact = count > 6 ? 'high' : count > 3 ? 'medium' : 'low'

    return {
      type: AIFeatureType.FORMULAIC_DIALOGUE,
      description: '对话表达过于公式化，缺乏自然感',
      severity: Math.min(5, Math.ceil(count / 2)),
      count,
      examples,
      impact
    }
  }

  /**
   * 检测语言生硬
   */
  private detectSterileLanguage(): DetectedFeature {
    let count = 0
    const examples: string[] = []

    // 检测语言生硬模式
    const matches = this.text.match(SENTENCE_PATTERNS.sterileLanguage) || []
    count = matches.length

    // 提取示例
    for (let i = 0; i < Math.min(3, matches.length); i++) {
      examples.push(matches[i].trim())
    }

    const impact = count > 10 ? 'high' : count > 5 ? 'medium' : 'low'

    return {
      type: AIFeatureType.STERILE_LANGUAGE,
      description: '语言表达生硬，缺乏文学性',
      severity: Math.min(5, Math.ceil(count / 3)),
      count,
      examples,
      impact
    }
  }

  /**
   * 检测流畅度差
   */
  private detectUnnaturalFlow(): DetectedFeature {
    let count = 0
    const examples: string[] = []

    // 检测句子间过渡不自然
    const sentences = this.text.match(/[^。！？]+[。！？]/g) || []
    
    for (let i = 0; i < sentences.length - 1; i++) {
      const current = sentences[i].trim()
      const next = sentences[i + 1].trim()
      
      // 检测突兀的过渡
      if (current.endsWith('。') && (next.startsWith('然而') || next.startsWith('但是') || next.startsWith('因此') || next.startsWith('所以'))) {
        count++
        if (examples.length < 3) {
          examples.push(`${current} ${next}`)
        }
      }
    }

    const impact = count > 5 ? 'high' : count > 2 ? 'medium' : 'low'

    return {
      type: AIFeatureType.UNNATURAL_FLOW,
      description: '句子间过渡不自然，流畅度差',
      severity: Math.min(5, Math.ceil(count / 2)),
      count,
      examples,
      impact
    }
  }

  /**
   * 查找示例句子
   */
  private findExamples(patterns: string[], maxExamples: number): string[] {
    const examples: string[] = []

    for (const pattern of patterns) {
      if (examples.length >= maxExamples) break

      const regex = new RegExp(`[^。！？]*${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^。！？]*[。！？]`, 'g')
      const matches = this.text.match(regex)
      if (matches) {
        for (const match of matches.slice(0, 2)) {
          if (examples.length < maxExamples && !examples.includes(match.trim())) {
            examples.push(match.trim())
          }
        }
      }
    }

    return examples
  }

  /**
   * 识别需要改写的段落
   */
  private identifyProblemParagraphs(features: DetectedFeature[]): ParagraphIssue[] {
    const issues: ParagraphIssue[] = []

    for (let i = 0; i < this.paragraphs.length; i++) {
      const paragraph = this.paragraphs[i]
      const paragraphIssues: string[] = []

      // 检查是否包含AI特征
      for (const feature of features) {
        for (const example of feature.examples) {
          if (paragraph.includes(example.slice(0, Math.min(10, example.length)))) {
            paragraphIssues.push(feature.description)
            break
          }
        }
      }

      // 检查句子长度一致性
      const sentences = paragraph.match(/[^。！？]+[。！？]/g) || []
      if (sentences.length >= 3) {
        const lengths = sentences.map(s => s.length)
        const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
        const similarCount = lengths.filter(l => Math.abs(l - avg) < 5).length
        if (similarCount / lengths.length > 0.7) {
          paragraphIssues.push('句子长度过于一致')
        }
      }

      // 检查段落长度
      if (paragraph.length > 200 && sentences.length > 5) {
        paragraphIssues.push('段落过长，建议分段')
      }

      if (paragraphIssues.length > 0) {
        // 计算段落严重程度
        let severity = 1
        for (const feature of features) {
          if (feature.impact === 'high' && paragraphIssues.includes(feature.description)) {
            severity = Math.max(severity, 5)
          } else if (feature.impact === 'medium' && paragraphIssues.includes(feature.description)) {
            severity = Math.max(severity, 3)
          }
        }

        issues.push({
          index: i,
          content: paragraph.slice(0, 100) + (paragraph.length > 100 ? '...' : ''),
          issues: [...new Set(paragraphIssues)],
          severity
        })
      }
    }

    return issues
  }

  /**
   * 计算AI痕迹分数
   */
  private calculateScore(features: DetectedFeature[]): number {
    if (features.length === 0) return 0

    let totalScore = 0
    let totalWeight = 0

    // 根据特征类型和严重程度计算分数
    const weights: Record<AIFeatureType, number> = {
      [AIFeatureType.FORMAL_CONNECTORS]: 1.5,
      [AIFeatureType.EMPTY_PHRASES]: 1.2,
      [AIFeatureType.PASSIVE_VOICE]: 1.0,
      [AIFeatureType.REPETITIVE_STRUCTURE]: 1.3,
      [AIFeatureType.UNIFORM_SENTENCE_LENGTH]: 1.0,
      [AIFeatureType.GENERIC_DESCRIPTIONS]: 1.4,
      [AIFeatureType.LACK_OF_EMOTION]: 1.2,
      [AIFeatureType.OVERLY_STRUCTURED]: 1.5,
      [AIFeatureType.PREDICTABLE_PATTERNS]: 1.1,
      [AIFeatureType.EXCESSIVE_ADVERBS]: 1.2,
      [AIFeatureType.FORMULAIC_DIALOGUE]: 1.4,
      [AIFeatureType.LACK_OF_SPECIFICITY]: 1.3,
      [AIFeatureType.STERILE_LANGUAGE]: 1.5,
      [AIFeatureType.UNNATURAL_FLOW]: 1.3,
      [AIFeatureType.TRANSITION_WORDS]: 1.2
    }

    for (const feature of features) {
      const weight = weights[feature.type] || 1
      const impactMultiplier = feature.impact === 'high' ? 1.5 : feature.impact === 'medium' ? 1.2 : 1.0
      totalScore += feature.severity * weight * impactMultiplier * Math.log(feature.count + 1)
      totalWeight += weight
    }

    // 归一化到0-100
    const normalizedScore = Math.min(100, Math.round((totalScore / (totalWeight * 3)) * 20))

    return normalizedScore
  }

  /**
   * 计算原创度分数
   */
  private calculateOriginalityScore(features: DetectedFeature[], aiScore: number): number {
    // 基于AI痕迹分数反向计算原创度
    let originalityScore = 100 - aiScore

    // 调整因素：特征数量和严重程度
    const highSeverityFeatures = features.filter(f => f.severity >= 4).length

    // 如果有很多高严重度特征，原创度会进一步降低
    if (highSeverityFeatures > 3) {
      originalityScore -= highSeverityFeatures * 5
    }

    // 确保分数在0-100之间
    return Math.max(0, Math.min(100, originalityScore))
  }

  /**
   * 生成详细分析
   */
  private generateDetailedAnalysis() {
    const sentences = this.text.match(/[^。！？]+[。！？]/g) || []
    const words = this.text.replace(/[，。！？；：""''（）、]/g, ' ').split(/\s+/).filter(w => w.length > 0)
    const uniqueWords = [...new Set(words)]

    // 句子多样性：基于句子长度的标准差
    let sentenceVariety = 0
    if (sentences.length > 1) {
      const lengths = sentences.map(s => s.length)
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
      const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length
      const stdDev = Math.sqrt(variance)
      sentenceVariety = Math.min(100, Math.round((stdDev / avgLength) * 200))
    }

    // 词汇多样性：基于词汇丰富度
    const vocabularyDiversity = Math.min(100, Math.round((uniqueWords.length / words.length) * 300))

    // 情感深度：基于情感词的使用
    const emotionalWords = ['喜欢', '爱', '恨', '悲伤', '快乐', '愤怒', '恐惧', '惊讶', '期待', '失望']
    const emotionalWordCount = emotionalWords.reduce((count, word) => {
      const matches = this.text.match(new RegExp(word, 'g'))
      return count + (matches ? matches.length : 0)
    }, 0)
    const emotionalDepth = Math.min(100, Math.round((emotionalWordCount / sentences.length) * 50))

    // 结构复杂度：基于句子结构的多样性
    const structuralComplexity = Math.min(100, Math.round(sentenceVariety * 0.7 + vocabularyDiversity * 0.3))

    return {
      sentenceVariety,
      vocabularyDiversity,
      emotionalDepth,
      structuralComplexity
    }
  }

  /**
   * 生成总体评估
   */
  private generateAssessment(score: number, _features: DetectedFeature[]): string {
    if (score < 20) {
      return '文本自然度较高，AI痕迹较少，基本不需要改写'
    } else if (score < 40) {
      return '文本存在轻微的AI写作特征，建议进行轻度优化'
    } else if (score < 60) {
      return '文本有明显的AI写作痕迹，建议进行针对性改写'
    } else if (score < 80) {
      return '文本AI特征非常明显，强烈建议进行全面改写'
    } else {
      return '文本几乎完全是AI生成的风格，必须进行深度改写才能提升自然度'
    }
  }

  /**
   * 生成改进建议
   */
  private generateSuggestions(features: DetectedFeature[]): string[] {
    const suggestions: string[] = []

    for (const feature of features) {
      switch (feature.type) {
        case AIFeatureType.FORMAL_CONNECTORS:
          suggestions.push('减少使用"首先"、"其次"、"综上所述"等结构化连接词，改用更自然的过渡')
          break
        case AIFeatureType.EMPTY_PHRASES:
          suggestions.push('删除"非常"、"十分"、"显然"等空洞修饰词，用具体描述替代')
          break
        case AIFeatureType.PASSIVE_VOICE:
          suggestions.push('将被动语态改为主动语态，增强叙述的生动性')
          break
        case AIFeatureType.REPETITIVE_STRUCTURE:
          suggestions.push('变化句子开头方式，避免连续使用相同的主语或句式')
          break
        case AIFeatureType.UNIFORM_SENTENCE_LENGTH:
          suggestions.push('调整句子长度，长短句结合，增加文本的节奏感')
          break
        case AIFeatureType.GENERIC_DESCRIPTIONS:
          suggestions.push('避免使用套话和陈词滥调，用独特的语言表达')
          break
        case AIFeatureType.LACK_OF_EMOTION:
          suggestions.push('增加具体的感官细节和情感描写，减少抽象概念')
          break
        case AIFeatureType.EXCESSIVE_ADVERBS:
          suggestions.push('减少副词的使用，用更具体的动词和形容词替代')
          break
        case AIFeatureType.FORMULAIC_DIALOGUE:
          suggestions.push('丰富对话的表达方式，增加人物的个性化语言')
          break
        case AIFeatureType.STERILE_LANGUAGE:
          suggestions.push('使用更生动、具体的词汇，避免使用生硬的书面语')
          break
        case AIFeatureType.UNNATURAL_FLOW:
          suggestions.push('优化句子间的过渡，使文本更加流畅自然')
          break
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('文本整体自然度良好，保持当前写作风格即可')
    }

    return [...new Set(suggestions)]
  }

  /**
   * 快速检测 - 仅返回分数
   */
  quickDetect(): number {
    try {
      const result = this.detect()
      return result.score
    } catch {
      return 50 // 出错时返回中等分数
    }
  }

  /**
   * 批量检测多个文本
   */
  static batchDetect(texts: string[]): AIFeatureDetectionResult[] {
    return texts.map(text => {
      const detector = new AIDetector(text)
      return detector.detect()
    })
  }
}

/**
 * 检测单个文本的AI特征
 */
export function detectAIFeatures(text: string): AIFeatureDetectionResult {
  const detector = new AIDetector(text)
  return detector.detect()
}

/**
 * 快速获取AI痕迹分数
 */
export function getAIScore(text: string): number {
  const detector = new AIDetector(text)
  return detector.quickDetect()
}

/**
 * 批量检测
 */
export function batchDetectAIFeatures(texts: string[]): AIFeatureDetectionResult[] {
  return AIDetector.batchDetect(texts)
}

export default AIDetector
