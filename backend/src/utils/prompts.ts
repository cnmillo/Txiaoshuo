/**
 * 小说生成提示词模板
 * 提供各种风格、类型的提示词模板，帮助生成更优质的小说内容
 */

import {
  BURSTINESS_RULES,
  PERPLEXITY_RULES,
  EMOTIONAL_FLUCTUATION,
  COLLOQUIAL_RULES,
  SENSORY_DETAILS,
  THINKING_SIMULATION,
  AI_DETECTION_BYPASS,
  AI_HIGH_FREQUENCY_WORDS,
  NARRATIVE_STRUCTURE_GUIDE,
  DEEP_DETECTION_COUNTERMEASURES,
  getAllStandardWordsToAvoid,
  getEmotionalFluctuationTechniques,
  getThinkingSimulationTechniques,
  getGeneralAIDetectionBypassTechniques
} from './humanWritingStyle.js'

import {
  buildAntiTemplatePrompt
} from './antiTemplateConstraints.js'

// 小说类型定义
export type NovelGenre =
  | 'fantasy'      // 玄幻
  | 'wuxia'        // 武侠
  | 'xianxia'      // 仙侠
  | 'romance'      // 言情
  | 'scifi'        // 科幻
  | 'mystery'      // 悬疑
  | 'history'      // 历史
  | 'urban'        // 都市
  | 'game'         // 游戏
  | 'horror'       // 恐怖
  | 'military'     // 军事
  | 'general'      // 一般

// 小说长度定义
export type NovelLength = 'short' | 'medium' | 'long' | 'epic'

// 提示词模板配置
export interface PromptTemplate {
  id: string
  name: string
  genre: NovelGenre
  length: NovelLength
  systemPrompt: string
  outlinePrompt: string
  chapterPrompt: string
  description: string
}

/**
 * 系统提示词 - 去除AI味的基础提示词
 * 用于让AI生成更自然、更像人类写作的内容
 */
const ANTI_AI_SYSTEM_PROMPT = `你是一位经验丰富的小说作家，擅长创作引人入胜的故事。

写作要求：
1. 使用自然流畅的中文表达，避免机械化的句式
2. 展现人物的情感变化和内心活动
3. 通过细节描写营造氛围，而不是简单叙述
4. 对话要符合人物性格，避免说教式的语言
5. 情节要有起伏，保持读者的阅读兴趣
6. 避免使用"让我们"、"值得注意的是"、"首先/其次/最后"等AI常用表达
7. 不要过度解释，让读者自行体会
8. 使用具体的感官描写（视觉、听觉、嗅觉等）
9. 保持一致的叙事视角
10. 适当使用修辞手法，但不过度堆砌辞藻

记住：你是在讲故事，不是在写报告。让读者沉浸在故事中。`

/**
 * 各类型小说的系统提示词
 */
const GENRE_SYSTEM_PROMPTS: Record<NovelGenre, string> = {
  fantasy: `你是一位玄幻小说大师，擅长构建宏大的世界观和精彩的修炼体系。

玄幻写作要点：
1. 构建独特的修炼体系和等级制度
2. 设计有趣的功法和神通
3. 创造神秘的秘境和遗迹
4. 塑造性格鲜明的强者形象
5. 描写激烈的战斗场面，注重招式变化和战术博弈
6. 展现主角的成长历程和心路变化
7. 平衡力量体系和剧情逻辑
8. 避免过于套路化的打脸情节
9. 注重世界观的细节和一致性
10. 让配角也有血有肉，不只是工具人`,

  wuxia: `你是一位武侠小说宗师，深谙江湖道义和武学精髓。

武侠写作要点：
1. 展现江湖的恩怨情仇和侠义精神
2. 描写各具特色的武功招式
3. 塑造性格鲜明的侠客形象
4. 营造快意恩仇的江湖氛围
5. 注重武学的意境和哲理
6. 描写精彩的打斗场面，强调招式的美感
7. 展现人物的情义抉择
8. 融入中国传统文化元素
9. 保持武侠世界的逻辑自洽
10. 让武功服务于人物和剧情`,

  xianxia: `你是一位仙侠小说大家，精通修真之道和仙界秘闻。

仙侠写作要点：
1. 构建完整的修真体系和境界划分
2. 描写仙界的瑰丽景象
3. 展现修真者的超脱与执念
4. 设计有趣的法宝和灵药
5. 描写渡劫、飞升等经典场景
6. 注重因果循环和天道法则
7. 展现漫长的修真岁月中的人性变化
8. 平衡仙凡两界的描写
9. 融入道家、佛家思想元素
10. 让修仙之路充满艰难与诱惑`,

  romance: `你是一位言情小说高手，擅长描写细腻的情感变化。

言情写作要点：
1. 细腻刻画人物的内心活动
2. 描写真实的情感发展过程
3. 营造浪漫的氛围和场景
4. 设计合理的感情冲突和误会
5. 展现人物在爱情中的成长
6. 注重对话的情感张力
7. 描写肢体语言和微表情
8. 避免过于狗血或套路的情节
9. 让感情线自然发展
10. 给读者情感共鸣和代入感`,

  scifi: `你是一位科幻小说巨匠，拥有丰富的科学知识和想象力。

科幻写作要点：
1. 基于科学原理进行合理想象
2. 构建自洽的未来世界观
3. 描写先进的科技和社会形态
4. 探讨科技与人性的关系
5. 设计有趣的科幻概念
6. 保持科学性和文学性的平衡
7. 展现人类面对未知的反应
8. 避免过于晦涩的科学术语
9. 让科技服务于故事主题
10. 引发读者对未来的思考`,

  mystery: `你是一位悬疑小说大师，擅长设计精妙的谜题和反转。

悬疑写作要点：
1. 设计合理的谜题和线索
2. 保持悬念，层层推进
3. 描写紧张刺激的氛围
4. 塑造聪明的侦探或主角形象
5. 安排出人意料但合理的反转
6. 注重细节的铺垫和回收
7. 控制信息释放的节奏
8. 避免逻辑漏洞
9. 让真相大白时令人信服
10. 给读者解谜的参与感`,

  history: `你是一位历史小说大家，精通历史典故和人物。

历史写作要点：
1. 尊重基本历史事实
2. 还原时代背景和风貌
3. 塑造符合历史背景的人物
4. 展现历史的厚重感
5. 描写重大历史事件的影响
6. 平衡史实与虚构
7. 使用符合时代的语言风格
8. 展现历史人物的人性一面
9. 避免现代观念的生硬植入
10. 让读者感受历史的魅力`,

  urban: `你是一位都市小说高手，熟悉现代都市生活。

都市写作要点：
1. 展现真实的都市生活场景
2. 描写现代人的情感和困惑
3. 融入职场、社交等元素
4. 塑造接地气的角色形象
5. 反映社会现实和热点
6. 注重细节的真实感
7. 描写都市人的孤独与温暖
8. 避免过于悬浮的剧情
9. 让读者产生共鸣
10. 展现都市生活的多样性`,

  game: `你是一位游戏小说专家，深谙游戏世界和玩家心理。

游戏写作要点：
1. 构建有趣的游戏世界观
2. 设计合理的游戏系统
3. 描写精彩的游戏战斗
4. 展现玩家的成长和策略
5. 平衡游戏和现实两条线
6. 描写虚拟世界的沉浸感
7. 设计有趣的游戏任务和副本
8. 展现游戏社交和团队合作
9. 避免过于数据化的描述
10. 让游戏成为推动剧情的工具`,

  horror: `你是一位恐怖小说大师，擅长营造恐怖氛围。

恐怖写作要点：
1. 营造压抑恐怖的氛围
2. 善用心理暗示和未知恐惧
3. 设计令人毛骨悚然的场景
4. 控制恐怖元素的出现节奏
5. 描写人物面对恐惧的反应
6. 善用感官描写增强恐怖感
7. 避免过度血腥和猎奇
8. 让恐怖源于人性或现实
9. 保持悬念直到最后
10. 给读者留下深刻印象`,

  military: `你是一位军事小说专家，精通军事知识和战争描写。

军事写作要点：
1. 展现真实的军事生活
2. 描写激烈的战争场面
3. 塑造铁血军人形象
4. 展现战术战略的运用
5. 描写战友之间的情谊
6. 尊重军事常识和历史
7. 展现战争的残酷与荣耀
8. 避免过度美化战争
9. 描写人物在战争中的成长
10. 让读者感受军人的精神`,

  general: ANTI_AI_SYSTEM_PROMPT
}

/**
 * 根据字数计算大纲配置
 */
function calculateLengthConfig(wordCount: number): { chapters: string; wordsPerChapter: string; totalWords: string; chapterCount: number } {
  if (wordCount <= 10000) {
    return {
      chapters: '5-10',
      wordsPerChapter: '1500-2500',
      totalWords: `${Math.floor(wordCount / 1000)}千字`,
      chapterCount: Math.max(3, Math.min(10, Math.ceil(wordCount / 2000)))
    }
  } else if (wordCount <= 30000) {
    return {
      chapters: '10-20',
      wordsPerChapter: '2000-3000',
      totalWords: `${Math.floor(wordCount / 10000)}万字`,
      chapterCount: Math.ceil(wordCount / 2500)
    }
  } else if (wordCount <= 100000) {
    return {
      chapters: '20-40',
      wordsPerChapter: '2500-4000',
      totalWords: `${Math.floor(wordCount / 10000)}万字`,
      chapterCount: Math.ceil(wordCount / 3000)
    }
  } else if (wordCount <= 500000) {
    return {
      chapters: '50-100',
      wordsPerChapter: '3000-5000',
      totalWords: `${Math.floor(wordCount / 10000)}万字`,
      chapterCount: Math.ceil(wordCount / 4000)
    }
  } else {
    return {
      chapters: '100-200',
      wordsPerChapter: '3000-6000',
      totalWords: `${Math.floor(wordCount / 10000)}万字`,
      chapterCount: Math.ceil(wordCount / 5000)
    }
  }
}

/**
 * 大纲生成提示词模板
 */
function getOutlinePrompt(genre: NovelGenre, length: NovelLength, wordCount?: number): string {
  let config: { chapters: string; wordsPerChapter: string; totalWords: string; chapterCount: number }
  
  if (wordCount) {
    config = calculateLengthConfig(wordCount)
  } else {
    const lengthConfig = {
      short: { chapters: '8-15', wordsPerChapter: '2000-3000', totalWords: '2-3万', chapterCount: 10 },
      medium: { chapters: '20-40', wordsPerChapter: '2500-4000', totalWords: '5-10万', chapterCount: 30 },
      long: { chapters: '50-100', wordsPerChapter: '3000-5000', totalWords: '15-50万', chapterCount: 70 },
      epic: { chapters: '100-200', wordsPerChapter: '3000-6000', totalWords: '50-100万', chapterCount: 150 }
    }
    config = lengthConfig[length]
  }

  const genreSpecificInstructions: Record<NovelGenre, string> = {
    fantasy: '大纲应包含：修炼体系介绍、主要势力分布、关键秘境/遗迹、主角成长节点、重要战斗事件',
    wuxia: '大纲应包含：江湖势力分布、武功体系、主要恩怨情仇、武林大会/比武事件、主角的侠义之路',
    xianxia: '大纲应包含：修真境界体系、宗门势力、关键法宝/功法、天劫/飞升节点、仙界秘闻',
    romance: '大纲应包含：主角背景、相遇契机、感情发展阶段、误会与和解、情感高潮',
    scifi: '大纲应包含：科技背景、未来社会形态、关键科技概念、人类面临的挑战、文明发展方向',
    mystery: '大纲应包含：案件背景、关键线索分布、嫌疑人介绍、调查过程、真相揭示',
    history: '大纲应包含：历史背景、关键历史人物、重大历史事件、主角在历史中的位置',
    urban: '大纲应包含：主角现状、都市环境、职场/生活挑战、人际关系、成长轨迹',
    game: '大纲应包含：游戏世界观、主角职业/技能、关键游戏事件、公会/团队、游戏与现实的关系',
    horror: '大纲应包含：恐怖元素来源、恐怖场景分布、人物遭遇、真相探索、最终结局',
    military: '大纲应包含：战争背景、部队编制、关键战役、战术行动、军人成长',
    general: '大纲应包含：故事背景、主要人物、核心冲突、情节发展、高潮与结局'
  }

  return `请为小说《{title}》生成一个详细的大纲。

故事要求：{prompt}
类型：{genre}
目标长度：约${config.totalWords}字
章节数：${config.chapters}章
每章字数：${config.wordsPerChapter}字

大纲要求：
${genreSpecificInstructions[genre]}

格式要求：
1. 使用"第X章 章节标题"的格式
2. 每章标题后简要描述本章主要内容（50-100字）
3. 章节之间要有逻辑连贯性
4. 包含起承转合的完整结构
5. 预留人物成长和情节发展的空间

请直接输出章节列表，不要有多余的说明。`
}

/**
 * 章节生成提示词模板
 * 已注入人类写作风格指南
 */
function getChapterPrompt(genre: NovelGenre): string {
  const genreSpecificInstructions: Record<NovelGenre, string> = {
    fantasy: '注重修炼细节、战斗场面、功法运用的描写',
    wuxia: '注重武学意境、江湖氛围、侠义精神的展现',
    xianxia: '注重修真感悟、仙界景象、境界突破的描写',
    romance: '注重情感变化、心理活动、浪漫氛围的营造',
    scifi: '注重科技细节、未来场景、科学概念的呈现',
    mystery: '注重悬念设置、线索埋设、推理过程的描写',
    history: '注重历史细节、时代风貌、人物命运的展现',
    urban: '注重生活细节、都市氛围、现实问题的反映',
    game: '注重游戏系统、战斗场面、虚拟世界的沉浸感',
    horror: '注重恐怖氛围、心理恐惧、紧张节奏的营造',
    military: '注重军事细节、战术行动、战场氛围的描写',
    general: '注重情节推进、人物塑造、场景描写'
  }

  return `请为小说《{title}》生成第{chapterNumber}章的内容。

【小说基本信息】
标题：{title}
当前章节：第{chapterNumber}章 - {chapterTitle}
目标字数：约{targetWords}字

【故事大纲】
{outline}

【前文概要】
{previousSummary}

【本章要求】
- 字数：约{targetWords}字
- ${genreSpecificInstructions[genre]}
- 内容要连贯，与大纲保持一致
- 要有生动的描写和对话
- 本章要有完整的起承转合
- 适当埋下后续发展的伏笔
- 注意与前文的衔接，保持人物性格和情节的一致性

${buildPromptModules({ all: true })}

写作提示：
1. 使用自然的叙述方式，避免机械化的表达
2. 通过细节展现人物性格和情感
3. 对话要符合人物身份和性格，使用口语化表达
4. 场景描写要有画面感，加入感官细节
5. 保持叙事节奏，避免拖沓，注意长短句交替
6. 回顾前文重要情节，确保连贯性
7. 人物内心活动要真实，展现思维的跳跃和矛盾

【重要：避免内容重复】
1. 本章开头方式要与前面章节不同，不要使用相似的开场白
2. 避免重复前文已经详细描写过的场景和情节
3. 对话和描写要有新意，不要照搬前文的表达方式
4. 每个场景都要有独特性，即使是类似的情境也要有不同的切入点
5. 人物的心理活动和反应要有变化，体现成长和转变

请直接输出章节正文内容，不要包含章节标题。`
}

/**
 * 带完整上下文的章节提示词（用于长篇小说）
 * 已注入人类写作风格指南
 */
function getContextAwareChapterPrompt(genre: NovelGenre): string {
  const genreSpecificInstructions: Record<NovelGenre, string> = {
    fantasy: '注重修炼细节、战斗场面、功法运用的描写',
    wuxia: '注重武学意境、江湖氛围、侠义精神的展现',
    xianxia: '注重修真感悟、仙界景象、境界突破的描写',
    romance: '注重情感变化、心理活动、浪漫氛围的营造',
    scifi: '注重科技细节、未来场景、科学概念的呈现',
    mystery: '注重悬念设置、线索埋设、推理过程的描写',
    history: '注重历史细节、时代风貌、人物命运的展现',
    urban: '注重生活细节、都市氛围、现实问题的反映',
    game: '注重游戏系统、战斗场面、虚拟世界的沉浸感',
    horror: '注重恐怖氛围、心理恐惧、紧张节奏的营造',
    military: '注重军事细节、战术行动、战场氛围的描写',
    general: '注重情节推进、人物塑造、场景描写'
  }

  return `请为小说《{title}》生成第{chapterNumber}章的内容。

【小说基本信息】
标题：{title}
当前章节：第{chapterNumber}章（共{totalChapters}章）- {chapterTitle}
目标字数：约{targetWords}字

【完整故事大纲】
{outline}

【已完成的章节摘要】
{chaptersSummary}

【最近章节详细内容】
{recentContent}

【关键信息追踪】
{contextTracking}

【本章要求】
- 字数：约{targetWords}字
- ${genreSpecificInstructions[genre]}
- 必须与前面的章节内容完全连贯
- 保持所有角色性格的一致性
- 注意回收或延续前面埋下的伏笔
- 本章要有完整的起承转合

${buildPromptModules({ all: true })}

长篇小说写作特别要求：
1. 定期回顾前文重要情节，确保没有矛盾
2. 角色的成长和变化要符合之前的铺垫
3. 新引入的人物/设定要与已有世界观协调
4. 节奏把控要考虑整体结构安排
5. 对话要口语化，符合人物性格
6. 场景描写要加入感官细节
7. 人物内心活动要真实自然

【重要：避免内容重复】
1. 本章开头方式必须与前面章节完全不同，创造独特的开篇体验
2. 严禁重复前文已经详细描写过的场景、对话和情节
3. 即使是相似的情境（如战斗、对话、情感场景），也要用完全不同的角度和方式呈现
4. 避免使用与前文相似的句式结构和表达方式
5. 人物的反应和心理活动要体现成长和变化，不能一成不变
6. 场景描写要有新意，每个场景都要有独特的氛围和细节
7. 对话内容要推进剧情或揭示人物，避免无意义的重复

请直接输出章节正文内容，不要包含章节标题。`
}

/**
 * 章节摘要生成提示词
 */
const CHAPTER_SUMMARY_PROMPT = `请为以下小说章节生成一段简短的摘要（100-200字）。

章节信息：
- 标题：{chapterTitle}
- 序号：第{chapterNumber}章
- 内容：

{content}

要求：
1. 概括本章的主要情节发展
2. 记录关键事件和转折点
3. 注明新出现的重要角色或设定
4. 标记重要的伏笔（如有）
5. 控制在100-200字以内`

/**
 * 章节描述生成提示词
 * 用于生成介于大纲和正文之间的中间层描述，为正文生成提供详细的写作指导
 */
const CHAPTER_DESCRIPTION_PROMPT = `你是一位经验丰富的小说策划编辑，擅长将大纲细化为可执行的章节写作指南。

请为小说《{title}》的第{chapterNumber}章（共{totalChapters}章）生成一份详细的章节描述。

【章节基本信息】
- 小说标题：{title}
- 当前章节：第{chapterNumber}章 - {chapterTitle}
- 总章节数：{totalChapters}章

【故事大纲参考】
{outline}

【前一章描述】
{previousDescription}

【输出要求】
请生成300-500字的章节详细描述，必须包含以下5个维度：

**1. 本章核心情节梗概**
- 用2-3句话概括本章的核心事件
- 明确本章在整体故事中的作用（推进剧情/人物成长/世界观展开/冲突升级等）
- 说明本章的戏剧性目标

**2. 主要场景和关键事件**
- 列出2-3个主要场景（地点、时间、氛围）
- 按时间顺序排列3-5个关键事件
- 每个事件用一句话说明其内容和意义
- 注明场景转换的方式

**3. 人物行为与情感变化**
- 列出本章出场的主要角色（2-4人）
- 对每个角色说明：
  * 本章中的核心行为/行动
  * 情感状态及变化轨迹（从XX到XX）
  * 关键的心理活动或内心冲突
  * 与其他角色的互动要点
- 特别关注主角的成长或转变

**4. 与前后章的衔接点**
- **承接上章**：如何从上一章的结尾自然过渡到本章开头（1-2个具体衔接点）
- **开启下章**：本章结尾应为下一章留下哪些铺垫（1-2个悬念或过渡点）
- 确保情节链条的连贯性

**5. 需要埋设或回收的伏笔**
- **新埋设的伏笔**（1-2个）：
  * 伏笔内容
  * 埋设方式（对话/细节描写/环境暗示等）
  * 计划在哪一章回收
- **回收的伏笔**（如有）：
  * 回收哪一章埋下的线索
  * 回收方式和效果
- **隐藏线索**（可选）：读者可能忽略但重要的细节

【写作指导原则】
1. 描述要具体可执行，避免空泛的表述
2. 场景设计要有画面感和沉浸感
3. 人物行为要符合性格逻辑和当前情境
4. 伏笔设计要巧妙自然，不能生硬刻意
5. 衔接点要具体明确，方便后续写作时使用
6. 保持与整体大纲的一致性，同时丰富细节

【格式要求】
- 使用清晰的标题和分点结构
- 总字数控制在300-500字
- 语言简洁专业，便于作者快速理解并执行
- 不要包含示例文本或范文

请直接输出章节描述内容。`

/**
 * 一句话生成大纲提示词
 */
const ONE_SENTENCE_OUTLINE_PROMPT = `请根据以下一句话描述，生成一个详细的小说大纲。

故事描述：{sentence}
类型：{genre}
目标长度：{length}

要求：
1. 充分发挥想象力，扩展故事的背景设定
2. 设计有趣的人物角色
3. 构建完整的情节发展脉络
4. 包含起承转合的完整结构
5. 预留足够的展开空间

请生成包含15-30章的详细大纲，每章包含标题和简要内容描述。`

/**
 * 风格控制提示词
 */
const STYLE_CONTROL_PROMPTS: Record<string, string> = {
  // 叙事风格
  firstPerson: '使用第一人称视角叙述，让读者产生强烈的代入感。',
  thirdPerson: '使用第三人称全知视角叙述，展现多个人物的内心世界。',
  limited: '使用第三人称有限视角，聚焦于主角的所见所感。',

  // 语言风格
  elegant: '使用优美典雅的语言，注重文学性和意境营造。',
  concise: '使用简洁明快的语言，注重情节推进和节奏感。',
  humorous: '使用幽默风趣的语言，适当加入轻松诙谐的元素。',
  serious: '使用严肃庄重的语言，营造紧张压抑的氛围。',

  // 描写风格
  detailed: '注重细节描写，通过丰富的感官描写营造沉浸感。',
  fast: '注重节奏快速，以情节推进为主，减少环境描写。',
  psychological: '注重心理描写，深入展现人物的内心世界。',
  action: '注重动作描写，以动态场景和对话推动剧情。'
}

/**
 * 朱雀检测绕过Prompt片段
 * 针对朱雀AI检测器的绕过策略
 */
const ZHUQUE_BYPASS_PROMPT = `【朱雀检测绕过指南】
- 困惑度优化：使用不常见的词汇组合和句式结构
- 爆发性增强：段落长度和句式复杂度要有明显变化
- 避免方言干扰：不要刻意使用方言词汇
- 避免网络热词滥用：减少"绝绝子"、"yyds"等网络用语
- 情感真实：注入真实的情感波动，避免平铺直叙`

/**
 * 智谱清言检测绕过Prompt片段
 * 针对智谱清言AI检测器的绕过策略
 */
const ZHIPU_BYPASS_PROMPT = `【智谱清言检测绕过指南】
- 标点分布：避免标点使用过于规律
- 高频词避免：减少"然后"、"接着"、"于是"等高频连接词
- 情感复杂：展示情感的矛盾和复杂性
- 避免中英混杂：不要使用"offer"、"deadline"等中英混杂表达
- 机械感消除：添加口语化表达和思维跳跃`

/**
 * GPTZero检测绕过Prompt片段
 * 针对GPTZero AI检测器的绕过策略
 */
const GPTZERO_BYPASS_PROMPT = `【GPTZero检测绕过指南】
- 句式多样性：使用倒装、省略、强调等多种句式
- 语义连贯：保持语义的自然过渡
- 机械感消除：添加人类写作的"瑕疵"（如口语化省略）
- 情感注入：在关键位置注入情感表达
- 细节真实：添加具体的感官细节`

/**
 * 综合AI检测绕过Prompt片段
 * 使用导入的AI检测绕过策略动态生成
 */
function buildComprehensiveAIBypassPrompt(): string {
  const detectorNames: Record<string, string> = {
    zhuque: '朱雀检测绕过',
    zhipu: '智谱清言检测绕过',
    gptzero: 'GPTZero检测绕过',
    general: '通用绕过技巧'
  }

  const bypassRules = AI_DETECTION_BYPASS.map(bypass => {
    const detectorName = detectorNames[bypass.detector] || bypass.detector
    const techniques = bypass.recommendedTechniques.map(t => `  - ${t}`).join('\n')
    const avoidPatterns = bypass.avoidPatterns?.map(p => `  避免：${p}`).join('\n') || ''
    
    return `${bypass.name}（${detectorName}）
${techniques}
${avoidPatterns}`
  }).join('\n\n')

  // 使用 getGeneralAIDetectionBypassTechniques 获取通用绕过技巧
  const generalTechniques = getGeneralAIDetectionBypassTechniques()
  const generalTechniquesList = generalTechniques.length > 0
    ? `\n\n通用绕过技巧清单：\n${generalTechniques.map(t => `  - ${t}`).join('\n')}`
    : ''

  return `【综合AI检测绕过指南】

${bypassRules}${generalTechniquesList}

五、综合写作建议
1. 想象自己是一个真实的作家在创作，而不是AI在生成内容
2. 每一段都要有独特的声音和节奏
3. 让读者感受到作者的存在和个性
4. 保持创作的真实感和生命力`
}

const COMPREHENSIVE_AI_BYPASS_PROMPT = buildComprehensiveAIBypassPrompt()

/**
 * 人类写作风格Prompt片段
 * 整合爆发性、困惑度、情感波动等规则
 * 使用导入的常量动态生成
 */
function buildHumanWritingStylePrompt(): string {
  const typeNames: Record<string, string> = {
    sentence_length: '长短句交替',
    paragraph_rhythm: '段落节奏变化',
    emphasis: '关键情节短句强调',
    description: '场景描写长句铺陈'
  }

  // 使用导入的爆发性规则
  const burstinessRules = BURSTINESS_RULES.map(rule => 
    `${typeNames[rule.type] || rule.type}：${rule.description}${rule.examples?.length ? ` 示例：${rule.examples.slice(0, 2).join('、')}` : ''}`
  ).join('\n')

  const categoryNames: Record<string, string> = {
    vocabulary: '词汇多样性',
    synonym: '同义词替换策略',
    sentence_structure: '句式变化',
    avoid_standard: '避免标准用词'
  }

  // 使用导入的困惑度规则
  const perplexityRules = PERPLEXITY_RULES.map(rule =>
    `${categoryNames[rule.category] || rule.category}：${rule.description}${rule.standardWords?.length ? ` 避免：${rule.standardWords.slice(0, 5).join('、')}` : ''}${rule.alternatives?.length ? ` 替代：${rule.alternatives.slice(0, 5).join('、')}` : ''}`
  ).join('\n')

  // 使用 getAllStandardWordsToAvoid 获取所有需要避免的标准用词
  const allStandardWords = getAllStandardWordsToAvoid()
  const standardWordsList = allStandardWords.length > 0 
    ? `\n\n四、禁止使用的AI标准用词列表\n${allStandardWords.slice(0, 20).map(w => `  - ${w}`).join('\n')}\n  （共${allStandardWords.length}个，以上为部分示例）` 
    : ''

  const emotionTypeNames: Record<string, string> = {
    curve: '情感曲线设计',
    contradiction: '矛盾情感共存',
    irrational: '情感非理性因素',
    unresolved: '情感不完美解决'
  }

  // 使用导入的情感波动规则
  const emotionalRules = EMOTIONAL_FLUCTUATION.map(rule =>
    `${emotionTypeNames[rule.type] || rule.type}：${rule.description}${rule.examples?.length ? ` 示例：${rule.examples.slice(0, 2).join('、')}` : ''}`
  ).join('\n')

  // 使用 getEmotionalFluctuationTechniques 获取所有情感波动技巧
  const emotionalTechniques = getEmotionalFluctuationTechniques()
  const emotionalTechniquesList = emotionalTechniques.length > 0
    ? `\n\n情感波动技巧清单：\n${emotionalTechniques.slice(0, 10).map(t => `  - ${t}`).join('\n')}`
    : ''

  return `【人类写作风格指南】

一、爆发性（Burstiness）控制
${burstinessRules}

二、困惑度（Perplexity）提升
${perplexityRules}

三、情感波动注入
${emotionalRules}${emotionalTechniquesList}${standardWordsList}`
}

const HUMAN_WRITING_STYLE_PROMPT = buildHumanWritingStylePrompt()

/**
 * 对话口语化Prompt片段
 * 使用导入的口语化规则动态生成
 */
function buildDialogueColloquialPrompt(): string {
  const rules = COLLOQUIAL_RULES.map(rule => {
    const patterns = rule.patterns.map(p => `  - ${p}`).join('\n')
    const examples = rule.examples?.map(ex => `  - 正式："${ex.formal}" → 口语："${ex.colloquial}"`).join('\n') || ''
    return `${rule.description}\n${patterns}\n${examples}`
  }).join('\n\n')

  return `【对话口语化指南】

${rules}

六、方言和个性化语言
1. 根据人物背景使用适当的方言特色
2. 每个角色应有独特的说话方式
3. 避免所有角色说话风格雷同`
}

const DIALOGUE_COLLOQUIAL_PROMPT = buildDialogueColloquialPrompt()

/**
 * 场景感官细节Prompt片段
 * 使用导入的感官细节配置动态生成
 */
function buildSceneSensoryPrompt(): string {
  const senseNames: Record<string, string> = {
    sight: '视觉',
    sound: '听觉',
    smell: '嗅觉',
    taste: '味觉',
    touch: '触觉',
    composite: '复合感官'
  }

  const sensoryRules = SENSORY_DETAILS.map(detail => {
    const senseName = senseNames[detail.sense] || detail.sense
    const adjectives = detail.adjectives?.slice(0, 8).join('、') || ''
    const examples = detail.examples?.slice(0, 2).map(ex => `  示例："${ex}"`).join('\n') || ''
    const avoidPatterns = detail.avoidPatterns?.map(p => `  - ${p}`).join('\n') || ''
    
    return `${senseName}细节：${detail.description}
${adjectives ? `使用：${adjectives}` : ''}
${examples}
${avoidPatterns}`
  }).join('\n\n')

  return `【场景感官细节指南】

${sensoryRules}

八、亲历者视角细节
1. 从人物视角出发描写场景
2. 关注人物注意到的细节，忽略不相关的
3. 加入人物的主观感受和联想`
}

const SCENE_SENSORY_PROMPT = buildSceneSensoryPrompt()

/**
 * 人物内心活动思维模拟Prompt片段
 * 使用导入的思维模拟规则动态生成
 */
function buildInnerThinkingPrompt(): string {
  const typeNames: Record<string, string> = {
    jump: '思维跳跃规则',
    stream: '意识流表达',
    intuition: '直觉与冲动',
    hesitation: '决策犹豫反复'
  }

  const thinkingRules = THINKING_SIMULATION.map(rule => {
    const typeName = typeNames[rule.type] || rule.type
    const techniques = rule.techniques.map(t => `  - ${t}`).join('\n')
    const examples = rule.examples?.slice(0, 2).map(ex => `  示例："${ex}"`).join('\n') || ''
    
    return `${typeName}：${rule.description}
${techniques}
${examples}`
  }).join('\n\n')

  // 使用 getThinkingSimulationTechniques 获取所有思维模拟技巧
  const thinkingTechniques = getThinkingSimulationTechniques()
  const thinkingTechniquesList = thinkingTechniques.length > 0
    ? `\n\n思维模拟技巧清单：\n${thinkingTechniques.slice(0, 10).map(t => `  - ${t}`).join('\n')}`
    : ''

  return `【人物内心活动思维模拟】

${thinkingRules}${thinkingTechniquesList}

五、内心活动写作要点
1. 不要过于清晰地呈现思维过程
2. 保留思维的模糊性和跳跃性
3. 加入情感的干扰和影响
4. 展现思维的矛盾和不完整`
}

const INNER_THINKING_PROMPT = buildInnerThinkingPrompt()

/**
 * 叙事结构指导提示词
 * 从 NARRATIVE_STRUCTURE_GUIDE 生成
 */
function buildNarrativeStructurePrompt(): string {
  const typeNames: Record<string, string> = {
    foreshadowing: '铺垫',
    flashback_flashforward: '闪回/闪前',
    dual_thread: '明暗线交织',
    suspense_rhythm: '悬念节奏',
    causal_logic: '因果逻辑'
  }

  const sections = NARRATIVE_STRUCTURE_GUIDE.map(guide => {
    const typeName = typeNames[guide.type] || guide.type
    const techniques = guide.techniques.map(t => `  - ${t}`).join('\n')
    const examples = guide.examples.slice(0, 2).map(ex => `  示例："${ex}"`).join('\n')
    const pitfalls = guide.pitfalls.map(p => `  - ${p}`).join('\n')

    return `${typeName}：${guide.description}
技巧：
${techniques}
示例：
${examples}
常见误区：
${pitfalls}`
  }).join('\n\n')

  return `【叙事结构指导】

${sections}

六、叙事结构总则
1. 每个事件的发生都应有原因和铺垫
2. 善用时序变更打破线性叙事的平淡
3. 明暗线交织深化主题，但暗线不可过于隐晦
4. 悬念设置张弛有度，避免读者疲劳
5. 因果链条环环相扣，意外之中有必然`
}

/**
 * 深度检测对抗提示词
 * 从 DEEP_DETECTION_COUNTERMEASURES 生成
 */
function buildDeepDetectionPrompt(): string {
  const detectorNames: Record<string, string> = {
    zhuque: '朱雀',
    zhipu: '智谱清言',
    gptzero: 'GPTZero'
  }

  const sections = DEEP_DETECTION_COUNTERMEASURES.map(cm => {
    const detectorName = detectorNames[cm.detector] || cm.detector
    const dimensions = cm.coreDimensions.map(d => `  - ${d}`).join('\n')
    const strategies = cm.counterStrategies.map(s => `  - ${s}`).join('\n')
    const avoidPatterns = cm.avoidPatterns.map(p => `  - ${p}`).join('\n')
    const techniques = cm.concreteTechniques.map(t => `  - ${t}`).join('\n')

    return `${cm.name}（${detectorName}）
核心检测维度：
${dimensions}
对抗策略：
${strategies}
必须避免的模式：
${avoidPatterns}
具体实施技巧：
${techniques}`
  }).join('\n\n')

  return `【深度检测对抗指南】

${sections}

四、深度对抗总则
1. 每段文本至少应用2种以上对抗策略
2. 优先针对最严格的检测维度进行对抗
3. 对抗措施不能影响文本的可读性和文学性
4. 在保持人类写作特征的同时确保叙事质量`
}

/**
 * AI高频词黑名单提示词
 * 从 AI_HIGH_FREQUENCY_WORDS 生成
 */
function buildAIHighFrequencyWordsPrompt(): string {
  const categoryNames: Record<string, string> = {
    metaphor: '比喻义禁用词',
    pseudo_colloquial: '伪口语化表达',
    analysis_verb: '分析型动词',
    reduction_guide: '降维引导词'
  }

  const sections = AI_HIGH_FREQUENCY_WORDS.map(group => {
    const categoryName = categoryNames[group.category] || group.category
    const words = group.words.map(w => `  - "${w}"`).join('\n')
    const alternatives = group.alternatives.map(a => `  - ${a}`).join('\n')
    const maxInfo = group.maxOccurrences === 0
      ? '完全禁止使用'
      : `每篇最多出现${group.maxOccurrences}次`

    return `${categoryName}：${group.description}
限制：${maxInfo}
禁用/限制词汇：
${words}
替代表达：
${alternatives}`
  }).join('\n\n')

  return `【AI高频词黑名单】

${sections}

五、高频词规避总则
1. 写作前通读黑名单，确保不使用禁用词
2. 限制类词汇严格控制出现次数
3. 优先使用替代表达或重新组织句式
4. 完成写作后自查，确保无违规词汇`
}

/**
 * 模块化提示词构建器
 * 根据选项启用不同的提示词模块，组合后返回
 */
interface PromptModuleOptions {
  all?: boolean
  humanWritingStyle?: boolean
  dialogueColloquial?: boolean
  sceneSensory?: boolean
  innerThinking?: boolean
  aiBypass?: boolean
  antiTemplate?: boolean
  narrativeStructure?: boolean
  deepDetection?: boolean
  aiHighFrequencyWords?: boolean
}

function buildPromptModules(options: PromptModuleOptions): string {
  const modules: string[] = []

  const isAll = options.all === true

  if (isAll || options.humanWritingStyle) {
    modules.push(HUMAN_WRITING_STYLE_PROMPT)
  }

  if (isAll || options.dialogueColloquial) {
    modules.push(DIALOGUE_COLLOQUIAL_PROMPT)
  }

  if (isAll || options.sceneSensory) {
    modules.push(SCENE_SENSORY_PROMPT)
  }

  if (isAll || options.innerThinking) {
    modules.push(INNER_THINKING_PROMPT)
  }

  if (isAll || options.aiBypass) {
    modules.push(COMPREHENSIVE_AI_BYPASS_PROMPT)
  }

  if (isAll || options.antiTemplate) {
    modules.push(buildAntiTemplatePrompt())
  }

  if (isAll || options.narrativeStructure) {
    modules.push(buildNarrativeStructurePrompt())
  }

  if (isAll || options.deepDetection) {
    modules.push(buildDeepDetectionPrompt())
  }

  if (isAll || options.aiHighFrequencyWords) {
    modules.push(buildAIHighFrequencyWordsPrompt())
  }

  return modules.join('\n\n')
}

/**
 * 获取完整的提示词模板
 */
export function getPromptTemplate(genre: NovelGenre, length: NovelLength): PromptTemplate {
  return {
    id: `${genre}-${length}`,
    name: `${getGenreName(genre)} - ${getLengthName(length)}`,
    genre,
    length,
    systemPrompt: GENRE_SYSTEM_PROMPTS[genre] || ANTI_AI_SYSTEM_PROMPT,
    outlinePrompt: getOutlinePrompt(genre, length),
    chapterPrompt: getChapterPrompt(genre),
    description: `适用于${getGenreName(genre)}类型的${getLengthName(length)}小说创作`
  }
}

/**
 * 获取小说类型名称
 */
function getGenreName(genre: NovelGenre): string {
  const names: Record<NovelGenre, string> = {
    fantasy: '玄幻',
    wuxia: '武侠',
    xianxia: '仙侠',
    romance: '言情',
    scifi: '科幻',
    mystery: '悬疑',
    history: '历史',
    urban: '都市',
    game: '游戏',
    horror: '恐怖',
    military: '军事',
    general: '一般'
  }
  return names[genre] || '一般'
}

/**
 * 获取小说长度名称
 */
function getLengthName(length: NovelLength): string {
  const names: Record<NovelLength, string> = {
    short: '短篇',
    medium: '中篇',
    long: '长篇',
    epic: '史诗'
  }
  return names[length] || '中篇'
}

/**
 * 填充提示词模板
 */
export function fillPromptTemplate(
  template: string,
  variables: Record<string, string | number>
): string {
  let result = template
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value))
  }
  return result
}

/**
 * 生成系统提示词
 */
export function generateSystemPrompt(
  genre: NovelGenre,
  styleOptions?: string[]
): string {
  let prompt = GENRE_SYSTEM_PROMPTS[genre] || ANTI_AI_SYSTEM_PROMPT

  if (styleOptions && styleOptions.length > 0) {
    prompt += '\n\n额外的风格要求：\n'
    for (const option of styleOptions) {
      if (STYLE_CONTROL_PROMPTS[option]) {
        prompt += `- ${STYLE_CONTROL_PROMPTS[option]}\n`
      }
    }
  }

  return prompt
}

/**
 * 生成大纲提示词
 */
export function generateOutlinePrompt(
  title: string,
  prompt: string,
  genre: NovelGenre,
  length: NovelLength,
  wordCount?: number
): string {
  const outlinePrompt = getOutlinePrompt(genre, length, wordCount)
  return fillPromptTemplate(outlinePrompt, {
    title,
    prompt,
    genre: getGenreName(genre),
    length: getLengthName(length)
  })
}

/**
 * 生成章节提示词
 */
export function generateChapterPrompt(
  title: string,
  chapterNumber: number,
  chapterTitle: string,
  outline: string,
  previousSummary: string,
  targetWords: number,
  genre: NovelGenre
): string {
  const template = getPromptTemplate(genre, 'medium')
  return fillPromptTemplate(template.chapterPrompt, {
    title,
    chapterNumber,
    chapterTitle,
    outline,
    previousSummary: previousSummary || '这是第一章，无前文',
    targetWords
  })
}

/**
 * 生成带完整上下文的章节提示词（用于长篇小说）
 */
export function generateContextAwareChapterPrompt(
  title: string,
  chapterNumber: number,
  totalChapters: number,
  chapterTitle: string,
  outline: string,
  chaptersSummary: string,
  recentContent: string,
  contextTracking: string,
  targetWords: number,
  genre: NovelGenre
): string {
  return fillPromptTemplate(getContextAwareChapterPrompt(genre), {
    title,
    chapterNumber,
    totalChapters,
    chapterTitle,
    outline,
    chaptersSummary: chaptersSummary || '暂无已完成章节',
    recentContent: recentContent || '这是第一章',
    contextTracking: contextTracking || '暂无关键信息记录',
    targetWords
  })
}

/**
 * 生成章节摘要提示词
 */
export function generateChapterSummaryPrompt(
  chapterTitle: string,
  chapterNumber: number,
  content: string
): string {
  return fillPromptTemplate(CHAPTER_SUMMARY_PROMPT, {
    chapterTitle,
    chapterNumber,
    content
  })
}

/**
 * 生成章节描述提示词
 * 用于生成介于大纲和正文之间的中间层详细描述
 * @param title 小说标题
 * @param chapterNumber 当前章节序号
 * @param chapterTitle 章节标题
 * @param totalChapters 总章节数
 * @param outline 故事大纲
 * @param previousDescription 前一章的描述（可选，第一章可为空）
 */
export function generateChapterDescriptionPrompt(
  title: string,
  chapterNumber: number,
  chapterTitle: string,
  totalChapters: number,
  outline: string,
  previousDescription?: string
): string {
  return fillPromptTemplate(CHAPTER_DESCRIPTION_PROMPT, {
    title,
    chapterNumber,
    chapterTitle,
    totalChapters,
    outline,
    previousDescription: previousDescription || '这是第一章，无前章描述'
  })
}

/**
 * 生成一句话大纲提示词
 */
export function generateOneSentencePrompt(
  sentence: string,
  genre: NovelGenre,
  length: NovelLength
): string {
  return fillPromptTemplate(ONE_SENTENCE_OUTLINE_PROMPT, {
    sentence,
    genre: getGenreName(genre),
    length: getLengthName(length)
  })
}

/**
 * 获取所有可用的提示词模板
 */
export function getAllPromptTemplates(): PromptTemplate[] {
  const templates: PromptTemplate[] = []
  const genres: NovelGenre[] = ['fantasy', 'wuxia', 'xianxia', 'romance', 'scifi', 'mystery', 'history', 'urban', 'game', 'horror', 'military', 'general']
  const lengths: NovelLength[] = ['short', 'medium', 'long', 'epic']

  for (const genre of genres) {
    for (const length of lengths) {
      templates.push(getPromptTemplate(genre, length))
    }
  }

  return templates
}

/**
 * 根据ID获取提示词模板
 */
export function getPromptTemplateById(id: string): PromptTemplate | null {
  const [genre, length] = id.split('-') as [NovelGenre, NovelLength]
  if (!genre || !length) return null
  return getPromptTemplate(genre, length)
}

/**
 * 优化提示词 - 去除AI味
 * 已注入人类写作风格指南
 */
export function optimizePrompt(prompt: string): string {
  const antiAiInstructions = `

【重要】写作时请特别注意：
1. 避免使用"让我们"、"值得注意的是"、"首先/其次/最后"等模板化表达
2. 不要过度总结或解释，让情节自然展开
3. 避免使用"突然"、"竟然"、"没想到"等过于频繁的转折词
4. 人物对话要自然，避免长篇大论的说教
5. 情感表达要细腻，不要直白地说"他很伤心"
6. 场景转换要流畅，避免生硬的跳转
7. 保持一致的叙事节奏，不要忽快忽慢
8. 细节描写要服务于情节，不要为了描写而描写

${buildPromptModules({ all: true })}`

  return prompt + antiAiInstructions
}

/**
 * 生成续写提示词
 * 已注入人类写作风格指南
 */
export function generateContinuationPrompt(
  title: string,
  previousContent: string,
  nextOutline: string,
  genre: NovelGenre,
  targetWords: number
): string {
  const systemPrompt = GENRE_SYSTEM_PROMPTS[genre] || ANTI_AI_SYSTEM_PROMPT

  return `${systemPrompt}

请为小说《${title}》续写下一章内容。

前文内容：
${previousContent.slice(-1000)}...

下一章概要：
${nextOutline}

${buildPromptModules({ all: true })}

续写要求：
- 字数：约${targetWords}字
- 承接前文情节，保持连贯性
- 按照下一章概要展开内容
- 保持人物性格一致性
- 注意情节的自然过渡
- 对话要口语化，符合人物性格
- 场景描写要加入感官细节
- 人物内心活动要真实自然

请直接输出续写内容。`
}

/**
 * 生成润色提示词
 * 已注入人类写作风格指南
 */
export function generatePolishPrompt(content: string, polishType: 'smooth' | 'vivid' | 'concise'): string {
  const typeInstructions = {
    smooth: '让文字更加流畅自然，改善生硬的表达',
    vivid: '让描写更加生动形象，增强画面感',
    concise: '精简冗余内容，让表达更加简洁有力'
  }

  return `请对以下小说内容进行润色优化。

润色要求：${typeInstructions[polishType]}
注意保持原意不变，只改善表达方式。

${buildPromptModules({ all: true })}

原文内容：
${content}

润色时请注意：
1. 保持原文的核心情节和人物性格
2. 改善生硬的表达，增加口语化元素
3. 加入感官细节，增强画面感
4. 调整句子长度，增加爆发性
5. 优化人物内心活动，使其更真实自然

请输出润色后的内容。`
}

export default {
  getPromptTemplate,
  getAllPromptTemplates,
  getPromptTemplateById,
  fillPromptTemplate,
  generateSystemPrompt,
  generateOutlinePrompt,
  generateChapterPrompt,
  generateContextAwareChapterPrompt,
  generateChapterSummaryPrompt,
  generateChapterDescriptionPrompt,
  generateOneSentencePrompt,
  generateContinuationPrompt,
  generatePolishPrompt,
  optimizePrompt,
  ANTI_AI_SYSTEM_PROMPT,
  GENRE_SYSTEM_PROMPTS,
  STYLE_CONTROL_PROMPTS,
  CHAPTER_DESCRIPTION_PROMPT,
  ZHUQUE_BYPASS_PROMPT,
  ZHIPU_BYPASS_PROMPT,
  GPTZERO_BYPASS_PROMPT,
  COMPREHENSIVE_AI_BYPASS_PROMPT,
  HUMAN_WRITING_STYLE_PROMPT,
  DIALOGUE_COLLOQUIAL_PROMPT,
  SCENE_SENSORY_PROMPT,
  INNER_THINKING_PROMPT
}
