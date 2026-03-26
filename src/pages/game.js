/**
 * 游戏核心页面 — NPC 对话 + 线索收集
 */

import { getScenario } from '../scenarios/scenario-registry.js'
import { gameState } from '../game/state.js'
import { aiService } from '../game/ai-service.js'
import { extractClue } from '../game/clue-extractor.js'

let scenario = null
let mockResponseIndexes = {}
let cluePanel = false

function loadScenario() {
  const state = gameState.get()
  scenario = getScenario(state.scenarioId)
  return scenario
}

export function renderGame() {
  if (!loadScenario()) return `<div class="page" style="text-align:center;padding:60px 20px;"><p>未找到剧本，<a href="#/">返回大厅</a></p></div>`

  const state = gameState.get()
  const activeNpc = scenario.npcs.find(n => n.id === state.activeNpcId) || scenario.npcs[0]
  const remaining = gameState.getRemainingRounds()
  const isLow = remaining <= 5

  return `
    <div class="game">
      <!-- Header -->
      <div class="game-header">
        <div class="game-header-title">${scenario.emoji} ${scenario.title}</div>
        <div class="game-round-counter ${isLow ? 'pulse-danger' : ''}">
          💬 剩余对话: <strong>${remaining}</strong> / ${state.maxRounds}
        </div>
      </div>

      <!-- Body -->
      <div class="game-body">
        <!-- NPC Sidebar -->
        <div class="npc-sidebar">
          <div class="npc-sidebar-title">嫌疑人</div>
          <div class="npc-list">
            ${scenario.npcs.map(npc => {
              const convLen = (state.conversations[npc.id] || []).filter(m => m.role === 'user').length
              return `
                <div class="npc-item ${npc.id === state.activeNpcId ? 'active' : ''}" data-npc="${npc.id}">
                  <div class="npc-item-avatar">${npc.emoji}</div>
                  <div class="npc-item-info">
                    <div class="npc-item-name">${npc.name}</div>
                    <div class="npc-item-role">${npc.role}${convLen > 0 ? ` · ${convLen}次` : ''}</div>
                  </div>
                </div>
              `
            }).join('')}
          </div>
          <div class="npc-sidebar-actions">
            <button class="btn btn-secondary btn-sm w-full" id="btn-clue-panel">
              📋 线索板 <span class="tag tag-gold" style="margin-left:4px">${state.clues.length}</span>
            </button>
            <button class="btn btn-primary btn-sm w-full" id="btn-submit-deduction" ${remaining > 0 ? '' : ''}>
              🔍 提交推理
            </button>
          </div>
        </div>

        <!-- Chat Area -->
        <div class="chat-area">
          <div class="chat-messages" id="chat-messages">
            <div class="chat-msg chat-msg-npc" style="animation:none;">
              <div class="chat-msg-sender">${activeNpc.emoji} ${activeNpc.name} · ${activeNpc.role}</div>
              <div class="chat-msg-bubble">
                <div style="font-size:0.85rem;color:var(--color-text-secondary);margin-bottom:8px;font-style:italic;">
                  ${activeNpc.description}
                </div>
              </div>
            </div>
            ${renderConversation(state.activeNpcId)}
          </div>

          <div class="chat-input-area">
            ${remaining <= 0 ? `
              <div style="text-align:center;color:var(--color-danger);padding:12px;">
                ⚠️ 对话次数已用完，请提交你的推理
              </div>
            ` : `
              <div class="chat-input-wrapper">
                <textarea class="input" id="chat-input" placeholder="输入你想问的问题..." rows="1"></textarea>
                <button class="btn btn-primary chat-send-btn" id="btn-send">➤</button>
              </div>
              ${!aiService.isConfigured ? `
                <div style="text-align:center;margin-top:8px;">
                  <span class="text-small" style="color:var(--color-warning);">⚠️ 未配置 API Key，使用预设回复模式</span>
                  <button class="btn btn-ghost btn-sm" id="btn-settings-game" style="margin-left:8px;">配置</button>
                </div>
              ` : ''}
            `}
          </div>
        </div>
      </div>

      <!-- Clue Panel -->
      <div class="clue-panel ${cluePanel ? 'open' : ''}" id="clue-panel">
        <div class="clue-panel-header">
          <h3 class="text-title" style="font-size:1.1rem;">📋 线索板</h3>
          <button class="btn btn-ghost btn-sm" id="btn-close-clue">✕</button>
        </div>
        <div class="clue-panel-body">
          ${state.clues.length === 0 ? `
            <div style="text-align:center;padding:40px 20px;color:var(--color-text-muted);">
              <div style="font-size:2rem;margin-bottom:12px;">🔎</div>
              <p>还没有收集到线索</p>
              <p style="font-size:0.85rem;margin-top:8px;">和嫌疑人对话来获取线索</p>
            </div>
          ` : state.clues.map(clue => `
            <div class="clue-card">
              <div class="clue-card-source">来自 ${clue.sourceName} — ${clue.title}</div>
              <div class="clue-card-content">${clue.content}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `
}

function renderConversation(npcId) {
  const conv = gameState.getConversation(npcId)
  const npc = scenario.npcs.find(n => n.id === npcId)

  return conv.map(msg => {
    if (msg.role === 'user') {
      return `
        <div class="chat-msg chat-msg-user">
          <div class="chat-msg-sender">🕵️ 你</div>
          <div class="chat-msg-bubble">${escapeHtml(msg.content)}</div>
        </div>
      `
    } else {
      return `
        <div class="chat-msg chat-msg-npc">
          <div class="chat-msg-sender">${npc?.emoji || '🤖'} ${npc?.name || 'NPC'}</div>
          <div class="chat-msg-bubble">${escapeHtml(msg.content)}</div>
        </div>
      `
    }
  }).join('')
}

function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML.replace(/\n/g, '<br>')
}

export function initGame(router) {
  const state = gameState.get()
  cluePanel = false

  // 如果没有游戏数据，跳回首页
  if (!state.scenarioId || state.phase !== 'playing') {
    router.navigate('/')
    return
  }

  if (!loadScenario()) {
    router.navigate('/')
    return
  }

  scrollChatToBottom()

  // NPC 切换
  document.querySelectorAll('.npc-item').forEach(item => {
    item.addEventListener('click', () => {
      const npcId = item.dataset.npc
      gameState.switchNpc(npcId)
      reRenderGame(router)
    })
  })

  // 发送消息
  const sendBtn = document.getElementById('btn-send')
  const chatInput = document.getElementById('chat-input')

  if (sendBtn && chatInput) {
    const send = () => sendMessage(chatInput, router)
    sendBtn.addEventListener('click', send)
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        send()
      }
    })

    // 自动调整输入框高度
    chatInput.addEventListener('input', () => {
      chatInput.style.height = 'auto'
      chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px'
    })
  }

  // 线索板
  document.getElementById('btn-clue-panel')?.addEventListener('click', () => {
    cluePanel = true
    document.getElementById('clue-panel')?.classList.add('open')
  })

  document.getElementById('btn-close-clue')?.addEventListener('click', () => {
    cluePanel = false
    document.getElementById('clue-panel')?.classList.remove('open')
  })

  // 提交推理
  document.getElementById('btn-submit-deduction')?.addEventListener('click', () => {
    router.navigate('/deduction')
  })

  // 设置
  document.getElementById('btn-settings-game')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('open:settings'))
  })
}

async function sendMessage(input, router) {
  const text = input.value.trim()
  if (!text) return

  const state = gameState.get()
  if (gameState.getRemainingRounds() <= 0) return

  const npcId = state.activeNpcId
  const npc = scenario.npcs.find(n => n.id === npcId)
  if (!npc) return

  // 添加用户消息
  input.value = ''
  input.style.height = 'auto'
  gameState.addMessage(npcId, 'user', text)

  // 重新渲染显示用户消息
  appendMessage('user', text, npc)
  showTypingIndicator()

  try {
    let reply

    if (aiService.isConfigured) {
      // AI 模式
      const history = gameState.getConversation(npcId).slice(0, -1) // 不含刚添加的用户消息
      reply = await aiService.chat(
        npc.systemPrompt,
        history.map(m => ({ role: m.role, content: m.content })),
        text
      )
    } else {
      // Mock 模式
      await new Promise(r => setTimeout(r, 800 + Math.random() * 1200))
      if (!mockResponseIndexes[npcId]) mockResponseIndexes[npcId] = 0
      const idx = mockResponseIndexes[npcId] % npc.mockResponses.length
      reply = npc.mockResponses[idx]
      mockResponseIndexes[npcId]++
    }

    // 添加 NPC 回复
    hideTypingIndicator()
    gameState.addMessage(npcId, 'assistant', reply)
    appendMessage('assistant', reply, npc)

    // 线索提取
    const clue = await extractClue(npcId, reply, text, scenario)
    if (clue) {
      const added = gameState.addClue(clue)
      if (added) {
        showClueNotification(clue)
      }
    }

    // 更新回合计数
    updateRoundCounter()

    // 如果回合用完
    if (gameState.getRemainingRounds() <= 0) {
      setTimeout(() => reRenderGame(router), 1000)
    }

  } catch (e) {
    hideTypingIndicator()
    appendSystemMessage(`⚠️ ${e.message}`)
  }
}

function appendMessage(role, content, npc) {
  const container = document.getElementById('chat-messages')
  if (!container) return

  const div = document.createElement('div')
  div.className = `chat-msg ${role === 'user' ? 'chat-msg-user' : 'chat-msg-npc'}`

  if (role === 'user') {
    div.innerHTML = `
      <div class="chat-msg-sender">🕵️ 你</div>
      <div class="chat-msg-bubble">${escapeHtml(content)}</div>
    `
  } else {
    div.innerHTML = `
      <div class="chat-msg-sender">${npc?.emoji || '🤖'} ${npc?.name || 'NPC'}</div>
      <div class="chat-msg-bubble">${escapeHtml(content)}</div>
    `
  }

  container.appendChild(div)
  scrollChatToBottom()
}

function appendSystemMessage(text) {
  const container = document.getElementById('chat-messages')
  if (!container) return

  const div = document.createElement('div')
  div.className = 'chat-msg'
  div.style.cssText = 'align-self:center;max-width:90%;'
  div.innerHTML = `<div class="tag tag-danger" style="font-size:0.85rem;padding:8px 16px;">${text}</div>`
  container.appendChild(div)
  scrollChatToBottom()
}

function showTypingIndicator() {
  const container = document.getElementById('chat-messages')
  if (!container) return

  const div = document.createElement('div')
  div.id = 'typing-indicator'
  div.className = 'typing-indicator'
  div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>'
  container.appendChild(div)
  scrollChatToBottom()
}

function hideTypingIndicator() {
  document.getElementById('typing-indicator')?.remove()
}

function showClueNotification(clue) {
  // 更新线索板按钮计数
  const btn = document.getElementById('btn-clue-panel')
  if (btn) {
    const state = gameState.get()
    btn.innerHTML = `📋 线索板 <span class="tag tag-gold" style="margin-left:4px">${state.clues.length}</span>`
  }

  // 浮动通知
  const notif = document.createElement('div')
  notif.className = 'clue-notification'
  notif.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
      <span style="font-size:1.2rem;">🔑</span>
      <strong style="color:var(--color-gold);">发现新线索！</strong>
    </div>
    <div style="font-size:0.9rem;color:var(--color-text-secondary);">${clue.title}</div>
  `
  document.body.appendChild(notif)

  setTimeout(() => {
    notif.style.transition = 'all 0.3s ease'
    notif.style.opacity = '0'
    notif.style.transform = 'translateY(-20px)'
    setTimeout(() => notif.remove(), 300)
  }, 3000)
}

function updateRoundCounter() {
  const el = document.querySelector('.game-round-counter')
  if (!el) return
  const remaining = gameState.getRemainingRounds()
  const state = gameState.get()
  el.innerHTML = `💬 剩余对话: <strong>${remaining}</strong> / ${state.maxRounds}`
  if (remaining <= 5) {
    el.classList.add('pulse-danger')
  }
}

function scrollChatToBottom() {
  const container = document.getElementById('chat-messages')
  if (container) {
    requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight
    })
  }
}

function reRenderGame(router) {
  const app = document.getElementById('app')
  if (app) {
    app.innerHTML = renderGame()
    initGame(router)
  }
}
