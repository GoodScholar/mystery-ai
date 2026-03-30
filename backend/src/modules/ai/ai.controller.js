import { aiService } from './ai.service.js'
import { successResponse, asyncHandler } from '../../shared/utils.js'
import { generateClueExtractPrompt } from './prompts/clue-extract.js'
import { generateScoreDeductionPrompt } from './prompts/score-deduction.js'
import { generateScenarioPrompt } from './prompts/generate-scenario.js'

export const chatWithNpc = asyncHandler(async (req, res) => {
  const { systemPrompt, history = [], message } = req.body

  // 设置 SSE Header
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  })

  try {
    const fullReply = await aiService.streamChat(systemPrompt, history, message, (chunk) => {
      res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`)
    })
    
    // 整个回复发送完毕后
    res.write(`data: [DONE]\n\n`)
    res.end()

    // 注意：在这里我们不能直接保存数据库，因为 SSE 连接已结束，
    // 在后续结合会话模块时，可以通过会话 ID 取出会话历史进行管理。
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
    res.end()
  }
})

export const extractClue = asyncHandler(async (req, res) => {
  const { conversationText, remainingClues } = req.body

  if (!remainingClues || remainingClues.length === 0) {
    return successResponse(res, { triggered: false })
  }

  const prompt = generateClueExtractPrompt(conversationText, remainingClues)
  const result = await aiService.jsonCompletion(
    '你是一个精确的JSON分析器，只返回合法的JSON',
    prompt,
    0.1
  )

  return successResponse(res, result)
})

export const scoreDeduction = asyncHandler(async (req, res) => {
  const { scenario, playerDeduction } = req.body

  const prompt = generateScoreDeductionPrompt(scenario, playerDeduction)
  const result = await aiService.jsonCompletion(
    '你是一个精确的JSON分析器，只返回合法的JSON',
    prompt,
    0.5
  )

  return successResponse(res, result)
})

export const generateScenario = asyncHandler(async (req, res) => {
  // 生成剧本可能需要比较长的时间，注意配置客户端超时
  const prompt = generateScenarioPrompt(req.body)
  const result = await aiService.jsonCompletion(
    '你是一个精确的JSON分析器，只返回合法的JSON',
    prompt,
    0.7
  )

  return successResponse(res, result)
})
