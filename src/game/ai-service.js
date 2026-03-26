/**
 * AI 服务 — 封装 LLM API 调用
 * 支持 OpenAI 和 Mock 模式
 */

const API_KEY_STORAGE = 'miju-ai-api-key'
const API_BASE_STORAGE = 'miju-ai-api-base'
const API_MODEL_STORAGE = 'miju-ai-api-model'

export class AIService {
  constructor() {
    this.apiKey = localStorage.getItem(API_KEY_STORAGE) || import.meta.env.VITE_API_KEY || ''
    this.apiBase = localStorage.getItem(API_BASE_STORAGE) || import.meta.env.VITE_API_BASE || 'https://api.deepseek.com/v1'
    this.model = localStorage.getItem(API_MODEL_STORAGE) || import.meta.env.VITE_API_MODEL || 'deepseek-chat'
  }

  /** 是否配置了 API Key */
  get isConfigured() {
    return !!this.apiKey
  }

  /** 保存设置 */
  saveSettings(apiKey, apiBase, model) {
    this.apiKey = apiKey
    this.apiBase = apiBase || 'https://api.deepseek.com/v1'
    this.model = model || 'deepseek-chat'
    localStorage.setItem(API_KEY_STORAGE, apiKey)
    localStorage.setItem(API_BASE_STORAGE, this.apiBase)
    localStorage.setItem(API_MODEL_STORAGE, this.model)
  }

  /** 获取设置 */
  getSettings() {
    return {
      apiKey: this.apiKey,
      apiBase: this.apiBase,
      model: this.model
    }
  }

  /**
   * 向 NPC 发送消息
   * @param {string} systemPrompt  NPC 的 system prompt
   * @param {Array} history 对话历史 [{role, content}]
   * @param {string} userMessage 玩家消息
   * @param {Function} onChunk 流式回调（可选）
   * @returns {Promise<string>} NPC 回复
   */
  async chat(systemPrompt, history, userMessage, onChunk) {
    if (!this.isConfigured) {
      throw new Error('请先配置 API Key')
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userMessage }
    ]

    const maxRetries = 3

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.apiBase}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify({
            model: this.model,
            messages,
            max_tokens: 500,
            temperature: 0.8,
            stream: !!onChunk
          })
        })

        // 429 频率限制 → 自动重试
        if (response.status === 429 && attempt < maxRetries) {
          const waitSec = Math.pow(2, attempt + 1) // 2s, 4s, 8s
          console.warn(`API 频率限制，${waitSec}秒后重试 (${attempt + 1}/${maxRetries})...`)
          if (onChunk) onChunk(`\n⏳ 请求过快，${waitSec}秒后自动重试...\n`, '')
          await new Promise(r => setTimeout(r, waitSec * 1000))
          continue
        }

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.error?.message || `API 错误: ${response.status}`)
        }

        if (onChunk) {
          return await this._readStream(response, onChunk)
        } else {
          const data = await response.json()
          return data.choices[0].message.content
        }
      } catch (e) {
        if (e.message.includes('Failed to fetch')) {
          throw new Error('网络连接失败，请检查 API 地址是否正确')
        }
        if (attempt === maxRetries) throw e
        throw e
      }
    }
  }

  /** 读取流式响应 */
  async _readStream(response, onChunk) {
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let result = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

      for (const line of lines) {
        const data = line.slice(6)
        if (data === '[DONE]') break

        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices[0]?.delta?.content || ''
          if (content) {
            result += content
            onChunk(content, result)
          }
        } catch (e) {
          // 忽略解析错误
        }
      }
    }

    return result
  }

  /**
   * 线索提取
   * @param {string} conversationText 最新对话文本
   * @param {Array} allClues 所有可触发线索
   * @param {Array} foundClueIds 已获得的线索ID
   * @returns {Promise<{triggered: boolean, clue_id?: string, clue_summary?: string}>}
   */
  async extractClue(conversationText, allClues, foundClueIds) {
    if (!this.isConfigured) return { triggered: false }

    const remainingClues = allClues.filter(c => !foundClueIds.includes(c.id))
    if (remainingClues.length === 0) return { triggered: false }

    const prompt = `你是一个游戏线索分析器。根据以下最新对话内容，判断玩家是否获得了新线索。

## 尚未触发的线索列表：
${remainingClues.map(c => `- ID: ${c.id} | 来源: ${c.source} | 内容: ${c.content} | 关键词: ${c.keywords.join(', ')}`).join('\n')}

## 最新对话内容：
${conversationText}

## 判断规则：
1. NPC的回复中需要包含与线索关键词相关的实质性信息
2. 仅仅提到一个人名不算触发线索，需要有具体的信息透露
3. 一次只能触发一条最相关的线索

请返回 JSON 格式（不要包含其他内容）：
如果触发了线索：{"triggered":true,"clue_id":"线索ID","clue_summary":"简短的线索描述"}
如果没有触发：{"triggered":false}`

    try {
      const response = await this.chat(
        '你是一个精确的JSON分析器。只返回合法的JSON，不要包含任何其他文字。',
        [],
        prompt
      )

      // 尝试解析 JSON
      const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
      return JSON.parse(cleaned)
    } catch (e) {
      console.warn('Clue extraction failed:', e)
      return { triggered: false }
    }
  }
}

// 单例
export const aiService = new AIService()
