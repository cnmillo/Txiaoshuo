import { aiService } from './aiService.js'
import logger from '../utils/logger.js'
import type { PolishMode, StyleAuditResult } from '../types/index.js'

export type PolishIntensity = 'light' | 'medium' | 'deep'

export interface PolishOptions {
  intensity?: PolishIntensity
  preserveKeywords?: string[]
  targetAudience?: string
  tone?: 'formal' | 'casual' | 'humorous' | 'serious'
  mode?: PolishMode
}

export interface PolishResult {
  originalContent: string
  polishedContent: string
  aiFeaturesDetected: AIFeature[]
  improvements: string[]
  wordCountBefore: number
  wordCountAfter: number
}

export interface AIFeature {
  type: string
  description: string
  examples: string[]
  position: number
  severity: 'high' | 'medium' | 'low'
}

const INTENSITY_CONFIGS = {
  light: {
    name: '轻度润色',
    description: '保持原文风格，仅修正明显的AI特征',
    temperature: 0.5,
    focusAreas: ['刻板句式替换', '过渡词优化'],
  },
  medium: {
    name: '中度润色',
    description: '优化句式和表达，增强可读性',
    temperature: 0.7,
    focusAreas: ['刻板句式替换', '过渡词优化', '句式变换', '词汇润色'],
  },
  deep: {
    name: '深度润色',
    description: '全面重构，注入人情味和细节描写',
    temperature: 0.9,
    focusAreas: ['刻板句式替换', '过渡词优化', '句式变换', '词汇润色', '情感注入', '细节补充'],
  },
}

const VALID_INTENSITIES: PolishIntensity[] = ['light', 'medium', 'deep']

/**
 * 验证并获取有效的 intensity 参数
 */
function validateIntensity(intensity?: string): PolishIntensity {
  if (!intensity) {
    return 'medium'
  }
  
  if (!VALID_INTENSITIES.includes(intensity as PolishIntensity)) {
    logger.warn(`无效的 intensity 参数: ${intensity}，使用默认值 'medium'`)
    return 'medium'
  }
  
  return intensity as PolishIntensity
}

// ============================================================================
// 24项AI痕迹检测函数
// ============================================================================

/**
 * 1. 过度强调意义、遗产和更广泛的趋势
 * 检测AI喜欢将小事上升到宏大叙事的倾向
 */
function detectOveremphasisOnSignificance(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /具有(深远|重大|重要|深刻)的(意义|影响|历史意义)/g, desc: '过度强调意义' },
    { regex: /(留下|创造|铸就)(不可磨灭|深远|永恒)的(遗产|印记|足迹)/g, desc: '过度强调遗产' },
    { regex: /(代表|标志|预示)着(一个|某种)(新时代|新纪元|新篇章)/g, desc: '宏大叙事倾向' },
    { regex: /(折射|反映|体现)出(更广泛|深层|根本)的(趋势|问题|现象)/g, desc: '趋势化解读' },
    { regex: /(不仅仅|不只)是[，,]更(是|代表着)/g, desc: '意义升华句式' },
    { regex: /(站在|处于)(历史|时代)的(交汇点|转折点|十字路口)/g, desc: '历史定位修辞' },
    { regex: /(开启|揭开|翻开)(了)?(新|崭新)的(篇章|纪元|时代)/g, desc: '时代开启修辞' },
    { regex: /(深刻|深远|重大)地(影响|改变|重塑)(了)?/g, desc: '影响力夸大' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '过度强调意义',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'medium',
      })
    }
  }
  
  return features
}

/**
 * 2. 过度强调知名度和媒体报道
 * 检测AI喜欢引用知名度、媒体报道来佐证观点
 */
function detectOveremphasisOnFame(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /(广受|备受)(好评|赞誉|关注|追捧)/g, desc: '知名度强调' },
    { regex: /(多家|众多)(媒体|机构|权威)(报道|推荐|认证)/g, desc: '媒体报道引用' },
    { regex: /(知名|著名|权威)(专家|学者|机构|媒体)/g, desc: '权威引用' },
    { regex: /(引发|引起)(广泛|热烈|强烈)(关注|讨论|反响)/g, desc: '关注度强调' },
    { regex: /(荣登|入选|获得)(各类|多项|权威)(榜单|奖项|排名)/g, desc: '荣誉强调' },
    { regex: /(被|获)(誉为|评为|称为).{0,10}(之一|之首)/g, desc: '排名式赞誉' },
    { regex: /(业界|行业|领域)(公认|公认度最高)/g, desc: '行业认可强调' },
    { regex: /(千万|百万|亿万)(用户|读者|观众)(信赖|选择|喜爱)/g, desc: '用户量强调' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '知名度过度强调',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'medium',
      })
    }
  }
  
  return features
}

/**
 * 3. 以-ing结尾的肤浅分析（中文对应：以"化"、"性"、"度"结尾的抽象名词）
 * 检测AI喜欢使用抽象概念代替具体描述
 */
function detectSuperficialAnalysis(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /[^\u4e00-\u9fa5](数字化|智能化|自动化|现代化|信息化|网络化)/g, desc: '化字结尾抽象词' },
    { regex: /[^\u4e00-\u9fa5](重要性|必要性|可行性|有效性|相关性|可持续性)/g, desc: '性字结尾抽象词' },
    { regex: /[^\u4e00-\u9fa5](透明度|可信度|专业度|成熟度|复杂度)/g, desc: '度字结尾抽象词' },
    { regex: /(呈现出|表现出|体现出)(一种|某种)(趋势|态势|特征)/g, desc: '模糊趋势描述' },
    { regex: /(进一步|更加)(深入|全面|系统)(地)?(分析|研究|探讨)/g, desc: '分析深度套话' },
    { regex: /(从.*角度|从.*层面)(来看|分析|出发)/g, desc: '角度分析套话' },
    { regex: /(整体|总体|宏观)(上|而言|来看)/g, desc: '宏观视角套话' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '肤浅分析',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'low',
      })
    }
  }
  
  return features
}

/**
 * 4. 模糊的归因
 * 检测AI喜欢使用模糊来源的引用
 */
function detectVagueAttribution(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /(有|据)(研究|调查|数据|报告)(显示|表明|指出)/g, desc: '研究引用无来源' },
    { regex: /(专家|学者|业内人士)(认为|指出|表示|分析)/g, desc: '专家引用无姓名' },
    { regex: /(普遍|广泛)(认为|接受|认可)/g, desc: '普遍认知无来源' },
    { regex: /(据统计|据测算|据估算)/g, desc: '统计数据无来源' },
    { regex: /(有观点认为|有人认为|部分人认为)/g, desc: '模糊观点来源' },
    { regex: /(众所周知|众所周知地)/g, desc: '众所周知式引用' },
    { regex: /(历史|传统|习惯)(上|而言)(一直|向来)/g, desc: '历史归因模糊' },
    { regex: /(社会|大众|公众)(普遍|广泛)/g, desc: '社会共识模糊' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '模糊归因',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'medium',
      })
    }
  }
  
  return features
}

/**
 * 5. 破折号过度使用
 * 检测AI喜欢用破折号进行补充说明
 */
function detectDashOveruse(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  // 统计破折号数量
  const dashCount = (content.match(/——/g) || []).length
  const emDashCount = (content.match(/—/g) || []).length
  const totalDashes = dashCount + emDashCount
  
  // 每500字超过3个破折号视为过度使用
  const threshold = Math.max(3, Math.floor(content.length / 500) * 3)
  
  if (totalDashes > threshold) {
    // 找出所有破折号位置
    const dashRegex = /——|—/g
    let match
    const examples: string[] = []
    
    while ((match = dashRegex.exec(content)) !== null && examples.length < 3) {
      const start = Math.max(0, match.index - 10)
      const end = Math.min(content.length, match.index + 20)
      examples.push(content.slice(start, end))
    }
    
    features.push({
      type: '破折号过度使用',
      description: `检测到${totalDashes}处破折号使用，超过合理密度`,
      examples,
      position: content.search(/——|—/),
      severity: 'low',
    })
  }
  
  return features
}

/**
 * 6. 三段式法则
 * 检测AI喜欢使用的"首先...其次...最后..."结构
 */
function detectThreePartStructure(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /首先[，,。][\s\S]{0,100}其次[，,。][\s\S]{0,100}最后[，,。]/g, desc: '首先其次最后结构' },
    { regex: /第一[，,。][\s\S]{0,100}第二[，,。][\s\S]{0,100}第三[，,。]/g, desc: '第一第二第三结构' },
    { regex: /一方面[，,。][\s\S]{0,100}另一方面[，,。]/g, desc: '一方面另一方面结构' },
    { regex: /其一[，,。][\s\S]{0,100}其二[，,。][\s\S]{0,100}其三[，,。]/g, desc: '其一其二其三结构' },
    { regex: /一来[，,。][\s\S]{0,100}二来[，,。][\s\S]{0,100}三来[，,。]/g, desc: '一来二来三来结构' },
    { regex: /先是[，,。][\s\S]{0,100}接着[，,。][\s\S]{0,100}然后[，,。]/g, desc: '先是接着然后结构' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '三段式结构',
        description: desc,
        examples: [match[0].slice(0, 80) + (match[0].length > 80 ? '...' : '')],
        position: match.index,
        severity: 'high',
      })
    }
  }
  
  return features
}

/**
 * 7. AI高频词汇（噪音、信号、底色等）
 * 检测AI生成文本中常见的高频词汇
 */
function detectAIHighFrequencyWords(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const aiWords = [
    // 抽象概念词
    { word: '噪音', desc: 'AI高频抽象词' },
    { word: '信号', desc: 'AI高频抽象词' },
    { word: '底色', desc: 'AI高频抽象词' },
    { word: '维度', desc: 'AI高频抽象词' },
    { word: '范式', desc: 'AI高频抽象词' },
    { word: '语境', desc: 'AI高频抽象词' },
    { word: '生态', desc: 'AI高频抽象词' },
    { word: '赋能', desc: 'AI高频抽象词' },
    { word: '闭环', desc: 'AI高频抽象词' },
    { word: '抓手', desc: 'AI高频抽象词' },
    { word: '痛点', desc: 'AI高频抽象词' },
    { word: '痒点', desc: 'AI高频抽象词' },
    { word: '颗粒度', desc: 'AI高频抽象词' },
    { word: '方法论', desc: 'AI高频抽象词' },
    { word: '底层逻辑', desc: 'AI高频抽象词' },
    { word: '顶层设计', desc: 'AI高频抽象词' },
    { word: '认知升级', desc: 'AI高频抽象词' },
    { word: '降维打击', desc: 'AI高频抽象词' },
    { word: '护城河', desc: 'AI高频抽象词' },
    { word: '赛道', desc: 'AI高频抽象词' },
    { word: '锚点', desc: 'AI高频抽象词' },
    { word: '阈值', desc: 'AI高频抽象词' },
    { word: '迭代', desc: 'AI高频抽象词' },
    { word: '沉淀', desc: 'AI高频抽象词' },
    { word: '耦合', desc: 'AI高频抽象词' },
    { word: '解耦', desc: 'AI高频抽象词' },
    { word: '复用', desc: 'AI高频抽象词' },
    { word: '对齐', desc: 'AI高频抽象词' },
    { word: '拉通', desc: 'AI高频抽象词' },
    { word: '落地', desc: 'AI高频抽象词' },
  ]
  
  for (const { word, desc } of aiWords) {
    const regex = new RegExp(word, 'g')
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: 'AI高频词汇',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'medium',
      })
    }
  }
  
  return features
}

/**
 * 8. 否定式排比
 * 检测"不是...不是...而是..."等否定式排比结构
 */
function detectNegativeParallelism(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /不是[，,。][\s\S]{0,50}不是[，,。][\s\S]{0,50}而是[，,。]/g, desc: '不是不是而是结构' },
    { regex: /并非[，,。][\s\S]{0,50}并非[，,。][\s\S]{0,50}而是[，,。]/g, desc: '并非并非而是结构' },
    { regex: /不在于[，,。][\s\S]{0,50}不在于[，,。][\s\S]{0,50}而在于/g, desc: '不在于不在于而在于结构' },
    { regex: /没有[，,。][\s\S]{0,50}没有[，,。][\s\S]{0,50}只有[，,。]/g, desc: '没有没有只有结构' },
    { regex: /不是为了[，,。][\s\S]{0,50}不是为了[，,。][\s\S]{0,50}而是为了/g, desc: '不是为了不是为了而是为了结构' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '否定式排比',
        description: desc,
        examples: [match[0].slice(0, 60) + (match[0].length > 60 ? '...' : '')],
        position: match.index,
        severity: 'medium',
      })
    }
  }
  
  return features
}

/**
 * 9. 过多的连接性短语
 * 检测AI喜欢使用的过渡性短语
 */
function detectExcessiveConnectives(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const connectives = [
    '值得注意的是', '需要指出的是', '不可否认的是', '需要强调的是',
    '与此同时', '不仅如此', '除此之外', '更重要的是',
    '换句话说', '换言之', '具体来说', '具体而言',
    '从这个角度来看', '从这个意义上说', '从这个层面来说',
    '从这个意义上讲', '从这个角度来说', '从这个层面来讲',
    '基于以上分析', '基于上述分析', '基于以上讨论',
    '综上所述', '总而言之', '概括而言', '简而言之',
    '换句话说', '反过来说', '换句话说',
    '从另一个角度', '从另一个方面', '从另一个层面',
    '进一步来说', '进一步而言', '更进一步说',
    '与此形成对比的是', '与此相反的是', '与此不同的是',
  ]
  
  let totalConnectives = 0
  const foundExamples: string[] = []
  
  for (const phrase of connectives) {
    const regex = new RegExp(phrase, 'g')
    const matches = content.match(regex)
    if (matches) {
      totalConnectives += matches.length
      if (foundExamples.length < 5) {
        foundExamples.push(...matches.slice(0, 2))
      }
    }
  }
  
  // 每300字超过2个连接性短语视为过多
  const threshold = Math.max(2, Math.floor(content.length / 300) * 2)
  
  if (totalConnectives > threshold) {
    features.push({
      type: '连接性短语过多',
      description: `检测到${totalConnectives}处连接性短语，超过合理密度`,
      examples: foundExamples.slice(0, 5),
      position: 0,
      severity: 'medium',
    })
  }
  
  return features
}

/**
 * 10. 戏剧化揭露修辞模板
 * 检测AI喜欢使用的戏剧化表达
 */
function detectDramaticReveal(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /(然而|但是|不过)[，,]?(真正的|实际的|核心的|关键的)(问题|答案|原因|真相)是/g, desc: '真相揭露修辞' },
    { regex: /(实际上|事实上|其实)[，,]?(情况|真相|事实)(并非如此|远非如此|恰恰相反)/g, desc: '反转修辞' },
    { regex: /(令人惊讶的是|令人意外的是|出人意料的是)/g, desc: '惊讶引导修辞' },
    { regex: /(鲜为人知的是|少有人知的是|不为人知的是)/g, desc: '秘密揭露修辞' },
    { regex: /(关键在于|核心在于|根本在于|本质在于)/g, desc: '核心揭示修辞' },
    { regex: /(真相|事实|答案)(往往|其实|实际上)(是|在于)/g, desc: '真相揭示修辞' },
    { regex: /(这背后的|这其中的|这里面的)(逻辑|原因|真相|奥秘)是/g, desc: '背后逻辑修辞' },
    { regex: /(深入|仔细|认真)(分析|研究|观察)(后|之后)(发现|不难发现)/g, desc: '深度分析修辞' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '戏剧化揭露',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'medium',
      })
    }
  }
  
  return features
}

/**
 * 11. 极值判断句式
 * 检测AI喜欢使用的绝对化表达
 */
function detectExtremeJudgments(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /(最好|最佳|最优|最强|最大|最小|最全|最新)(的)?/g, desc: '最字极值表达' },
    { regex: /(毫无疑问|毋庸置疑|无可争议|无可置疑)/g, desc: '绝对肯定表达' },
    { regex: /(必须|一定|必然|肯定|绝对)(要|会|是)/g, desc: '绝对必要性表达' },
    { regex: /(唯一|仅有|独有|特有)(的|方式|方法|途径)/g, desc: '唯一性表达' },
    { regex: /(永远|始终|一直|从来)(都是|都是如此|如此)/g, desc: '永恒性表达' },
    { regex: /(所有|一切|全部|任何)(都|均)/g, desc: '全称量词表达' },
    { regex: /(不可能|无法|不能)(没有|缺少|脱离)/g, desc: '否定极值表达' },
    { regex: /(最关键|最重要|最核心|最根本|最本质)(的|是)/g, desc: '最高级强调' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '极值判断',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'high',
      })
    }
  }
  
  return features
}

/**
 * 12. 协作/教学路标词
 * 检测AI喜欢使用的教学式引导词
 */
function detectTeachingSignposts(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /(让我们|让我们来|让我们一起)(看看|分析|探讨|了解)/g, desc: '协作引导词' },
    { regex: /(我们可以|我们可以通过|我们可以从)(看到|发现|了解)/g, desc: '共同探索词' },
    { regex: /(需要(我们)?注意的是|需要(我们)?特别注意的是)/g, desc: '注意引导词' },
    { regex: /(值得(我们)?关注的是|值得(我们)?深思的是)/g, desc: '关注引导词' },
    { regex: /(接下来[，,]?我们|下面[，,]?我们)(来|将)(看看|分析|探讨)/g, desc: '顺序引导词' },
    { regex: /(首先[，,]?让我们|第一步[，,]?让我们)/g, desc: '步骤引导词' },
    { regex: /(通过以上分析[，,]?我们(可以|能够))/g, desc: '总结引导词' },
    { regex: /(为了更好地(理解|分析|探讨)[，,]?我们)/g, desc: '目的引导词' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '教学路标词',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'medium',
      })
    }
  }
  
  return features
}

/**
 * 13. 客服/AI身份口吻
 * 检测AI特有的客服式表达
 */
function detectServiceTone(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /(很高兴|非常荣幸)(为您|能够为您)(解答|服务|提供帮助)/g, desc: '客服问候语' },
    { regex: /(如果您|若您)(有任何|其他)(问题|疑问|需求)/g, desc: '客服引导语' },
    { regex: /(请随时|欢迎随时)(联系|咨询|反馈)/g, desc: '客服结束语' },
    { regex: /(希望(这|以上)(能|可以)(帮助|解答|解决)(您|您的))/g, desc: '帮助表达' },
    { regex: /(作为AI|作为人工智能|作为一个AI助手)/g, desc: 'AI身份声明' },
    { regex: /(我的职责是|我的任务是|我旨在)/g, desc: '职责声明' },
    { regex: /(我不能|我无法|我没有能力)/g, desc: '能力限制声明' },
    { regex: /(建议您|推荐您|您可以尝试)/g, desc: '建议式表达' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '客服口吻',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'high',
      })
    }
  }
  
  return features
}

/**
 * 14. 解释/列举型冒号
 * 检测AI喜欢使用的冒号引导列举
 */
function detectExplanatoryColons(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /(主要|具体|包括|具有)(特点|特征|内容|方面|因素)[：:]/g, desc: '特点列举冒号' },
    { regex: /(原因|理由|因素)(如下|有以下)[：:]/g, desc: '原因列举冒号' },
    { regex: /(分为|分为以下)(几|若干)(类|种|个)[：:]/g, desc: '分类列举冒号' },
    { regex: /(步骤|方法|方式)(如下|有以下)[：:]/g, desc: '步骤列举冒号' },
    { regex: /(优势|劣势|优点|缺点)(包括|如下)[：:]/g, desc: '优劣势列举冒号' },
    { regex: /(需要注意|需要注意的)(事项|问题|点)[：:]/g, desc: '注意事项冒号' },
    { regex: /(以下|如下)[几点几方面几项]?[：:]/g, desc: '引导列举冒号' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '列举型冒号',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'low',
      })
    }
  }
  
  return features
}

/**
 * 15. AI伪口语化高频词
 * 检测AI模拟口语但实际不自然的表达
 */
function detectPseudoColloquial(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /(说实话|老实说|说真的|讲真)[，,]/g, desc: '伪口语开头' },
    { regex: /(其实吧|说实话吧|老实说吧)/g, desc: '伪口语语气词' },
    { regex: /(怎么说呢|怎么讲呢|怎么说好呢)/g, desc: '伪口语犹豫词' },
    { regex: /(你知道吗|你想想|你想啊)/g, desc: '伪口语互动词' },
    { regex: /(简单来说|简单来讲|通俗来说|通俗来讲)/g, desc: '伪简化表达' },
    { regex: /(换句话说|换种说法|换个角度)/g, desc: '伪转换表达' },
    { regex: /(就像.*说的那样|正如.*所说)/g, desc: '伪引用表达' },
    { regex: /(打个比方|举个例子|形象地说)/g, desc: '伪比喻引导' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '伪口语化',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'low',
      })
    }
  }
  
  return features
}

/**
 * 16. AI高频分析动词堆叠
 * 检测AI喜欢使用的分析动词连续出现
 */
function detectAnalysisVerbStacking(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const analysisVerbs = ['分析', '探讨', '研究', '考察', '审视', '剖析', '解读', '阐释', '阐述', '论述', '论证', '说明', '解释', '阐述']
  
  // 检测连续的分析动词
  for (let i = 0; i < analysisVerbs.length; i++) {
    for (let j = 0; j < analysisVerbs.length; j++) {
      if (i !== j) {
        const pattern = new RegExp(`${analysisVerbs[i]}[^。！？\n]{0,20}${analysisVerbs[j]}`, 'g')
        let match
        while ((match = pattern.exec(content)) !== null) {
          features.push({
            type: '分析动词堆叠',
            description: '分析动词连续使用',
            examples: [match[0]],
            position: match.index,
            severity: 'low',
          })
        }
      }
    }
  }
  
  // 检测分析动词+分析动词模式
  const stackingPatterns = [
    { regex: /(深入|进一步|全面|系统)(分析|探讨|研究|考察)/g, desc: '深度分析动词堆叠' },
    { regex: /(分析|探讨|研究|考察)(并|和|与)(阐述|说明|解释)/g, desc: '分析动词并列' },
    { regex: /(通过|通过对其)(分析|研究|考察)(发现|得出|揭示)/g, desc: '分析结果模式' },
  ]
  
  for (const { regex, desc } of stackingPatterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '分析动词堆叠',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'low',
      })
    }
  }
  
  return features
}

/**
 * 17. 降维引导语
 * 检测AI喜欢使用的简化解释引导语
 */
function detectSimplificationGuides(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /(简单来说|简单地说|简而言之|简言之)[，,：:]/g, desc: '简单化引导' },
    { regex: /(通俗来说|通俗地讲|通俗地说)[，,：:]/g, desc: '通俗化引导' },
    { regex: /(换句话说|换种说法|换言之)[，,：:]/g, desc: '转换表达引导' },
    { regex: /(用通俗的话说|用简单的话说|用大白话说)[，,：:]/g, desc: '口语化引导' },
    { regex: /(打个比方|打个形象的比方|打个简单的比方)[，,：:]/g, desc: '比喻引导' },
    { regex: /(可以理解为|可以看作是|可以认为是)[，,：:]/g, desc: '理解引导' },
    { regex: /(本质上|根本上|归根结底)(是|来说|而言)/g, desc: '本质化引导' },
    { regex: /(一言以蔽之|一句话来说|一句话概括)/g, desc: '概括引导' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '降维引导语',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'low',
      })
    }
  }
  
  return features
}

/**
 * 18. 分析师讲解语姿
 * 检测AI模仿分析师的专业口吻
 */
function detectAnalystTone(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /(从.*角度(来)?看|从.*层面(来)?看|从.*方面(来)?看)/g, desc: '多角度分析' },
    { regex: /(综合来看|总体来看|整体来看|整体而言)/g, desc: '综合分析' },
    { regex: /(深入分析|仔细分析|详细分析|全面分析)(后|之后|表明|显示)/g, desc: '深度分析' },
    { regex: /(数据表明|数据显示|数据揭示|数据证明)/g, desc: '数据引用' },
    { regex: /(趋势表明|趋势显示|趋势预示)/g, desc: '趋势分析' },
    { regex: /(市场分析|行业分析|竞品分析)(显示|表明|指出)/g, desc: '专业分析' },
    { regex: /(根据分析|基于分析|通过分析)/g, desc: '分析依据' },
    { regex: /(对比分析|比较分析|对标分析)(发现|显示)/g, desc: '对比分析' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '分析师语姿',
        description: desc,
        examples: [match[0]],
        position: match.index,
        severity: 'medium',
      })
    }
  }
  
  return features
}

/**
 * 19. AI高频关联句式
 * 检测AI喜欢使用的关联句式
 */
function detectHighFrequencyCorrelations(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /不仅[^\n。！？]{0,30}而且[^\n。！？]{0,30}/g, desc: '不仅而且句式' },
    { regex: /虽然[^\n。！？]{0,30}但是[^\n。！？]{0,30}/g, desc: '虽然但是句式' },
    { regex: /因为[^\n。！？]{0,30}所以[^\n。！？]{0,30}/g, desc: '因为所以句式' },
    { regex: /既然[^\n。！？]{0,30}那么[^\n。！？]{0,30}/g, desc: '既然那么句式' },
    { regex: /只有[^\n。！？]{0,30}才能[^\n。！？]{0,30}/g, desc: '只有才能句式' },
    { regex: /只要[^\n。！？]{0,30}就[^\n。！？]{0,30}/g, desc: '只要就句式' },
    { regex: /除非[^\n。！？]{0,30}否则[^\n。！？]{0,30}/g, desc: '除非否则句式' },
    { regex: /与其[^\n。！？]{0,30}不如[^\n。！？]{0,30}/g, desc: '与其不如句式' },
    { regex: /宁可[^\n。！？]{0,30}也不[^\n。！？]{0,30}/g, desc: '宁可也不句式' },
    { regex: /无论[^\n。！？]{0,30}都[^\n。！？]{0,30}/g, desc: '无论都句式' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '高频关联句式',
        description: desc,
        examples: [match[0].slice(0, 50) + (match[0].length > 50 ? '...' : '')],
        position: match.index,
        severity: 'low',
      })
    }
  }
  
  return features
}

/**
 * 20. "而是"及其变体
 * 检测AI喜欢使用的转折强调
 */
function detectErShiVariants(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const patterns = [
    { regex: /[^\n。！？]{0,20}而是[^\n。！？]{0,30}/g, desc: '而是转折' },
    { regex: /[^\n。！？]{0,20}并非[^\n。！？]{0,30}而是[^\n。！？]{0,30}/g, desc: '并非而是转折' },
    { regex: /[^\n。！？]{0,20}不是[^\n。！？]{0,30}而是[^\n。！？]{0,30}/g, desc: '不是而是转折' },
    { regex: /[^\n。！？]{0,20}不在于[^\n。！？]{0,30}而在于[^\n。！？]{0,30}/g, desc: '不在于而在于转折' },
    { regex: /[^\n。！？]{0,20}并不是[^\n。！？]{0,30}而是[^\n。！？]{0,30}/g, desc: '并不是而是转折' },
    { regex: /关键不在于[^\n。！？]{0,30}而在于[^\n。！？]{0,30}/g, desc: '关键不在于转折' },
    { regex: /问题不在于[^\n。！？]{0,30}而在于[^\n。！？]{0,30}/g, desc: '问题不在于转折' },
    { regex: /重点不在于[^\n。！？]{0,30}而在于[^\n。！？]{0,30}/g, desc: '重点不在于转折' },
  ]
  
  for (const { regex, desc } of patterns) {
    let match
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '而是转折',
        description: desc,
        examples: [match[0].slice(0, 40) + (match[0].length > 40 ? '...' : '')],
        position: match.index,
        severity: 'low',
      })
    }
  }
  
  return features
}

/**
 * 21. 二人称过度使用
 * 检测"你"字的过度使用
 */
function detectSecondPersonOveruse(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  // 统计"你"字出现次数
  const youCount = (content.match(/你/g) || []).length
  
  // 每200字超过3个"你"视为过度使用
  const threshold = Math.max(3, Math.floor(content.length / 200) * 3)
  
  if (youCount > threshold) {
    // 找出"你"字的使用示例
    const youRegex = /你[^。！？\n]{0,15}/g
    let match
    const examples: string[] = []
    
    while ((match = youRegex.exec(content)) !== null && examples.length < 5) {
      examples.push(match[0])
    }
    
    features.push({
      type: '二人称过度使用',
      description: `检测到${youCount}处"你"字使用，超过合理密度`,
      examples,
      position: content.indexOf('你'),
      severity: 'medium',
    })
  }
  
  return features
}

/**
 * 22. 路标词密度过高
 * 检测文章中路标词的密度
 */
function detectHighSignpostDensity(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  const signposts = [
    '首先', '其次', '再次', '最后', '第一', '第二', '第三',
    '一方面', '另一方面', '此外', '另外', '而且', '并且',
    '因此', '所以', '于是', '从而', '进而', '继而',
    '然而', '但是', '不过', '可是', '却', '反而',
    '总之', '综上所述', '概括来说', '简而言之',
    '值得注意的是', '需要指出的是', '需要强调的是',
    '具体来说', '具体而言', '换句话说', '换言之',
  ]
  
  let totalSignposts = 0
  const foundExamples: string[] = []
  
  for (const signpost of signposts) {
    const regex = new RegExp(signpost, 'g')
    const matches = content.match(regex)
    if (matches) {
      totalSignposts += matches.length
      if (foundExamples.length < 8) {
        foundExamples.push(...matches.slice(0, 2))
      }
    }
  }
  
  // 每150字超过2个路标词视为密度过高
  const threshold = Math.max(2, Math.floor(content.length / 150) * 2)
  
  if (totalSignposts > threshold) {
    features.push({
      type: '路标词密度过高',
      description: `检测到${totalSignposts}处路标词，超过合理密度`,
      examples: foundExamples.slice(0, 8),
      position: 0,
      severity: 'medium',
    })
  }
  
  return features
}

/**
 * 23. 段落结构公式化
 * 检测段落结构是否过于公式化
 */
function detectFormulaicParagraphStructure(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  // 按段落分割
  const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 0)
  
  if (paragraphs.length < 3) {
    return features
  }
  
  // 检测段落开头模式
  const startPatterns: Record<string, number> = {}
  
  for (const para of paragraphs) {
    const start = para.trim().slice(0, 6)
    if (start.length >= 2) {
      startPatterns[start] = (startPatterns[start] || 0) + 1
    }
  }
  
  // 检测重复的段落开头
  for (const [pattern, count] of Object.entries(startPatterns)) {
    if (count >= 3) {
      features.push({
        type: '段落结构公式化',
        description: `段落开头"${pattern}"重复出现${count}次`,
        examples: paragraphs.filter(p => p.trim().startsWith(pattern)).slice(0, 3).map(p => p.slice(0, 50) + '...'),
        position: 0,
        severity: 'medium',
      })
    }
  }
  
  // 检测段落长度是否过于均匀
  const lengths = paragraphs.map(p => p.length)
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length
  const stdDev = Math.sqrt(variance)
  
  // 如果标准差小于平均长度的20%，认为段落长度过于均匀
  if (stdDev < avgLength * 0.2 && paragraphs.length >= 4) {
    features.push({
      type: '段落结构公式化',
      description: '段落长度过于均匀，缺乏自然变化',
      examples: [`平均段落长度: ${Math.round(avgLength)}字`, `标准差: ${Math.round(stdDev)}字`],
      position: 0,
      severity: 'low',
    })
  }
  
  return features
}

/**
 * 24. 句式节奏单一
 * 检测句式长度和结构是否过于单一
 */
function detectMonotonousSentenceRhythm(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  // 按句子分割
  const sentences = content.match(/[^。！？\n]+[。！？\n]/g) || []
  
  if (sentences.length < 5) {
    return features
  }
  
  // 计算句子长度
  const lengths = sentences.map(s => s.trim().length)
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length
  
  // 计算长度变化
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length
  const stdDev = Math.sqrt(variance)
  
  // 如果标准差小于平均长度的25%，认为句式节奏单一
  if (stdDev < avgLength * 0.25) {
    features.push({
      type: '句式节奏单一',
      description: '句子长度变化不足，节奏过于平缓',
      examples: [
        `平均句长: ${Math.round(avgLength)}字`,
        `长度标准差: ${Math.round(stdDev)}字`,
        `变化系数: ${(stdDev / avgLength * 100).toFixed(1)}%`,
      ],
      position: 0,
      severity: 'low',
    })
  }
  
  // 检测句子开头模式
  const startPatterns: Record<string, number> = {}
  
  for (const sentence of sentences) {
    const start = sentence.trim().slice(0, 4)
    if (start.length >= 2) {
      startPatterns[start] = (startPatterns[start] || 0) + 1
    }
  }
  
  // 检测重复的句子开头
  for (const [pattern, count] of Object.entries(startPatterns)) {
    if (count >= 4) {
      features.push({
        type: '句式节奏单一',
        description: `句子开头"${pattern}"重复出现${count}次`,
        examples: sentences.filter(s => s.trim().startsWith(pattern)).slice(0, 3).map(s => s.trim()),
        position: 0,
        severity: 'low',
      })
    }
  }
  
  return features
}

/**
 * 检测重复表达
 */
function detectRepetitivePatterns(content: string): AIFeature[] {
  const features: AIFeature[] = []
  const sentences = content.match(/[^。！？\n]+[。！？\n]/g) || []
  
  // 检测重复的句式开头
  const startPatterns: Record<string, number[]> = {}
  sentences.forEach((sentence, index) => {
    const start = sentence.trim().slice(0, 4)
    if (start.length >= 2) {
      if (!startPatterns[start]) {
        startPatterns[start] = []
      }
      startPatterns[start].push(index)
    }
  })
  
  // 找出重复出现的句式开头
  for (const [pattern, positions] of Object.entries(startPatterns)) {
    if (positions.length >= 3) {
      const firstPosition = content.indexOf(sentences[positions[0]])
      features.push({
        type: '重复表达',
        description: `句式开头"${pattern}"重复出现${positions.length}次`,
        examples: positions.slice(0, 3).map(i => sentences[i].trim()),
        position: firstPosition >= 0 ? firstPosition : 0,
        severity: 'medium',
      })
    }
  }
  
  return features
}

/**
 * 检测缺乏情感的内容
 */
function detectLackOfEmotion(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  // 情感词汇列表
  const emotionalWords = [
    '喜欢', '爱', '恨', '悲伤', '快乐', '愤怒', '恐惧', '惊讶', '期待', '失望',
    '兴奋', '焦虑', '感动', '温暖', '痛苦', '幸福', '孤独', '希望', '绝望', '激动',
    '开心', '难过', '生气', '害怕', '惊喜', '遗憾', '满足', '不满', '感动', '震撼'
  ]
  
  // 检测情感词密度
  let emotionalWordCount = 0
  for (const word of emotionalWords) {
    const regex = new RegExp(word, 'g')
    const matches = content.match(regex)
    if (matches) {
      emotionalWordCount += matches.length
    }
  }
  
  // 计算情感密度（每1000字的情感词数量）
  const emotionalDensity = (emotionalWordCount / content.length) * 1000
  
  // 如果情感密度过低，标记为缺乏情感
  if (emotionalDensity < 2 && content.length > 100) {
    features.push({
      type: '缺乏情感',
      description: `文本情感密度较低（${emotionalDensity.toFixed(1)}个/千字），表达过于中性客观`,
      examples: ['整体文本缺乏情感色彩'],
      position: 0,
      severity: 'medium',
    })
  }
  
  return features
}

/**
 * 检测固定模式
 */
function detectFixedPatterns(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  // 检测列表式表达
  const listPatterns = [
    /如下[：:][\s\S]{0,200}[一二三四五六七八九十]+[、:：]/g,
    /包括以下[\s\S]{0,200}[一二三四五六七八九十]+[、:：]/g,
    /具有以下[\s\S]{0,200}[一二三四五六七八九十]+[、:：]/g,
  ]
  
  for (const pattern of listPatterns) {
    let match
    const regex = new RegExp(pattern.source, pattern.flags)
    while ((match = regex.exec(content)) !== null) {
      features.push({
        type: '固定模式',
        description: '检测到列表式、模板化表达',
        examples: [match[0].slice(0, 50) + (match[0].length > 50 ? '...' : '')],
        position: match.index,
        severity: 'medium',
      })
    }
  }
  
  return features
}

/**
 * 主检测函数：调用所有24项AI痕迹检测
 */
export function detectAIFeatures(content: string): AIFeature[] {
  const features: AIFeature[] = []
  
  // 调用24项检测函数
  const detectionFunctions = [
    detectOveremphasisOnSignificance,      // 1. 过度强调意义、遗产和更广泛的趋势
    detectOveremphasisOnFame,              // 2. 过度强调知名度和媒体报道
    detectSuperficialAnalysis,             // 3. 以-ing结尾的肤浅分析
    detectVagueAttribution,                // 4. 模糊的归因
    detectDashOveruse,                     // 5. 破折号过度使用
    detectThreePartStructure,              // 6. 三段式法则
    detectAIHighFrequencyWords,            // 7. AI高频词汇
    detectNegativeParallelism,             // 8. 否定式排比
    detectExcessiveConnectives,            // 9. 过多的连接性短语
    detectDramaticReveal,                  // 10. 戏剧化揭露修辞模板
    detectExtremeJudgments,                // 11. 极值判断句式
    detectTeachingSignposts,               // 12. 协作/教学路标词
    detectServiceTone,                     // 13. 客服/AI身份口吻
    detectExplanatoryColons,               // 14. 解释/列举型冒号
    detectPseudoColloquial,                // 15. AI伪口语化高频词
    detectAnalysisVerbStacking,            // 16. AI高频分析动词堆叠
    detectSimplificationGuides,            // 17. 降维引导语
    detectAnalystTone,                     // 18. 分析师讲解语姿
    detectHighFrequencyCorrelations,       // 19. AI高频关联句式
    detectErShiVariants,                   // 20. "而是"及其变体
    detectSecondPersonOveruse,             // 21. 二人称过度使用
    detectHighSignpostDensity,             // 22. 路标词密度过高
    detectFormulaicParagraphStructure,     // 23. 段落结构公式化
    detectMonotonousSentenceRhythm,        // 24. 句式节奏单一
    // 额外检测
    detectRepetitivePatterns,
    detectLackOfEmotion,
    detectFixedPatterns,
  ]
  
  // 执行所有检测
  for (const detectFn of detectionFunctions) {
    try {
      const detectedFeatures = detectFn(content)
      features.push(...detectedFeatures)
    } catch (error) {
      logger.warn(`AI特征检测函数执行失败: ${detectFn.name}`, { error })
    }
  }
  
  // 按位置排序
  features.sort((a, b) => a.position - b.position)
  
  // 去重（相同位置和类型的特征只保留一个）
  const uniqueFeatures: AIFeature[] = []
  const seen = new Set<string>()
  
  for (const feature of features) {
    const key = `${feature.type}-${feature.position}`
    if (!seen.has(key)) {
      seen.add(key)
      uniqueFeatures.push(feature)
    }
  }
  
  return uniqueFeatures
}

function buildPolishPrompt(content: string, options: PolishOptions): string {
  const intensity = validateIntensity(options.intensity)
  const config = INTENSITY_CONFIGS[intensity]
  
  const toneInstructions = {
    formal: '保持正式、严谨的语言风格',
    casual: '使用轻松、口语化的表达方式',
    humorous: '适当加入幽默元素，让文字更有趣',
    serious: '保持严肃、深沉的叙述风格',
  }
  
  const toneInstruction = options.tone ? toneInstructions[options.tone] : '保持自然流畅的语言风格'
  
  // 根据模式选择不同的提示词
  const modeInstructions = {
    'good-writing': {
      title: 'AI 文章润色师 (AI Text Polisher)',
      description: '专注于提升文章的文学性和可读性，让文字更加优美流畅。',
      focus: '提升文学性、优化表达、增强可读性',
      guidelines: `## Guidelines for Good Writing:
1. **句式优美：** 追求长短句的和谐搭配，让文字有节奏感和韵律美。
2. **词汇丰富：** 使用精准、生动、有画面感的词汇，避免重复和单调。
3. **情感真挚：** 注入真实的情感，让读者能够感同身受。
4. **细节生动：** 加入具体的细节描写，让场景更加立体。
5. **叙事流畅：** 保持故事的连贯性，让情节自然推进。
6. **风格统一：** 保持全文风格的一致性，符合小说的整体基调。
7. **避免陈词滥调：** 拒绝套话和模板化表达，追求原创性。
8. **展示而非说教：** 通过细节和行动展现人物和情节，避免直接说教。`
    },
    'de-AI-writing': {
      title: 'AI 文章去AI化专家 (AI Text Humanizer)',
      description: '专注于将 AI 生成的文章转化为 **地道、流畅、富有吸引力** 的人类写作风格。',
      focus: '去除AI痕迹、增强人情味、提升自然度',
      guidelines: `## Guidelines for Humanization:
1. **句式灵动：** 告别死板。长短结合，并列、从句、口语化表达交替使用。
2. **词汇鲜活：** 拒绝模板化。用具体、形象、有温度的词替换中性、抽象、生硬的词。多用动词，少用被动。
3. **自然过渡：** 抛弃"首先/其次/总之"。使用更隐性、符合思维流的连接方式（如"说到这里"、"另一方面"、"更重要的是"、"回过头来看"等）。
4. **视角与情感：** 适度引入。根据文体，考虑使用第一人称分享见解或感受，加入适量的感叹、反问，或通过描绘细节引发共鸣。**展示而非说教 (Show, don't tell)**。
5. **互动感营造：** 拉近距离。可以适当使用设问、直接称呼读者（如"你可能会想……"），邀请读者思考。
6. **节奏把控：** 张弛有度。模仿人类写作的自然起伏，避免匀速平铺直叙。
7. **避免 AI 习语：** 坚决去除"值得注意的是"、"不难发现"、"基于以上分析"等高频 AI 特征短语。
8. **口语化与书面语平衡：** 根据文章性质和目标读者，恰当把握口语化表达和书面语规范的平衡。`
    }
  }
  
  const modeConfig = modeInstructions[options.mode || 'de-AI-writing']
  
  return `# Role: ${modeConfig.title}

## Profile:
- Language: 中文 (Chinese)
- Description: ${modeConfig.description}

## 润色配置
- 润色强度：${config.name} - ${config.description}
- 润色模式：${options.mode === 'good-writing' ? '文学润色' : '去AI化润色'}
- 目标受众：${options.targetAudience || '普通大众'}
- 语调要求：${toneInstruction}
- 重点优化：${config.focusAreas.join('、')}
- 核心目标：${modeConfig.focus}

${modeConfig.guidelines}

## Constraints:
- **忠于原意：** 核心信息、关键数据不得篡改或遗漏。
- **风格匹配：** 优化后的风格需符合原文的主题、目的和目标受众。
- **自然为本：** 避免过度修饰或炫技，追求 **真诚、自然的表达**。
- **逻辑严谨：** 优化过程不能破坏原文的逻辑结构。
- **杜绝新"AI 味"**: 严格遵守上述指南，确保优化后的文本彻底摆脱机器痕迹。

## 需要润色的原文：
${content}

## 输出要求：
请直接输出润色后的文章内容，不要包含任何分析或说明。保留原文的核心情节和人物设定，但要让文字更加自然、生动、富有吸引力。`
}

export async function polishContent(
  content: string,
  options: PolishOptions = {}
): Promise<PolishResult> {
  // 验证 intensity 参数
  const intensity = validateIntensity(options.intensity)
  const config = INTENSITY_CONFIGS[intensity]
  
  logger.info('开始润色内容', {
    intensity: config.name,
    contentLength: content.length,
  })
  
  // 在润色前检测AI特征
  const aiFeatures = detectAIFeatures(content)
  
  // 统计各类特征数量
  const featureStats: Record<string, number> = {}
  for (const feature of aiFeatures) {
    featureStats[feature.type] = (featureStats[feature.type] || 0) + 1
  }
  
  // 统计严重程度
  const severityStats = {
    high: aiFeatures.filter(f => f.severity === 'high').length,
    medium: aiFeatures.filter(f => f.severity === 'medium').length,
    low: aiFeatures.filter(f => f.severity === 'low').length,
  }
  
  logger.info('检测到AI特征', {
    featureCount: aiFeatures.length,
    featureTypes: [...new Set(aiFeatures.map(f => f.type))],
    featureStats,
    severityStats,
  })
  
  const prompt = buildPolishPrompt(content, options)
  
  try {
    const polishedContent = await aiService.generateText(prompt, {
      temperature: config.temperature,
      maxTokens: Math.min(content.length * 2, 16000),
    })
    
    const improvements: string[] = []
    
    // 根据检测到的特征生成改进说明
    for (const [type, count] of Object.entries(featureStats)) {
      if (count > 0) {
        improvements.push(`修正了${count}处${type}问题`)
      }
    }
    
    if (intensity === 'medium' || intensity === 'deep') {
      improvements.push('优化了句式结构，增强可读性')
      improvements.push('润色了词汇表达，更加生动自然')
    }
    
    if (intensity === 'deep') {
      improvements.push('注入了情感色彩和细节描写')
      improvements.push('增强了叙事节奏和阅读体验')
    }
    
    const result: PolishResult = {
      originalContent: content,
      polishedContent: polishedContent.trim(),
      aiFeaturesDetected: aiFeatures,
      improvements,
      wordCountBefore: content.length,
      wordCountAfter: polishedContent.trim().length,
    }
    
    logger.info('润色完成', {
      wordCountBefore: result.wordCountBefore,
      wordCountAfter: result.wordCountAfter,
      improvementCount: improvements.length,
      detectedFeatureCount: aiFeatures.length,
    })
    
    return result
  } catch (error) {
    logger.error('润色失败', { error })
    throw error
  }
}

export async function polishChapter(
  chapterContent: string,
  chapterTitle: string,
  options: PolishOptions = {}
): Promise<PolishResult> {
  logger.info('开始润色章节', { chapterTitle, mode: options.mode })
  
  const result = await polishContent(chapterContent, {
    ...options,
    targetAudience: options.targetAudience || '小说读者',
  })
  
  return result
}

/**
 * 生成风格审计结果
 */
export function generateStyleAudit(aiFeatures: AIFeature[], content: string): StyleAuditResult {
  // 计算严重程度分布
  const severityBreakdown = {
    high: aiFeatures.filter(f => f.severity === 'high').length,
    medium: aiFeatures.filter(f => f.severity === 'medium').length,
    low: aiFeatures.filter(f => f.severity === 'low').length,
  }
  
  // 计算总体评分 (0-100)
  // 基础分100，每个高严重度问题扣5分，中严重度扣3分，低严重度扣1分
  let score = 100
  score -= severityBreakdown.high * 5
  score -= severityBreakdown.medium * 3
  score -= severityBreakdown.low * 1
  score = Math.max(0, Math.min(100, score))
  
  // 分析内容特征（使用 content 参数）
  const contentLength = content.length
  const paragraphCount = content.split(/\n\n+/).filter(p => p.trim()).length
  const avgParagraphLength = paragraphCount > 0 ? Math.round(contentLength / paragraphCount) : 0
  
  // 生成改进建议
  const suggestions: string[] = []
  
  // 根据内容长度添加建议
  if (contentLength < 100) {
    suggestions.push('内容较短，建议扩充更多细节描写')
  }
  
  // 根据段落长度添加建议
  if (avgParagraphLength > 500) {
    suggestions.push('段落过长，建议适当分段以提高可读性')
  } else if (avgParagraphLength < 50 && paragraphCount > 3) {
    suggestions.push('段落过短，建议合并相关内容以增强连贯性')
  }
  
  // 根据特征类型生成针对性建议
  const featureTypes = [...new Set(aiFeatures.map(f => f.type))]
  
  if (featureTypes.includes('三段式结构')) {
    suggestions.push('避免使用"首先...其次...最后..."等三段式结构，尝试更自然的过渡方式')
  }
  if (featureTypes.includes('AI高频词汇')) {
    suggestions.push('减少使用"赋能、闭环、抓手"等AI高频词汇，用更具体的表达替代')
  }
  if (featureTypes.includes('过度强调意义')) {
    suggestions.push('避免将小事上升到宏大叙事，保持叙述的适度性')
  }
  if (featureTypes.includes('连接性短语过多')) {
    suggestions.push('减少"值得注意的是"、"需要指出的是"等连接性短语的使用')
  }
  if (featureTypes.includes('极值判断')) {
    suggestions.push('避免使用"最好"、"唯一"、"毫无疑问"等绝对化表达')
  }
  if (featureTypes.includes('客服口吻')) {
    suggestions.push('去除客服式表达，保持自然的叙述风格')
  }
  if (featureTypes.includes('教学路标词')) {
    suggestions.push('避免使用"让我们看看"、"我们可以发现"等教学式引导词')
  }
  if (featureTypes.includes('句式节奏单一')) {
    suggestions.push('增加句式变化，长短句交替使用，增强节奏感')
  }
  if (featureTypes.includes('缺乏情感')) {
    suggestions.push('增加情感色彩，使用更有温度的表达方式')
  }
  if (featureTypes.includes('段落结构公式化')) {
    suggestions.push('打破段落结构的公式化，让段落长度和开头更加多样化')
  }
  
  // 如果没有检测到问题，给出正面反馈
  if (aiFeatures.length === 0) {
    suggestions.push('文本风格自然流畅，未检测到明显的AI痕迹')
    suggestions.push('继续保持这种自然的写作风格')
  }
  
  // 限制建议数量
  const limitedSuggestions = suggestions.slice(0, 5)
  
  return {
    overallScore: score,
    aiFeatureCount: aiFeatures.length,
    severityBreakdown,
    features: aiFeatures,
    suggestions: limitedSuggestions,
  }
}

export default {
  polishContent,
  polishChapter,
  detectAIFeatures,
  generateStyleAudit,
}
