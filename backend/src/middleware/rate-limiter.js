import rateLimit from 'express-rate-limit'

// 公共接口：100次/分钟
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: '请求过于频繁，请稍后再试'
    }
  }
})

// 认证接口：10次/分钟
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: '尝试次数过多，请稍后再试'
    }
  }
})

// AI 调用：30次/分钟
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: '对话过于频繁，请稍后再试'
    }
  }
})
