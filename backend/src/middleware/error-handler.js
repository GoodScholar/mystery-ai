import logger from '../shared/logger.js'

export const errorHandler = (err, req, res, next) => {
  logger.error({ err, req }, err.message)

  const statusCode = err.statusCode || 500
  const code = err.code || 'INTERNAL_ERROR'
  const message = err.message || '内部服务器错误'

  const errorResponse = {
    success: false,
    error: {
      code,
      message
    }
  }

  if (err.details) {
    errorResponse.error.details = err.details
  }

  // 开发环境返回完整堆栈
  if (process.env.NODE_ENV === 'development') {
    errorResponse.error.stack = err.stack
  }

  res.status(statusCode).json(errorResponse)
}
