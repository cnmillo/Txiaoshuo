/**
 * 人类写作风格指南 (Human Writing Style Guide)
 * 
 * 本模块定义了使AI生成文本更具人类特征的风格规则和策略。
 * 目标：降低AI检测率，提升文本的自然度和可读性。
 * 
 * @module humanWritingStyle
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 爆发性规则类型
 */
export interface BurstinessRule {
  type: 'sentence_length' | 'paragraph_rhythm' | 'emphasis' | 'description';
  description: string;
  examples: string[];
  applyWeight: number; // 应用权重 0-1
}

/**
 * 困惑度控制规则
 */
export interface PerplexityRule {
  category: 'vocabulary' | 'synonym' | 'sentence_structure' | 'avoid_standard';
  description: string;
  standardWords: string[]; // 需要避免的标准用词
  alternatives: string[]; // 替代表达
  examples: { original: string; improved: string }[];
}

/**
 * 情感波动配置
 */
export interface EmotionalFluctuation {
  type: 'curve' | 'contradiction' | 'irrational' | 'unresolved';
  description: string;
  techniques: string[];
  examples: string[];
}

/**
 * 口语化表达规则
 */
export interface ColloquialRule {
  type: 'omission' | 'modal_particle' | 'incomplete' | 'rhythm';
  description: string;
  patterns: string[];
  examples: { formal: string; colloquial: string }[];
}

/**
 * 感官细节类型
 */
export interface SensoryDetail {
  sense: 'sight' | 'sound' | 'smell' | 'taste' | 'touch' | 'composite';
  description: string;
  adjectives: string[];
  examples: string[];
  avoidPatterns: string[]; // 需要避免的"完美"描写模式
}

/**
 * 思维模拟规则
 */
export interface ThinkingSimulation {
  type: 'jump' | 'stream' | 'intuition' | 'hesitation';
  description: string;
  techniques: string[];
  examples: string[];
}

/**
 * AI检测绕过策略
 */
export interface AIDetectionBypass {
  detector: 'zhuque' | 'zhipu' | 'gptzero' | 'general';
  name: string;
  keyPoints: string[];
  avoidPatterns: string[];
  recommendedTechniques: string[];
}

export interface AIHighFrequencyWord {
  category: 'metaphor' | 'pseudo_colloquial' | 'analysis_verb' | 'reduction_guide';
  words: string[];
  maxOccurrences: number;
  description: string;
  alternatives: string[];
}

export interface NarrativeStructureGuide {
  type: 'foreshadowing' | 'flashback_flashforward' | 'dual_thread' | 'suspense_rhythm' | 'causal_logic';
  description: string;
  techniques: string[];
  examples: string[];
  pitfalls: string[];
}

export interface DeepDetectionCountermeasure {
  detector: 'zhuque' | 'zhipu' | 'gptzero';
  name: string;
  coreDimensions: string[];
  counterStrategies: string[];
  avoidPatterns: string[];
  concreteTechniques: string[];
}

/**
 * 完整的人类写作风格配置
 */
export interface HumanWritingStyleConfig {
  burstiness: BurstinessRule[];
  perplexity: PerplexityRule[];
  emotionalFluctuation: EmotionalFluctuation[];
  colloquial: ColloquialRule[];
  sensoryDetails: SensoryDetail[];
  thinkingSimulation: ThinkingSimulation[];
  aiDetectionBypass: AIDetectionBypass[];
  aiHighFrequencyWords: AIHighFrequencyWord[];
  narrativeStructureGuide: NarrativeStructureGuide[];
  deepDetectionCountermeasures: DeepDetectionCountermeasure[];
}

// ============================================================================
// 1. 爆发性（Burstiness）指南
// ============================================================================

/**
 * 爆发性规则定义
 * 
 * 爆发性是指文本中句子长度和复杂度的变化程度。
 * 人类写作天然具有高爆发性，而AI写作往往趋于均匀。
 */
export const BURSTINESS_RULES: BurstinessRule[] = [
  {
    type: 'sentence_length',
    description: '长短句交替规则：在段落中刻意制造句子长度的显著差异，避免均匀分布',
    examples: [
      '他站在窗前。很久没下雨了。空气里弥漫着干燥的尘土味，让他想起小时候外婆家的那个夏天，蝉鸣声从早到晚不曾停歇，热浪一阵阵扑面而来。他叹了口气。',
      '她笑了。只是轻轻的、几乎听不见的一声笑。但那笑容里藏着太多东西——无奈、释然、还有一丝说不清道不明的苦涩，像是喝了一口放久了的茶，温吞吞的，却让人回味。',
    ],
    applyWeight: 0.9,
  },
  {
    type: 'paragraph_rhythm',
    description: '段落节奏变化：通过段落长度变化创造阅读节奏感，关键处用短段强调',
    examples: [
      '夜深了。\n\n他翻了个身，睡不着。脑子里乱糟糟的，像是有一百只蜜蜂在嗡嗡作响。\n\n算了。',
      '她看着他离去的背影，想说点什么，却什么也没说出来。喉咙像是被什么东西堵住了，酸涩得厉害。\n\n算了。\n\n都算了。',
    ],
    applyWeight: 0.85,
  },
  {
    type: 'emphasis',
    description: '关键情节短句强调：在重要转折、情感爆发、悬念揭示时使用极短句',
    examples: [
      '门开了。没有人。她僵住了。',
      '他说完这句话，转身就走。没有回头。一次也没有。',
      '那一刻，她忽然明白了。全都明白了。',
    ],
    applyWeight: 0.95,
  },
  {
    type: 'description',
    description: '场景描写长句铺陈：在环境、氛围、心理描写时使用复杂长句',
    examples: [
      '窗外的梧桐树叶子已经落了大半，枯黄的叶片在风中打着旋儿，像是喝醉了的蝴蝶，摇摇晃晃地飘向地面，偶尔有一两片贴在玻璃上，发出轻微的沙沙声，像是有人在轻轻叩门。',
      '她记得那天的阳光很好，好得有些过分，照得人睁不开眼，空气里飘着桂花的香气，甜得发腻，街上人来人往，没有人注意到一个穿着白裙子的女孩站在路边，手里攥着一张皱巴巴的纸条，眼泪无声地往下掉。',
    ],
    applyWeight: 0.8,
  },
];

// ============================================================================
// 2. 困惑度（Perplexity）控制
// ============================================================================

/**
 * 困惑度控制规则
 * 
 * 困惑度衡量文本的不可预测性。人类写作通常具有更高的困惑度，
 * 因为人类会使用更多样的词汇选择和句式结构。
 */
export const PERPLEXITY_RULES: PerplexityRule[] = [
  {
    category: 'vocabulary',
    description: '词汇多样性规则：避免重复使用相同词汇，同一段落内同义词替换率应达到30%以上',
    standardWords: ['非常', '十分', '极其', '相当'],
    alternatives: ['要命', '不行', '厉害', '够呛', '没谁了', '没话说'],
    examples: [
      { original: '她非常高兴，非常激动，非常期待。', improved: '她高兴得不行，激动得手都在抖，期待得心都要跳出来了。' },
      { original: '这个消息非常重要，影响非常深远。', improved: '这个消息要紧得很，影响能往后数好几年。' },
    ],
  },
  {
    category: 'synonym',
    description: '同义词替换策略：建立同义词库，根据语境选择最贴切的表达',
    standardWords: ['说', '回答', '表示', '认为'],
    alternatives: ['嘟囔', '嘀咕', '开口', '接话', '插嘴', '应声', '回了一句', '抛出一句'],
    examples: [
      { original: '他说："我不知道。"', improved: '他嘟囔了一句："谁知道呢。"' },
      { original: '她回答说："好的。"', improved: '她应了一声："行吧。"' },
    ],
  },
  {
    category: 'sentence_structure',
    description: '句式变化规则：同一意思用不同句式表达，避免模板化',
    standardWords: [],
    alternatives: [],
    examples: [
      { original: '他感到很失望。', improved: '失望？不，比失望更糟，是那种说不出来的空落落。' },
      { original: '她决定去见他。', improved: '见他？不见？她在门口站了很久，最后还是敲响了门。' },
      { original: '这是一个很好的机会。', improved: '机会？也许吧。但总觉得哪里不对劲。' },
    ],
  },
  {
    category: 'avoid_standard',
    description: '避免"标准"用词：识别并替换AI常用的标准化表达',
    standardWords: [
      '首先', '其次', '最后', '总之', '综上所述',
      '值得注意的是', '需要指出的是', '不可否认的是',
      '具有重要意义', '产生了深远影响', '发挥了关键作用',
      '与此同时', '在此基础上', '进一步而言',
    ],
    alternatives: [
      '先说', '再说', '还有', '话说回来', '说到底',
      '有意思的是', '说来也怪', '怪就怪在',
      '这事儿挺重要的', '影响可不小', '起了大作用',
      '同一时候', '这还不算', '再往下说',
    ],
    examples: [
      { original: '首先，我们需要考虑这个问题的重要性。', improved: '这事儿，得从头说起。' },
      { original: '综上所述，这是一个值得深思的问题。', improved: '说到底，这事儿没那么简单。' },
    ],
  },
];

// ============================================================================
// 3. 情感波动注入
// ============================================================================

/**
 * 情感波动配置
 * 
 * 人类情感是复杂的、矛盾的、非线性的。注入情感波动使文本更具人性。
 */
export const EMOTIONAL_FLUCTUATION: EmotionalFluctuation[] = [
  {
    type: 'curve',
    description: '情感曲线设计：在叙事中设计情感的起伏变化，避免平铺直叙',
    techniques: [
      '在平静叙事中突然插入情感爆发',
      '用细节暗示情感暗流',
      '情感高潮后的余韵描写',
      '情感转折的铺垫与爆发',
    ],
    examples: [
      '她以为自己是笑着的。直到眼泪掉在手上，凉凉的，她才发现不对劲。',
      '他没说话。只是盯着那封信看了很久，久到窗外的天都暗了下来。然后他把信折好，放进口袋，像是放进了一段再也回不去的日子。',
    ],
  },
  {
    type: 'contradiction',
    description: '矛盾情感共存：展现人物内心的复杂性和矛盾性',
    techniques: [
      '爱与恨的交织',
      '期待与恐惧并存',
      '释然与不甘同在',
      '冷漠下的关心',
    ],
    examples: [
      '她恨他。恨得牙痒痒。可看到他落魄的样子，心里某个地方还是软了一下——该死的。',
      '他想走，却迈不开步子。明明知道不该留，可就是舍不得。真是没出息。',
    ],
  },
  {
    type: 'irrational',
    description: '情感非理性因素：加入不合逻辑但真实的情感反应',
    techniques: [
      '因小事触发大情绪',
      '不合时宜的笑或泪',
      '莫名其妙的烦躁或安心',
      '直觉式的喜欢或厌恶',
    ],
    examples: [
      '她不知道自己为什么突然想哭。明明是好事，可就是鼻子酸得厉害。',
      '他看到那把旧椅子，心里忽然堵得慌。明明只是把椅子，可就是觉得哪里不对。',
    ],
  },
  {
    type: 'unresolved',
    description: '情感"不完美解决"：不追求情感的圆满解决，保留遗憾和悬念',
    techniques: [
      '情感未得到明确回应',
      '和解中的隔阂',
      '原谅下的芥蒂',
      '释然里的不甘',
    ],
    examples: [
      '她原谅了他。至少，她是这么对自己说的。',
      '他们和好了。表面上。但有些东西，像是镜子上的裂痕，怎么也抹不平。',
    ],
  },
];

// ============================================================================
// 4. 口语化表达规则
// ============================================================================

/**
 * 口语化表达规则
 * 
 * 人类日常表达充满口语化特征，这是AI文本常常缺失的。
 */
export const COLLOQUIAL_RULES: ColloquialRule[] = [
  {
    type: 'omission',
    description: '句式省略规则：省略主语、谓语、连接词等，模拟真实说话习惯',
    patterns: [
      '省略主语：直接以动词开头',
      '省略谓语：只保留关键信息',
      '省略连接词：句子之间自然衔接',
      '省略修饰语：保留核心意思',
    ],
    examples: [
      { formal: '我觉得这件事情不太好处理。', colloquial: '这事儿，难办。' },
      { formal: '他不知道应该说什么才好。', colloquial: '他张了张嘴，没说出话来。' },
      { formal: '我认为我们应该尽快做出决定。', colloquial: '得快点拿主意了。' },
    ],
  },
  {
    type: 'modal_particle',
    description: '语气词使用：适当使用语气词增加口语感',
    patterns: [
      '句末语气词：啊、吧、呢、嘛、呀、哦',
      '句中语气词：嘛、呗、啦',
      '疑问语气词：吗、呢、啊',
      '感叹语气词：啊、呀、哇',
    ],
    examples: [
      { formal: '这件事确实有些困难。', colloquial: '这事儿嘛，确实有点难。' },
      { formal: '我不知道他为什么会这样做。', colloquial: '他怎么这样啊，真是的。' },
      { formal: '时间已经不早了。', colloquial: '时间不早了呢。' },
    ],
  },
  {
    type: 'incomplete',
    description: '不完整句子：使用断句、省略、中断的句子',
    patterns: [
      '话说到一半停住',
      '欲言又止的表达',
      '被打断的句子',
      '自我纠正的句子',
    ],
    examples: [
      { formal: '他想要解释，但是不知道该说什么。', colloquial: '他想解释，可——算了。' },
      { formal: '她觉得这件事情有些奇怪。', colloquial: '她觉得——不对，是哪里不对？' },
      { formal: '我不知道该怎么说这件事。', colloquial: '这事儿吧……怎么说呢……' },
    ],
  },
  {
    type: 'rhythm',
    description: '真实说话节奏：模拟人类说话的停顿、重复、犹豫',
    patterns: [
      '重复关键词强调',
      '停顿后的补充',
      '自我否定的表达',
      '追加说明',
    ],
    examples: [
      { formal: '他非常确定这个决定是正确的。', colloquial: '他确定，很确定，这事儿没错。' },
      { formal: '她对这个消息感到很惊讶。', colloquial: '她愣了一下——不，是吓了一跳。' },
      { formal: '这是一个很好的建议。', colloquial: '这建议不错，真的不错。' },
    ],
  },
];

// ============================================================================
// 5. 感官细节描写
// ============================================================================

/**
 * 感官细节配置
 * 
 * 人类通过五感体验世界，加入丰富的感官细节使文本更真实。
 */
export const SENSORY_DETAILS: SensoryDetail[] = [
  {
    sense: 'sight',
    description: '视觉细节：颜色、光影、形状、动态',
    adjectives: [
      '灰蒙蒙', '金灿灿', '暗沉沉', '亮堂堂',
      '斑驳', '朦胧', '刺眼', '昏黄',
      '一闪一闪', '影影绰绰', '若隐若现',
    ],
    examples: [
      '阳光从窗帘缝隙里挤进来，在地板上画出一道金线，灰尘在光里跳舞。',
      '她的眼睛在暗处亮得吓人，像是两团鬼火。',
    ],
    avoidPatterns: [
      '避免"美丽的""漂亮的"等泛泛形容词',
      '避免完美的、对称的描写',
      '避免过于工整的视觉呈现',
    ],
  },
  {
    sense: 'sound',
    description: '听觉细节：音量、音调、节奏、质感',
    adjectives: [
      '沙沙', '哗啦', '咚咚', '吱呀',
      '闷闷的', '尖尖的', '粗粗的', '细细的',
      '断断续续', '时高时低', '忽远忽近',
    ],
    examples: [
      '楼上的脚步声咚咚咚地响，像是谁在来回踱步，听得人心烦。',
      '风从门缝里钻进来，呜呜地响，像有人在哭。',
    ],
    avoidPatterns: [
      '避免"悦耳的""动听的"等泛泛形容词',
      '避免过于精确的声音描述',
      '避免声音的完美同步',
    ],
  },
  {
    sense: 'smell',
    description: '嗅觉细节：气味、氛围、记忆触发',
    adjectives: [
      '腥腥的', '酸酸的', '甜甜的', '涩涩的',
      '呛人', '刺鼻', '淡雅', '浓郁',
      '若有若无', '时有时无', '一阵一阵',
    ],
    examples: [
      '空气里飘着一股淡淡的霉味，像是旧书和潮湿的墙皮混在一起。',
      '她身上有股香皂味，淡淡的，像是刚洗过澡。',
    ],
    avoidPatterns: [
      '避免"芳香的""清新的"等泛泛形容词',
      '避免过于精确的气味来源',
      '避免气味的完美识别',
    ],
  },
  {
    sense: 'taste',
    description: '味觉细节：味道、口感、温度',
    adjectives: [
      '涩涩的', '麻麻的', '腻腻的', '淡淡的',
      '发苦', '发酸', '发甜', '发咸',
      '回味', '余味', '后味',
    ],
    examples: [
      '茶已经凉了，喝下去涩涩的，像是吞了一口沙子。',
      '她嘴里泛着苦味，不知道是药还是别的什么。',
    ],
    avoidPatterns: [
      '避免"美味的""可口的"等泛泛形容词',
      '避免过于精确的味道分析',
      '避免味觉的完美描述',
    ],
  },
  {
    sense: 'touch',
    description: '触觉细节：温度、质地、压力、疼痛',
    adjectives: [
      '黏糊糊', '滑溜溜', '毛糙糙', '凉丝丝',
      '刺痛', '钝痛', '酸胀', '麻木',
      '粗糙', '细腻', '柔软', '坚硬',
    ],
    examples: [
      '她的手冰凉，像是刚从冷水里捞出来，碰到他的手时，他下意识缩了一下。',
      '地板上全是灰，踩上去沙沙的，像是走在沙滩上。',
    ],
    avoidPatterns: [
      '避免"柔软的""光滑的"等泛泛形容词',
      '避免过于精确的触觉描述',
      '避免触觉的完美感知',
    ],
  },
  {
    sense: 'composite',
    description: '复合感官：多种感官交织的综合体验',
    adjectives: [
      '闷热', '阴冷', '潮湿', '干燥',
      '压抑', '空旷', '拥挤', '疏离',
    ],
    examples: [
      '屋里闷得厉害，空气像是凝固了一样，吸进去的全是热气，呼出来的还是热气。',
      '雨后的街道湿漉漉的，空气里有股泥土味，凉丝丝的风从领口灌进来，让人打了个哆嗦。',
    ],
    avoidPatterns: [
      '避免过于和谐的感官组合',
      '避免完美的感官协调',
      '避免所有感官同时出现',
    ],
  },
];

// ============================================================================
// 6. 人类思维模拟
// ============================================================================

/**
 * 人类思维模拟规则
 * 
 * 人类思维是非线性的、跳跃的、充满直觉和矛盾的。
 */
export const THINKING_SIMULATION: ThinkingSimulation[] = [
  {
    type: 'jump',
    description: '思维跳跃规则：模拟人类思维的跳跃性和联想性',
    techniques: [
      '由当前事物联想到无关记忆',
      '突然插入的无关想法',
      '被打断后转向另一话题',
      '看似无关实则相关的联想',
    ],
    examples: [
      '他盯着那杯茶，忽然想起小时候外婆家的那只猫——也是这样的下午，阳光斜斜地照进来，猫趴在窗台上打盹。他摇了摇头，把思绪拉回来。',
      '她说着说着，忽然停住了。对了，那封信呢？她放在哪儿了？',
    ],
  },
  {
    type: 'stream',
    description: '意识流表达：展现思维的流动和变化',
    techniques: [
      '内心独白与外部动作交织',
      '思绪的反复和修正',
      '自我对话和质疑',
      '情绪与思绪的混合',
    ],
    examples: [
      '他应该去的，应该去，可是去了说什么呢？说对不起？说我想你了？太矫情了。可是不去……不去又放不下。真是的，一把年纪了还这样。',
      '她看着那扇门，想敲，又不敢。敲了会怎样？不敲又会怎样？算了，还是敲吧。不，还是算了。可是……',
    ],
  },
  {
    type: 'intuition',
    description: '直觉与冲动：展现非理性的决策过程',
    techniques: [
      '说不清原因的决定',
      '突然的冲动行为',
      '直觉式的判断',
      '事后才明白的动机',
    ],
    examples: [
      '她不知道自己为什么要走那条路，就是觉得应该走。后来想想，也许是冥冥之中有什么在指引。',
      '他突然想喝咖啡，明明已经晚上了，明明喝了会睡不着，可就是想喝。于是他去了。',
    ],
  },
  {
    type: 'hesitation',
    description: '决策犹豫反复：展现人类决策的不确定性',
    techniques: [
      '反复权衡利弊',
      '决定后的动摇',
      '自我说服的过程',
      '最终的不确定',
    ],
    examples: [
      '去还是不去？去了怕尴尬，不去又遗憾。他站在门口，进也不是，退也不是。',
      '她决定了，就这样吧。可是转身的那一刻，心里又打起了鼓。真的就这样吗？',
    ],
  },
];

// ============================================================================
// 7. AI检测绕过策略
// ============================================================================

/**
 * AI检测绕过策略
 * 
 * 针对不同AI检测工具的特点，制定相应的绕过策略。
 */
export const AI_DETECTION_BYPASS: AIDetectionBypass[] = [
  {
    detector: 'zhuque',
    name: '朱雀检测绕过要点',
    keyPoints: [
      '朱雀检测对文本的统计特征敏感，需要打破均匀分布',
      '重点规避过于工整的段落结构',
      '增加口语化表达和不完整句子',
      '引入思维跳跃和意识流表达',
      '使用更多感官细节描写',
    ],
    avoidPatterns: [
      '避免每段字数相近',
      '避免句式结构的重复',
      '避免过于完整的论述结构',
      '避免标准化的过渡词使用',
    ],
    recommendedTechniques: [
      '使用长短句交替，比例控制在3:7到7:3之间变化',
      '每3-5段插入一个极短段（1-2句）',
      '在关键处使用省略号、破折号等标点',
      '增加内心独白和思维跳跃',
    ],
  },
  {
    detector: 'zhipu',
    name: '智谱清言检测绕过要点',
    keyPoints: [
      '智谱检测对语义连贯性分析较强',
      '需要增加语义的跳跃性和模糊性',
      '引入更多情感波动和矛盾表达',
      '使用口语化和方言化表达',
      '增加个人化视角和主观判断',
    ],
    avoidPatterns: [
      '避免过于逻辑严密的论述',
      '避免因果关系的明确表达',
      '避免过于客观的叙述视角',
      '避免标准化的修辞手法',
    ],
    recommendedTechniques: [
      '使用模糊表达：好像、大概、说不清',
      '引入主观感受：我觉得、不知道为什么',
      '增加情感矛盾：想笑又想哭、恨不起来',
      '使用口语化句式：这事儿、那啥、怎么说呢',
    ],
  },
  {
    detector: 'gptzero',
    name: 'GPTZero检测绕过要点',
    keyPoints: [
      'GPTZero对困惑度和爆发性指标敏感',
      '需要显著提高文本的困惑度',
      '增加爆发性：句子长度和复杂度的剧烈变化',
      '使用非常规词汇搭配',
      '引入人类特有的"不完美"表达',
    ],
    avoidPatterns: [
      '避免过于流畅的句子衔接',
      '避免标准化的词汇选择',
      '避免过于完整的段落结构',
      '避免完美的语法结构',
    ],
    recommendedTechniques: [
      '刻意使用"不完美"句子：断句、省略、重复',
      '增加非常规搭配：冷得发烫、吵得安静',
      '使用长短句极端对比：1字句与50字句相邻',
      '引入方言和口语词汇',
    ],
  },
  {
    detector: 'general',
    name: '通用AI检测绕过要点',
    keyPoints: [
      '所有AI检测工具都关注统计特征和语义模式',
      '核心策略：打破AI写作的"均匀性"和"标准性"',
      '增加人类写作特有的"不完美"和"随意性"',
      '注入个人化视角和情感体验',
      '使用口语化和生活化表达',
    ],
    avoidPatterns: [
      '避免"首先、其次、最后"等标准化结构',
      '避免"值得注意的是""需要指出的是"等AI常用表达',
      '避免过于工整的段落和句子',
      '避免过于完美的论述和总结',
      '避免标准化的过渡和衔接',
    ],
    recommendedTechniques: [
      '使用长短句交替，制造节奏变化',
      '增加口语化表达和不完整句子',
      '引入感官细节和情感波动',
      '使用思维跳跃和意识流表达',
      '增加个人化视角和主观判断',
      '使用模糊表达和不确定语气',
      '引入方言、俚语、口语词汇',
      '刻意使用"不完美"表达：重复、省略、断句',
    ],
  },
];

// ============================================================================
// 8. AI高频词黑名单
// ============================================================================

export const AI_HIGH_FREQUENCY_WORDS: AIHighFrequencyWord[] = [
  {
    category: 'metaphor',
    words: ['噪音', '背景噪音', '信号', '底色', '光谱', '滤镜', '解药', '土壤', '基因', '拼图', '镜像', '路径', '尺子', '标尺', '横截面', '切面', '切片', '透镜', '棱镜', '窗口', '缩影'],
    maxOccurrences: 0,
    description: '比喻义禁用词：这些词汇在非本义使用时具有强烈AI特征',
    alternatives: ['直接描述事物本身', '用具体场景替代抽象比喻', '用人物动作或感受替代概念化表达'],
  },
  {
    category: 'pseudo_colloquial',
    words: ['拆一拆', '拆开来看', '掰开', '掰开来看', '盘一盘', '聊一聊', '捋一捋', '盘点一下', '划重点', '敲黑板'],
    maxOccurrences: 0,
    description: '伪口语化表达：看似口语实则模板化的AI常用套话',
    alternatives: ['直接说', '用自然的口语表达', '用具体动作描写替代'],
  },
  {
    category: 'analysis_verb',
    words: ['拆解', '梳理', '剖析', '解构', '聚焦', '洞察', '深耕', '赋能', '助力', '践行', '驱动', '构建', '打造'],
    maxOccurrences: 2,
    description: '分析型动词：AI文本中高频出现的分析性动词，需严格控制使用次数',
    alternatives: ['说', '看', '想', '弄', '搞', '做', '理', '找', '试', '走'],
  },
  {
    category: 'reduction_guide',
    words: ['说白了', '本质上', '归根结底', '一句话概括', '简单来说', '换个角度看', '从某种意义上说', '不妨这样理解'],
    maxOccurrences: 1,
    description: '降维引导词：AI常用的简化归纳表达，过度使用暴露AI特征',
    alternatives: ['说到底', '其实', '不过就是', '也没什么复杂的', '直白点讲'],
  },
];

// ============================================================================
// 9. 叙事结构指导
// ============================================================================

export const NARRATIVE_STRUCTURE_GUIDE: NarrativeStructureGuide[] = [
  {
    type: 'foreshadowing',
    description: '铺垫：任何事件的产生都需要原因和前提条件，设下原因和前提条件就是为后面事件的产生做铺垫',
    techniques: [
      '提前埋下细节线索，后续自然呼应',
      '通过环境描写暗示即将发生的事件',
      '人物不经意间的言行成为后续伏笔',
      '用小事件预示大转折的到来',
    ],
    examples: [
      '他随手把钥匙放在了门口的碗里，那时候他不知道，这把钥匙三天后再也用不上了。',
      '窗台上的花已经枯了，她忘了浇水。后来她想，如果那天记得浇水，是不是就不会忘了那通电话。',
    ],
    pitfalls: [
      '铺垫过于明显，读者一眼看穿',
      '铺垫与后续事件缺乏逻辑关联',
      '铺垫过多导致节奏拖沓',
      '铺垫后忘记呼应',
    ],
  },
  {
    type: 'flashback_flashforward',
    description: '闪回/闪前：通过时序变更手法增强层次感，打破线性叙事',
    techniques: [
      '在关键时刻闪回过去，揭示人物动机',
      '用闪前暗示未来走向，制造悬念',
      '过去与现在交织，逐步揭示真相',
      '时序跳跃中保持情感连贯',
    ],
    examples: [
      '他站在病房门口，忽然想起十年前也是这样的走廊，也是这样的消毒水味。那时候走出来的是医生，告诉他的话他一辈子都忘不了。',
      '她不知道，此刻她随手放进抽屉的那张照片，五年后会成为唯一的证据。',
    ],
    pitfalls: [
      '闪回过于频繁，打断叙事节奏',
      '时序混乱，读者无法理清时间线',
      '闪回内容与主线无关',
      '闪前剧透过多，失去悬念',
    ],
  },
  {
    type: 'dual_thread',
    description: '明暗线交织：主线推进同时暗线暗流涌动，深化主题表达',
    techniques: [
      '明线写事件发展，暗线写情感变化',
      '表面故事下隐藏真实意图',
      '通过细节暗示暗线的存在',
      '明暗线在关键节点交汇碰撞',
    ],
    examples: [
      '他每天照常上班、吃饭、睡觉，一切看起来毫无异常。但只有他自己知道，枕头底下那封信，他已经读了不下一百遍。',
      '她笑着和每个人打招呼，谁也看不出她手腕上那道疤是新的。',
    ],
    pitfalls: [
      '暗线过于隐晦，读者完全无法察觉',
      '明暗线割裂，缺乏内在联系',
      '暗线揭示过于突兀',
      '明暗线主题不一致',
    ],
  },
  {
    type: 'suspense_rhythm',
    description: '悬念节奏：张弛有度，避免平铺直叙，悬念设置与节奏平衡',
    techniques: [
      '在平静处设置悬念钩子',
      '高潮前刻意放慢节奏',
      '悬念揭示后留出情感消化空间',
      '多层悬念交替推进',
    ],
    examples: [
      '电话响了三声，她没接。第四声的时候，她拿起来看了一眼来电显示，脸色瞬间变了。',
      '他打开信封，里面只有一张纸条，上面写着七个字。他看了很久，然后笑了——那种笑，比哭还难看。',
    ],
    pitfalls: [
      '悬念设置过多，读者疲劳',
      '悬念揭示过于平淡，缺乏冲击力',
      '节奏始终紧张，缺少喘息',
      '悬念拖得太久，读者失去耐心',
    ],
  },
  {
    type: 'causal_logic',
    description: '因果逻辑：事件之间要有因果关联，避免突兀转折',
    techniques: [
      '每个转折都有前因后果',
      '用小事件触发大变化',
      '因果链条环环相扣',
      '意外之中有必然',
    ],
    examples: [
      '如果不是那天忘带伞，他不会躲进那家咖啡馆；如果没躲进那家咖啡馆，他不会看见那张告示；如果没看见那张告示，他现在大概还在那个工位上，过着和昨天一模一样的日子。',
      '她一直以为自己是因为工作才留下的。后来才明白，不过是因为楼下那家面馆的阳春面，和那个人说话时微微上扬的嘴角。',
    ],
    pitfalls: [
      '因果过于巧合，缺乏说服力',
      '转折缺乏铺垫，显得突兀',
      '因果链条过于简单，缺乏层次',
      '为了因果而牺牲人物真实性',
    ],
  },
];

// ============================================================================
// 10. 深度检测对抗
// ============================================================================

export const DEEP_DETECTION_COUNTERMEASURES: DeepDetectionCountermeasure[] = [
  {
    detector: 'zhuque',
    name: '朱雀检测对抗策略',
    coreDimensions: ['困惑度', '爆发性'],
    counterStrategies: [
      '打破统计均匀性',
      '增加词汇不可预测性',
      '段落长度剧烈变化',
      '不常见词汇组合',
      '句子结构显著差异',
    ],
    avoidPatterns: [
      '均匀的段落长度分布',
      '重复的句式结构',
      '可预测的词汇选择',
      '过于流畅的文本节奏',
    ],
    concreteTechniques: [
      '相邻段落字数差异控制在3倍以上',
      '每5句中至少1句使用非常规语序',
      '插入1-2个生僻但准确的词汇',
      '关键段落使用极端长短句对比',
      '刻意制造1-2处轻微的语法偏移',
    ],
  },
  {
    detector: 'zhipu',
    name: '智谱清言检测对抗策略',
    coreDimensions: ['标点分布', '高频词', '情感波动'],
    counterStrategies: [
      '标点使用不规律',
      '避免高频词机械重复',
      '注入真实情感波动',
      '避免中英混杂',
      '增加个人化视角',
    ],
    avoidPatterns: [
      '标点使用过于规范',
      '同一词汇在短距离内重复出现',
      '情感表达过于平稳',
      '中英文混杂表达',
      '缺乏个人视角的客观叙述',
    ],
    concreteTechniques: [
      '省略号和破折号使用频率波动化',
      '同一概念用3种以上不同表达',
      '在叙事中插入1-2处强烈情感反应',
      '全部使用中文表达，避免英文术语',
      '加入"我觉得""不知道为什么"等个人化表达',
    ],
  },
  {
    detector: 'gptzero',
    name: 'GPTZero检测对抗策略',
    coreDimensions: ['句式结构', '语义连贯', '机械感'],
    counterStrategies: [
      '句式多样性',
      '语义自然跳跃',
      '消除机械感表达',
      '增加不完美表达',
      '引入人类特有的随意性',
    ],
    avoidPatterns: [
      '过于工整的句式结构',
      '完美的语义衔接',
      '机械化的过渡表达',
      '过于精确的用词',
      '缺乏随意性的文本',
    ],
    concreteTechniques: [
      '每段至少1处句式变化：倒装、省略、重复',
      '允许2-3处语义轻微跳跃',
      '用口语化表达替代书面化过渡',
      '加入1-2处自我纠正或补充说明',
      '使用不精确但生动的表达替代精确但平淡的描述',
    ],
  },
];

// ============================================================================
// 完整配置导出
// ============================================================================

/**
 * 完整的人类写作风格配置
 */
export const HUMAN_WRITING_STYLE_CONFIG: HumanWritingStyleConfig = {
  burstiness: BURSTINESS_RULES,
  perplexity: PERPLEXITY_RULES,
  emotionalFluctuation: EMOTIONAL_FLUCTUATION,
  colloquial: COLLOQUIAL_RULES,
  sensoryDetails: SENSORY_DETAILS,
  thinkingSimulation: THINKING_SIMULATION,
  aiDetectionBypass: AI_DETECTION_BYPASS,
  aiHighFrequencyWords: AI_HIGH_FREQUENCY_WORDS,
  narrativeStructureGuide: NARRATIVE_STRUCTURE_GUIDE,
  deepDetectionCountermeasures: DEEP_DETECTION_COUNTERMEASURES,
};

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 获取指定类型的爆发性规则
 */
export function getBurstinessRulesByType(type: BurstinessRule['type']): BurstinessRule[] {
  return BURSTINESS_RULES.filter(rule => rule.type === type);
}

/**
 * 获取指定类别的困惑度规则
 */
export function getPerplexityRulesByCategory(category: PerplexityRule['category']): PerplexityRule[] {
  return PERPLEXITY_RULES.filter(rule => rule.category === category);
}

/**
 * 获取指定感官类型的细节配置
 */
export function getSensoryDetailsBySense(sense: SensoryDetail['sense']): SensoryDetail | undefined {
  return SENSORY_DETAILS.find(detail => detail.sense === sense);
}

/**
 * 获取指定检测器的绕过策略
 */
export function getAIDetectionBypass(detector: AIDetectionBypass['detector']): AIDetectionBypass | undefined {
  return AI_DETECTION_BYPASS.find(bypass => bypass.detector === detector);
}

/**
 * 获取所有需要避免的标准用词
 */
export function getAllStandardWordsToAvoid(): string[] {
  return PERPLEXITY_RULES.flatMap(rule => rule.standardWords);
}

/**
 * 获取口语化替换建议
 */
export function getColloquialReplacement(formal: string): string | null {
  for (const rule of COLLOQUIAL_RULES) {
    const match = rule.examples.find(ex => ex.formal === formal);
    if (match) return match.colloquial;
  }
  return null;
}

/**
 * 生成随机感官细节组合
 */
export function generateRandomSensoryCombination(count: number = 3): SensoryDetail[] {
  const shuffled = [...SENSORY_DETAILS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * 获取情感波动技巧列表
 */
export function getEmotionalFluctuationTechniques(): string[] {
  return EMOTIONAL_FLUCTUATION.flatMap(fluctuation => fluctuation.techniques);
}

/**
 * 获取思维模拟技巧列表
 */
export function getThinkingSimulationTechniques(): string[] {
  return THINKING_SIMULATION.flatMap(simulation => simulation.techniques);
}

/**
 * 获取通用AI检测绕过技巧
 */
export function getGeneralAIDetectionBypassTechniques(): string[] {
  const general = AI_DETECTION_BYPASS.find(bypass => bypass.detector === 'general');
  return general ? general.recommendedTechniques : [];
}

/**
 * 验证文本是否符合人类写作风格
 * 返回改进建议
 */
export function validateHumanWritingStyle(text: string): {
  score: number;
  issues: string[];
  suggestions: string[];
} {
  const issues: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // 检查标准用词
  const standardWords = getAllStandardWordsToAvoid();
  for (const word of standardWords) {
    if (text.includes(word)) {
      issues.push(`发现标准用词："${word}"`);
      score -= 5;
    }
  }

  // 检查句子长度分布
  const sentences = text.split(/[。！？\n]/).filter(s => s.trim());
  const lengths = sentences.map(s => s.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance = lengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / lengths.length;

  if (variance < 100) {
    issues.push('句子长度分布过于均匀，缺乏爆发性');
    suggestions.push('尝试增加长短句的对比，使用极短句强调关键情节');
    score -= 10;
  }

  // 检查段落结构
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
  const paragraphLengths = paragraphs.map(p => p.length);
  const paragraphVariance = paragraphLengths.reduce((sum, len) => sum + Math.pow(len - paragraphLengths.reduce((a, b) => a + b, 0) / paragraphLengths.length, 2), 0) / paragraphLengths.length;

  if (paragraphVariance < 500) {
    issues.push('段落长度分布过于均匀');
    suggestions.push('尝试使用极短段落（1-2句）强调关键转折');
    score -= 10;
  }

  // 检查口语化程度
  const colloquialPatterns = ['……', '——', '吧', '呢', '嘛', '呀', '哦', '啊'];
  const colloquialCount = colloquialPatterns.reduce((count, pattern) => {
    const matches = text.match(new RegExp(pattern, 'g'));
    return count + (matches ? matches.length : 0);
  }, 0);

  if (colloquialCount < text.length / 100) {
    issues.push('口语化程度不足');
    suggestions.push('增加语气词、省略号、破折号等口语化元素');
    score -= 10;
  }

  // 生成总体建议
  if (score < 80) {
    suggestions.push('建议参考通用AI检测绕过技巧进行修改');
    suggestions.push('增加感官细节描写和情感波动');
    suggestions.push('使用思维跳跃和意识流表达');
  }

  return {
    score: Math.max(0, score),
    issues,
    suggestions,
  };
}

export function getAIHighFrequencyWordsByCategory(category: AIHighFrequencyWord['category']): AIHighFrequencyWord[] {
  return AI_HIGH_FREQUENCY_WORDS.filter(word => word.category === category);
}

export function getNarrativeStructureGuideByType(type: NarrativeStructureGuide['type']): NarrativeStructureGuide[] {
  return NARRATIVE_STRUCTURE_GUIDE.filter(guide => guide.type === type);
}

export function getDeepDetectionCountermeasure(detector: DeepDetectionCountermeasure['detector']): DeepDetectionCountermeasure | undefined {
  return DEEP_DETECTION_COUNTERMEASURES.find(cm => cm.detector === detector);
}

// 默认导出
export default HUMAN_WRITING_STYLE_CONFIG;
