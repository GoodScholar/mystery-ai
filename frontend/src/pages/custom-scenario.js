/**
 * 自定义剧本创作工坊 — 4步分步向导
 * Step 1: 灵感激发（主题模板 + 自由输入）
 * Step 2: 剧本设定（风格/时代/难度/NPC/特殊要求）
 * Step 3: 虚空酝酿（AI 生成动画播报）
 * Step 4: 剧本预览与微调
 */

import { aiService } from '../game/ai-service.js'
import { addCustomScenario } from '../scenarios/scenario-registry.js'
import { draftManager } from '../utils/draft-manager.js'

// ===== 常量 =====
const THEME_TEMPLATES = [
  { emoji: '🏫', name: '校园怪谈', keywords: '校园、怪谈、社团' },
  { emoji: '🏝️', name: '孤岛惊魂', keywords: '孤岛、暴风雨、求生' },
  { emoji: '🚀', name: '太空密室', keywords: '空间站、失重、氧气告急' },
  { emoji: '🏰', name: '中世纪古堡', keywords: '城堡、骑士、密道' },
  { emoji: '🎪', name: '午夜马戏团', keywords: '马戏团、魔术、消失' },
  { emoji: '🏥', name: '废弃医院', keywords: '医院、病历、夜班' },
  { emoji: '🎬', name: '惊悚片场', keywords: '片场、导演、道具' },
  { emoji: '🚢', name: '迷雾游轮', keywords: '游轮、浓雾、船长' },
  { emoji: '🏔️', name: '雪山别墅', keywords: '暴风雪、别墅、封路' },
  { emoji: '🎰', name: '赌场风云', keywords: '赌场、千术、筹码' },
  { emoji: '🌃', name: '赛博都市', keywords: '赛博朋克、AI、黑市' },
  { emoji: '🏛️', name: '失窃博物馆', keywords: '博物馆、名画、监控' },
]

const STYLE_OPTIONS = [
  { value: '本格推理', label: '🔍 本格推理', desc: '严密逻辑推理，公平解谜' },
  { value: '变格惊悚', label: '🔪 变格惊悚', desc: '心理恐怖，氛围压迫' },
  { value: '轻松搞笑', label: '😂 轻松搞笑', desc: '喜剧元素，反转搞笑' },
  { value: '古风文艺', label: '🌸 古风文艺', desc: '诗词意境，情感纠葛' },
  { value: '硬核烧脑', label: '⚡ 硬核烧脑', desc: '多重反转，极限推理' },
]

const ERA_OPTIONS = [
  { value: '现代都市', label: '🏙️ 现代都市', desc: '当下城市社会背景' },
  { value: '民国旧影', label: '🏮 民国旧影', desc: '20世纪初旧中国' },
  { value: '古代王朝', label: '🏯 古代王朝', desc: '古装宫廷或江湖' },
  { value: '遥远未来', label: '🛸 遥远未来', desc: '科幻或后现代世界' },
]

const DIFFICULTY_OPTIONS = [
  { value: 2, label: '⭐⭐ 入门' },
  { value: 3, label: '⭐⭐⭐ 进阶' },
  { value: 4, label: '⭐⭐⭐⭐ 困难' },
  { value: 5, label: '⭐⭐⭐⭐⭐ 大师' },
]

const NPC_OPTIONS = [
  { value: 3, label: '3 人' },
  { value: 4, label: '4 人' },
]

const GENERATE_STAGES = [
  { icon: '🧩', text: '正在构思核心诡计...' },
  { icon: '👥', text: '正在塑造嫌疑人画像...' },
  { icon: '🔗', text: '正在埋设逻辑冲突与线索...' },
  { icon: '✨', text: '正在完善最终真相...' },
]

const difficultyLabels = { 2: '入门', 3: '进阶', 4: '困难', 5: '大师' }

const STEP_LABELS = [
  { num: 1, label: '灵感' },
  { num: 2, label: '设定' },
  { num: 3, label: '生成' },
  { num: 4, label: '预览' },
]

// ===== 状态 =====
let wizardState = {}
let generateTimer = null

let draftTimer = null
function saveDraftDebounced() {
  if (draftTimer) clearTimeout(draftTimer)
  draftTimer = setTimeout(() => {
    // 只在未生成最终剧本的流程阶段存入草稿
    if (wizardState.currentStep < 4 && !wizardState.generatedScenario) {
      draftManager.saveDraft(wizardState)
    }
  }, 500)
}

function resetState() {
  wizardState = {
    currentStep: 1,
    theme: '',
    selectedTemplate: -1,
    description: '',
    style: '',
    era: '',
    difficulty: 3,
    npcCount: 4,
    specialRequest: '',
    generatedScenario: null,
  }
}

// ===== 渲染 =====
export function renderCustom() {
  const currentStep = wizardState.currentStep || 1
  return `
    <div class="custom page">
      <div class="container" style="max-width:720px;">
        <div style="text-align:center;margin-bottom:24px;">
          <h1 class="text-title" style="font-size:2rem;">✨ 剧本创作工坊</h1>
          <p class="text-small" style="margin-top:8px;">
            分步引导，让 AI 为你打造独一无二的推理剧本
          </p>
        </div>

        <div id="wizard-stepper-placeholder">
          ${renderStepper(currentStep)}
        </div>

        <div id="wizard-content">
          ${currentStep === 1 ? renderStep1() : ''}
        </div>
      </div>
    </div>
  `
}

function renderStepper(current) {
  return `
    <div class="wizard-stepper" id="wizard-stepper">
      ${STEP_LABELS.map((s, i) => {
        const cls = current > s.num ? 'completed' : current === s.num ? 'active' : ''
        const connector = i < STEP_LABELS.length - 1
          ? `<div class="wizard-step-connector ${current > s.num ? 'active' : ''}"></div>`
          : ''
        return `
          <div class="wizard-step ${cls}">
            <span class="wizard-step-number">${current > s.num ? '✓' : s.num}</span>
            <span>${s.label}</span>
          </div>
          ${connector}
        `
      }).join('')}
    </div>
  `
}

// ===== Step 1: 灵感激发 =====
function renderStep1() {
  return `
    <div class="wizard-panel" id="step-1">
      <div class="deduction-section">
        <div class="deduction-section-title">🎭 选择灵感主题</div>
        <div class="theme-grid" id="theme-grid">
          ${THEME_TEMPLATES.map((t, i) => `
            <div class="theme-card ${wizardState.selectedTemplate === i ? 'selected' : ''}" data-index="${i}" data-keywords="${t.keywords}">
              <span class="theme-card-emoji">${t.emoji}</span>
              <span class="theme-card-name">${t.name}</span>
            </div>
          `).join('')}
        </div>
      </div>

      <div class="deduction-section">
        <div class="deduction-section-title">✏️ 主题名称</div>
        <input class="input" id="custom-theme" type="text" placeholder="选择上方模板自动填入，也可自由输入..." value="${wizardState.theme}" />
      </div>

      <div class="deduction-section">
        <div class="deduction-section-title">📝 补充描述（可选）</div>
        <textarea class="input" id="custom-desc" rows="3" placeholder="描述你想要的核心诡计、角色类型或剧情走向...">${wizardState.description}</textarea>
      </div>

      ${!aiService.isConfigured ? `
        <div style="text-align:center;padding:20px;background:rgba(248,113,113,0.08);border-radius:12px;margin-bottom:24px;">
          <p style="color:var(--color-danger);margin-bottom:8px;">⚠️ 需要配置 API Key 才能使用 AI 生成功能</p>
          <button class="btn btn-ghost btn-sm" id="btn-settings-custom">配置 API</button>
        </div>
      ` : ''}

      <div class="wizard-actions">
        <button class="btn btn-ghost" id="btn-back-home">← 返回大厅</button>
        <button class="btn btn-primary btn-lg" id="btn-next-step2" ${!aiService.isConfigured ? 'disabled' : ''}>
          下一步 — 剧本设定 →
        </button>
      </div>
    </div>
  `
}

// ===== 实时预览辅助函数 =====
function renderLiveMeta() {
   const difficultyMap = { 2: '入门', 3: '进阶', 4: '困难', 5: '大师' }
   let html = ''
   if (wizardState.style) {
       const lbl = STYLE_OPTIONS.find(o=>o.value===wizardState.style)?.label || ''
       html += `<span class="tag tag-primary">风格:${lbl.substring(lbl.indexOf(' ')+1)}</span>`
   }
   if (wizardState.era) {
       const lbl = ERA_OPTIONS.find(o=>o.value===wizardState.era)?.label || ''
       html += `<span class="tag tag-gold">背景:${lbl.substring(lbl.indexOf(' ')+1)}</span>`
   }
   if (wizardState.difficulty) {
       html += `<span class="tag tag-danger">⭐ ${difficultyMap[wizardState.difficulty] || '未知'}</span>`
   }
   if (wizardState.npcCount) {
       html += `<span class="tag tag-accent">👥 ${wizardState.npcCount}人</span>`
   }
   return html || '<span class="tag">请在左侧选择设定...</span>'
}

// ===== Step 2: 剧本设定 =====
function renderStep2() {
  const emoji = THEME_TEMPLATES[wizardState.selectedTemplate]?.emoji || '🎭'
  const title = wizardState.theme || '未命名剧本'
  const desc = wizardState.description || '暂无详细背景描述...'

  return `
    <div class="wizard-panel" id="step-2">
      <div class="step-2-layout" style="display:flex; gap:32px; flex-wrap:wrap;">
        <div class="step-2-form" style="flex: 1; min-width: 320px;">
          <div class="setting-group">
            <div class="setting-group-title">🎨 故事风格</div>
            <div class="option-chips" data-group="style">
          ${STYLE_OPTIONS.map(o => `
            <div class="option-chip ${wizardState.style === o.value ? 'selected' : ''}" data-value="${o.value}" title="${o.desc}">
              ${o.label}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="setting-group">
        <div class="setting-group-title">🕰️ 时代背景</div>
        <div class="option-chips" data-group="era">
          ${ERA_OPTIONS.map(o => `
            <div class="option-chip ${wizardState.era === o.value ? 'selected' : ''}" data-value="${o.value}" title="${o.desc}">
              ${o.label}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="setting-group">
        <div class="setting-group-title">⭐ 难度等级</div>
        <div class="option-chips" data-group="difficulty">
          ${DIFFICULTY_OPTIONS.map(o => `
            <div class="option-chip ${wizardState.difficulty === o.value ? 'selected' : ''}" data-value="${o.value}">
              ${o.label}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="setting-group">
        <div class="setting-group-title">👥 NPC 数量</div>
        <div class="option-chips" data-group="npcCount">
          ${NPC_OPTIONS.map(o => `
            <div class="option-chip ${wizardState.npcCount === o.value ? 'selected' : ''}" data-value="${o.value}">
              ${o.label}
            </div>
          `).join('')}
        </div>
      </div>

      <div class="setting-group">
        <div class="setting-group-title">💡 特殊要求（可选）</div>
        <textarea class="input" id="custom-special" rows="2" placeholder="如：需要有密室诡计、希望凶手是最不可能的人...">${wizardState.specialRequest}</textarea>
      </div>
      </div> <!-- form end -->

      <!-- 实时预览区 -->
      <div class="step-2-preview" style="flex: 1; min-width: 320px;">
        <div style="position: sticky; top: 20px;">
          <div class="setting-group-title">👁️ 本地评估预览</div>
          <div class="preview-card" style="margin:0;">
            <div class="preview-card-cover" style="height:120px; background: linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%);">
              <span class="preview-card-cover-emoji" id="live-emoji" style="font-size:3rem;">${emoji}</span>
            </div>
            <div class="preview-card-body">
              <div class="preview-card-title" id="live-title" style="font-size:1.1rem;margin-bottom:8px;">
                《${title}》
              </div>
              <div class="preview-card-meta" id="live-meta">
                ${renderLiveMeta()}
              </div>
              <div style="font-size:0.85rem; color:var(--color-text-secondary); margin-top:12px; line-height:1.5;">
                ${desc}
              </div>
            </div>
          </div>
          <div style="margin-top:16px; font-size:0.8rem; color:var(--color-text-muted); text-align:center;">
            <p>ℹ️ 实际生成的情节、嫌疑人与诡计将基于此设定大纲由 AI 发散</p>
          </div>
        </div>
      </div> <!-- preview end -->
      </div> <!-- layout end -->

      <div class="wizard-actions" style="margin-top:32px; border-top:1px solid rgba(255,255,255,0.1); padding-top:24px;">
        <button class="btn btn-ghost" id="btn-prev-step1">← 上一步</button>
        <button class="btn btn-primary btn-lg" id="btn-generate">🤖 开始生成剧本</button>
      </div>
    </div>
  `
}

// ===== Step 3: 虚空酝酿 =====
function renderStep3() {
  return `
    <div class="wizard-panel" id="step-3">
      <div class="generate-stage-container" id="generate-container">
        <div class="generate-stage-icon" id="stage-icon">${GENERATE_STAGES[0].icon}</div>
        <div class="generate-stage-text" id="stage-text">${GENERATE_STAGES[0].text}</div>
        <div class="generate-stage-dots">
          ${GENERATE_STAGES.map((_, i) => `<div class="generate-stage-dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></div>`).join('')}
        </div>
      </div>
    </div>
  `
}

// ===== Step 4: 剧本预览 =====
function renderStep4() {
  const s = wizardState.generatedScenario
  if (!s) return '<div class="generate-error">⚠️ 剧本数据丢失</div>'

  const gradient = s.cover?.gradient || 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'

  return `
    <div class="wizard-panel" id="step-4">
      <div class="preview-card">
        <div class="preview-card-cover" style="background: ${gradient}">
          <span class="preview-card-cover-emoji">${s.emoji || '🎭'}</span>
        </div>
        <div class="preview-card-body">
          ${s._warnings && s._warnings.length > 0 
            ? `<div style="margin-bottom:16px;padding:12px;background:rgba(251,191,36,0.1);color:var(--color-warning);border-radius:8px;font-size:0.9rem;">⚠️ ${s._warnings.length} 项建议优化: ${s._warnings[0]}</div>`
            : `<div style="margin-bottom:16px;padding:12px;background:rgba(52,211,153,0.1);color:var(--color-success);border-radius:8px;font-size:0.9rem;">✅ 剧本结构完整，逻辑正常</div>`
          }
          <div class="preview-card-title" id="preview-title" title="点击编辑">
            📖 《${s.title}》<span class="edit-icon">✏️</span>
          </div>
          <div class="preview-card-brief" id="preview-brief" title="点击编辑">
            ${s.brief}
          </div>

          <div class="preview-card-meta">
            <span class="tag tag-primary">⭐ ${s.difficultyLabel}</span>
            <span class="tag tag-accent">👤 ${s.playerCount}</span>
            <span class="tag tag-gold">⏱ ${s.estimatedTime}</span>
            ${(s.tags || []).map(t => `<span class="tag tag-primary">${t}</span>`).join('')}
          </div>

          <div class="preview-card-section">
            <div class="preview-card-section-title">👥 角色阵容</div>
            <div class="preview-characters">
              ${(s.npcs || []).map(n => `
                <div class="preview-character">
                  <div class="preview-character-emoji">${n.emoji}</div>
                  <div class="preview-character-name">${n.name}</div>
                  <div class="preview-character-role">${n.role}</div>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="preview-card-section">
            <div class="preview-card-section-title">🔍 线索数量: ${(s.clues || []).length} 条</div>
          </div>
        </div>

        <div class="preview-card-actions">
          <button class="btn btn-ghost" id="btn-back-step2" style="flex:1;">← 返回设定</button>
          <button class="btn btn-secondary" id="btn-regenerate" style="flex:1;">🔄 重新生成</button>
          <button class="btn btn-primary btn-lg" id="btn-start-game" style="flex:2;">🎮 开始游玩</button>
        </div>
      </div>
    </div>
  `
}

// ===== 导航逻辑 =====
function goToStep(step, direction, router) {
  wizardState.currentStep = step

  // 更新 stepper
  const stepperContainer = document.getElementById('wizard-stepper')
  if (stepperContainer) {
    stepperContainer.outerHTML = renderStepper(step)
  } else {
    // 兼容第一次渲染
    const holder = document.getElementById('wizard-stepper-placeholder')
    if (holder) holder.innerHTML = renderStepper(step)
  }

  // 渲染内容
  const content = document.getElementById('wizard-content')
  if (!content) return

  let html = ''
  switch (step) {
    case 1: html = renderStep1(); break
    case 2: html = renderStep2(); break
    case 3: html = renderStep3(); break
    case 4: html = renderStep4(); break
  }

  content.innerHTML = html

  // 反向动画
  if (direction === 'back') {
    const panel = content.querySelector('.wizard-panel')
    if (panel) {
      panel.classList.remove('wizard-panel')
      panel.classList.add('wizard-panel-back')
    }
  }

  // 绑定事件
  bindStepEvents(step, router)
}

function bindStepEvents(step, router) {
  switch (step) {
    case 1: bindStep1Events(router); break
    case 2: bindStep2Events(router); break
    case 3: startGeneration(router); break
    case 4: bindStep4Events(router); break
  }
}

// ===== Step 1 事件 =====
function bindStep1Events(router) {
  // 返回大厅
  document.getElementById('btn-back-home')?.addEventListener('click', () => {
    router.navigate('/')
  })

  // API 设置
  document.getElementById('btn-settings-custom')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('open:settings'))
  })

  // 主题模板选择
  document.querySelectorAll('.theme-card').forEach(card => {
    card.addEventListener('click', () => {
      const index = parseInt(card.dataset.index)
      const template = THEME_TEMPLATES[index]

      // 移除其他选中态
      document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('selected'))
      card.classList.add('selected')

      wizardState.selectedTemplate = index
      wizardState.theme = template.name

      const themeInput = document.getElementById('custom-theme')
      if (themeInput) themeInput.value = template.name
      
      saveDraftDebounced()
    })
  })

  document.getElementById('custom-theme')?.addEventListener('input', (e) => {
     wizardState.theme = e.target.value
     saveDraftDebounced()
  })
  document.getElementById('custom-desc')?.addEventListener('input', (e) => {
     wizardState.description = e.target.value
     saveDraftDebounced()
  })

  // 下一步
  document.getElementById('btn-next-step2')?.addEventListener('click', () => {
    const theme = document.getElementById('custom-theme')?.value?.trim()
    if (!theme) {
      showToast('⚠️ 请选择或输入主题')
      return
    }

    wizardState.theme = theme
    wizardState.description = document.getElementById('custom-desc')?.value?.trim() || ''

    goToStep(2, 'forward', router)
  })
}

// ===== Step 2 事件 =====
function bindStep2Events(router) {
  // 选项胶囊点击
  document.querySelectorAll('.option-chips').forEach(group => {
    const groupName = group.dataset.group
    group.querySelectorAll('.option-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        // 在组内取消其他选中
        group.querySelectorAll('.option-chip').forEach(c => c.classList.remove('selected'))
        chip.classList.add('selected')

        const value = chip.dataset.value
        if (groupName === 'difficulty' || groupName === 'npcCount') {
          wizardState[groupName] = parseInt(value)
        } else {
          wizardState[groupName] = value
        }
        
        // 实时更新预览
        const metaContainer = document.getElementById('live-meta')
        if (metaContainer) {
           metaContainer.innerHTML = renderLiveMeta()
        }
        
        saveDraftDebounced()
      })
    })
  })

  document.getElementById('custom-special')?.addEventListener('input', (e) => {
      wizardState.specialRequest = e.target.value
      saveDraftDebounced()
  })

  // 上一步
  document.getElementById('btn-prev-step1')?.addEventListener('click', () => {
    goToStep(1, 'back', router)
  })

  // 生成
  document.getElementById('btn-generate')?.addEventListener('click', () => {
    // 验证必选项
    if (!wizardState.style) {
      showToast('⚠️ 请选择故事风格')
      return
    }
    if (!wizardState.era) {
      showToast('⚠️ 请选择时代背景')
      return
    }
    wizardState.specialRequest = document.getElementById('custom-special')?.value?.trim() || ''
    goToStep(3, 'forward', router)
  })
}

// ===== Step 3: 生成逻辑 =====
async function startGeneration(router) {
  let stageIndex = 0

  // 阶段播报
  generateTimer = setInterval(() => {
    stageIndex++
    if (stageIndex >= GENERATE_STAGES.length) {
      clearInterval(generateTimer)
      generateTimer = null
      return
    }

    const iconEl = document.getElementById('stage-icon')
    const textEl = document.getElementById('stage-text')
    if (iconEl) iconEl.textContent = GENERATE_STAGES[stageIndex].icon
    if (textEl) {
      textEl.textContent = GENERATE_STAGES[stageIndex].text
      textEl.style.animation = 'none'
      textEl.offsetHeight // reflow
      textEl.style.animation = ''
    }

    // 更新进度点
    document.querySelectorAll('.generate-stage-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i <= stageIndex)
    })
  }, 3000)

  try {
    const scenario = await generateScenario(
      wizardState.theme,
      wizardState.description,
      wizardState.difficulty,
      wizardState.npcCount,
      wizardState.style,
      wizardState.era,
      wizardState.specialRequest
    )

    if (generateTimer) {
      clearInterval(generateTimer)
      generateTimer = null
    }

    if (scenario) {
      wizardState.generatedScenario = scenario
      goToStep(4, 'forward', router)
    }
  } catch (e) {
    if (generateTimer) {
      clearInterval(generateTimer)
      generateTimer = null
    }

    const container = document.getElementById('generate-container')
    if (container) {
      container.innerHTML = `
        <div class="generate-error">
          <div style="font-size:3rem;margin-bottom:16px;">⚠️</div>
          <p style="margin-bottom:16px;">生成失败：${e.message}</p>
          <button class="btn btn-primary" id="btn-retry-generate">🔄 重试</button>
        </div>
      `
      document.getElementById('btn-retry-generate')?.addEventListener('click', () => {
        goToStep(3, 'forward', router)
      })
    }
  }
}

// ===== Step 4 事件 =====
function bindStep4Events(router) {
  const scenario = wizardState.generatedScenario
  if (!scenario) return

  // 标题编辑
  document.getElementById('preview-title')?.addEventListener('click', () => {
    const el = document.getElementById('preview-title')
    const current = scenario.title
    el.innerHTML = `<input class="inline-edit-input title-edit" id="edit-title-input" value="${current}" />`
    const input = document.getElementById('edit-title-input')
    input.focus()
    input.select()

    const finish = () => {
      const newVal = input.value.trim() || current
      scenario.title = newVal
      el.innerHTML = `📖 《${newVal}》<span class="edit-icon">✏️</span>`
    }
    input.addEventListener('blur', finish)
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') input.blur() })
  })

  // 简介编辑
  document.getElementById('preview-brief')?.addEventListener('click', () => {
    const el = document.getElementById('preview-brief')
    const current = scenario.brief
    el.innerHTML = `<textarea class="inline-edit-input brief-edit" id="edit-brief-input">${current}</textarea>`
    const input = document.getElementById('edit-brief-input')
    input.focus()

    const finish = () => {
      const newVal = input.value.trim() || current
      scenario.brief = newVal
      el.textContent = newVal
    }
    input.addEventListener('blur', finish)
  })

  // 返回设定
  document.getElementById('btn-back-step2')?.addEventListener('click', () => {
    goToStep(2, 'back', router)
  })

  // 重新生成
  document.getElementById('btn-regenerate')?.addEventListener('click', () => {
    wizardState.generatedScenario = null
    goToStep(3, 'forward', router)
  })

  // 开始游玩
  document.getElementById('btn-start-game')?.addEventListener('click', () => {
    addCustomScenario(scenario)
    sessionStorage.setItem('miju-selected-scenario', scenario.id)
    draftManager.clearDraft() // 成功生成并使用后清除草稿
    router.navigate('/intro')
  })
}

// ===== 初始化 =====
export function initCustom(router) {
  const draft = draftManager.getDraft()
  let hasRestored = false
  
  if (draft && draft.state && (Date.now() - draft.timestamp < 7 * 24 * 3600 * 1000)) {
    const isProceed = confirm(`📝 检测到您有未完成的剧本草稿（最后修改：${new Date(draft.timestamp).toLocaleTimeString()}），是否恢复继续编辑？`)
    if (isProceed) {
       wizardState = draft.state
       hasRestored = true
    } else {
       draftManager.clearDraft()
       resetState()
    }
  } else {
    resetState()
  }
  
  if (hasRestored && wizardState.currentStep) {
     goToStep(wizardState.currentStep, 'forward', router)
  } else {
     goToStep(1, 'forward', router)
  }
}

// ===== AI 生成 =====
async function generateScenario(theme, desc, difficulty, npcCount, style, era, specialRequest) {
  const prompt = `你是一个专业的剧本杀编剧。请根据以下要求生成一个完整的推理解谜剧本。

## 要求
- 主题：${theme}
- 补充描述：${desc || '无'}
- 故事风格：${style || '不限'}
- 时代背景：${era || '不限'}
- 难度：${difficultyLabels[difficulty]}
- NPC数量：${npcCount}人
- 特殊要求：${specialRequest || '无'}

## 输出格式（必须是合法的JSON）

请返回一个 JSON 对象，格式如下（不要包含任何其他文字，只返回 JSON）：

{
  "title": "剧本标题（2-4个字）",
  "emoji": "一个代表主题的emoji",
  "brief": "一句话简介（30-50字）",
  "intro": "开场故事（150-300字，用换行分段）",
  "playerRole": "玩家角色设定（一句话）",
  "tags": ["标签1", "标签2", "标签3"],
  "coverGradient": "CSS渐变色（如 linear-gradient(135deg, #色值1 0%, #色值2 50%, #色值3 100%)）",
  "npcs": [
    {
      "id": "英文id",
      "name": "中文名",
      "emoji": "emoji",
      "role": "角色身份",
      "status": "当前状态",
      "description": "外貌和行为描述（30字）",
      "systemPrompt": "详细的AI角色扮演提示词（包含背景、已知信息、秘密、对话风格、规则，200-400字）",
      "mockResponses": ["预设回复1", "预设回复2", "预设回复3", "预设回复4"]
    }
  ],
  "clues": [
    {
      "id": "线索ID", 
      "source": "来源NPC的id",
      "title": "线索标题",
      "content": "线索内容描述",
      "keywords": ["关键词1", "关键词2"]
    }
  ],
  "answer": {
    "suspect": "凶手的NPC id",
    "motive": "作案动机",
    "method": "作案手法",
    "motiveKeywords": ["动机关键词1", "动机关键词2"],
    "methodKeywords": ["手法关键词1", "手法关键词2"]
  },
  "truthReveal": "真相揭秘的完整故事（200-400字，使用**加粗**和##标题的markdown格式）"
}

## 重要规则
1. 必须有且只有一个凶手
2. 每个NPC都要有独特的秘密和对话风格
3. 线索之间要有逻辑链，能推理出真相
4. systemPrompt 要详细，包含角色该说什么和不该说什么
5. 凶手的 systemPrompt 中要明确他绝不直接承认，但会露出破绽`

  // 最多尝试 3 次（包含 AI自修复校验失败）
  let data = null
  let lastErrors = []
  
  for (let attempt = 0; attempt < 3; attempt++) {
    const errorPrompt = lastErrors.length > 0 
      ? '\n\n⚠️ 注意：你上次生成的剧本存在以下严重错误，请务必修复后再次输出完整的JSON：\n- ' + lastErrors.join('\n- ')
      : ''
      
    const response = await aiService.chat(
      '你是一个专业的JSON生成器。只返回合法的JSON对象，不要包含任何其他文字、代码块标记或解释。',
      [],
      prompt + errorPrompt
    )

    // 解析 JSON
    const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    try {
      const parsed = JSON.parse(cleaned)
      const val = validateScenario(parsed)
      
      if (!val.valid) {
        lastErrors = val.errors
        console.warn('剧本结构校验失败，执行 AI 修复重试...', val.errors)
        continue
      }
      
      data = parsed
      if (val.hasWarnings) data._warnings = val.warnings
      break // 解析且校验成功，退出重试
    } catch (e) {
      lastErrors = ['AI 返回的数据无法解析为合法 JSON']
      console.warn('JSON 解析失败，正在重试...', e.message)
    }
  }

  if (!data) throw new Error('剧本生成失败或存在无法修复的结构错误，请重试')

  // 构建完整剧本对象
  return {
    id: `custom-${Date.now()}`,
    title: data.title,
    emoji: data.emoji,
    difficulty: difficulty,
    difficultyLabel: difficultyLabels[difficulty],
    playerCount: '1人',
    estimatedTime: difficulty <= 2 ? '10-15分钟' : difficulty <= 3 ? '15-25分钟' : '25-35分钟',
    maxRounds: difficulty <= 2 ? 20 : difficulty <= 3 ? 25 : 30,
    tags: data.tags || [theme],
    cover: {
      gradient: data.coverGradient || 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      emoji: data.emoji
    },
    brief: data.brief,
    intro: data.intro,
    playerRole: data.playerRole,
    npcs: data.npcs,
    clues: data.clues,
    answer: data.answer,
    truthReveal: data.truthReveal,
    isCustom: true,
    _warnings: data._warnings
  }
}

// ===== 结构化校验 =====
function validateScenario(scenario) {
  const errors = []
  const warnings = []
  
  const required = ['title', 'intro', 'npcs', 'clues', 'answer', 'truthReveal']
  required.forEach(key => {
    if (!scenario[key]) errors.push(`缺少必填字段: ${key}`)
  })
  
  if (scenario.npcs?.length < 3) errors.push('NPC 数量不足 3 人')
  
  const npcIds = scenario.npcs?.map(n => n.id) || []
  if (!npcIds.includes(scenario.answer?.suspect)) {
    errors.push(`凶手"${scenario.answer?.suspect}"不在 NPC 列表中`)
  }
  
  scenario.clues?.forEach(clue => {
    if (!npcIds.includes(clue.source)) {
      errors.push(`线索"${clue.title}"的来源 NPC "${clue.source}" 不存在`)
    }
  })
  
  npcIds.forEach(id => {
    const npcName = scenario.npcs.find(n => n.id === id)?.name || id
    if (!scenario.clues?.some(c => c.source === id)) {
      warnings.push(`${npcName} 没有关联任何线索`)
    }
  })
  
  scenario.clues?.forEach(clue => {
    if (!clue.keywords?.length) {
      warnings.push(`线索"${clue.title}"缺少触发关键词`)
    }
  })
  
  if (!scenario.answer?.motiveKeywords?.length) warnings.push('动机评分关键词为空')
  if (!scenario.answer?.methodKeywords?.length) warnings.push('手法评分关键词为空')
  
  return { 
    valid: errors.length === 0, 
    errors, 
    warnings,
    hasWarnings: warnings.length > 0
  }
}

// ===== Toast 提示 =====
function showToast(message, duration = 2500) {
  // 移除已存在的 toast
  document.querySelector('.custom-toast')?.remove()

  const toast = document.createElement('div')
  toast.className = 'custom-toast'
  toast.textContent = message
  document.body.appendChild(toast)

  // 入场动画
  requestAnimationFrame(() => {
    toast.classList.add('show')
  })

  // 自动消失
  setTimeout(() => {
    toast.classList.remove('show')
    toast.addEventListener('transitionend', () => toast.remove())
  }, duration)
}
