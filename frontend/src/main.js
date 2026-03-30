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

// ===== Theme Initialization =====
const THEME_KEY = 'mijuai_theme'
const FONT_SIZE_KEY = 'mijuai_font_size'

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  if (saved) {
    document.documentElement.setAttribute('data-theme', saved)
  } else {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }

  // Restore global font size
  const savedFontSize = localStorage.getItem(FONT_SIZE_KEY)
  if (savedFontSize) {
    document.documentElement.style.fontSize = savedFontSize + 'px'
  }
}
initTheme()

window.setTheme = function(theme) {
  if (theme === 'auto') {
    localStorage.removeItem(THEME_KEY)
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  } else {
    localStorage.setItem(THEME_KEY, theme)
    document.documentElement.setAttribute('data-theme', theme)
  }
}
// =================================

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

// 初始化 AI Service 后启动路由
aiService.init().then(() => {
  router.start()
})

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

      <div class="settings-group">
        <label class="settings-label">全局字号缩放 (基于 REM)</label>
        <div style="display:flex; align-items:center; gap:12px;">
          <input type="range" id="settings-fontsize" min="12" max="22" step="1" value="${localStorage.getItem(FONT_SIZE_KEY) || 16}" style="flex:1;">
          <span id="settings-fontsize-val" style="width:40px; font-weight:600; text-align:right;">${localStorage.getItem(FONT_SIZE_KEY) || 16}px</span>
        </div>
      </div>
      
      <div class="settings-group">
        <label class="settings-label">外观主题</label>
        <select class="input" id="settings-theme">
          <option value="auto" ${!localStorage.getItem('mijuai_theme') ? 'selected' : ''}>跟随系统</option>
          <option value="dark" ${localStorage.getItem('mijuai_theme')==='dark' ? 'selected' : ''}>深色模式</option>
          <option value="light" ${localStorage.getItem('mijuai_theme')==='light' ? 'selected' : ''}>浅色模式</option>
        </select>
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

  const origFontSize = document.documentElement.style.fontSize

  document.getElementById('settings-fontsize')?.addEventListener('input', (e) => {
    document.getElementById('settings-fontsize-val').textContent = e.target.value + 'px'
    document.documentElement.style.fontSize = e.target.value + 'px'
  })

  document.getElementById('settings-cancel').addEventListener('click', () => {
    // 恢复原字体
    document.documentElement.style.fontSize = origFontSize
    closeSettings()
  })

  document.getElementById('settings-save').addEventListener('click', async () => {
    const key = document.getElementById('settings-key').value.trim()
    const base = document.getElementById('settings-base').value.trim()
    const model = document.getElementById('settings-model').value.trim()
    const theme = document.getElementById('settings-theme').value
    const fsize = document.getElementById('settings-fontsize').value

    window.setTheme(theme)
    localStorage.setItem(FONT_SIZE_KEY, fsize)
    await aiService.saveSettings(key, base, model)
    closeSettings()

    // 重新渲染当前页面
    router.resolve()
  })

  function closeSettings() {
    overlay.style.opacity = '0'
    setTimeout(() => overlay.remove(), 200)
  }
}

// 解锁 Audio
const unlockAudio = () => {
  audioManager.unlock()
  document.removeEventListener('click', unlockAudio)
  document.removeEventListener('touchstart', unlockAudio)
}
document.addEventListener('click', unlockAudio)
document.addEventListener('touchstart', unlockAudio)

// ===== PWA Service Worker 注册 =====
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW registered!', reg)
    }).catch(err => console.error('SW registration failed:', err))
  })
}

