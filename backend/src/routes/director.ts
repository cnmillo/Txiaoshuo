/**
 * AI 导演模式路由
 * 
 * 提供整本方向候选生成、方案修改、选择等 API 接口
 */

import { Router, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

const router = Router()

// ============================================================================
// Mock 数据生成工具
// ============================================================================

/**
 * 生成 Mock 候选方案
 */
function generateMockCandidate(index: number, inspiration: string) {
  const titles = [
    { title: '星辰变', reason: '寓意主角如星辰般崛起', styleTags: ['玄幻', '热血'] },
    { title: '修仙之路', reason: '直接点明主题，易于理解', styleTags: ['修仙', '成长'] },
    { title: '逆天改命', reason: '突出主角的逆袭特质', styleTags: ['逆袭', '励志'] },
  ]

  const genres = ['玄幻', '仙侠', '都市', '科幻']
  const primaryGenre = genres[index % genres.length]

  return {
    id: uuidv4(),
    name: `方案 ${String.fromCharCode(65 + index)}`,
    titleCandidates: titles,
    genrePositioning: {
      primaryGenre,
      subGenres: ['热血', '成长', '冒险'],
      description: `基于"${inspiration}"的${primaryGenre}题材创作方向`,
      marketHeat: ['hot', 'warm', 'normal', 'cold'][index % 4] as 'hot' | 'warm' | 'normal' | 'cold',
    },
    sellingPoints: [
      {
        id: uuidv4(),
        title: '独特世界观',
        description: '构建一个全新的修炼体系，让读者耳目一新',
        importance: 'core' as const,
        difficulty: 'medium' as const,
      },
      {
        id: uuidv4(),
        title: '主角成长线',
        description: '从普通人到强者的蜕变过程，充满戏剧性',
        importance: 'core' as const,
        difficulty: 'easy' as const,
      },
      {
        id: uuidv4(),
        title: '情感纠葛',
        description: '主角与多位角色之间的情感纠葛，增加故事张力',
        importance: 'major' as const,
        difficulty: 'medium' as const,
      },
    ],
    first30ChaptersPromise: [
      {
        id: uuidv4(),
        content: '主角获得神秘力量，开启修炼之路',
        setupRange: { start: 1, end: 5 },
        payoffMethod: '通过危机事件展现力量价值',
        readerExpectation: '期待主角如何运用新力量',
      },
      {
        id: uuidv4(),
        content: '建立主角与核心角色的关系',
        setupRange: { start: 6, end: 15 },
        payoffMethod: '通过共同经历加深羁绊',
        readerExpectation: '期待角色之间的互动发展',
      },
      {
        id: uuidv4(),
        content: '引入主要反派势力',
        setupRange: { start: 16, end: 30 },
        payoffMethod: '通过冲突展现反派威胁',
        readerExpectation: '期待主角与反派的对抗',
      },
    ],
    oneLineSummary: `一个关于${inspiration.slice(0, 20)}...的故事`,
    targetReaderFeeling: '热血沸腾，为主角的成长感到振奋',
    difficultyAssessment: {
      overall: ['easy', 'medium', 'hard', 'expert'][index % 4] as 'easy' | 'medium' | 'hard' | 'expert',
      factors: [
        { name: '世界观构建', level: 'medium' as const, description: '需要设计完整的修炼体系' },
        { name: '角色塑造', level: 'easy' as const, description: '角色性格鲜明，易于塑造' },
        { name: '情节设计', level: 'medium' as const, description: '需要设计多条情节线' },
      ],
    },
    generatedAt: new Date().toISOString(),
    score: 75 + index * 5,
  }
}

// ============================================================================
// API 路由
// ============================================================================

/**
 * 生成整本方向候选
 * POST /api/director/generate-candidates
 */
router.post('/generate-candidates', async (req: Request, res: Response) => {
  try {
    const { inspiration, count = 3 } = req.body

    if (!inspiration || inspiration.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: '灵感描述至少需要10个字符',
      })
    }

    // 模拟 AI 处理延迟
    await new Promise(resolve => setTimeout(resolve, 2000))

    const candidates = Array.from({ length: count }, (_, i) =>
      generateMockCandidate(i, inspiration)
    )

    res.json({
      success: true,
      data: {
        candidates,
        duration: 2000,
        analysis: `基于您的灵感"${inspiration.slice(0, 30)}..."，AI 为您生成了 ${count} 套创作方向`,
      },
    })
  } catch (error) {
    console.error('生成候选方案失败:', error)
    res.status(500).json({
      success: false,
      error: '生成候选方案失败',
    })
  }
})

/**
 * 流式生成候选方案
 * POST /api/director/stream-generate-candidates
 */
router.post('/stream-generate-candidates', async (req: Request, res: Response) => {
  try {
    const { inspiration, count = 3 } = req.body

    if (!inspiration || inspiration.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: '灵感描述至少需要10个字符',
      })
    }

    // 设置 SSE 响应头
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    // 逐个生成并发送候选方案
    for (let i = 0; i < count; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const candidate = generateMockCandidate(i, inspiration)
      
      res.write(`data: ${JSON.stringify({ candidate })}\n\n`)
    }

    // 发送完成信号
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (error) {
    console.error('流式生成候选方案失败:', error)
    res.status(500).json({
      success: false,
      error: '流式生成候选方案失败',
    })
  }
})

/**
 * 开始导演模式
 * POST /api/director/start
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { inspiration, initialCandidateCount = 3 } = req.body

    if (!inspiration || inspiration.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: '灵感描述至少需要10个字符',
      })
    }

    // 模拟 AI 处理延迟
    await new Promise(resolve => setTimeout(resolve, 2000))

    const candidates = Array.from({ length: initialCandidateCount }, (_, i) =>
      generateMockCandidate(i, inspiration)
    )

    res.json({
      success: true,
      data: {
        candidates,
        sessionId: uuidv4(),
      },
    })
  } catch (error) {
    console.error('启动导演模式失败:', error)
    res.status(500).json({
      success: false,
      error: '启动导演模式失败',
    })
  }
})

/**
 * 修改候选方案
 * POST /api/director/modify-candidate
 */
router.post('/modify-candidate', async (req: Request, res: Response) => {
  try {
    const { candidateId, modificationType, modificationNote } = req.body

    if (!candidateId || !modificationType || !modificationNote) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
      })
    }

    // 模拟 AI 处理延迟
    await new Promise(resolve => setTimeout(resolve, 1500))

    // 返回修改后的方案（这里简化处理，实际应该根据修改类型生成新内容）
    const modifiedCandidate = generateMockCandidate(0, modificationNote)
    modifiedCandidate.id = candidateId
    modifiedCandidate.name = `修改后的方案`

    res.json({
      success: true,
      data: {
        candidate: modifiedCandidate,
        modificationSummary: `已根据"${modificationNote}"修改了方案`,
      },
    })
  } catch (error) {
    console.error('修改候选方案失败:', error)
    res.status(500).json({
      success: false,
      error: '修改候选方案失败',
    })
  }
})

/**
 * 选择候选方案
 * POST /api/director/select-candidate
 */
router.post('/select-candidate', async (req: Request, res: Response) => {
  try {
    const { candidateId, progressMode } = req.body

    if (!candidateId || !progressMode) {
      return res.status(400).json({
        success: false,
        error: '缺少必要参数',
      })
    }

    // 模拟 AI 处理延迟
    await new Promise(resolve => setTimeout(resolve, 1000))

    const workflowId = uuidv4()

    res.json({
      success: true,
      data: {
        success: true,
        nextStepHint: '工作流已启动，请查看进度',
        workflowId,
      },
    })
  } catch (error) {
    console.error('选择候选方案失败:', error)
    res.status(500).json({
      success: false,
      error: '选择候选方案失败',
    })
  }
})

export default router
