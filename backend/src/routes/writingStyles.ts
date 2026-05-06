/**
 * 写法引擎 API 路由
 */

import { Router, type Request, type Response } from 'express'
import { writingStyleService } from '../services/writingStyleService.js'
import { sendSuccess, sendError, HttpStatus } from '../utils/response.js'
import logger from '../utils/logger.js'

const router = Router()

/**
 * 获取写法资产列表
 * GET /api/writing-styles
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { search, styleTags, applicableScenes, isCustom } = req.query

    const filter = {
      search: search as string,
      styleTags: styleTags ? (styleTags as string).split(',') : undefined,
      applicableScenes: applicableScenes ? (applicableScenes as string).split(',') : undefined,
      isCustom: isCustom === 'true' ? true : isCustom === 'false' ? false : undefined,
    }

    const assets = await writingStyleService.getAllAssets(filter)

    sendSuccess(res, {
      items: assets,
      total: assets.length,
    })
  } catch (error) {
    logger.error('获取写法资产列表失败', error)
    sendError(res, '获取写法资产列表失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取写法资产详情
 * GET /api/writing-styles/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const asset = await writingStyleService.getAssetById(id)

    if (!asset) {
      sendError(res, '写法资产不存在', HttpStatus.NOT_FOUND)
      return
    }

    sendSuccess(res, asset)
  } catch (error) {
    logger.error(`获取写法资产详情失败: ${req.params.id}`, error)
    sendError(res, '获取写法资产详情失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 创建写法资产
 * POST /api/writing-styles
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const asset = await writingStyleService.createAsset(req.body)
    sendSuccess(res, asset, '创建写法资产成功', HttpStatus.CREATED)
  } catch (error) {
    logger.error('创建写法资产失败', error)
    const message = error instanceof Error ? error.message : '创建写法资产失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 更新写法资产
 * PUT /api/writing-styles/:id
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const asset = await writingStyleService.updateAsset(id, req.body)
    sendSuccess(res, asset, '更新写法资产成功')
  } catch (error) {
    logger.error(`更新写法资产失败: ${req.params.id}`, error)
    const message = error instanceof Error ? error.message : '更新写法资产失败'
    const status = message === '写法资产不存在' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
    sendError(res, message, status)
  }
})

/**
 * 删除写法资产
 * DELETE /api/writing-styles/:id
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await writingStyleService.deleteAsset(id)
    sendSuccess(res, null, '删除写法资产成功')
  } catch (error) {
    logger.error(`删除写法资产失败: ${req.params.id}`, error)
    const message = error instanceof Error ? error.message : '删除写法资产失败'
    const status = message === '写法资产不存在' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
    sendError(res, message, status)
  }
})

/**
 * 复制写法资产
 * POST /api/writing-styles/:id/duplicate
 */
router.post('/:id/duplicate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const asset = await writingStyleService.duplicateAsset(id)
    sendSuccess(res, asset, '复制写法资产成功', HttpStatus.CREATED)
  } catch (error) {
    logger.error(`复制写法资产失败: ${req.params.id}`, error)
    const message = error instanceof Error ? error.message : '复制写法资产失败'
    const status = message === '写法资产不存在' ? HttpStatus.NOT_FOUND : HttpStatus.INTERNAL_SERVER_ERROR
    sendError(res, message, status)
  }
})

/**
 * 提取特征
 * POST /api/writing-styles/extract-features
 */
router.post('/extract-features', async (req: Request, res: Response) => {
  try {
    const { text, options } = req.body

    if (!text) {
      sendError(res, '文本不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await writingStyleService.extractFeatures(text, options)

    sendSuccess(res, result)
  } catch (error) {
    logger.error('特征提取失败', error)
    sendError(res, '特征提取失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 获取写法绑定列表
 * GET /api/writing-styles/bindings
 */
router.get('/bindings', async (req: Request, res: Response) => {
  try {
    const { targetType, targetId } = req.query

    const bindings = await writingStyleService.getBindings(
      targetType as string,
      targetId as string
    )

    sendSuccess(res, bindings)
  } catch (error) {
    logger.error('获取写法绑定列表失败', error)
    sendError(res, '获取写法绑定列表失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 创建写法绑定
 * POST /api/writing-styles/bindings
 */
router.post('/bindings', async (req: Request, res: Response) => {
  try {
    const binding = await writingStyleService.createBinding(req.body)
    sendSuccess(res, binding, '创建写法绑定成功', HttpStatus.CREATED)
  } catch (error) {
    logger.error('创建写法绑定失败', error)
    const message = error instanceof Error ? error.message : '创建写法绑定失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 删除写法绑定
 * DELETE /api/writing-styles/bindings/:id
 */
router.delete('/bindings/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    await writingStyleService.deleteBinding(id)
    sendSuccess(res, null, '删除写法绑定成功')
  } catch (error) {
    logger.error(`删除写法绑定失败: ${req.params.id}`, error)
    const message = error instanceof Error ? error.message : '删除写法绑定失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 更新写法绑定配置
 * PATCH /api/writing-styles/bindings/:id/config
 */
router.patch('/bindings/:id/config', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const binding = await writingStyleService.updateBindingConfig(id, req.body)
    sendSuccess(res, binding, '更新写法绑定配置成功')
  } catch (error) {
    logger.error(`更新写法绑定配置失败: ${req.params.id}`, error)
    const message = error instanceof Error ? error.message : '更新写法绑定配置失败'
    sendError(res, message, HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 导出写法资产
 * GET /api/writing-styles/export
 */
router.get('/export', async (req: Request, res: Response) => {
  try {
    const { ids } = req.query
    const assetIds = ids ? (ids as string).split(',') : undefined

    const data = await writingStyleService.exportAssets(assetIds)

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', 'attachment; filename=writing-styles-export.json')
    res.send(data)
  } catch (error) {
    logger.error('导出写法资产失败', error)
    sendError(res, '导出写法资产失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

/**
 * 导入写法资产
 * POST /api/writing-styles/import
 */
router.post('/import', async (req: Request, res: Response) => {
  try {
    const { data } = req.body

    if (!data) {
      sendError(res, '导入数据不能为空', HttpStatus.BAD_REQUEST)
      return
    }

    const result = await writingStyleService.importAssets(data)
    sendSuccess(res, result)
  } catch (error) {
    logger.error('导入写法资产失败', error)
    sendError(res, '导入写法资产失败', HttpStatus.INTERNAL_SERVER_ERROR)
  }
})

export default router
