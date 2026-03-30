import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env, corsOrigins } from './config/env.js'
import { requestLogger } from './middleware/logger.js'
import { errorHandler } from './middleware/error-handler.js'
import { publicLimiter } from './middleware/rate-limiter.js'
import { NotFoundError } from './shared/errors.js'
import aiRoutes from './modules/ai/ai.routes.js'

const app = express()

// 安全头
app.use(helmet())

// CORS
app.use(cors({
  origin: corsOrigins,
  credentials: true
}))

// Body 解析 (限制大小1mb)
app.use(express.json({ limit: '1mb' }))

// 重写部分请求日志
app.use(requestLogger)

// 全局限流 (对于公共接口)
app.use('/api', publicLimiter)

// 健康检查
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime()
    }
  })
})

// 注册路由
app.use('/api/ai', aiRoutes)

// 404
app.use((req, res, next) => {
  next(new NotFoundError(`路径未找到: ${req.originalUrl}`))
})

// 全局错误处理
app.use(errorHandler)

export default app
