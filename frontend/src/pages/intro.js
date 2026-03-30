/**
 * 开场页 — 剧本背景介绍 + 角色展示
 */

import { getScenario } from '../scenarios/scenario-registry.js'
import { gameState } from '../game/state.js'

function getSelectedScenario() {
  const id = sessionStorage.getItem('miju-selected-scenario')
  return id ? getScenario(id) : null
}

export function renderIntro() {
  const scenario = getSelectedScenario()
  if (!scenario) return `<div class="page" style="text-align:center;padding:60px 20px;"><p>未找到剧本，<a href="#/">返回大厅</a></p></div>`

  return `
    <div class="intro page">
      <div class="intro-backdrop"></div>

      <div style="margin-bottom: 32px;">
        <span class="tag tag-primary" style="font-size: 0.9rem; padding: 6px 16px;">
          ${scenario.emoji} ${scenario.title}
        </span>
      </div>

      <div class="intro-story" id="story-text"></div>

      <div style="margin-bottom: 16px;">
        <h3 class="text-title" style="font-size: 1.1rem; text-align: center;">📋 嫌疑人</h3>
      </div>

      <div class="intro-characters">
        ${scenario.npcs.map(npc => `
          <div class="character-card">
            <div class="character-avatar">${npc.emoji}</div>
            <div class="character-name">${npc.name}</div>
            <div class="character-role">${npc.role}</div>
            <div style="margin-top: 8px;">
              <span class="tag tag-accent">${npc.status}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div style="max-width: 500px; text-align: center; margin-bottom: 24px;">
        <p class="text-small" style="line-height: 1.6;">
          💡 你有 <strong style="color: var(--color-gold);">${scenario.maxRounds} 次</strong> 对话机会，自由与嫌疑人交谈，收集线索，最终提交你的推理。
        </p>
      </div>

      <button class="btn btn-primary btn-lg" id="btn-start-game">
        🔍 开始调查
      </button>

      <button class="btn btn-ghost" id="btn-back-home" style="margin-top: 12px;">
        ← 返回大厅
      </button>
    </div>
  `
}

export function initIntro(router) {
  const scenario = getSelectedScenario()
  if (!scenario) return

  // 打字机效果
  typeWriter(document.getElementById('story-text'), scenario.intro, 30)

  // 开始游戏
  document.getElementById('btn-start-game')?.addEventListener('click', () => {
    const activeSaves = gameState.getSaves().filter(s => s.scenarioId === scenario.id && s.phase === 'playing')
    
    if (activeSaves.length > 0) {
      showOverwriteConfirm(() => {
        gameState.startGame(scenario.id, scenario.maxRounds)
        gameState.switchNpc(scenario.npcs[0].id)
        router.navigate('/game')
      })
    } else {
      gameState.startGame(scenario.id, scenario.maxRounds)
      gameState.switchNpc(scenario.npcs[0].id)
      router.navigate('/game')
    }
  })

  // 返回
  document.getElementById('btn-back-home')?.addEventListener('click', () => {
    router.navigate('/')
  })
}

/** 打字机效果 */
function typeWriter(element, text, speed = 30) {
  if (!element) return

  let i = 0
  element.innerHTML = '<span class="cursor"></span>'

  function type() {
    if (i < text.length) {
      const char = text.charAt(i)
      const cursor = element.querySelector('.cursor')
      if (cursor) {
        element.insertBefore(document.createTextNode(char === '\n' ? '' : char), cursor)
        if (char === '\n') {
          element.insertBefore(document.createElement('br'), cursor)
        }
      }
      i++
      setTimeout(type, speed)
    } else {
      // 移除光标
      const cursor = element.querySelector('.cursor')
      if (cursor) cursor.remove()
    }
  }

  type()
}

function showOverwriteConfirm(onNew) {
  const overlay = document.createElement('div')
  overlay.className = 'overlay'
  overlay.innerHTML = `
    <div class="modal confirm-dialog">
      <div class="confirm-dialog-title" style="color:var(--color-warning);">⚠️ 发现进行中的存档</div>
      <div class="confirm-dialog-text">你有一个该剧本的存档正在进行中。开始新游戏将保留旧存档并创建新进度，确定要重新开始吗？</div>
      <div style="display:flex;gap:12px;">
        <button class="btn btn-ghost" id="overwrite-cancel" style="flex:1;">取消</button>
        <button class="btn btn-primary" id="overwrite-confirm" style="flex:1;">重新开始</button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  
  const close = () => {
    overlay.style.opacity = '0'
    setTimeout(() => overlay.remove(), 200)
  }
  
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close() })
  document.getElementById('overwrite-cancel')?.addEventListener('click', close)
  document.getElementById('overwrite-confirm')?.addEventListener('click', () => {
    close()
    onNew()
  })
}
