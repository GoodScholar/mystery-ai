import app from './app.js'
import { env } from './config/env.js'
import { connectDatabase } from './config/database.js'
import logger from './shared/logger.js'

// 可选：如果不使用 Redis，把相关代码注释或者放到初始化内尝试
import { redis } from './config/redis.js'

const startServer = async () => {
  try {
    // 1. 连接数据库
    await connectDatabase()

    // 2. 检查 Redis (可选，如果是云托管可以失败降级等，目前由 ioredis 处理重试)
    
    // 3. 启动监听
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 [MijuAI Backend] Server listening at http://localhost:${env.PORT}`)
      logger.info(`👉 Env: ${env.NODE_ENV}`)
    })

    // 优雅停机
    const gracefulShutdown = () => {
      logger.info('SIGTERM/SIGINT received, shutting down gracefully...')
      server.close(() => {
        logger.info('HTTP server closed.')
        process.exit(0)
      })
    }
    process.on('SIGTERM', gracefulShutdown)
    process.on('SIGINT', gracefulShutdown)

  } catch (error) {
    logger.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
