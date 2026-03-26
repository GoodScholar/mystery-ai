/**
 * 首页 — 剧本大厅
 */

import { getAllScenarios } from '../scenarios/scenario-registry.js'

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
    card.addEventListener('click', () => {
      const scenarioId = card.dataset.scenario
      // 将选中的剧本 ID 存入 sessionStorage 供 intro 页面使用
      sessionStorage.setItem('miju-selected-scenario', scenarioId)
      router.navigate('/intro')
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
