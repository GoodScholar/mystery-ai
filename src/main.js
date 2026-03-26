/**
 * 迷局 AI — 主入口
 */

import './style.css'
import { Router } from './router.js'
import { renderHome, initHome } from './pages/home.js'
import { renderIntro, initIntro } from './pages/intro.js'
import { renderGame, initGame } from './pages/game.js'
import { renderDeduction, initDeduction } from './pages/deduction.js'
import { renderResult, initResult } from './pages/result.js'
import { renderCustom, initCustom } from './pages/custom-scenario.js'
import { aiService } from './game/ai-service.js'

// 初始化路由
const app = document.getElementById('app')
const router = new Router(app)

// 注册路由
router
  .on('/', () => renderHome())
  .on('/intro', () => renderIntro())
  .on('/game', () => renderGame())
  .on('/deduction', () => renderDeduction())
  .on('/result', () => renderResult())
  .on('/custom', () => renderCustom())

// 页面加载后初始化
window.addEventListener('page:mounted', (e) => {
  const path = e.detail.path
  switch (path) {
    case '/': initHome(router); break
    case '/intro': initIntro(router); break
    case '/game': initGame(router); break
    case '/deduction': initDeduction(router); break
    case '/result': initResult(router); break
    case '/custom': initCustom(router); break
  }
})

// 设置弹窗
window.addEventListener('open:settings', () => {
  showSettingsModal()
})

// 启动
router.start()

// ===== Settings Modal =====
function escapeAttr(str) {
  return String(str).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function showSettingsModal() {
  const settings = aiService.getSettings()

  const overlay = document.createElement('div')
  overlay.className = 'overlay'
  overlay.innerHTML = `
    <div class="modal">
      <h2 class="text-title" style="font-size:1.3rem;margin-bottom:24px;">⚙️ API 设置</h2>

      <div class="settings-group">
        <label class="settings-label">API Key</label>
        <input class="input" id="settings-key" type="password" placeholder="sk-..." value="${escapeAttr(settings.apiKey)}" />
        <p class="settings-hint">支持 OpenAI / Gemini / 任何兼容 API</p>
      </div>

      <div class="settings-group">
        <label class="settings-label">API Base URL</label>
        <input class="input" id="settings-base" type="text" placeholder="https://generativelanguage.googleapis.com/v1beta/openai" value="${escapeAttr(settings.apiBase)}" />
        <p class="settings-hint">兼容 OpenAI 格式的 API 地址</p>
      </div>

      <div class="settings-group">
        <label class="settings-label">模型名称</label>
        <input class="input" id="settings-model" type="text" placeholder="gemini-2.0-flash" value="${escapeAttr(settings.model)}" />
        <p class="settings-hint">推荐：gemini-2.0-flash（免费）或 gpt-4o-mini</p>
      </div>

      <div style="display:flex;gap:12px;margin-top:24px;">
        <button class="btn btn-ghost" id="settings-cancel" style="flex:1;">取消</button>
        <button class="btn btn-primary" id="settings-save" style="flex:1;">保存</button>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  // 点击遮罩关闭
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeSettings()
  })

  document.getElementById('settings-cancel').addEventListener('click', closeSettings)

  document.getElementById('settings-save').addEventListener('click', () => {
    const key = document.getElementById('settings-key').value.trim()
    const base = document.getElementById('settings-base').value.trim()
    const model = document.getElementById('settings-model').value.trim()

    aiService.saveSettings(key, base, model)
    closeSettings()

    // 重新渲染当前页面
    router.resolve()
  })

  function closeSettings() {
    overlay.style.opacity = '0'
    setTimeout(() => overlay.remove(), 200)
  }
}
