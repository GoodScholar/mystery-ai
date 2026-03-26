/**
 * 首页 — 剧本大厅
 */

import { midnightGallery } from '../scenarios/midnight-gallery.js'

const scenarios = [midnightGallery]

export function renderHome() {
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
                <h3 class="scenario-card-title">${s.title}</h3>
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
  document.querySelectorAll('.scenario-card').forEach(card => {
    card.addEventListener('click', () => {
      const scenarioId = card.dataset.scenario
      router.navigate('/intro')
    })
  })

  // 设置按钮
  document.getElementById('btn-settings')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('open:settings'))
  })
}
