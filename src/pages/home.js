/**
 * 首页 — 剧本大厅
 */

import { getAllScenarios, removeCustomScenario } from '../scenarios/scenario-registry.js'

export function renderHome() {
  const scenarios = getAllScenarios()

  return `
    <div class="home page">
      <div class="container">
        <div class="home-hero">
          <h1 class="home-hero-title">
            <span class="text-gradient">迷局</span> AI
          </h1>
          <p class="home-hero-subtitle">
            沉浸式 AI 剧本杀推理游戏 —— 与 AI 角色自由对话，收集线索，破解迷局
          </p>
        </div>

        <div class="scenario-grid">
          ${scenarios.map(s => `
            <div class="card scenario-card" data-scenario="${s.id}" id="scenario-${s.id}">
              ${s.isCustom ? `<button class="scenario-delete-btn" data-delete-id="${s.id}" title="删除此剧本">🗑️</button>` : ''}
              <div class="scenario-card-cover" style="background: ${s.cover.gradient}">
                <span style="font-size: 5rem; position: relative; z-index: 1;">${s.cover.emoji}</span>
              </div>
              <div class="scenario-card-body">
                <h3 class="scenario-card-title">
                  ${s.title}
                  ${s.isCustom ? '<span class="tag tag-accent" style="margin-left:6px;font-size:0.7rem;">自定义</span>' : ''}
                </h3>
                <p class="scenario-card-desc">${s.brief}</p>
                <div class="scenario-card-meta">
                  <span class="tag tag-primary">⭐ ${s.difficultyLabel}</span>
                  <span class="tag tag-accent">👤 ${s.playerCount}</span>
                  <span class="tag tag-gold">⏱ ${s.estimatedTime}</span>
                  ${s.tags.map(t => `<span class="tag tag-primary">${t}</span>`).join('')}
                </div>
              </div>
            </div>
          `).join('')}

          <!-- 创建剧本入口 -->
          <div class="card scenario-card scenario-card-create" id="btn-create-scenario">
            <div class="scenario-card-cover" style="background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 50%, #4a4a6a 100%); display:flex; flex-direction:column; gap:8px;">
              <span style="font-size: 4rem; position: relative; z-index: 1;">✨</span>
              <span style="font-size: 1rem; position: relative; z-index: 1; color: rgba(255,255,255,0.8);">AI 生成</span>
            </div>
            <div class="scenario-card-body">
              <h3 class="scenario-card-title">创建新剧本</h3>
              <p class="scenario-card-desc">输入主题，让 AI 为你生成一个全新的剧本故事</p>
              <div class="scenario-card-meta">
                <span class="tag tag-primary">🤖 AI 生成</span>
                <span class="tag tag-accent">📝 自定义</span>
              </div>
            </div>
          </div>
        </div>

        <div style="text-align: center; margin-top: 48px;">
          <button class="btn btn-ghost" id="btn-settings">⚙️ API 设置</button>
        </div>
      </div>
    </div>
  `
}

export function initHome(router) {
  // 剧本卡片点击
  document.querySelectorAll('.scenario-card:not(.scenario-card-create)').forEach(card => {
    card.addEventListener('click', (e) => {
      // 如果点击的是删除按钮，不触发卡片跳转
      if (e.target.closest('.scenario-delete-btn')) return

      const scenarioId = card.dataset.scenario
      sessionStorage.setItem('miju-selected-scenario', scenarioId)
      router.navigate('/intro')
    })
  })

  // 删除按钮
  document.querySelectorAll('.scenario-delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const deleteId = btn.dataset.deleteId
      const card = btn.closest('.scenario-card')
      const title = card?.querySelector('.scenario-card-title')?.textContent?.trim() || '此剧本'

      showDeleteConfirm(title, () => {
        removeCustomScenario(deleteId)
        router.resolve() // 重新渲染页面
      })
    })
  })

  // 创建剧本
  document.getElementById('btn-create-scenario')?.addEventListener('click', () => {
    router.navigate('/custom')
  })

  // 设置按钮
  document.getElementById('btn-settings')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('open:settings'))
  })
}

/** 删除确认弹窗 */
function showDeleteConfirm(title, onConfirm) {
  const overlay = document.createElement('div')
  overlay.className = 'overlay'
  overlay.innerHTML = `
    <div class="modal confirm-dialog">
      <div class="confirm-dialog-title">⚠️ 确认删除</div>
      <div class="confirm-dialog-text">确定删除「${title}」？<br>此操作不可恢复。</div>
      <div style="display:flex;gap:12px;">
        <button class="btn btn-ghost" id="confirm-cancel" style="flex:1;">取消</button>
        <button class="btn btn-primary" id="confirm-delete" style="flex:1;background:linear-gradient(135deg,#f87171,#ef4444);">删除</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  const close = () => {
    overlay.style.opacity = '0'
    setTimeout(() => overlay.remove(), 200)
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close()
  })

  document.getElementById('confirm-cancel')?.addEventListener('click', close)
  document.getElementById('confirm-delete')?.addEventListener('click', () => {
    close()
    onConfirm()
  })
}
