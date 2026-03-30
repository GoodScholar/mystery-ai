/**
 * 游戏核心页面 — NPC 对话 + 线索收集
 */

import { getScenario } from '../scenarios/scenario-registry.js'
import { gameState } from '../game/state.js'
import { aiService } from '../game/ai-service.js'
import { extractClue } from '../game/clue-extractor.js'
import { VirtualList } from '../game/virtual-list.js'
import { audioManager } from '../utils/audio-manager.js'

let scenario = null
let mockResponseIndexes = {}
let cluePanel = false
let chatList = null

let clueFilter = {
  keyword: '',
  sourceName: 'All'
}

function renderClueList() {
  const state = gameState.get()
  let clues = state.clues

  if (clueFilter.keyword) {
    const kw = clueFilter.keyword.toLowerCase()
    clues = clues.filter(c => c.title.toLowerCase().includes(kw) || c.content.toLowerCase().includes(kw))
  }
  if (clueFilter.sourceName !== 'All') {
    clues = clues.filter(c => c.sourceName === clueFilter.sourceName)
  }

  if (clues.length === 0) {
    if (state.clues.length === 0) {
      return `
        <div style="text-align:center;padding:40px 20px;color:var(--color-text-muted);">
          <div style="font-size:2rem;margin-bottom:12px;">🔎</div>
          <p>还没有收集到线索</p>
          <p style="font-size:0.85rem;margin-top:8px;">和嫌疑人对话来获取线索</p>
        </div>
      `
    } else {
       return `<div style="text-align:center;padding:40px;color:var(--color-text-muted);">没找到匹配的线索</div>`
    }
  }

  return clues.map(clue => `
    <div class="clue-card">
      <div class="clue-card-source">来自 ${clue.sourceName} — ${clue.title}</div>
      <div class="clue-card-content">${clue.content}</div>
    </div>
  `).join('')
}

function renderClueFilters() {
   const state = gameState.get()
   if (state.clues.length === 0) return ''
   
   const sources = ['All', ...new Set(state.clues.map(c => c.sourceName))]
   return `
     <div class="clue-filters">
       <input type="text" id="clue-search" class="input" placeholder="搜索线索标题或内容..." value="${clueFilter.keyword}" style="padding: 8px; font-size: 0.9rem;">
       <div class="clue-tags" style="margin-top:12px; display:flex; gap:8px; overflow-x:auto; padding-bottom:4px;">
         ${sources.map(s => `
           <span class="tag ${clueFilter.sourceName === s ? 'tag-primary' : ''} clue-source-tag" data-source="${s}" style="cursor:pointer; flex-shrink:0;">
             ${s === 'All' ? '全部' : s}
           </span>
         `).join('')}
       </div>
     </div>
   `
}

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
          <div class="chat-messages" id="chat-messages" style="position:relative;overflow-y:auto;flex:1;">
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
        <div class="clue-panel-header" style="flex-wrap: wrap;">
          <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
            <h3 class="text-title" style="font-size:1.1rem;">📋 线索板</h3>
            <button class="btn btn-ghost btn-sm" id="btn-close-clue">✕</button>
          </div>
          <div id="clue-filters-container" style="width:100%; margin-top:12px;">
            ${renderClueFilters()}
          </div>
        </div>
        <div class="clue-panel-body" id="clue-list-container">
          ${renderClueList()}
        </div>
      </div>
    </div>
  `
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

  const chatContainer = document.getElementById('chat-messages')
  if (chatContainer) {
    const npc = scenario.npcs.find(n => n.id === state.activeNpcId)
    const history = gameState.getConversation(state.activeNpcId)
    
    // 初始化消息列表
    const initialItems = [{ role: 'system_desc', content: npc.description }]
    history.forEach(m => initialItems.push(m))

    if (chatList) {
      chatList.setItems(initialItems)
    } else {
      chatList = new VirtualList(chatContainer, {
        items: initialItems,
        estimatedItemHeight: 90,
        buffer: 8,
        renderItem: (item, idx) => {
          const div = document.createElement('div')
          div.className = `chat-msg ${item.role === 'user' ? 'chat-msg-user' : 'chat-msg-npc'}`
          div.style.animation = 'none' 
          
          if (item.role === 'system_desc') {
            div.innerHTML = `
              <div class="chat-msg-sender">${npc.emoji} ${npc.name} · ${npc.role}</div>
              <div class="chat-msg-bubble">
                <div style="font-size:0.85rem;color:var(--color-text-secondary);margin-bottom:8px;font-style:italic;">
                  ${item.content}
                </div>
              </div>`
          } else if (item.role === 'user') {
            div.innerHTML = `
              <div class="chat-msg-sender">🕵️ 你</div>
              <div class="chat-msg-bubble">${escapeHtml(item.content)}</div>`
          } else if (item.role === 'system') {
            div.style.cssText = 'align-self:center;max-width:90%;'
            div.innerHTML = `<div class="tag tag-danger" style="font-size:0.85rem;padding:8px 16px;">${item.content}</div>`
          } else {
            div.innerHTML = `
              <div class="chat-msg-sender">${npc?.emoji || '🤖'} ${npc?.name || 'NPC'}</div>
              <div class="chat-msg-bubble">${escapeHtml(item.content)}</div>`
          }
          return div
        }
      })
    }
    chatList.scrollToBottom()
  }

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

  // 线索板事件
  bindClueEvents()

  // 提交推理
  document.getElementById('btn-submit-deduction')?.addEventListener('click', () => {
    router.navigate('/deduction')
  })

  // 设置
  document.getElementById('btn-settings-game')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('open:settings'))
  })
  
  // 播放环境音效
  audioManager.playSuspenseBGM()
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
      // AI 模式 — 流式输出
      const history = gameState.getConversation(npcId).slice(0, -1) // 不含刚添加的用户消息
      // Token 截断：只发送最近 20 条对话给 AI
      const trimmedHistory = history.slice(-20).map(m => ({ role: m.role, content: m.content }))

      // 预先创建 NPC 回复气泡用于流式填充
      hideTypingIndicator()
      const replyBubble = createEmptyReplyBubble(npc)

      reply = await aiService.chat(
        npc.systemPrompt,
        trimmedHistory,
        text,
        // 流式回调：逐字更新气泡内容
        (chunk, fullText) => {
          if (replyBubble) replyBubble.updateContent(fullText)
          if (chunk.trim()) audioManager.playTypeWriter()
        }
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
    // 流式模式已实时填充气泡，Mock 模式不会实时填充，需要单独更新
    if (!aiService.isConfigured) {
      appendMessage('assistant', reply, npc)
    } else if (replyBubble && replyBubble.index !== undefined) {
      // 保证最终内容完整
      replyBubble.updateContent(reply)
    }

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
      setTimeout(() => showRoundExhaustedDialog(router), 1000)
    }

  } catch (e) {
    hideTypingIndicator()
    appendSystemMessage(`⚠️ ${e.message}`)
  }
}

function appendMessage(role, content, npc) {
  if (chatList) {
    chatList.appendItem({ role, content })
  }
}

/** 创建空的 NPC 回复气泡（用于流式填充） */
function createEmptyReplyBubble(npc) {
  if (!chatList) return null
  chatList.appendItem({ role: 'assistant', content: '' })
  
  return {
    index: chatList.items.length - 1,
    updateContent: function(text) {
       chatList.items[this.index].content = text;
       const dom = chatList.renderedDomMap.get(this.index);
       if (dom) {
          const bubble = dom.querySelector('.chat-msg-bubble');
          if (bubble) bubble.innerHTML = escapeHtml(text);
          chatList.updateItemHeight(this.index);
       }
       chatList.scrollToBottom();
    }
  }
}

function appendSystemMessage(text) {
  if (chatList) chatList.appendItem({ role: 'system', content: text })
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
  
  // 如果面板处于打开状态，立即刷新其内部视图以动态插入新线索
  if (cluePanel) {
    updateClueView(false)
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
  if (chatList) {
    chatList.scrollToBottom()
  } else {
    const container = document.getElementById('chat-messages')
    if (container) {
      container.scrollTop = container.scrollHeight
    }
  }
}

function reRenderGame(router) {
  const app = document.getElementById('app')
  if (app) {
    app.innerHTML = renderGame()
    initGame(router)
  }
}

function showRoundExhaustedDialog(router) {
  const overlay = document.createElement('div')
  overlay.className = 'overlay'
  // 简易遮罩样式如果CSS没有的话内联加上
  overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);'
  
  overlay.innerHTML = `
    <div class="result-card" style="margin: 0 16px;">
      <div style="font-size:3rem;margin-bottom:16px;">⏰</div>
      <h3 style="font-size:1.5rem;margin-bottom:12px;color:var(--color-danger);">对话回合已用完</h3>
      <p style="color:var(--color-text-secondary);margin-bottom:24px;line-height:1.6;">
        根据你收集到的线索，是时候提交你的推理了！
      </p>
      <div style="display:flex;gap:12px;">
        <button class="btn btn-secondary" id="btn-stay" style="flex:1;">查看线索</button>
        <button class="btn btn-primary" id="btn-go-deduction" style="flex:2;">
          🔍 提交推理
        </button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  
  document.getElementById('btn-go-deduction')?.addEventListener('click', () => {
    overlay.remove()
    router.navigate('/deduction')
  })
  
  document.getElementById('btn-stay')?.addEventListener('click', () => {
    overlay.remove()
    reRenderGame(router) // 刷新页面，禁用输入框但保留线索板
  })
}

function bindClueEvents() {
  document.getElementById('btn-clue-panel')?.addEventListener('click', () => {
    cluePanel = true
    document.getElementById('clue-panel')?.classList.add('open')
    updateClueView(true)
  })

  document.getElementById('btn-close-clue')?.addEventListener('click', () => {
    cluePanel = false
    document.getElementById('clue-panel')?.classList.remove('open')
  })
}

let clueSearchTimer = null;
function updateClueView(focusAndSelect = false) {
  const filterContainer = document.getElementById('clue-filters-container')
  const listContainer = document.getElementById('clue-list-container')
  if (filterContainer) filterContainer.innerHTML = renderClueFilters()
  if (listContainer) listContainer.innerHTML = renderClueList()

  // 重新绑定过滤器事件
  const searchInput = document.getElementById('clue-search')
  if (searchInput) {
    if (focusAndSelect) {
      searchInput.focus()
      const len = searchInput.value.length
      searchInput.setSelectionRange(len, len)
    }
    
    searchInput.addEventListener('input', (e) => {
      if (clueSearchTimer) clearTimeout(clueSearchTimer)
      clueSearchTimer = setTimeout(() => {
        clueFilter.keyword = e.target.value
        updateClueView(true)
      }, 300)
    })
  }

  document.querySelectorAll('.clue-source-tag').forEach(tag => {
    tag.addEventListener('click', (e) => {
      clueFilter.sourceName = e.target.dataset.source
      updateClueView(true) // Re-focus search to keep typing coherent if user uses keyboard
    })
  })
}

