import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { UnauthorizedError } from '../shared/errors.js'

export const auth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('请先登录')
    }

    const token = authHeader.split(' ')[1]
    const decoded = jwt.verify(token, env.JWT_SECRET)
    
    // Attach user payload to request
    req.user = decoded
    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('登录已过期，请重新登录'))
    } else {
      next(new UnauthorizedError('无效的访问令牌'))
    }
  }
}
