/**
 * 线索提取器
 * 支持 AI 提取和 Mock 关键词匹配两种模式
 */

import { aiService } from './ai-service.js'
import { gameState } from './state.js'

/**
 * 尝试从最新对话中提取线索
 * @param {string} npcId NPC ID
 * @param {string} npcReply NPC 的最新回复
 * @param {string} userMessage 玩家的消息
 * @param {object} scenario 剧本数据
 * @returns {Promise<object|null>} 触发的线索或 null
 */
export async function extractClue(npcId, npcReply, userMessage, scenario) {
  const state = gameState.get()
  const foundClueIds = state.clues.map(c => c.id)

  // 只检查当前 NPC 相关的线索
  const npcClues = scenario.clues.filter(c => c.source === npcId)
  const remainingClues = npcClues.filter(c => !foundClueIds.includes(c.id))

  if (remainingClues.length === 0) return null

  // 如果有 AI 服务，使用 AI 提取（增加超时控制）
  if (aiService.isConfigured) {
    try {
      const conversationText = `玩家: ${userMessage}\n${scenario.npcs.find(n => n.id === npcId)?.name}: ${npcReply}`

      // 5 秒超时，超时后降级为关键词匹配
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('线索提取超时')), 5000)
      )
      const result = await Promise.race([
        aiService.extractClue(conversationText, remainingClues, foundClueIds),
        timeoutPromise
      ])

      if (result.triggered && result.clue_id) {
        const clue = scenario.clues.find(c => c.id === result.clue_id)
        if (clue) {
          return {
            id: clue.id,
            source: clue.source,
            sourceName: scenario.npcs.find(n => n.id === clue.source)?.name || clue.source,
            title: clue.title,
            content: result.clue_summary || clue.content
          }
        }
      }
      return null
    } catch (e) {
      console.warn('AI clue extraction failed, falling back to keyword matching:', e)
    }
  }

  // Mock 模式：关键词匹配
  return keywordMatch(npcReply, remainingClues, scenario)
}

/**
 * 关键词匹配提取线索（Mock 模式）
 */
function keywordMatch(text, clues, scenario) {
  const lowerText = text.toLowerCase()

  for (const clue of clues) {
    const matchCount = clue.keywords.filter(kw => lowerText.includes(kw.toLowerCase())).length
    // 需要匹配至少2个关键词
    if (matchCount >= 2) {
      return {
        id: clue.id,
        source: clue.source,
        sourceName: scenario.npcs.find(n => n.id === clue.source)?.name || clue.source,
        title: clue.title,
        content: clue.content
      }
    }
  }

  return null
}
