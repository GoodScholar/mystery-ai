/**
 * 格式化 API 成功响应
 */
export const successResponse = (res, data = null, meta = null, statusCode = 200) => {
  const response = { success: true }
  if (data) response.data = data
  if (meta) response.meta = meta
  return res.status(statusCode).json(response)
}

/**
 * 包装 asyncHandler，替代 try-catch 块
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}
