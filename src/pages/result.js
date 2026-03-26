/**
 * 结果页 — 评分展示 + 真相揭秘
 */

import { getScenario } from '../scenarios/scenario-registry.js'
import { gameState } from '../game/state.js'

let scenario = null

function loadScenario() {
  const state = gameState.get()
  scenario = getScenario(state.scenarioId)
  return scenario
}

function getGrade(total) {
  if (total >= 95) return { grade: 'S', class: 'grade-s', label: '完美推理' }
  if (total >= 80) return { grade: 'A', class: 'grade-a', label: '优秀侦探' }
  if (total >= 60) return { grade: 'B', class: 'grade-b', label: '不错的直觉' }
  if (total >= 40) return { grade: 'C', class: 'grade-c', label: '需要更多线索' }
  return { grade: 'D', class: 'grade-d', label: '案件扑朔迷离' }
}

export function renderResult() {
  if (!loadScenario()) return `<div class="page" style="text-align:center;padding:60px 20px;"><p>未找到剧本，<a href="#/">返回大厅</a></p></div>`

  const state = gameState.get()
  const score = state.score || { suspect: 0, motive: 0, method: 0, efficiency: 0, total: 0 }
  const gradeInfo = getGrade(score.total)
  const deduction = state.deduction || {}

  const suspectNpc = scenario.npcs.find(n => n.id === deduction.suspect)
  const correctNpc = scenario.npcs.find(n => n.id === scenario.answer.suspect)
  const isCorrectSuspect = deduction.suspect === scenario.answer.suspect

  return `
    <div class="result page">
      <div class="result-card">
        <div style="margin-bottom:16px;">
          <span class="tag tag-primary" style="font-size:0.9rem;padding:6px 16px;">
            ${scenario.emoji} ${scenario.title}
          </span>
        </div>

        <div class="result-score text-gradient">${score.total}</div>
        <div style="font-size:0.9rem;color:var(--color-text-secondary);margin-bottom:16px;">总分</div>

        <div class="result-grade ${gradeInfo.class}">${gradeInfo.grade}</div>
        <div style="font-weight:600;margin-bottom:8px;color:var(--color-text-highlight);">${gradeInfo.label}</div>

        <!-- 分数明细 -->
        <div class="result-detail">
          <div class="result-detail-row">
            <span class="result-detail-label">👤 凶手判断</span>
            <span class="result-detail-value" style="color:${score.suspect > 0 ? 'var(--color-success)' : 'var(--color-danger)'}">
              ${score.suspect > 0 ? '✓ 正确' : '✗ 错误'} (${score.suspect}/40)
            </span>
          </div>
          <div class="result-detail-row">
            <span class="result-detail-label">💡 动机分析</span>
            <span class="result-detail-value">${score.motive}/30</span>
          </div>
          <div class="result-detail-row">
            <span class="result-detail-label">🔪 手法推理</span>
            <span class="result-detail-value">${score.method}/30</span>
          </div>
          <div class="result-detail-row">
            <span class="result-detail-label">⚡ 效率加分</span>
            <span class="result-detail-value" style="color:var(--color-gold)">+${score.efficiency}</span>
          </div>
          <div class="result-detail-row">
            <span class="result-detail-label">📋 收集线索</span>
            <span class="result-detail-value">${state.clues.length} 条</span>
          </div>
          <div class="result-detail-row">
            <span class="result-detail-label">💬 使用对话</span>
            <span class="result-detail-value">${state.usedRounds} / ${state.maxRounds}</span>
          </div>
        </div>

        <!-- 你的推理 vs 正确答案 -->
        <div style="margin-top:24px;">
          <div class="result-detail-row" style="border:none;padding:12px;background:${isCorrectSuspect ? 'rgba(52,211,153,0.08)' : 'rgba(248,113,113,0.08)'};border-radius:8px;">
            <span>你选择的凶手：${suspectNpc?.emoji || '?'} <strong>${suspectNpc?.name || '未选择'}</strong></span>
            <span>${isCorrectSuspect ? '✅' : `❌ 正确: ${correctNpc?.emoji} ${correctNpc?.name}`}</span>
          </div>
        </div>

        <!-- 真相揭秘 -->
        <div class="result-truth">
          <div class="result-truth-title">📖 真相揭秘</div>
          <div style="font-size:0.9rem;line-height:1.8;white-space:pre-wrap;">${renderMarkdown(scenario.truthReveal)}</div>
        </div>

        <!-- 操作按钮 -->
        <div class="result-actions">
          <button class="btn btn-primary" id="btn-play-again">🔄 再玩一次</button>
          <button class="btn btn-secondary" id="btn-go-home">🏠 返回大厅</button>
        </div>
      </div>
    </div>
  `
}

export function initResult(router) {
  const state = gameState.get()

  if (!state.submitted) {
    router.navigate('/')
    return
  }

  if (!loadScenario()) {
    router.navigate('/')
    return
  }

  // 分数动画
  animateScore()

  // 再玩一次
  document.getElementById('btn-play-again')?.addEventListener('click', () => {
    gameState.reset()
    gameState.startGame(scenario.id, scenario.maxRounds)
    gameState.switchNpc(scenario.npcs[0].id)
    router.navigate('/game')
  })

  // 返回大厅
  document.getElementById('btn-go-home')?.addEventListener('click', () => {
    gameState.reset()
    router.navigate('/')
  })
}

function animateScore() {
  const scoreEl = document.querySelector('.result-score')
  if (!scoreEl) return

  const state = gameState.get()
  const targetScore = state.score?.total || 0
  let current = 0

  const interval = setInterval(() => {
    current += Math.ceil(targetScore / 30)
    if (current >= targetScore) {
      current = targetScore
      clearInterval(interval)
    }
    scoreEl.textContent = current
  }, 30)
}

function renderMarkdown(text) {
  return text
    .replace(/## (.*)/g, '<h3 style="font-size:1.1rem;font-weight:700;margin:16px 0 8px;color:var(--color-text-highlight);">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong style="color:var(--color-text-highlight);">$1</strong>')
    .replace(/\n/g, '<br>')
}
