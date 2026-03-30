import Redis from 'ioredis'
import { env } from './env.js'
import logger from '../shared/logger.js'

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000)
    return delay
  }
})

redis.on('connect', () => {
  logger.info('✅ Redis Connected')
})

redis.on('error', (err) => {
  logger.error('❌ Redis Connection Error:', err.message)
})

export const checkRedisStatus = () => {
  return redis.status === 'ready' ? 'ok' : 'error'
}
