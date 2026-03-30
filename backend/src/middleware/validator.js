import { BadRequestError } from '../shared/errors.js'

/**
 * Zod Schema 请求校验中间件
 * @param {z.ZodType} schema - Zod Schema 对象 (支持 query, body, params)
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params,
    })
    next()
  } catch (error) {
    const details = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message
    }))
    next(new BadRequestError('请求参数校验失败', details))
  }
}
