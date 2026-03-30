import { Router } from 'express'
import { chatWithNpc, extractClue, scoreDeduction, generateScenario } from './ai.controller.js'
import { validate } from '../../middleware/validator.js'
import { chatSchema, extractClueSchema, generateScenarioSchema } from './ai.schema.js'
import { aiLimiter } from '../../middleware/rate-limiter.js'
import { auth } from '../../middleware/auth.js'

const router = Router()

// 在第一期尚未集成 User 数据库前，为了能跑通流程，我们可以暂时不挂载 auth 中间件，或者提供测试 JWT。
// 后续加上 `auth` 验证
router.post('/chat', aiLimiter, validate(chatSchema), chatWithNpc)
router.post('/extract-clue', aiLimiter, validate(extractClueSchema), extractClue)
router.post('/score', aiLimiter, scoreDeduction) // 这里少校验一层，直接走 controller
router.post('/generate-scenario', aiLimiter, validate(generateScenarioSchema), generateScenario)

export default router
