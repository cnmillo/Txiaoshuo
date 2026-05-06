import {
  AI_HIGH_FREQUENCY_WORDS,
  getAllStandardWordsToAvoid,
  type AIHighFrequencyWord
} from './humanWritingStyle.js'

export interface AntiTemplateViolation {
  type: 'high_frequency_word' | 'standard_word' | 'template_pattern' | 'formulaic_expression'
  category: string
  word: string
  count: number
  maxAllowed: number
  severity: 'critical' | 'warning' | 'info'
  alternatives: string[]
}

export interface AntiTemplateDetectionResult {
  violations: AntiTemplateViolation[]
  totalViolations: number
  criticalCount: number
  warningCount: number
  score: number
  summary: string
}

const TEMPLATE_PATTERNS: Array<{
  name: string
  pattern: RegExp
  description: string
  severity: 'critical' | 'warning'
}> = [
  {
    name: '首先其次最后',
    pattern: /首先[^。]{0,50}其次[^。]{0,50}最后/g,
    description: '首先-其次-最后结构',
    severity: 'critical'
  },
  {
    name: '综上所述总而言之',
    pattern: /(综上所述|总而言之|总的来说)[^。]{0,30}/g,
    description: '总结性模板表达',
    severity: 'critical'
  },
  {
    name: '值得注意的是',
    pattern: /(值得注意的是|需要指出的是|不可否认的是|不容忽视的是)[^。]{0,30}/g,
    description: 'AI引导性表达',
    severity: 'critical'
  },
  {
    name: '不仅而且',
    pattern: /不仅[^。]{0,30}而且/g,
    description: '不仅-而且模板结构',
    severity: 'warning'
  },
  {
    name: '随着发展',
    pattern: /随着[^。]{0,15}的(发展|进步|变化|提升)[，。]/g,
    description: '随着...的发展模板',
    severity: 'warning'
  },
  {
    name: '在背景下',
    pattern: /在[^。]{0,15}的背景下/g,
    description: '在...背景下模板',
    severity: 'warning'
  },
  {
    name: '发挥了关键作用',
    pattern: /(发挥了?关键作用|产生了?深远影响|具有?重要意义|起到?了?重要作用)/g,
    description: '空洞评价性表达',
    severity: 'critical'
  }
]

const FORMULAIC_EXPRESSIONS: Array<{
  expression: string
  pattern: RegExp
  severity: 'critical' | 'warning'
  alternatives: string[]
}> = [
  {
    expression: '不可否认',
    pattern: /不可否认/g,
    severity: 'warning',
    alternatives: ['确实', '没错', '说真的']
  },
  {
    expression: '毋庸置疑',
    pattern: /毋庸置疑/g,
    severity: 'warning',
    alternatives: ['肯定', '当然', '那是自然']
  },
  {
    expression: '显而易见',
    pattern: /显而易见/g,
    severity: 'warning',
    alternatives: ['明摆着', '谁都看得出来', '一看就知道']
  },
  {
    expression: '众所周知',
    pattern: /众所周知/g,
    severity: 'warning',
    alternatives: ['大家都知道', '谁不知道', '人人都晓得']
  },
  {
    expression: '一言以蔽之',
    pattern: /一言以蔽之/g,
    severity: 'critical',
    alternatives: ['一句话', '说到底', '总之']
  },
  {
    expression: '从这个角度来看',
    pattern: /从这个角度(来看|来说|而言)/g,
    severity: 'warning',
    alternatives: ['这么看', '往这面想', '这么一琢磨']
  },
  {
    expression: '基于以上分析',
    pattern: /基于以上(分析|讨论|研究)/g,
    severity: 'critical',
    alternatives: ['说到底', '这么看来', '折腾了半天']
  },
  {
    expression: '由此可见',
    pattern: /由此可见/g,
    severity: 'warning',
    alternatives: ['可见', '这就看得出来', '明摆着嘛']
  }
]

export function detectAntiTemplateViolations(text: string): AntiTemplateDetectionResult {
  const violations: AntiTemplateViolation[] = []

  for (const category of AI_HIGH_FREQUENCY_WORDS) {
    for (const word of category.words) {
      const regex = new RegExp(word, 'g')
      const matches = text.match(regex)
      const count = matches ? matches.length : 0
      if (count > category.maxOccurrences) {
        violations.push({
          type: 'high_frequency_word',
          category: category.category,
          word,
          count,
          maxAllowed: category.maxOccurrences,
          severity: count > category.maxOccurrences + 2 ? 'critical' : 'warning',
          alternatives: category.alternatives
        })
      }
    }
  }

  const standardWords = getAllStandardWordsToAvoid()
  for (const word of standardWords) {
    const regex = new RegExp(word, 'g')
    const matches = text.match(regex)
    const count = matches ? matches.length : 0
    if (count > 0) {
      violations.push({
        type: 'standard_word',
        category: 'standard_word',
        word,
        count,
        maxAllowed: 0,
        severity: count >= 3 ? 'critical' : 'warning',
        alternatives: []
      })
    }
  }

  for (const template of TEMPLATE_PATTERNS) {
    const matches = text.match(template.pattern)
    if (matches && matches.length > 0) {
      violations.push({
        type: 'template_pattern',
        category: template.name,
        word: matches[0],
        count: matches.length,
        maxAllowed: 0,
        severity: template.severity,
        alternatives: []
      })
    }
  }

  for (const expr of FORMULAIC_EXPRESSIONS) {
    const matches = text.match(expr.pattern)
    if (matches && matches.length > 0) {
      violations.push({
        type: 'formulaic_expression',
        category: 'formulaic',
        word: expr.expression,
        count: matches.length,
        maxAllowed: 0,
        severity: expr.severity,
        alternatives: expr.alternatives
      })
    }
  }

  const criticalCount = violations.filter(v => v.severity === 'critical').length
  const warningCount = violations.filter(v => v.severity === 'warning').length
  const totalViolations = violations.length

  let score = 100
  score -= criticalCount * 10
  score -= warningCount * 3
  score = Math.max(0, Math.min(100, score))

  let summary = ''
  if (totalViolations === 0) {
    summary = '未检测到反模板约束违规'
  } else {
    const parts: string[] = []
    if (criticalCount > 0) parts.push(`${criticalCount}个严重违规`)
    if (warningCount > 0) parts.push(`${warningCount}个警告`)
    summary = `检测到${parts.join('，')}，共${totalViolations}处违规`
  }

  return {
    violations,
    totalViolations,
    criticalCount,
    warningCount,
    score,
    summary
  }
}

export function getAntiTemplateBlacklist(): string[] {
  const words: string[] = []
  for (const category of AI_HIGH_FREQUENCY_WORDS) {
    words.push(...category.words)
  }
  words.push(...getAllStandardWordsToAvoid())
  return Array.from(new Set(words))
}

export function getFormulaicExpressionBlacklist(): Array<{
  expression: string
  alternatives: string[]
  severity: 'critical' | 'warning'
}> {
  return FORMULAIC_EXPRESSIONS.map(expr => ({
    expression: expr.expression,
    alternatives: expr.alternatives,
    severity: expr.severity
  }))
}

export function getTemplatePatternBlacklist(): Array<{
  name: string
  description: string
  severity: 'critical' | 'warning'
}> {
  return TEMPLATE_PATTERNS.map(p => ({
    name: p.name,
    description: p.description,
    severity: p.severity
  }))
}

export function buildAntiTemplateConstraintPrompt(): string {
  const highFreqSections = AI_HIGH_FREQUENCY_WORDS.map(category => {
    const wordsList = category.words.join('、')
    const alternatives = category.alternatives.join('、')
    return `${category.description}\n禁用词：${wordsList}\n替代方案：${alternatives}\n最大允许次数：${category.maxOccurrences}`
  }).join('\n\n')

  const standardWords = getAllStandardWordsToAvoid()
  const standardWordsList = standardWords.slice(0, 30).join('、')

  const templateSections = TEMPLATE_PATTERNS.map(p =>
    `${p.name}（${p.severity === 'critical' ? '严重' : '警告'}）：${p.description}`
  ).join('\n')

  const formulaicSections = FORMULAIC_EXPRESSIONS.map(expr =>
    `${expr.expression} → 替代：${expr.alternatives.join('、')}（${expr.severity === 'critical' ? '严重' : '警告'}）`
  ).join('\n')

  return `【反模板硬约束规则】

一、AI高频词黑名单
${highFreqSections}

二、AI标准用词黑名单（部分）
${standardWordsList}${standardWords.length > 30 ? `\n（共${standardWords.length}个，以上为部分示例）` : ''}

三、模板结构黑名单
${templateSections}

四、套话表达黑名单
${formulaicSections}

五、硬约束要求
1. 以上黑名单中的词汇和表达在改写时必须替换或删除
2. 模板结构必须拆解重构
3. 套话表达必须用替代方案或更自然的表达替换
4. 严重级别的违规必须完全消除`
}

export function buildAntiTemplatePrompt(): string {
  return buildAntiTemplateConstraintPrompt()
}
