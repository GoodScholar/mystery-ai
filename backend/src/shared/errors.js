export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', details = null) {
    super(message)
    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.details = details
    Error.captureStackTrace(this, this.constructor)
  }
}

export class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, 404, 'NOT_FOUND')
  }
}

export class BadRequestError extends AppError {
  constructor(message = '请求参数错误', details = null) {
    super(message, 400, 'BAD_REQUEST', details)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = '未授权，请携带有效的凭证') {
    super(message, 401, 'UNAUTHORIZED')
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '拒绝访问，权限不足') {
    super(message, 403, 'FORBIDDEN')
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = '请求过于频繁，请稍后再试') {
    super(message, 429, 'TOO_MANY_REQUESTS')
  }
}
