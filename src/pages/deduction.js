/**
 * 推理提交页 — 选择凶手、填写动机和手法
 */

import { getScenario } from '../scenarios/scenario-registry.js'
import { gameState } from '../game/state.js'

let scenario = null
let selectedSuspect = null

function loadScenario() {
  const state = gameState.get()
  scenario = getScenario(state.scenarioId)
  return scenario
}

export function renderDeduction() {
  if (!loadScenario()) return `<div class="page" style="text-align:center;padding:60px 20px;"><p>未找到剧本，<a href="#/">返回大厅</a></p></div>`

  const state = gameState.get()

  return `
    <div class="deduction page">
      <div class="container">
        <div class="deduction-form">

          <div style="text-align:center;margin-bottom:40px;">
            <h1 class="text-title" style="font-size:2rem;">🔍 提交推理</h1>
            <p class="text-small" style="margin-top:8px;">
              根据你收集到的 ${state.clues.length} 条线索，做出你的判断
            </p>
          </div>

          <!-- 选择凶手 -->
          <div class="deduction-section">
            <div class="deduction-section-title">
              <span>👤 凶手是谁？</span>
              <span class="tag tag-gold">40分</span>
            </div>
            ${scenario.npcs.map(npc => `
              <div class="deduction-option" data-suspect="${npc.id}" id="suspect-${npc.id}">
                <div class="deduction-option-avatar">${npc.emoji}</div>
                <div>
                  <div class="deduction-option-name">${npc.name}</div>
                  <div class="text-small">${npc.role}</div>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- 动机 -->
          <div class="deduction-section">
            <div class="deduction-section-title">
              <span>💡 作案动机</span>
              <span class="tag tag-gold">30分</span>
            </div>
            <textarea class="input" id="motive-input" placeholder="请描述你认为的作案动机..." rows="3"></textarea>
          </div>

          <!-- 手法 -->
          <div class="deduction-section">
            <div class="deduction-section-title">
              <span>🔪 作案手法</span>
              <span class="tag tag-gold">30分</span>
            </div>
            <textarea class="input" id="method-input" placeholder="请描述你推理的作案手法..." rows="3"></textarea>
          </div>

          <!-- 你的线索 -->
          ${state.clues.length > 0 ? `
            <div class="deduction-section">
              <div class="deduction-section-title">📋 你的线索参考</div>
              <div style="display:flex;flex-direction:column;gap:8px;">
                ${state.clues.map(c => `
                  <div class="card-flat">
                    <div style="font-size:0.8rem;color:var(--color-primary);font-weight:600;margin-bottom:4px;">${c.sourceName} — ${c.title}</div>
                    <div style="font-size:0.9rem;">${c.content}</div>
                  </div>
                `).join('')}
              </div>
            </div>
          ` : ''}

          <!-- 按钮 -->
          <div style="display:flex;gap:16px;margin-top:32px;">
            <button class="btn btn-ghost" id="btn-back-game" style="flex:1;">
              ← 继续调查
            </button>
            <button class="btn btn-primary btn-lg" id="btn-submit" style="flex:2;" disabled>
              提交推理
            </button>
          </div>

        </div>
      </div>
    </div>
  `
}

export function initDeduction(router) {
  const state = gameState.get()
  selectedSuspect = null

  if (!state.scenarioId) {
    router.navigate('/')
    return
  }

  if (!loadScenario()) {
    router.navigate('/')
    return
  }

  // 嫌疑人选择
  document.querySelectorAll('.deduction-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.deduction-option').forEach(o => o.classList.remove('selected'))
      option.classList.add('selected')
      selectedSuspect = option.dataset.suspect
      checkCanSubmit()
    })
  })

  // 输入变化检查
  document.getElementById('motive-input')?.addEventListener('input', checkCanSubmit)
  document.getElementById('method-input')?.addEventListener('input', checkCanSubmit)

  // 返回
  document.getElementById('btn-back-game')?.addEventListener('click', () => {
    router.navigate('/game')
  })

  // 提交
  document.getElementById('btn-submit')?.addEventListener('click', () => {
    if (!selectedSuspect) return

    const motive = document.getElementById('motive-input')?.value?.trim() || ''
    const method = document.getElementById('method-input')?.value?.trim() || ''

    // 计算分数
    const score = calculateScore(selectedSuspect, motive, method)

    gameState.submitDeduction({
      suspect: selectedSuspect,
      motive,
      method
    })
    gameState.setScore(score)

    router.navigate('/result')
  })
}

function checkCanSubmit() {
  const btn = document.getElementById('btn-submit')
  const motive = document.getElementById('motive-input')?.value?.trim()
  const method = document.getElementById('method-input')?.value?.trim()

  if (btn) {
    const canSubmit = selectedSuspect && motive && method
    btn.disabled = !canSubmit
  }
}

function calculateScore(suspect, motive, method) {
  const answer = scenario.answer
  let suspectScore = 0
  let motiveScore = 0
  let methodScore = 0

  // 凶手是否正确（40分）
  if (suspect === answer.suspect) {
    suspectScore = 40
  }

  // 动机评分（30分）— 通用关键词匹配
  const motiveKeywords = answer.motiveKeywords || []
  if (motiveKeywords.length > 0) {
    const motiveMatches = motiveKeywords.filter(kw => motive.includes(kw)).length
    motiveScore = Math.min(30, Math.round((motiveMatches / 3) * 30))
  }

  // 手法评分（30分）— 通用关键词匹配
  const methodKeywords = answer.methodKeywords || []
  if (methodKeywords.length > 0) {
    const methodMatches = methodKeywords.filter(kw => method.includes(kw)).length
    methodScore = Math.min(30, Math.round((methodMatches / 3) * 30))
  }

  // 效率加分
  const remaining = gameState.getRemainingRounds()
  const efficiencyBonus = Math.min(10, remaining * 2)

  return {
    suspect: suspectScore,
    motive: motiveScore,
    method: methodScore,
    efficiency: efficiencyBonus,
    total: suspectScore + motiveScore + methodScore + efficiencyBonus
  }
}
