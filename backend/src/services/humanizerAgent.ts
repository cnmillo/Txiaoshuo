import { aiService } from './aiService.js'
import logger from '../utils/logger.js'

const HUMANIZER_SYSTEM_PROMPT = `你是一个资深小说编辑，干了十五年，能牢牢抓住读者，专治"AI味"。

你的工作不是润色，不是续写，是动刀子。AI写出来的东西有几种通病，你要一眼看出来，一刀改掉。

核心原则：
1. 情节、人物、场景不能改——故事还是那个故事
2. 只改表达方式，不改内容走向
3. 改完读一遍，必须像人写的，不像机器写的
4. 宁可粗糙一点，也不要光滑得假——人写东西有毛边
5. 绝对不能添加新情节、新场景、新角色——只改已有内容的表达
6. 输出长度必须与原文相近，不能膨胀——原文多少字，改完就多少字左右
7. 绝对不能续写——原文最后一个字在哪里，改写就停在哪里。不能往下多写一个情节。`

const HUMANIZER_USER_PROMPT = `把下面这段小说改写得更自然。只改表达，绝不改情节，绝不续写。

【铁律——违反任何一条都是失败】
- 输出字数严格控制在原文的90%-110%（原文约{wordCount}字，改写后必须在{minWordCount}-{maxWordCount}字之间）
- 绝对不能添加新情节、新场景、新角色、新对话
- 绝对不能续写故事——原文到哪里，改写就到哪里，不能往下多写一个字
- 只改表达方式：删AI词、改对话标签、调整句式、删段末升华
- 改写后的段落数量必须与原文相近，不能凭空多出好几段

【MECE原则——禁止重复】
- 同一个意思不要写两遍
- 同一个副词不要出现超过2次
- 同一个句式结构不能连续出现3次
- 已经写过的细节不要换种说法再写一遍

【画面感提升——每300字至少1处具体感官/动作细节】
- 原文中空洞的描写要替换成具体的感官细节：看到的颜色、听到的声音、摸到的质感、闻到的气味
- 用朴实白描手法，不要华丽辞藻——"他手在抖"比"他不由自主地颤抖着双手"强
- 每300字左右，确保有1处五感描写或人物习惯性动作
- 动作描写要具体——"攥紧拳头"比"握紧了手"强，"指甲掐进肉里"比"用力握拳"强

【必须检测并修复的AI通病】

一、词汇层（出现即删/替换）：
- 删掉：不禁、微微、缓缓、淡淡、轻轻、默默、静静、仿佛、宛如、犹如、似乎、下意识、心中一动、深吸一口气、难以言喻、难以置信、若有若无
- 删掉：充满了、惊讶地、坚定地、莫名的、不由得、紧紧地、轻轻地、深深地
- "突然"最多留1个
- "涌上心头""一股XX""我感到一阵"→换成身体反应（手心冒汗、喉咙发紧、胃里翻了个个）
- "关切地问""严肃地说""微笑着回答"→删掉标签，用动作代替，或者干脆不加提示语
- "眼神坚定""眼中充满了XX"→换成具体动作（攥紧拳头、咬紧牙关、后退一步）
- "心中涌起一股暖流"→换成具体感受（鼻子一酸、喉咙发紧、眼眶发热）

二、对话层（这是AI味最重的地方）：
- 问答式对话循环（"你没事吧？"→"我没事"）→改成有潜台词的对话，或者用动作代替
- 每句对话都配动作/表情→大部分对话就扔在那，不加提示语
- 所有角色说话方式一样→给不同角色不同的说话节奏和用词
- 连续三段纯对话→中间穿插动作、心理、环境
- "我们会一起面对""你很坚强"等正能量台词→换成更真实的反应（沉默、骂人、装不在乎）

三、结构层：
- 段落长度太均匀→有的段落就一句话，有的段落四五句一口气铺完
- 每段结尾都来一句感悟/总结→删掉，停在动作或对话上
- "遇险→战斗→安全→再遇险"循环→打破，让每次危机的形态不同
- 结尾升华/总结→删掉，停在画面或动作上

四、感官层：
- "夜幕低垂""月光如水"等套路化开篇→换成动作或对话切入
- 按模板堆砌感官（视觉→触觉→嗅觉→悬念）→一次最多写一两个感官
- 修饰语太多→"门"就是"门"，不用"斑驳的木门"

【改写示例】
原文："梦璃，你没事吧？"轩辕破关切地问。"我没事，谢谢你。"我微笑着回答。
改写：轩辕破看了我一眼，没说话，把刀递过来。我接了。

原文：突然，一股强大的力量在我体内涌动，我感觉身体要炸裂般膨胀。
改写：身体里有什么东西在翻涌。不对劲。我攥紧拳头，指甲掐进肉里。

原文：夜幕低垂，末世城市的轮廓在黑暗中若隐若现。
改写：灯灭了。外面有人在喊，声音越来越远。

原文：她哽咽着，心中涌起一股暖流。
改写：她鼻子一酸，没说话。

原文：
{content}

改写后（严格控制在{minWordCount}-{maxWordCount}字）：`

export interface HumanizeResult {
  originalContent: string
  humanizedContent: string
  aiScoreBefore: number
  aiScoreAfter: number
  changes: string[]
}

function detectAIScore(content: string): number {
  let score = 0
  const checks: Array<{ pattern: RegExp; weight: number }> = [
    { pattern: /突然[，,]/g, weight: 2 },
    { pattern: /不禁/g, weight: 2 },
    { pattern: /微微/g, weight: 2 },
    { pattern: /缓缓/g, weight: 2 },
    { pattern: /淡淡/g, weight: 2 },
    { pattern: /轻轻/g, weight: 1 },
    { pattern: /默默/g, weight: 1 },
    { pattern: /仿佛/g, weight: 2 },
    { pattern: /宛如/g, weight: 2 },
    { pattern: /犹如/g, weight: 2 },
    { pattern: /似乎/g, weight: 1 },
    { pattern: /下意识/g, weight: 2 },
    { pattern: /心中一动/g, weight: 2 },
    { pattern: /深吸一口气/g, weight: 2 },
    { pattern: /难以言喻/g, weight: 2 },
    { pattern: /难以置信/g, weight: 2 },
    { pattern: /若有若无/g, weight: 3 },
    { pattern: /令人.{0,4}的是/g, weight: 3 },
    { pattern: /像[^像]{1,10}一样/g, weight: 1 },
    { pattern: /像[^像]{1,15}似的/g, weight: 1 },
    { pattern: /奏响.*序章/g, weight: 3 },
    { pattern: /彻底改变/g, weight: 3 },
    { pattern: /新的决心/g, weight: 2 },
    { pattern: /就在这时/g, weight: 2 },
    { pattern: /就在此时/g, weight: 2 },
    { pattern: /涌上心头/g, weight: 3 },
    { pattern: /一股.{1,6}力量/g, weight: 3 },
    { pattern: /我感到一阵/g, weight: 3 },
    { pattern: /关切地问/g, weight: 3 },
    { pattern: /严肃地说/g, weight: 2 },
    { pattern: /微笑着回答/g, weight: 3 },
    { pattern: /你没事吧/g, weight: 3 },
    { pattern: /我没事/g, weight: 2 },
    { pattern: /夜幕低垂/g, weight: 3 },
    { pattern: /月光如水/g, weight: 3 },
    { pattern: /若隐若现/g, weight: 2 },
    { pattern: /充满了/g, weight: 3 },
    { pattern: /惊讶地/g, weight: 2 },
    { pattern: /坚定地/g, weight: 2 },
    { pattern: /莫名的/g, weight: 2 },
    { pattern: /不由得/g, weight: 2 },
    { pattern: /紧紧地/g, weight: 1 },
    { pattern: /深深地/g, weight: 1 },
    { pattern: /眼神坚定/g, weight: 3 },
    { pattern: /眼中充满了/g, weight: 3 },
    { pattern: /心中涌起/g, weight: 3 },
    { pattern: /涌起一股/g, weight: 3 },
    { pattern: /暖流/g, weight: 2 },
    { pattern: /我们会一起面对/g, weight: 3 },
    { pattern: /你很坚强/g, weight: 3 },
    { pattern: /必须坚强/g, weight: 3 },
    { pattern: /为了.*为了/g, weight: 3 },
    { pattern: /旅程才刚刚开始/g, weight: 3 },
    { pattern: /等待希望/g, weight: 3 },
  ]

  for (const { pattern, weight } of checks) {
    const matches = content.match(pattern)
    if (matches) {
      score += matches.length * weight
    }
  }

  const paragraphs = content.split('\n').filter(p => p.trim().length > 0)
  if (paragraphs.length > 5) {
    const lengths = paragraphs.map(p => p.trim().length)
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length
    const variance = lengths.reduce((sum, l) => sum + Math.pow(l - avg, 2), 0) / lengths.length
    const cv = Math.sqrt(variance) / avg
    if (cv < 0.3) score += 5
  }

  const iStarters = paragraphs.filter(p => p.trim().startsWith('我')).length
  if (iStarters / paragraphs.length > 0.5) score += 3

  score += detectStructuralAIPatterns(content)

  return Math.min(score, 100)
}

function detectStructuralAIPatterns(content: string): number {
  let structuralScore = 0

  const dialoguePattern = /[""「」][^""「」]{0,30}[""「」][^""「」]{0,20}(关切|严肃|微笑|坚定|冷静)/g
  const dialogueMatches = content.match(dialoguePattern)
  if (dialogueMatches && dialogueMatches.length >= 2) {
    structuralScore += dialogueMatches.length * 2
  }

  const qandaPattern = /你没事吧|你怎么样|你还好吗/g
  const qandaMatches = content.match(qandaPattern)
  if (qandaMatches && qandaMatches.length >= 2) {
    structuralScore += qandaMatches.length * 3
  }

  const summaryEndings = /那一刻.{0,10}明白了|终于.{0,6}了|只要.{1,8}就一定能|必须坚强|旅程才刚刚开始|等待希望/g
  const summaryMatches = content.match(summaryEndings)
  if (summaryMatches) {
    structuralScore += summaryMatches.length * 3
  }

  const clichéOpenings = /夜幕|月光|晨光|夕阳|天色|夜色|月色|晨曦|暮色|华灯|夜风|月华|旭日|乌云|繁星/g
  const firstParagraph = content.split('\n\n')[0]?.trim() || ''
  if (clichéOpenings.test(firstParagraph)) {
    structuralScore += 4
  }

  return structuralScore
}

function detectChanges(original: string, humanized: string): string[] {
  const changes: string[] = []
  const aiWords = ['突然', '不禁', '微微', '缓缓', '淡淡', '仿佛', '宛如', '犹如', '似乎', '下意识', '心中一动', '深吸一口气', '难以言喻', '难以置信', '关切地问', '严肃地说', '微笑着回答', '涌上心头', '充满了', '惊讶地', '坚定地', '莫名的', '眼神坚定', '暖流']

  for (const word of aiWords) {
    const beforeCount = (original.match(new RegExp(word, 'g')) || []).length
    const afterCount = (humanized.match(new RegExp(word, 'g')) || []).length
    if (beforeCount > afterCount) {
      changes.push(`删除了${beforeCount - afterCount}个"${word}"`)
    }
  }

  const origParas = original.split('\n').filter(p => p.trim()).length
  const newParas = humanized.split('\n').filter(p => p.trim()).length
  if (Math.abs(origParas - newParas) > 2) {
    changes.push(`段落从${origParas}段调整为${newParas}段`)
  }

  const origQanda = (original.match(/你没事吧|你怎么样|你还好吗/g) || []).length
  const newQanda = (humanized.match(/你没事吧|你怎么样|你还好吗/g) || []).length
  if (origQanda > newQanda) {
    changes.push(`修复了${origQanda - newQanda}处问答式对话`)
  }

  const lengthDiff = humanized.length - original.length
  const lengthRatio = lengthDiff / original.length
  if (lengthRatio > 0.15) {
    changes.push(`⚠️ 字数膨胀${Math.round(lengthRatio * 100)}%（${original.length}→${humanized.length}），可能续写了新内容`)
  } else if (lengthRatio < -0.15) {
    changes.push(`字数缩减${Math.round(Math.abs(lengthRatio) * 100)}%（${original.length}→${humanized.length}）`)
  }

  return changes
}

export async function humanizeContent(content: string, threshold: number = 8): Promise<HumanizeResult> {
  const aiScoreBefore = detectAIScore(content)
  logger.info(`去AI味检测: AI分数=${aiScoreBefore}, 阈值=${threshold}`)

  if (aiScoreBefore <= threshold) {
    logger.info('AI分数低于阈值，无需去AI味处理')
    return {
      originalContent: content,
      humanizedContent: content,
      aiScoreBefore,
      aiScoreAfter: aiScoreBefore,
      changes: ['AI分数低于阈值，无需处理'],
    }
  }

  const chunks = splitContent(content)
  const humanizedChunks: string[] = []

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i]
    if (chunk.trim().length < 50) {
      humanizedChunks.push(chunk)
      continue
    }

    const chunkWordCount = chunk.length
    const chunkMinWords = Math.floor(chunkWordCount * 0.9)
    const chunkMaxWords = Math.floor(chunkWordCount * 1.1)

    try {
      const structuralHints = buildStructuralHints(chunk)
      let promptWithHints = HUMANIZER_USER_PROMPT
        .replace('{wordCount}', String(chunkWordCount))
        .replace('{minWordCount}', String(chunkMinWords))
        .replace('{maxWordCount}', String(chunkMaxWords))
        .replace('{content}', chunk)
      promptWithHints += (structuralHints ? `\n\n【本段检测到的具体AI问题】\n${structuralHints}` : '')

      const result = await aiService.generateText(promptWithHints, {
        temperature: 0.9,
        maxTokens: Math.floor(chunkWordCount * 1.05),
        systemPrompt: HUMANIZER_SYSTEM_PROMPT,
      })

      if (result && result.trim()) {
        const trimmedResult = result.trim()
        if (trimmedResult.length > chunkWordCount * 1.15) {
          logger.warn(`去AI味: 第${i + 1}段改写后字数膨胀${Math.round((trimmedResult.length / chunkWordCount - 1) * 100)}%，可能续写了新内容，回退到原文`)
          humanizedChunks.push(chunk)
        } else {
          humanizedChunks.push(trimmedResult)
        }
      } else {
        humanizedChunks.push(chunk)
      }
      logger.info(`去AI味: 第${i + 1}/${chunks.length}段处理完成`)
    } catch (error) {
      logger.error(`去AI味: 第${i + 1}段处理失败，保留原文`, error)
      humanizedChunks.push(chunk)
    }
  }

  const humanizedContent = humanizedChunks.join('\n\n')
  const aiScoreAfter = detectAIScore(humanizedContent)
  const changes = detectChanges(content, humanizedContent)

  logger.info(`去AI味完成: AI分数 ${aiScoreBefore} → ${aiScoreAfter}`)

  return {
    originalContent: content,
    humanizedContent,
    aiScoreBefore,
    aiScoreAfter,
    changes,
  }
}

function buildStructuralHints(chunk: string): string {
  const hints: string[] = []

  const qandaCount = (chunk.match(/你没事吧|你怎么样|你还好吗/g) || []).length
  if (qandaCount >= 1) {
    hints.push(`- 发现${qandaCount}处"你没事吧"式问答对话，需要改成有潜台词的对话或用动作代替`)
  }

  const tagCount = (chunk.match(/关切地问|严肃地说|微笑着回答|冷静地回应/g) || []).length
  if (tagCount >= 1) {
    hints.push(`- 发现${tagCount}处AI式对话标签（关切地问/严肃地说等），需要删掉或换成动作`)
  }

  const feelingCount = (chunk.match(/涌上心头|一股.{1,6}力量|我感到一阵|心中涌起|暖流/g) || []).length
  if (feelingCount >= 1) {
    hints.push(`- 发现${feelingCount}处AI感官句式（涌上心头/一股力量/暖流等），需要换成身体反应`)
  }

  const summaryCount = (chunk.match(/那一刻.{0,10}明白了|终于.{0,6}了|只要.{1,8}就一定能|必须坚强|旅程才刚刚开始|等待希望/g) || []).length
  if (summaryCount >= 1) {
    hints.push(`- 发现${summaryCount}处段末升华/总结，需要删掉，停在动作或对话上`)
  }

  const clichéOpening = /夜幕|月光|晨光|夕阳|天色渐暗|夜色降临/.test(chunk.split('\n\n')[0] || '')
  if (clichéOpening) {
    hints.push('- 开头使用了套路化景物描写，需要用动作或对话切入')
  }

  const filledWithCount = (chunk.match(/充满了/g) || []).length
  if (filledWithCount >= 1) {
    hints.push(`- 发现${filledWithCount}处"充满了"（AI高频词），需要换成具体动作或身体反应`)
  }

  const firmEyesCount = (chunk.match(/眼神坚定|眼中充满了/g) || []).length
  if (firmEyesCount >= 1) {
    hints.push(`- 发现${firmEyesCount}处"眼神坚定/眼中充满了"（AI标签），需要换成具体动作`)
  }

  return hints.join('\n')
}

function splitContent(content: string): string[] {
  const paragraphs = content.split('\n\n')
  const chunks: string[] = []
  let currentChunk = ''

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > 1500 && currentChunk.length > 0) {
      chunks.push(currentChunk.trim())
      currentChunk = para
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + para
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim())
  }

  return chunks
}
