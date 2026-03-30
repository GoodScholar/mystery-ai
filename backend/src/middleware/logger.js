import logger from '../shared/logger.js'

export const requestLogger = (req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    const ms = Date.now() - start
    logger.info({
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ms,
      ip: req.ip
    }, `${req.method} ${req.originalUrl} - ${res.statusCode} ${ms}ms`)
  })
  next()
}
