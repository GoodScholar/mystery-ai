import OpenAI from 'openai'
import { env } from '../../config/env.js'
import logger from '../../shared/logger.js'

class AIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: env.AI_API_KEY,
      baseURL: env.AI_API_BASE,
    })
    this.model = env.AI_API_MODEL
  }

  /**
   * 流式对话
   */
  async streamChat(systemPrompt, history, userMessage, onChunk) {
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ]

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: 500,
        temperature: 0.8,
        stream: true,
      })

      let fullContent = ''
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || ''
        if (content) {
          fullContent += content
          if (onChunk) onChunk(content)
        }
      }
      return fullContent
    } catch (error) {
      logger.error('Stream chat Error:', error)
      throw new Error(error.message || 'AI API 连接失败')
    }
  }

  /**
   * JSON 补全请求（用于提取线索、评分、生成脚本）
   */
  async jsonCompletion(systemPrompt, userPrompt, temperature = 0.5) {
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]

    let responseStr = ''
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature,
        response_format: { type: 'json_object' }
      })
      responseStr = response.choices[0].message.content
      return JSON.parse(responseStr)
    } catch (error) {
      // 容错：有些模型可能不支持 json_object，或者解析失败
      logger.error('JSON completion parsing error or API error:', error)
      try {
        const cleaned = responseStr.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
        return JSON.parse(cleaned)
      } catch (parseError) {
        logger.error('Fallback JSON parse failed:', parseError)
        throw new Error('AI 返回数据解析失败')
      }
    }
  }
}

export const aiService = new AIService()
