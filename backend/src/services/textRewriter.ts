/**
 * 文本改写器
 * 用于重构句式结构、替换AI常用词汇、增加人性化表达
 */

import logger from '../utils/logger.js'
import { AIFeatureType, type DetectedFeature } from './aiDetector.js'
import {
  detectAntiTemplateViolations,
  getAntiTemplateBlacklist,
  getFormulaicExpressionBlacklist,
  buildAntiTemplateConstraintPrompt,
  type AntiTemplateDetectionResult
} from '../utils/antiTemplateConstraints.js'

/**
 * 改写结果
 */
export interface RewriteResult {
  /** 改写后的文本 */
  rewrittenText: string
  /** 应用的改写规则 */
  appliedRules: RewriteRule[]
  /** 改写统计 */
  statistics: RewriteStatistics
  /** 保持原意的置信度 (0-100) */
  fidelityScore: number
  /** 改进说明 */
  improvements: string[]
  /** 原创度提升 */
  originalityImprovement: number
  /** 语义保持分析 */
  semanticAnalysis: {
    preservedMeaning: number
    structuralChanges: number
    vocabularyChanges: number
  }
  /** 反模板约束检测结果 */
  antiTemplateDetection?: AntiTemplateDetectionResult
  /** 是否仍有反模板违规 */
  hasAntiTemplateViolations: boolean
}

/**
 * 批量改写结果
 */
export interface BatchRewriteResult {
  /** 改写后的文本列表 */
  results: RewriteResult[]
  /** 总处理时间 (毫秒) */
  totalTime: number
  /** 成功数量 */
  successCount: number
  /** 失败数量 */
  failedCount: number
  /** 错误信息 */
  errors: string[]
  /** 平均原创度提升 */
  averageOriginalityImprovement: number
  /** 平均语义保持度 */
  averageFidelityScore: number
}

/**
 * 改写规则
 */
export interface RewriteRule {
  /** 规则名称 */
  name: string
  /** 规则描述 */
  description: string
  /** 应用次数 */
  appliedCount: number
  /** 示例 */
  examples: Array<{ original: string; rewritten: string }>
  /** 规则类型 */
  type: 'vocabulary' | 'structure' | 'style' | 'flow'
}

/**
 * 改写统计
 */
export interface RewriteStatistics {
  /** 原始字符数 */
  originalLength: number
  /** 改写后字符数 */
  rewrittenLength: number
  /** 替换的词组数量 */
  replacedPhrases: number
  /** 重构的句子数量 */
  restructuredSentences: number
  /** 应用的规则数量 */
  appliedRules: number
  /** 风格调整数量 */
  styleAdjustments: number
  /** 流畅度改进数量 */
  flowImprovements: number
}

/**
 * 改写选项
 */
export interface RewriteOptions {
  /** 改写强度 (light/medium/strong) */
  intensity?: 'light' | 'medium' | 'strong'
  /** 保留特定短语 */
  preservePhrases?: string[]
  /** 目标风格 */
  targetStyle?: 'natural' | 'vivid' | 'concise' | 'literary' | 'conversational'
  /** 是否保持段落结构 */
  keepParagraphStructure?: boolean
  /** 是否使用AI辅助改写 */
  useAIAssist?: boolean
  /** 是否保持语义 */
  preserveMeaning?: boolean
  /** 批量处理大小 */
  batchSize?: number
  /** 目标原创度 */
  targetOriginality?: number
}

/**
 * 词汇替换映射
 */
const VOCABULARY_REPLACEMENTS: Record<string, string[]> = {
  // 结构化连接词替换
  '首先': ['一开始', '起初', '最先', '开头', '刚一开始', ''],
  '其次': ['接着', '然后', '随后', '再者', '紧接着', ''],
  '再次': ['接下来', '而后', '其后', '之后', ''],
  '最后': ['最终', '末了', '到头来', '结尾', '终于', ''],
  '综上所述': ['说到底', '总之', '归根结底', '一句话', ''],
  '总而言之': ['总之', '一句话', '概括来说', '简而言之', ''],
  '总的来说': ['总的来说', '整体而言', '大体上', '整体来看', ''],
  '值得注意的是': ['有意思的是', '特别的是', '令人注意的是', '需要注意的是', ''],
  '需要指出的是': ['要说的是', '值得一提的是', '必须提到的是', ''],
  '不可否认的是': ['确实', '不可否认', '毋庸置疑', ''],
  '毫无疑问': ['显然', '明显', '不用说', '肯定', ''],
  '换句话说': ['也就是说', '换言之', '简单说', '换个说法', ''],
  '从这个角度来看': ['由此看来', '从这个角度看', '从这方面来说', ''],
  '基于以上分析': ['综上所述', '由此可知', '根据分析', ''],
  '由此可见': ['可见', '由此可知', '可以看出', ''],
  '一言以蔽之': ['一句话', '总之', '概括地说', ''],
  '简而言之': ['简单说', '总之', '概括来说', ''],
  '显而易见': ['明显', '显然', '不用说', ''],
  '众所周知': ['大家都知道', '人尽皆知', ''],
  '不可避免': ['必然', '无法避免', ''],
  '毋庸置疑': ['毫无疑问', '肯定', ''],

  // 空洞修饰词替换
  '非常': ['很', '特别', '相当', '格外', '颇', '十分', ''],
  '十分': ['很', '相当', '特别', '非常', ''],
  '极其': ['非常', '特别', '极为', '分外', ''],
  '相当': ['比较', '还算', '挺', '很', ''],
  '特别': ['尤其', '格外', '分外', '非常', ''],
  '显然': ['明显', '显然', '一看就', '很明显', ''],
  '明显': ['清楚', '显然', '明显', '很明显', ''],
  '无疑': ['肯定', '一定', '必然', '毫无疑问', ''],
  '绝对': ['肯定', '一定', '必定', ''],
  '必然': ['肯定', '一定', '势必', '不可避免', ''],
  '某种程度上': ['一定程度上', '某种意义上', '在某种程度上', ''],
  '一定程度上': ['某种程度上', '一定程度上', '在一定程度上', ''],
  '事实上': ['实际上', '其实', '事实上', ''],
  '实际上': ['事实上', '其实', '实际上', ''],
  '真的': ['确实', '真的', ''],
  '确实': ['真的', '确实', '的确', ''],
  '实在': ['真的', '确实', '实在', ''],
  '完全': ['彻底', '完全', ''],
  '彻底': ['完全', '彻底', ''],
  '极度': ['非常', '特别', '极度', ''],

  // 被动语态转换
  '被称为': ['人们叫', '大家称', '被叫做', ''],
  '被认为是': ['人们认为', '大家认为', '被看作', ''],
  '被视为': ['被看作', '被认为是', '被当作', ''],
  '被看作': ['被视为', '被认为是', '被当作', ''],
  '被发现': ['人们发现', '发现', ''],
  '被创造': ['创造', '人们创造', ''],
  '被开发': ['开发', '人们开发', ''],
  '被设计': ['设计', '人们设计', ''],
  '被实现': ['实现', '人们实现', ''],
  '被完成': ['完成', '人们完成', ''],
  '被执行': ['执行', '人们执行', ''],

  // 套话替换
  '这是一个': ['这是', ''],
  '那是一个': ['那是', ''],
  '这是一种': ['这是', ''],
  '那是一种': ['那是', ''],
  '在...的背景下': ['在...的情况下', '在...的环境中', ''],
  '随着...的发展': ['随着...的进步', '随着...的变化', ''],
  '在...的过程中': ['在...过程中', '在...的时候', ''],
  '不仅...而且': ['不但...而且', '不仅...还', ''],
  '既...又': ['既...也', '不但...而且', ''],
  '虽然...但是': ['尽管...但是', '虽然...可是', ''],
  '因为...所以': ['因为...因此', '由于...所以', ''],
  '如果...那么': ['如果...就', '假如...那么', ''],
  '即使...也': ['就算...也', '即便...也', ''],
  '为了...': ['为了', '为', ''],
  '以便...': ['以便', '为了', ''],
  '从而...': ['从而', '因此', ''],
  '进而...': ['进而', '进一步', ''],
  '可以说': ['可以说', '可以认为', ''],
  '不得不说': ['必须说', '得说', ''],
  '必须承认': ['得承认', '必须承认', ''],
  '应该说': ['可以说', '应该说', ''],

  // 过度使用的副词
  '很': ['非常', '相当', '挺', ''],
  '太': ['非常', '特别', ''],
  '挺': ['很', '相当', ''],
  '比较': ['相当', '比较', ''],
  '更加': ['更', '更加', ''],
  '最': ['最', '极其', ''],

  // 语言生硬标志
  '进行': ['开展', '实施', '做', ''],
  '实现': ['完成', '达成', '实现', ''],
  '完成': ['完成', '结束', '做完', ''],
  '执行': ['执行', '实施', '进行', ''],
  '开展': ['开展', '进行', '实施', ''],
  '实施': ['实施', '执行', '开展', ''],
  '具有': ['有', '具备', '拥有', ''],
  '拥有': ['有', '具有', '具备', ''],
  '存在': ['有', '存在', ''],
  '包含': ['包括', '包含', '有', ''],
  '包括': ['包含', '包括', '有', ''],
  '涉及': ['涉及', '关系到', '关于', ''],
  '产生': ['产生', '造成', '引起', ''],
  '造成': ['造成', '导致', '引起', ''],
  '导致': ['导致', '造成', '引起', ''],
  '引起': ['引起', '导致', '造成', ''],
  '带来': ['带来', '引起', '导致', ''],
  '引发': ['引发', '引起', '导致', ''],

  // 公式化对话
  '他说': ['他开口道', '他说道', '他说', ''],
  '她说': ['她开口道', '她说道', '她说', ''],
  '他们说': ['他们开口道', '他们说道', '他们说', ''],
  '我们说': ['我们开口道', '我们说道', '我们说', ''],
  '他问道': ['他问', '他开口问道', '他问道', ''],
  '她问道': ['她问', '她开口问道', '她问道', ''],
  '他们问道': ['他们问', '他们开口问道', '他们问道', ''],
  '我们问道': ['我们问', '我们开口问道', '我们问道', ''],
  '他回答': ['他回答道', '他答道', '他回答', ''],
  '她回答': ['她回答道', '她答道', '她回答', ''],
  '他们回答': ['他们回答道', '他们答道', '他们回答', ''],
  '我们回答': ['我们回答道', '我们答道', '我们回答', ''],
  '他笑着说': ['他笑着道', '他笑着说', '他边笑边说', ''],
  '她笑着说': ['她笑着道', '她笑着说', '她边笑边说', ''],
  '他严肃地说': ['他严肃地道', '他严肃地说', '他板着脸说', ''],
  '她严肃地说': ['她严肃地道', '她严肃地说', '她板着脸说', '']
}

/**
 * 句式转换规则
 */
interface SentenceTransformation {
  name: string
  pattern: RegExp
  transform: (match: string, ...args: string[]) => string
}

const SENTENCE_TRANSFORMATIONS: SentenceTransformation[] = [
  {
    name: '被动转主动',
    pattern: /([^，。]{1,10})被([^，。]{1,15})[，。]/g,
    transform: (match: string, subject?: string, action?: string) => {
      // 简单转换：将被字句改为主动句
      if (subject && action && subject.length < 5 && action.length < 10) {
        return match.replace('被', '把')
      }
      return match
    }
  },
  {
    name: '拆分长句',
    pattern: /([^，。]{15,30}，[^，。]{15,30}，[^，。]{15,30})[。]/g,
    transform: (match: string) => {
      // 将包含多个从句的长句拆分为短句
      return match.replace(/，/g, '。').replace(/。$/g, '。')
    }
  },
  {
    name: '变化句首',
    pattern: /^([他她它][^，]{3,8}，[他她它])/gm,
    transform: (match: string) => {
      // 变化重复的主语开头
      const alternatives = ['与此同时，', '这时，', '此刻，', '就在这时，', '']
      const randomAlt = alternatives[Math.floor(Math.random() * alternatives.length)]
      return randomAlt + match
    }
  },
  {
    name: '优化过渡词',
    pattern: /^(然而|但是|因此|所以)[，。]/gm,
    transform: (match: string) => {
      // 优化过渡词使用
      const transitions: Record<string, string[]> = {
        '然而': ['不过', '然而', '可是', ''],
        '但是': ['不过', '但是', '可是', ''],
        '因此': ['所以', '因此', '于是', ''],
        '所以': ['因此', '所以', '于是', '']
      }
      const transition = match.trim().replace(/[，。]/g, '')
      const alternatives = transitions[transition] || [transition]
      const randomAlt = alternatives[Math.floor(Math.random() * alternatives.length)]
      return randomAlt ? randomAlt + match.slice(transition.length) : match.slice(transition.length)
    }
  },
  {
    name: '合并短句',
    pattern: /([^。！？]{5,15}[。！？])([^。！？]{5,15}[。！？])/g,
    transform: (match: string, s1?: string, s2?: string) => {
      // 合并过短的句子
      if (s1 && s2 && Math.random() > 0.5) {
        return s1.slice(0, -1) + '，' + s2.slice(0, -1) + '。'
      }
      return match
    }
  },
  {
    name: '优化对话表达',
    pattern: /(他|她|他们|我们)(说|问道|回答|笑着说|严肃地说)：["'](.*?)["']/g,
    transform: (match: string, subject?: string, action?: string, content?: string) => {
      // 优化对话表达
      const actionVariations: Record<string, string[]> = {
        '说': ['开口道', '说道', '说', ''],
        '问道': ['问', '开口问道', '问道', ''],
        '回答': ['回答道', '答道', '回答', ''],
        '笑着说': ['笑着道', '笑着说', '边笑边说', ''],
        '严肃地说': ['严肃地道', '严肃地说', '板着脸说', '']
      }
      const act = action || '说'
      const sub = subject || ''
      const cont = content || ''
      const variations = actionVariations[act] || [act]
      const randomAction = variations[Math.floor(Math.random() * variations.length)]
      return randomAction ? `${sub}${randomAction}："${cont}"` : `${sub}："${cont}"`
    }
  }
]

/**
 * 人性化表达增强
 */
const HUMANIZATION_PATTERNS = {
  // 增加口语化表达
  colloquialisms: [
    { pattern: /^(他|她|它)/, replacement: '话说$1' },
    { pattern: /^(然而|但是)/, replacement: '不过' },
    { pattern: /^(因此|所以)/, replacement: '于是' },
    { pattern: /^(忽然|突然)/, replacement: '冷不丁' },
    { pattern: /^(这时|此刻)/, replacement: '这时候' },
    { pattern: /^(首先|开始)/, replacement: '一开始' },
    { pattern: /^(最后|最终)/, replacement: '到最后' }
  ],

  // 增加情感词
  emotionalWords: [
    { pattern: /说[道|着]/g, replacement: '说道' },
    { pattern: /看[着|向]/g, replacement: '望着' },
    { pattern: /走[向|到]/g, replacement: '走向' },
    { pattern: /笑[着|了]/g, replacement: '笑着' },
    { pattern: /哭[着|了]/g, replacement: '哭着' },
    { pattern: /想[着|了]/g, replacement: '想着' },
    { pattern: /感[到|觉]/g, replacement: '感觉到' },
    { pattern: /听[到|见]/g, replacement: '听到' },
    { pattern: /看[到|见]/g, replacement: '看到' }
  ],

  // 增加感官细节
  sensoryDetails: [
    { pattern: /([他她]感[到觉])/, replacement: '$1到' },
    { pattern: /([他她]看[到见])/, replacement: '$1见' },
    { pattern: /([他她]听[到见])/, replacement: '$1见' },
    { pattern: /([他她]闻[到见])/, replacement: '$1到' },
    { pattern: /([他她]尝[到])/, replacement: '$1到' },
    { pattern: /([他她]触[到])/, replacement: '$1到' }
  ],

  // 增加个性化表达
  personalizedExpressions: [
    { pattern: /(他|她)点了点头/, replacement: '$1轻轻点了点头' },
    { pattern: /(他|她)摇了摇头/, replacement: '$1缓缓摇了摇头' },
    { pattern: /(他|她)笑了/, replacement: '$1嘴角微微上扬' },
    { pattern: /(他|她)哭了/, replacement: '$1眼眶湿润了' },
    { pattern: /(他|她)想了想/, replacement: '$1皱着眉头想了想' },
    { pattern: /(他|她)看了看/, replacement: '$1仔细看了看' },
    { pattern: /(他|她)听了听/, replacement: '$1侧耳听了听' }
  ]
}

/**
 * 文本改写器类
 */
export class TextRewriter {
  private text: string
  private options: RewriteOptions
  private appliedRules: RewriteRule[] = []
  private statistics: RewriteStatistics

  constructor(text: string, options: RewriteOptions = {}) {
    this.text = text
    this.options = {
      intensity: 'medium',
      keepParagraphStructure: true,
      useAIAssist: false,
      preserveMeaning: true,
      batchSize: 10,
      targetOriginality: 80,
      ...options
    }
    this.statistics = {
      originalLength: text.length,
      rewrittenLength: 0,
      replacedPhrases: 0,
      restructuredSentences: 0,
      appliedRules: 0,
      styleAdjustments: 0,
      flowImprovements: 0
    }
  }

  /**
   * 执行文本改写
   */
  rewrite(): RewriteResult {
    try {
      logger.debug('开始文本改写', { textLength: this.text.length, intensity: this.options.intensity })

      let rewrittenText = this.text

      const antiTemplateBlacklist = getAntiTemplateBlacklist()
      const formulaicBlacklist = getFormulaicExpressionBlacklist()
      const antiTemplatePrompt = buildAntiTemplateConstraintPrompt()

      // 1. 词汇替换
      rewrittenText = this.replaceVocabulary(rewrittenText)

      // 2. 反模板硬约束替换
      rewrittenText = this.applyAntiTemplateConstraints(rewrittenText, antiTemplateBlacklist, formulaicBlacklist)

      // 3. 句式重构
      rewrittenText = this.restructureSentences(rewrittenText)

      // 4. 增加人性化表达
      rewrittenText = this.addHumanization(rewrittenText)

      // 5. 根据强度进行额外处理
      if (this.options.intensity === 'strong') {
        rewrittenText = this.strongRewrite(rewrittenText)
      } else if (this.options.intensity === 'light') {
        rewrittenText = this.lightRewrite(rewrittenText)
      }

      // 6. 后处理
      rewrittenText = this.postProcess(rewrittenText)

      // 更新统计
      this.statistics.rewrittenLength = rewrittenText.length
      this.statistics.appliedRules = this.appliedRules.length

      // 计算保真度分数
      const fidelityScore = this.calculateFidelity(this.text, rewrittenText)

      // 生成改进说明
      const improvements = this.generateImprovements()

      // 计算原创度提升（模拟值，实际应基于AI检测）
      const originalityImprovement = this.calculateOriginalityImprovement()

      // 语义分析
      const semanticAnalysis = this.analyzeSemantics(this.text, rewrittenText)

      const antiTemplateDetection = detectAntiTemplateViolations(rewrittenText)
      const hasAntiTemplateViolations = antiTemplateDetection.totalViolations > 0

      logger.debug('文本改写完成', {
        originalLength: this.statistics.originalLength,
        rewrittenLength: this.statistics.rewrittenLength,
        appliedRules: this.appliedRules.length,
        fidelityScore,
        originalityImprovement
      })

      return {
        rewrittenText,
        appliedRules: this.appliedRules,
        statistics: this.statistics,
        fidelityScore,
        improvements,
        originalityImprovement,
        semanticAnalysis,
        antiTemplateDetection,
        hasAntiTemplateViolations
      }
    } catch (error) {
      logger.error('文本改写失败', error)
      throw new Error('文本改写过程中发生错误: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  /**
   * 词汇替换
   */
  private replaceVocabulary(text: string): string {
    let result = text
    let replacedCount = 0
    const examples: Array<{ original: string; rewritten: string }> = []

    for (const [original, replacements] of Object.entries(VOCABULARY_REPLACEMENTS)) {
      // 跳过需要保留的短语
      if (this.options.preservePhrases?.includes(original)) continue

      const regex = new RegExp(original, 'g')
      const matches = result.match(regex)

      if (matches) {
        // 随机选择一个替换词
        const replacement = replacements[Math.floor(Math.random() * replacements.length)]

        if (replacement !== '') {
          result = result.replace(regex, replacement)
          replacedCount += matches.length

          if (examples.length < 5) {
            examples.push({ original, rewritten: replacement })
          }
        }
      }
    }

    this.statistics.replacedPhrases = replacedCount

    if (replacedCount > 0) {
      this.appliedRules.push({
        name: '词汇替换',
        description: '将AI常用词汇替换为更自然的表达',
        appliedCount: replacedCount,
        examples,
        type: 'vocabulary'
      })
    }

    return result
  }

  private applyAntiTemplateConstraints(text: string, blacklist: string[], formulaicBlacklist: Array<{ expression: string; alternatives: string[]; severity: 'critical' | 'warning' }>): string {
    let result = text
    let replacedCount = 0
    const examples: Array<{ original: string; rewritten: string }> = []

    if (this.options.preservePhrases) {
      for (const phrase of this.options.preservePhrases) {
        const idx = blacklist.indexOf(phrase)
        if (idx !== -1) blacklist.splice(idx, 1)
      }
    }

    for (const word of blacklist) {
      const regex = new RegExp(word, 'g')
      const matches = result.match(regex)
      if (matches && matches.length > 0) {
        result = result.replace(regex, '')
        replacedCount += matches.length
        if (examples.length < 5) {
          examples.push({ original: word, rewritten: '(已删除)' })
        }
      }
    }

    for (const expr of formulaicBlacklist) {
      const regex = new RegExp(expr.expression, 'g')
      const matches = result.match(regex)
      if (matches && matches.length > 0) {
        const replacement = expr.alternatives[Math.floor(Math.random() * expr.alternatives.length)]
        result = result.replace(regex, replacement)
        replacedCount += matches.length
        if (examples.length < 5) {
          examples.push({ original: expr.expression, rewritten: replacement })
        }
      }
    }

    this.statistics.replacedPhrases += replacedCount

    if (replacedCount > 0) {
      this.appliedRules.push({
        name: '反模板硬约束替换',
        description: '根据反模板约束黑名单替换或删除AI模板化表达',
        appliedCount: replacedCount,
        examples,
        type: 'vocabulary'
      })
    }

    return result
  }

  /**
   * 句式重构
   */
  private restructureSentences(text: string): string {
    let result = text
    let restructuredCount = 0
    const examples: Array<{ original: string; rewritten: string }> = []

    // 应用句式转换规则
    for (const rule of SENTENCE_TRANSFORMATIONS) {
      const matches = result.match(rule.pattern)
      if (matches) {
        result = result.replace(rule.pattern, (match, ...args) => {
          const stringArgs = args.filter((arg): arg is string => typeof arg === 'string')
          const transformed = rule.transform(match, ...stringArgs)
          if (transformed !== match && examples.length < 3) {
            examples.push({ original: match, rewritten: transformed })
          }
          return transformed
        })
        restructuredCount += matches.length
      }
    }

    // 变化句子长度
    result = this.varySentenceLength(result)

    this.statistics.restructuredSentences = restructuredCount

    if (restructuredCount > 0) {
      this.appliedRules.push({
        name: '句式重构',
        description: '重构句子结构，增加句式变化',
        appliedCount: restructuredCount,
        examples,
        type: 'structure'
      })
    }

    return result
  }

  /**
   * 变化句子长度
   */
  private varySentenceLength(text: string): string {
    const sentences = text.match(/[^。！？]+[。！？]/g) || []
    if (sentences.length < 5) return text

    let result = text

    // 查找连续的长句并拆分
    for (let i = 0; i < sentences.length - 1; i++) {
      const current = sentences[i]
      const next = sentences[i + 1]

      if (current.length > 30 && next.length > 30) {
        // 拆分当前长句
        const splitPoint = current.indexOf('，', Math.floor(current.length / 2))
        if (splitPoint > 0) {
          const newSentence = current.slice(0, splitPoint) + '。' + current.slice(splitPoint + 1)
          result = result.replace(current, newSentence)
        }
      }
    }

    // 合并过短的句子
    const shortSentencePattern = /([^。！？]{5,15}[。！？])([^。！？]{5,15}[。！？])/g
    result = result.replace(shortSentencePattern, (match, s1, s2) => {
      if (Math.random() > 0.5) {
        return s1.slice(0, -1) + '，' + s2.slice(0, -1) + '。'
      }
      return match
    })

    return result
  }

  /**
   * 增加人性化表达
   */
  private addHumanization(text: string): string {
    let result = text
    let modifiedCount = 0
    const examples: Array<{ original: string; rewritten: string }> = []

    // 应用口语化表达
    for (const item of HUMANIZATION_PATTERNS.colloquialisms) {
      if (Math.random() > 0.7) { // 随机应用，避免过度
        const regex = new RegExp(item.pattern, 'm')
        if (regex.test(result)) {
          const original = result.match(regex)?.[0] || ''
          result = result.replace(regex, item.replacement)
          modifiedCount++
          if (examples.length < 3) {
            examples.push({ original, rewritten: item.replacement })
          }
        }
      }
    }

    // 应用情感词
    for (const item of HUMANIZATION_PATTERNS.emotionalWords) {
      const matches = result.match(item.pattern)
      if (matches && Math.random() > 0.8) {
        const original = matches[0]
        result = result.replace(item.pattern, item.replacement)
        modifiedCount++
        if (examples.length < 3) {
          examples.push({ original, rewritten: item.replacement })
        }
      }
    }

    // 应用感官细节
    for (const item of HUMANIZATION_PATTERNS.sensoryDetails) {
      const matches = result.match(item.pattern)
      if (matches && Math.random() > 0.7) {
        const original = matches[0]
        result = result.replace(item.pattern, item.replacement)
        modifiedCount++
        if (examples.length < 3) {
          examples.push({ original, rewritten: item.replacement })
        }
      }
    }

    // 应用个性化表达
    for (const item of HUMANIZATION_PATTERNS.personalizedExpressions) {
      const regex = new RegExp(item.pattern, 'g')
      const matches = result.match(regex)
      if (matches && Math.random() > 0.6) {
        const original = matches[0]
        result = result.replace(regex, item.replacement)
        modifiedCount++
        if (examples.length < 3) {
          examples.push({ original, rewritten: item.replacement })
        }
      }
    }

    this.statistics.styleAdjustments = modifiedCount

    if (modifiedCount > 0) {
      this.appliedRules.push({
        name: '人性化增强',
        description: '增加口语化、情感化和个性化表达',
        appliedCount: modifiedCount,
        examples,
        type: 'style'
      })
    }

    return result
  }

  /**
   * 轻度改写
   */
  private lightRewrite(text: string): string {
    // 轻度改写：只做最小限度的修改
    return text
  }

  /**
   * 深度改写
   */
  private strongRewrite(text: string): string {
    let result = text

    // 1. 打乱部分句子顺序（在段落内）
    const paragraphs = result.split(/\n\s*\n/)
    const rewrittenParagraphs = paragraphs.map(para => {
      const sentences = para.match(/[^。！？]+[。！？]/g) || []
      if (sentences.length >= 4 && Math.random() > 0.7) {
        // 随机交换相邻句子
        for (let i = 0; i < sentences.length - 1; i += 2) {
          if (Math.random() > 0.5) {
            [sentences[i], sentences[i + 1]] = [sentences[i + 1], sentences[i]]
          }
        }
        return sentences.join('')
      }
      return para
    })

    result = rewrittenParagraphs.join('\n\n')

    // 2. 增加更多变化
    result = this.addVariations(result)

    return result
  }

  /**
   * 增加文本变化
   */
  private addVariations(text: string): string {
    let result = text

    // 替换一些常见表达
    const variations: Record<string, string[]> = {
      '说道': ['说', '开口道', '讲道', '言道'],
      '看着': ['望着', '瞧着', '盯着', '看着'],
      '走了': ['离去', '离开', '走了', '远去'],
      '来了': ['到来', '出现', '来了', '赶到']
    }

    for (const [original, alternatives] of Object.entries(variations)) {
      const regex = new RegExp(original, 'g')
      result = result.replace(regex, () => {
        return alternatives[Math.floor(Math.random() * alternatives.length)]
      })
    }

    return result
  }

  /**
   * 后处理
   */
  private postProcess(text: string): string {
    let result = text

    // 清理多余的空格
    result = result.replace(/  +/g, ' ')

    // 清理重复的标点
    result = result.replace(/，。/g, '。')
    result = result.replace(/。。/g, '。')
    result = result.replace(/，，/g, '，')

    // 确保段落结构
    if (this.options.keepParagraphStructure) {
      result = result.replace(/\n{3,}/g, '\n\n')
    }

    // 修正一些常见的替换错误
    result = result.replace(/是是/g, '是')
    result = result.replace(/的的/g, '的')
    result = result.replace(/了了/g, '了')

    return result.trim()
  }

  /**
   * 计算保真度分数
   */
  private calculateFidelity(original: string, rewritten: string): number {
    // 基于文本相似度计算保真度
    const originalWords = this.extractWords(original)
    const rewrittenWords = this.extractWords(rewritten)

    // 计算共同词汇
    const commonWords = originalWords.filter(w => rewrittenWords.includes(w))
    const similarity = commonWords.length / Math.max(originalWords.length, rewrittenWords.length)

    // 基于长度的变化调整
    const lengthRatio = Math.min(original.length, rewritten.length) / Math.max(original.length, rewritten.length)

    // 综合分数
    const fidelity = Math.round((similarity * 0.6 + lengthRatio * 0.4) * 100)

    return Math.min(100, Math.max(0, fidelity))
  }

  /**
   * 提取词汇
   */
  private extractWords(text: string): string[] {
    // 简单的中文分词：按字符和常见词组提取
    const words: string[] = []
    const cleanText = text.replace(/[，。！？；：""''（）、]/g, ' ')

    // 提取2-4字的词组
    for (let i = 0; i < cleanText.length - 1; i++) {
      for (let len = 2; len <= 4 && i + len <= cleanText.length; len++) {
        const word = cleanText.slice(i, i + len).trim()
        if (word.length >= 2 && !/\s/.test(word)) {
          words.push(word)
        }
      }
    }

    return [...new Set(words)]
  }

  /**
   * 生成改进说明
   */
  private generateImprovements(): string[] {
    const improvements: string[] = []

    for (const rule of this.appliedRules) {
      switch (rule.name) {
        case '词汇替换':
          improvements.push(`替换了 ${rule.appliedCount} 个AI常用词汇，使表达更自然`)
          break
        case '句式重构':
          improvements.push(`重构了 ${rule.appliedCount} 个句子，增加了句式变化`)
          break
        case '人性化增强':
          improvements.push(`增加了 ${rule.appliedCount} 处口语化、情感化和个性化表达`)
          break
      }
    }

    if (this.options.intensity === 'strong') {
      improvements.push('进行了深度改写，大幅提升了文本的自然度和原创度')
    } else if (this.options.intensity === 'light') {
      improvements.push('进行了轻度改写，保留了原文的大部分表达方式')
    }

    if (improvements.length === 0) {
      improvements.push('文本已经较为自然，未进行大幅修改')
    }

    return improvements
  }

  /**
   * 计算原创度提升
   */
  private calculateOriginalityImprovement(): number {
    // 基于应用的规则和强度估算原创度提升
    let improvement = 0

    // 根据应用的规则数量和类型计算
    for (const rule of this.appliedRules) {
      switch (rule.type) {
        case 'vocabulary':
          improvement += rule.appliedCount * 0.5
          break
        case 'structure':
          improvement += rule.appliedCount * 1.2
          break
        case 'style':
          improvement += rule.appliedCount * 0.8
          break
        case 'flow':
          improvement += rule.appliedCount * 0.6
          break
      }
    }

    // 根据强度调整
    if (this.options.intensity === 'strong') {
      improvement *= 1.5
    } else if (this.options.intensity === 'light') {
      improvement *= 0.6
    }

    // 确保在合理范围内
    return Math.min(50, Math.round(improvement))
  }

  /**
   * 语义分析
   */
  private analyzeSemantics(original: string, rewritten: string): {
    preservedMeaning: number
    structuralChanges: number
    vocabularyChanges: number
  } {
    // 计算词汇变化
    const originalWords = original.replace(/[，。！？；：""''（）、]/g, ' ').split(/\s+/).filter(w => w.length > 0)
    const rewrittenWords = rewritten.replace(/[，。！？；：""''（）、]/g, ' ').split(/\s+/).filter(w => w.length > 0)
    
    const commonWords = originalWords.filter(w => rewrittenWords.includes(w))
    const vocabularyChanges = Math.round((1 - commonWords.length / Math.max(originalWords.length, rewrittenWords.length)) * 100)

    // 计算结构变化（基于句子数量差异）
    const originalSentences = original.match(/[^。！？]+[。！？]/g) || []
    const rewrittenSentences = rewritten.match(/[^。！？]+[。！？]/g) || []
    const structuralChanges = Math.round(Math.abs(originalSentences.length - rewrittenSentences.length) / Math.max(originalSentences.length, rewrittenSentences.length) * 100)

    // 计算意义保留度（基于词汇相似度和长度差异）
    const lengthRatio = Math.min(original.length, rewritten.length) / Math.max(original.length, rewritten.length)
    const meaningPreservation = Math.round((commonWords.length / Math.max(originalWords.length, rewrittenWords.length) * 0.7 + lengthRatio * 0.3) * 100)

    return {
      preservedMeaning: meaningPreservation,
      structuralChanges,
      vocabularyChanges
    }
  }

  /**
   * 批量改写
   */
  static batchRewrite(texts: string[], options: RewriteOptions = {}): BatchRewriteResult {
    const startTime = Date.now()
    const results: RewriteResult[] = []
    const errors: string[] = []
    let successCount = 0
    let failedCount = 0

    // 按批次处理
    const batchSize = options.batchSize || 10
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize)
      
      for (const text of batch) {
        try {
          const rewriter = new TextRewriter(text, options)
          const result = rewriter.rewrite()
          results.push(result)
          successCount++
        } catch (error) {
          failedCount++
          errors.push(error instanceof Error ? error.message : '未知错误')
          // 失败时返回原文
          results.push({
            rewrittenText: text,
            appliedRules: [],
            statistics: {
              originalLength: text.length,
              rewrittenLength: text.length,
              replacedPhrases: 0,
              restructuredSentences: 0,
              appliedRules: 0,
              styleAdjustments: 0,
              flowImprovements: 0
            },
            fidelityScore: 100,
            improvements: ['改写失败，返回原文'],
            originalityImprovement: 0,
            semanticAnalysis: {
              preservedMeaning: 100,
              structuralChanges: 0,
              vocabularyChanges: 0
            },
            hasAntiTemplateViolations: false
          })
        }
      }
    }

    // 计算平均原创度提升和平均语义保持度
    const averageOriginalityImprovement = results.reduce((sum, r) => sum + r.originalityImprovement, 0) / results.length
    const averageFidelityScore = results.reduce((sum, r) => sum + r.fidelityScore, 0) / results.length

    return {
      results,
      totalTime: Date.now() - startTime,
      successCount,
      failedCount,
      errors,
      averageOriginalityImprovement: Math.round(averageOriginalityImprovement),
      averageFidelityScore: Math.round(averageFidelityScore)
    }
  }

  /**
   * 基于检测到的特征进行针对性改写
   */
  rewriteBasedOnFeatures(features: DetectedFeature[]): RewriteResult {
    // 根据检测到的特征调整改写策略
    const targetFeatures = features.filter(f => f.severity >= 3)

    if (targetFeatures.length === 0) {
      // 没有严重特征，进行轻度改写
      this.options.intensity = 'light'
    } else if (targetFeatures.length >= 3) {
      // 多个严重特征，进行深度改写
      this.options.intensity = 'strong'
    }

    // 针对特定特征进行额外处理
    for (const feature of targetFeatures) {
      switch (feature.type) {
        case AIFeatureType.EXCESSIVE_ADVERBS:
          // 特别处理过度使用副词的情况
          this.options.preservePhrases = this.options.preservePhrases || []
          break
        case AIFeatureType.FORMULAIC_DIALOGUE:
          // 特别处理公式化对话
          break
        case AIFeatureType.STERILE_LANGUAGE:
          // 特别处理语言生硬
          break
      }
    }

    return this.rewrite()
  }


}

/**
 * 改写单个文本
 */
export function rewriteText(text: string, options: RewriteOptions = {}): RewriteResult {
  const rewriter = new TextRewriter(text, options)
  return rewriter.rewrite()
}

/**
 * 基于特征改写文本
 */
export function rewriteBasedOnFeatures(text: string, features: DetectedFeature[]): RewriteResult {
  const rewriter = new TextRewriter(text)
  return rewriter.rewriteBasedOnFeatures(features)
}

/**
 * 批量改写文本
 */
export function batchRewriteTexts(texts: string[], options: RewriteOptions = {}): BatchRewriteResult {
  return TextRewriter.batchRewrite(texts, options)
}

/**
 * 快速改写 - 轻度改写
 */
export function quickRewrite(text: string): string {
  const rewriter = new TextRewriter(text, { intensity: 'light' })
  return rewriter.rewrite().rewrittenText
}

/**
 * 深度改写
 */
export function deepRewrite(text: string): RewriteResult {
  const rewriter = new TextRewriter(text, { intensity: 'strong' })
  return rewriter.rewrite()
}

export default TextRewriter
