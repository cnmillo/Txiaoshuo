/**
 * 风格优化器
 * 根据小说类型调整语言风格、增加描写细节、优化对话自然度、调整叙事节奏
 */

import logger from '../utils/logger.js'
import type { NovelGenre } from '../types/index.js'
import {
  AI_HIGH_FREQUENCY_WORDS,
  getAIHighFrequencyWordsByCategory,
  type AIHighFrequencyWord
} from '../utils/humanWritingStyle.js'
import {
  detectAntiTemplateViolations,
  getAntiTemplateBlacklist,
  type AntiTemplateDetectionResult
} from '../utils/antiTemplateConstraints.js'

/**
 * 风格优化结果
 */
export interface StyleOptimizationResult {
  /** 优化后的文本 */
  optimizedText: string
  /** 应用的风格调整 */
  appliedStyles: StyleAdjustment[]
  /** 优化统计 */
  statistics: StyleStatistics
  /** 风格评分 */
  styleScore: number
  /** 改进说明 */
  improvements: string[]
  /** AI高频词检测结果 */
  aiHighFrequencyWordDetection?: AntiTemplateDetectionResult
  /** 是否仍有AI高频词违规 */
  hasAIHighFrequencyWordViolations: boolean
}

/**
 * 风格调整
 */
export interface StyleAdjustment {
  /** 调整类型 */
  type: StyleAdjustmentType
  /** 调整描述 */
  description: string
  /** 应用次数 */
  appliedCount: number
  /** 示例 */
  examples: Array<{ original: string; optimized: string }>
}

/**
 * 风格调整类型
 */
export enum StyleAdjustmentType {
  DIALOGUE_OPTIMIZATION = 'dialogue_optimization',
  DESCRIPTION_ENHANCEMENT = 'description_enhancement',
  PACING_ADJUSTMENT = 'pacing_adjustment',
  GENRE_ADAPTATION = 'genre_adaptation',
  EMOTIONAL_DEPTH = 'emotional_depth',
  SENSORY_DETAILS = 'sensory_details',
  SHOW_DONT_TELL = 'show_dont_tell',
  VARIED_SENTENCE_STRUCTURE = 'varied_sentence_structure',
  AI_HIGH_FREQUENCY_WORD_REPLACEMENT = 'ai_high_frequency_word_replacement'
}

/**
 * 风格统计
 */
export interface StyleStatistics {
  /** 原始字符数 */
  originalLength: number
  /** 优化后字符数 */
  optimizedLength: number
  /** 优化的对话数量 */
  optimizedDialogues: number
  /** 增加的描写数量 */
  addedDescriptions: number
  /** 调整的节奏点数量 */
  pacingAdjustments: number
}

/**
 * 风格优化选项
 */
export interface StyleOptimizationOptions {
  /** 小说类型 */
  genre?: NovelGenre
  /** 优化强度 */
  intensity?: 'light' | 'medium' | 'strong'
  /** 重点优化方面 */
  focus?: StyleAdjustmentType[]
  /** 保留作者风格 */
  preserveAuthorStyle?: boolean
  /** 目标读者年龄 */
  targetAudience?: 'young' | 'adult' | 'general'
}

/**
 * 小说类型风格特征
 */
const GENRE_STYLES: Record<NovelGenre, GenreStyle> = {
  fantasy: {
    name: '玄幻',
    characteristics: ['宏大场景', '力量体系', '修炼描写', '战斗场面'],
    commonPhrases: ['灵气', '境界', '功法', '法宝', '天地', '虚空'],
    pacing: 'fast',
    descriptionFocus: 'action'
  },
  wuxia: {
    name: '武侠',
    characteristics: ['江湖气息', '武功招式', '侠义精神', '恩怨情仇'],
    commonPhrases: ['江湖', '武功', '内力', '招式', '门派', '侠义'],
    pacing: 'moderate',
    descriptionFocus: 'action'
  },
  xianxia: {
    name: '仙侠',
    characteristics: ['修仙问道', '法宝飞剑', '洞天福地', '长生大道'],
    commonPhrases: ['修仙', '飞升', '灵根', '丹药', '法宝', '仙缘'],
    pacing: 'moderate',
    descriptionFocus: 'environment'
  },
  romance: {
    name: '言情',
    characteristics: ['细腻情感', '心理描写', '浪漫氛围', '人物关系'],
    commonPhrases: ['心动', '情愫', '温柔', '眷恋', '相思', '情意'],
    pacing: 'slow',
    descriptionFocus: 'emotion'
  },
  scifi: {
    name: '科幻',
    characteristics: ['科技设定', '未来世界', '科学概念', '逻辑严密'],
    commonPhrases: ['科技', '未来', '宇宙', '文明', '智能', '能量'],
    pacing: 'moderate',
    descriptionFocus: 'concept'
  },
  mystery: {
    name: '悬疑',
    characteristics: ['悬念设置', '推理过程', '紧张氛围', '意外反转'],
    commonPhrases: ['谜团', '线索', '真相', '怀疑', '推理', '揭秘'],
    pacing: 'fast',
    descriptionFocus: 'atmosphere'
  },
  history: {
    name: '历史',
    characteristics: ['历史背景', '人物塑造', '时代氛围', '权谋斗争'],
    commonPhrases: ['朝堂', '天下', '江山', '社稷', '权谋', '谋略'],
    pacing: 'moderate',
    descriptionFocus: 'environment'
  },
  urban: {
    name: '都市',
    characteristics: ['现代生活', '职场竞争', '人际关系', '现实问题'],
    commonPhrases: ['城市', '生活', '工作', '梦想', '现实', '奋斗'],
    pacing: 'moderate',
    descriptionFocus: 'emotion'
  },
  game: {
    name: '游戏',
    characteristics: ['游戏设定', '升级系统', '虚拟世界', '竞技对抗'],
    commonPhrases: ['等级', '装备', '技能', '副本', 'BOSS', '经验'],
    pacing: 'fast',
    descriptionFocus: 'action'
  },
  horror: {
    name: '恐怖',
    characteristics: ['恐怖氛围', '心理恐惧', '悬疑惊悚', '未知恐惧'],
    commonPhrases: ['黑暗', '恐惧', '诡异', '阴森', '恐怖', '惊悚'],
    pacing: 'slow',
    descriptionFocus: 'atmosphere'
  },
  military: {
    name: '军事',
    characteristics: ['战争场面', '战术策略', '军人精神', '装备细节'],
    commonPhrases: ['战场', '战术', '指挥', '士兵', '武器', '作战'],
    pacing: 'fast',
    descriptionFocus: 'action'
  },
  general: {
    name: '一般',
    characteristics: ['平实叙述', '清晰表达', '一般描写'],
    commonPhrases: [],
    pacing: 'moderate',
    descriptionFocus: 'balanced'
  }
}

/**
 * 小说类型风格定义
 */
interface GenreStyle {
  name: string
  characteristics: string[]
  commonPhrases: string[]
  pacing: 'slow' | 'moderate' | 'fast'
  descriptionFocus: 'action' | 'emotion' | 'environment' | 'atmosphere' | 'concept' | 'balanced'
}

/**
 * 对话优化规则
 */
const DIALOGUE_RULES = {
  // 对话标签优化
  dialogueTags: [
    { pattern: /([""""])[。，]\s*他\/她说/g, replacement: '$1' },
    { pattern: /([""""])[。，]\s*回答/g, replacement: '$1' },
    { pattern: /([""""])[。，]\s*问道/g, replacement: '$1' }
  ],

  // 增加对话动作
  dialogueActions: [
    '说着，他',
    '说完，他',
    '顿了顿，',
    '沉声道',
    '轻声道',
    '冷笑道',
    '苦笑道'
  ],

  // 对话情感表达
  emotionalExpressions: {
    angry: ['怒吼道', '厉声道', '冷声道', '喝道'],
    sad: ['哽咽道', '低声道', '黯然道', '叹息道'],
    happy: ['笑道', '微笑道', '欣喜道', '兴奋道'],
    surprised: ['惊讶道', '惊叫道', '失声道', '诧异道'],
    thoughtful: ['沉吟道', '思索道', '缓缓道', '若有所思道']
  }
}

// 描写增强模板 - 保留供将来使用
// const DESCRIPTION_TEMPLATES = {
//   // 环境描写
//   environment: [
//     '四周一片{adjective}，只有{sound}在{action}',
//     '空气中弥漫着{smell}，让人感到{feeling}',
//     '{weather}，天空{sky_description}',
//     '远处{distance_description}，近处{close_description}'
//   ],
//
//   // 人物描写
//   character: [
//     '他的{feature}流露出{emotion}',
//     '眼中闪过一丝{emotion}',
//     '嘴角微微{action}，露出{expression}',
//     '整个人散发着{aura}'
//   ],
//
//   // 动作描写
//   action: [
//     '他{adverb}{action}，{result}',
//     '动作{adjective}，仿佛{metaphor}',
//     '每一个{movement}都{description}',
//     '{action}的瞬间，{detail}'
//   ],
//
//   // 心理描写
//   psychology: [
//     '他心里{feeling}，却{action}',
//     '一种{emotion}涌上心头',
//     '脑海中闪过{thought}',
//     '内心深处{deep_feeling}'
//   ]
// }

/**
 * 感官细节词库
 */
const SENSORY_DETAILS = {
  visual: ['明亮', '昏暗', '绚丽', '暗淡', '清晰', '模糊', '鲜艳', '单调'],
  auditory: ['嘈杂', '寂静', '悦耳', '刺耳', '低沉', '高亢', '细微', '洪亮'],
  olfactory: ['清香', '恶臭', '芬芳', '刺鼻', '淡雅', '浓烈', '清新', '沉闷'],
  tactile: ['光滑', '粗糙', '柔软', '坚硬', '温暖', '冰凉', '湿润', '干燥'],
  gustatory: ['甘甜', '苦涩', '酸辣', '咸鲜', '清淡', '浓郁', '爽口', '油腻']
}

// 节奏调整规则 - 保留供将来使用
// const PACING_RULES = {
//   // 快节奏标记
//   fastPacing: ['突然', '瞬间', '立刻', '马上', '立即', '顿时', '骤然'],
//
//   // 慢节奏标记
//   slowPacing: ['缓缓', '慢慢', '渐渐', '徐徐', '逐步', '逐渐', '一点点'],
//
//   // 短句模式（快节奏）
//   shortSentencePatterns: [
//     /^[^，。]{5,15}[。！]/g,
//     /([。！])[\s\n]*([^，。]{3,10}[。！])/g
//   ],
//
//   // 长句模式（慢节奏）
//   longSentencePatterns: [
//     /([^，。]{20,40}，[^，。]{20,40}[。])/g
//   ]
// }

/**
 * 风格优化器类
 */
export class StyleOptimizer {
  private text: string
  private options: StyleOptimizationOptions
  private appliedStyles: StyleAdjustment[] = []
  private statistics: StyleStatistics

  constructor(text: string, options: StyleOptimizationOptions = {}) {
    this.text = text
    this.options = {
      intensity: 'medium',
      preserveAuthorStyle: true,
      targetAudience: 'general',
      ...options
    }
    this.statistics = {
      originalLength: text.length,
      optimizedLength: 0,
      optimizedDialogues: 0,
      addedDescriptions: 0,
      pacingAdjustments: 0
    }
  }

  /**
   * 执行风格优化
   */
  optimize(): StyleOptimizationResult {
    try {
      logger.debug('开始风格优化', { textLength: this.text.length, genre: this.options.genre })

      let optimizedText = this.text

      // 1. 对话优化
      if (this.shouldApplyStyle(StyleAdjustmentType.DIALOGUE_OPTIMIZATION)) {
        optimizedText = this.optimizeDialogue(optimizedText)
      }

      // 2. 描写增强
      if (this.shouldApplyStyle(StyleAdjustmentType.DESCRIPTION_ENHANCEMENT)) {
        optimizedText = this.enhanceDescriptions(optimizedText)
      }

      // 3. 节奏调整
      if (this.shouldApplyStyle(StyleAdjustmentType.PACING_ADJUSTMENT)) {
        optimizedText = this.adjustPacing(optimizedText)
      }

      // 4. 类型适配
      if (this.options.genre && this.shouldApplyStyle(StyleAdjustmentType.GENRE_ADAPTATION)) {
        optimizedText = this.adaptToGenre(optimizedText, this.options.genre)
      }

      // 5. 情感深度
      if (this.shouldApplyStyle(StyleAdjustmentType.EMOTIONAL_DEPTH)) {
        optimizedText = this.enhanceEmotionalDepth(optimizedText)
      }

      // 6. 感官细节
      if (this.shouldApplyStyle(StyleAdjustmentType.SENSORY_DETAILS)) {
        optimizedText = this.addSensoryDetails(optimizedText)
      }

      // 7. 展示而非讲述
      if (this.shouldApplyStyle(StyleAdjustmentType.SHOW_DONT_TELL)) {
        optimizedText = this.applyShowDontTell(optimizedText)
      }

      // 8. 句式变化
      if (this.shouldApplyStyle(StyleAdjustmentType.VARIED_SENTENCE_STRUCTURE)) {
        optimizedText = this.varySentenceStructure(optimizedText)
      }

      // 9. AI高频词替换
      if (this.shouldApplyStyle(StyleAdjustmentType.AI_HIGH_FREQUENCY_WORD_REPLACEMENT)) {
        optimizedText = this.replaceAIHighFrequencyWords(optimizedText)
      }

      // 后处理
      optimizedText = this.postProcess(optimizedText)

      // 更新统计
      this.statistics.optimizedLength = optimizedText.length

      // 计算风格评分
      const styleScore = this.calculateStyleScore(optimizedText)

      // 生成改进说明
      const improvements = this.generateImprovements()

      const aiHighFrequencyWordDetection = detectAntiTemplateViolations(optimizedText)
      const hasAIHighFrequencyWordViolations = aiHighFrequencyWordDetection.totalViolations > 0

      logger.debug('风格优化完成', {
        originalLength: this.statistics.originalLength,
        optimizedLength: this.statistics.optimizedLength,
        appliedStyles: this.appliedStyles.length
      })

      return {
        optimizedText,
        appliedStyles: this.appliedStyles,
        statistics: this.statistics,
        styleScore,
        improvements,
        aiHighFrequencyWordDetection,
        hasAIHighFrequencyWordViolations
      }
    } catch (error) {
      logger.error('风格优化失败', error)
      throw new Error('风格优化过程中发生错误: ' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  /**
   * 检查是否应该应用某种风格调整
   */
  private shouldApplyStyle(type: StyleAdjustmentType): boolean {
    if (this.options.focus) {
      return this.options.focus.includes(type)
    }
    // 默认应用所有风格调整
    return true
  }

  /**
   * 优化对话
   */
  private optimizeDialogue(text: string): string {
    let result = text
    let optimizedCount = 0
    const examples: Array<{ original: string; optimized: string }> = []

    // 1. 优化对话标签
    for (const rule of DIALOGUE_RULES.dialogueTags) {
      const matches = result.match(rule.pattern)
      if (matches) {
        result = result.replace(rule.pattern, rule.replacement)
        optimizedCount += matches.length
      }
    }

    // 2. 为简单对话增加动作描写
    const simpleDialoguePattern = /([""""][^""""]+[""""])\s*他\/她说[道|]/g
    result = result.replace(simpleDialoguePattern, (match, dialogue) => {
      if (Math.random() > 0.5) {
        optimizedCount++
        const action = DIALOGUE_RULES.dialogueActions[Math.floor(Math.random() * DIALOGUE_RULES.dialogueActions.length)]
        const newText = `${dialogue}${action}`
        if (examples.length < 3) {
          examples.push({ original: match, optimized: newText })
        }
        return newText
      }
      return match
    })

    // 3. 根据上下文增加情感表达
    const emotionalPattern = /([""""][^""""]*[！？][""""])\s*他\/她说/g
    result = result.replace(emotionalPattern, (match, dialogue) => {
      let emotion = 'thoughtful'
      if (dialogue.includes('！')) emotion = 'angry'
      else if (dialogue.includes('？')) emotion = 'surprised'

      const expressions = DIALOGUE_RULES.emotionalExpressions[emotion as keyof typeof DIALOGUE_RULES.emotionalExpressions]
      const expression = expressions[Math.floor(Math.random() * expressions.length)]

      optimizedCount++
      const newText = `${dialogue}${expression}`
      if (examples.length < 3) {
        examples.push({ original: match, optimized: newText })
      }
      return newText
    })

    this.statistics.optimizedDialogues = optimizedCount

    if (optimizedCount > 0) {
      this.appliedStyles.push({
        type: StyleAdjustmentType.DIALOGUE_OPTIMIZATION,
        description: '优化对话表达，增加动作和情感描写',
        appliedCount: optimizedCount,
        examples
      })
    }

    return result
  }

  /**
   * 增强描写
   */
  private enhanceDescriptions(text: string): string {
    let result = text
    let addedCount = 0
    const examples: Array<{ original: string; optimized: string }> = []

    // 1. 为简单叙述增加环境描写
    const simpleNarrationPattern = /([^。！？]{10,20}[。])/g
    result = result.replace(simpleNarrationPattern, (match) => {
      if (Math.random() > 0.9 && addedCount < 5) {
        addedCount++
        // 简单地在句末增加一些描写
        const enhancements = [
          '四周一片寂静。',
          '空气中弥漫着紧张的气氛。',
          '阳光透过窗户洒进来。',
          '远处传来隐约的声响。'
        ]
        const enhancement = enhancements[Math.floor(Math.random() * enhancements.length)]
        const newText = match + enhancement
        if (examples.length < 3) {
          examples.push({ original: match, optimized: newText })
        }
        return newText
      }
      return match
    })

    // 2. 增强人物外貌描写
    const appearancePattern = /([他她])长得/g
    result = result.replace(appearancePattern, (match, pronoun) => {
      addedCount++
      return `${pronoun}有着${this.getRandomDescription('appearance')}，长得`
    })

    // 3. 增强动作描写
    const actionPattern = /([他她])(走|跑|站|坐|看)/g
    result = result.replace(actionPattern, (match, pronoun, action) => {
      if (Math.random() > 0.7) {
        addedCount++
        const adverbs: Record<string, string[]> = {
          '走': ['缓缓地', '快步', '轻轻地', '坚定地'],
          '跑': ['飞快地', '拼命地', '急匆匆地', '撒腿'],
          '站': ['笔直地', '静静地', '傲然', '颓然'],
          '坐': ['慢慢地', '重重地', '随意地', '端正地'],
          '看': ['仔细', '目不转睛地', '淡淡地', '深情地']
        }
        const adverb = adverbs[action]?.[Math.floor(Math.random() * 4)] || ''
        return `${pronoun}${adverb}${action}`
      }
      return match
    })

    this.statistics.addedDescriptions = addedCount

    if (addedCount > 0) {
      this.appliedStyles.push({
        type: StyleAdjustmentType.DESCRIPTION_ENHANCEMENT,
        description: '增强环境、人物和动作描写',
        appliedCount: addedCount,
        examples
      })
    }

    return result
  }

  /**
   * 调整叙事节奏
   */
  private adjustPacing(text: string): string {
    let result = text
    let adjustedCount = 0
    const examples: Array<{ original: string; optimized: string }> = []

    const genreStyle = this.options.genre ? GENRE_STYLES[this.options.genre] : null
    const targetPacing = genreStyle?.pacing || 'moderate'

    if (targetPacing === 'fast') {
      // 加快节奏：将长句拆分，增加短句
      const longSentencePattern = /([^，。]{30,50}，[^，。]{30,50}[。])/g
      result = result.replace(longSentencePattern, (match) => {
        if (Math.random() > 0.5) {
          adjustedCount++
          const newText = match.replace(/，/g, '。').replace(/。$/g, '。')
          if (examples.length < 3) {
            examples.push({ original: match, optimized: newText })
          }
          return newText
        }
        return match
      })
    } else if (targetPacing === 'slow') {
      // 放慢节奏：增加描写和细节
      const shortSentencePattern = /([^，。]{5,15}[。])/g
      result = result.replace(shortSentencePattern, (match) => {
        if (Math.random() > 0.8) {
          adjustedCount++
          const newText = match.slice(0, -1) + '，' + this.getRandomDescription('detail') + '。'
          if (examples.length < 3) {
            examples.push({ original: match, optimized: newText })
          }
          return newText
        }
        return match
      })
    }

    this.statistics.pacingAdjustments = adjustedCount

    if (adjustedCount > 0) {
      this.appliedStyles.push({
        type: StyleAdjustmentType.PACING_ADJUSTMENT,
        description: `调整叙事节奏为${targetPacing === 'fast' ? '快节奏' : targetPacing === 'slow' ? '慢节奏' : '适中节奏'}`,
        appliedCount: adjustedCount,
        examples
      })
    }

    return result
  }

  /**
   * 适配小说类型
   */
  private adaptToGenre(text: string, genre: NovelGenre): string {
    let result = text
    const genreStyle = GENRE_STYLES[genre]

    if (!genreStyle) return result

    let adaptedCount = 0
    const examples: Array<{ original: string; optimized: string }> = []

    // 1. 增加类型特色词汇
    if (genreStyle.commonPhrases.length > 0) {
      const paragraphs = result.split(/\n\s*\n/)
      const adaptedParagraphs = paragraphs.map(para => {
        if (Math.random() > 0.8 && adaptedCount < 3) {
          const phrase = genreStyle.commonPhrases[Math.floor(Math.random() * genreStyle.commonPhrases.length)]
          adaptedCount++
          return para + `空气中仿佛弥漫着${phrase}的气息。`
        }
        return para
      })
      result = adaptedParagraphs.join('\n\n')
    }

    // 2. 根据类型调整描写重点
    switch (genreStyle.descriptionFocus) {
      case 'action':
        result = this.enhanceActionDescriptions(result)
        break
      case 'emotion':
        result = this.enhanceEmotionalDescriptions(result)
        break
      case 'environment':
        result = this.enhanceEnvironmentDescriptions(result)
        break
      case 'atmosphere':
        result = this.enhanceAtmosphereDescriptions(result)
        break
    }

    if (adaptedCount > 0 || genreStyle.descriptionFocus !== 'balanced') {
      this.appliedStyles.push({
        type: StyleAdjustmentType.GENRE_ADAPTATION,
        description: `适配${genreStyle.name}类型风格，增加类型特色元素`,
        appliedCount: adaptedCount + 1,
        examples
      })
    }

    return result
  }

  /**
   * 增强情感深度
   */
  private enhanceEmotionalDepth(text: string): string {
    let result = text
    let enhancedCount = 0
    const examples: Array<{ original: string; optimized: string }> = []

    // 1. 将简单的情感词改为更具体的表达
    const simpleEmotions: Record<string, string[]> = {
      '高兴': ['欣喜若狂', '心花怒放', '喜上眉梢', '眉开眼笑'],
      '难过': ['心如刀割', '悲痛欲绝', '黯然神伤', '愁肠百结'],
      '生气': ['怒不可遏', '火冒三丈', '咬牙切齿', '愤愤不平'],
      '害怕': ['心惊胆战', '毛骨悚然', '惶恐不安', '战战兢兢'],
      '惊讶': ['目瞪口呆', '大吃一惊', '瞠目结舌', '难以置信']
    }

    for (const [simple, complex] of Object.entries(simpleEmotions)) {
      const pattern = new RegExp(simple, 'g')
      result = result.replace(pattern, () => {
        if (Math.random() > 0.7) {
          enhancedCount++
          return complex[Math.floor(Math.random() * complex.length)]
        }
        return simple
      })
    }

    // 2. 增加内心独白
    const actionPattern = /([他她])(决定|想|觉得)[^，。]{3,10}[，。]/g
    result = result.replace(actionPattern, (match, pronoun: string) => {
      if (Math.random() > 0.9 && enhancedCount < 5) {
        enhancedCount++
        const thoughts = [
          `${pronoun}心里暗暗思索。`,
          `${pronoun}心中百感交集。`,
          `${pronoun}内心深处涌起复杂的情绪。`
        ]
        const thought = thoughts[Math.floor(Math.random() * thoughts.length)]
        const newText = match + thought
        if (examples.length < 3) {
          examples.push({ original: match, optimized: newText })
        }
        return newText
      }
      return match
    })

    if (enhancedCount > 0) {
      this.appliedStyles.push({
        type: StyleAdjustmentType.EMOTIONAL_DEPTH,
        description: '增强情感描写的深度和层次',
        appliedCount: enhancedCount,
        examples
      })
    }

    return result
  }

  /**
   * 增加感官细节
   */
  private addSensoryDetails(text: string): string {
    let result = text
    let addedCount = 0
    const examples: Array<{ original: string; optimized: string }> = []

    // 在适当位置增加感官描写
    const sentenceEndPattern = /([^。！？]{15,30}[。])/g
    result = result.replace(sentenceEndPattern, (match) => {
      if (Math.random() > 0.9 && addedCount < 3) {
        addedCount++
        const senses = Object.values(SENSORY_DETAILS)
        const randomSense = senses[Math.floor(Math.random() * senses.length)]
        const detail = randomSense[Math.floor(Math.random() * randomSense.length)]
        const newText = match + `周围一片${detail}。`
        if (examples.length < 3) {
          examples.push({ original: match, optimized: newText })
        }
        return newText
      }
      return match
    })

    if (addedCount > 0) {
      this.appliedStyles.push({
        type: StyleAdjustmentType.SENSORY_DETAILS,
        description: '增加视觉、听觉、嗅觉等感官细节描写',
        appliedCount: addedCount,
        examples
      })
    }

    return result
  }

  /**
   * 应用"展示而非讲述"原则
   */
  private applyShowDontTell(text: string): string {
    let result = text
    let appliedCount = 0
    const examples: Array<{ original: string; optimized: string }> = []

    // 将讲述改为展示
    const tellPatterns: Record<string, string[]> = {
      '他很生气': ['他脸色铁青，双拳紧握', '他眼中燃烧着怒火', '他咬牙切齿，浑身颤抖'],
      '她很高兴': ['她嘴角上扬，眼睛弯成了月牙', '她脸上洋溢着灿烂的笑容', '她忍不住笑出声来'],
      '他很紧张': ['他手心冒汗，不停地搓着手', '他坐立不安，目光游移', '他深吸一口气，努力让自己镇定'],
      '她很伤心': ['她眼眶泛红，泪水在眼中打转', '她低下头，肩膀微微颤抖', '她用手捂住嘴，不让自己哭出声']
    }

    for (const [tell, shows] of Object.entries(tellPatterns)) {
      const pattern = new RegExp(tell, 'g')
      result = result.replace(pattern, () => {
        appliedCount++
        const show = shows[Math.floor(Math.random() * shows.length)]
        if (examples.length < 3) {
          examples.push({ original: tell, optimized: show })
        }
        return show
      })
    }

    if (appliedCount > 0) {
      this.appliedStyles.push({
        type: StyleAdjustmentType.SHOW_DONT_TELL,
        description: '将直接讲述改为间接展示，增强画面感',
        appliedCount,
        examples
      })
    }

    return result
  }

  /**
   * 变化句式结构
   */
  private varySentenceStructure(text: string): string {
    let result = text
    let variedCount = 0
    const examples: Array<{ original: string; optimized: string }> = []

    // 1. 变化句子开头
    const repetitiveStartPattern = /^([他她它][^，]{3,8}，[他她它])/gm
    result = result.replace(repetitiveStartPattern, (match) => {
      if (Math.random() > 0.5) {
        variedCount++
        const alternatives = ['与此同时，', '这时，', '此刻，', '紧接着，']
        const alt = alternatives[Math.floor(Math.random() * alternatives.length)]
        const newText = alt + match
        if (examples.length < 3) {
          examples.push({ original: match, optimized: newText })
        }
        return newText
      }
      return match
    })

    // 2. 将一些陈述句改为反问句或感叹句
    const statementPattern = /([^。！？]{10,20}是[^。！？]{5,10}。[^\n])/g
    result = result.replace(statementPattern, (match, next) => {
      if (Math.random() > 0.95 && variedCount < 3) {
        variedCount++
        return match.slice(0, -1) + '！' + next
      }
      return match
    })

    if (variedCount > 0) {
      this.appliedStyles.push({
        type: StyleAdjustmentType.VARIED_SENTENCE_STRUCTURE,
        description: '变化句式结构，避免单调',
        appliedCount: variedCount,
        examples
      })
    }

    return result
  }

  private replaceAIHighFrequencyWords(text: string): string {
    let result = text
    let replacedCount = 0
    const examples: Array<{ original: string; optimized: string }> = []

    for (const category of AI_HIGH_FREQUENCY_WORDS) {
      for (const word of category.words) {
        const regex = new RegExp(word, 'g')
        const matches = result.match(regex)
        if (matches && matches.length > category.maxOccurrences) {
          if (category.alternatives.length > 0) {
            const replacement = category.alternatives[Math.floor(Math.random() * category.alternatives.length)]
            result = result.replace(regex, replacement)
            replacedCount += matches.length
            if (examples.length < 5) {
              examples.push({ original: word, optimized: replacement })
            }
          } else {
            result = result.replace(regex, '')
            replacedCount += matches.length
            if (examples.length < 5) {
              examples.push({ original: word, optimized: '(已删除)' })
            }
          }
        }
      }
    }

    const blacklist = getAntiTemplateBlacklist()
    for (const word of blacklist) {
      const regex = new RegExp(word, 'g')
      const matches = result.match(regex)
      if (matches && matches.length > 0) {
        result = result.replace(regex, '')
        replacedCount += matches.length
        if (examples.length < 5) {
          examples.push({ original: word, optimized: '(已删除)' })
        }
      }
    }

    if (replacedCount > 0) {
      this.appliedStyles.push({
        type: StyleAdjustmentType.AI_HIGH_FREQUENCY_WORD_REPLACEMENT,
        description: '替换AI高频词和黑名单词汇，消除AI写作痕迹',
        appliedCount: replacedCount,
        examples
      })
    }

    return result
  }

  /**
   * 增强动作描写
   */
  private enhanceActionDescriptions(text: string): string {
    // 增加动作细节
    return text.replace(/([他她])(打|踢|挥|刺)[^，。]{0,5}/g, (match, pronoun, action) => {
      const details: Record<string, string[]> = {
        '打': ['迅猛', '凌厉', '势大力沉', '快如闪电'],
        '踢': ['凌厉', '狠辣', '精准', '势如破竹'],
        '挥': ['潇洒', '从容', '随意', '举重若轻'],
        '刺': ['迅疾', '狠辣', '精准', '直取要害']
      }
      const detail = details[action]?.[Math.floor(Math.random() * 4)] || ''
      return match + `，动作${detail}`
    })
  }

  /**
   * 增强情感描写
   */
  private enhanceEmotionalDescriptions(text: string): string {
    // 增加情感细节
    return text.replace(/([他她])(爱|恨|想|念)[^，。]{0,5}/g, (match) => {
      const details = ['深深地', '由衷地', '无法抑制地', '默默地']
      const detail = details[Math.floor(Math.random() * 4)]
      return match.replace(/([爱恨想念])/, `${detail}$1`)
    })
  }

  /**
   * 增强环境描写
   */
  private enhanceEnvironmentDescriptions(text: string): string {
    // 增加环境氛围
    const paragraphs = text.split(/\n\s*\n/)
    return paragraphs.map(para => {
      if (Math.random() > 0.9) {
        const environments = [
          '四周一片宁静，只有微风轻轻拂过。',
          '远处山峦起伏，云雾缭绕其间。',
          '阳光透过树叶的缝隙洒落下来。',
          '夜空中繁星点点，月光如水般倾泻。'
        ]
        return para + environments[Math.floor(Math.random() * 4)]
      }
      return para
    }).join('\n\n')
  }

  /**
   * 增强氛围描写
   */
  private enhanceAtmosphereDescriptions(text: string): string {
    // 增加氛围渲染
    const paragraphs = text.split(/\n\s*\n/)
    return paragraphs.map(para => {
      if (Math.random() > 0.9) {
        const atmospheres = [
          '空气中弥漫着一种说不出的压抑感。',
          '四周静得可怕，仿佛连呼吸声都清晰可闻。',
          '一种莫名的不安在心底蔓延开来。',
          '黑暗中仿佛有无数双眼睛在窥视着。'
        ]
        return para + atmospheres[Math.floor(Math.random() * 4)]
      }
      return para
    }).join('\n\n')
  }

  /**
   * 获取随机描写
   */
  private getRandomDescription(type: string): string {
    const descriptions: Record<string, string[]> = {
      appearance: ['英俊的面容', '清秀的五官', '坚毅的脸庞', '柔和的线条'],
      detail: ['细节之处见真章', '每一个细微之处都值得关注', '细微之处蕴含着深意', '细节往往决定成败']
    }
    const typeDescriptions = descriptions[type] || ['独特的气质']
    return typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)]
  }

  /**
   * 后处理
   */
  private postProcess(text: string): string {
    let result = text

    // 清理重复标点
    result = result.replace(/，。/g, '。')
    result = result.replace(/。。/g, '。')
    result = result.replace(/，，/g, '，')
    result = result.replace(/。。。/g, '……')

    // 清理多余空格
    result = result.replace(/  +/g, ' ')

    // 确保段落间距
    result = result.replace(/\n{3,}/g, '\n\n')

    return result.trim()
  }

  /**
   * 计算风格评分
   */
  private calculateStyleScore(text: string): number {
    let score = 70 // 基础分

    // 根据应用的风格调整数量加分
    score += this.appliedStyles.length * 3

    // 根据描写丰富度加分
    const descriptionCount = (text.match(/[，。][^，。]{10,30}[，。]/g) || []).length
    score += Math.min(10, descriptionCount / 5)

    // 根据对话质量加分
    const dialogueCount = (text.match(/[""""]/g) || []).length / 2
    if (dialogueCount > 0) {
      score += Math.min(10, dialogueCount)
    }

    return Math.min(100, Math.round(score))
  }

  /**
   * 生成改进说明
   */
  private generateImprovements(): string[] {
    const improvements: string[] = []

    for (const style of this.appliedStyles) {
      switch (style.type) {
        case StyleAdjustmentType.DIALOGUE_OPTIMIZATION:
          improvements.push(`优化了 ${style.appliedCount} 处对话，增加了动作和情感表达`)
          break
        case StyleAdjustmentType.DESCRIPTION_ENHANCEMENT:
          improvements.push(`增强了 ${style.appliedCount} 处描写，丰富了细节层次`)
          break
        case StyleAdjustmentType.PACING_ADJUSTMENT:
          improvements.push(`调整了 ${style.appliedCount} 处叙事节奏`)
          break
        case StyleAdjustmentType.GENRE_ADAPTATION:
          improvements.push(`适配了小说类型风格，增加了类型特色元素`)
          break
        case StyleAdjustmentType.EMOTIONAL_DEPTH:
          improvements.push(`深化了 ${style.appliedCount} 处情感描写`)
          break
        case StyleAdjustmentType.SENSORY_DETAILS:
          improvements.push(`增加了 ${style.appliedCount} 处感官细节`)
          break
        case StyleAdjustmentType.SHOW_DONT_TELL:
          improvements.push(`将 ${style.appliedCount} 处讲述改为展示，增强画面感`)
          break
        case StyleAdjustmentType.VARIED_SENTENCE_STRUCTURE:
          improvements.push(`变化了 ${style.appliedCount} 处句式结构`)
          break
        case StyleAdjustmentType.AI_HIGH_FREQUENCY_WORD_REPLACEMENT:
          improvements.push(`替换了 ${style.appliedCount} 个AI高频词和黑名单词汇`)
          break
      }
    }

    if (improvements.length === 0) {
      improvements.push('文本风格已经较为完善，未进行大幅调整')
    }

    return improvements
  }

  /**
   * 批量优化
   */
  static batchOptimize(texts: string[], options: StyleOptimizationOptions = {}): StyleOptimizationResult[] {
    return texts.map(text => {
      const optimizer = new StyleOptimizer(text, options)
      return optimizer.optimize()
    })
  }
}

/**
 * 优化单个文本的风格
 */
export function optimizeStyle(text: string, options: StyleOptimizationOptions = {}): StyleOptimizationResult {
  const optimizer = new StyleOptimizer(text, options)
  return optimizer.optimize()
}

/**
   * 批量优化文本风格
 */
export function batchOptimizeStyle(texts: string[], options: StyleOptimizationOptions = {}): StyleOptimizationResult[] {
  return StyleOptimizer.batchOptimize(texts, options)
}

/**
 * 根据小说类型优化
 */
export function optimizeForGenre(text: string, genre: NovelGenre): StyleOptimizationResult {
  const optimizer = new StyleOptimizer(text, { genre, intensity: 'medium' })
  return optimizer.optimize()
}

/**
 * 快速风格优化
 */
export function quickStyleOptimize(text: string): string {
  const optimizer = new StyleOptimizer(text, { intensity: 'light' })
  return optimizer.optimize().optimizedText
}

export default StyleOptimizer
