/**
 * 自定义剧本页 — AI 生成剧本
 */

import { aiService } from '../game/ai-service.js'
import { addCustomScenario } from '../scenarios/scenario-registry.js'

let generating = false

export function renderCustom() {
  return `
    <div class="custom page">
      <div class="container" style="max-width:700px;">
        <div style="text-align:center;margin-bottom:40px;">
          <h1 class="text-title" style="font-size:2rem;">✨ 创建新剧本</h1>
          <p class="text-small" style="margin-top:8px;">
            输入你的创意，让 AI 为你生成一个全新的推理剧本
          </p>
        </div>

        <div class="deduction-section">
          <div class="deduction-section-title">🎭 剧本主题</div>
          <input class="input" id="custom-theme" type="text" placeholder="例：校园推理、海岛度假村、太空站" />
        </div>

        <div class="deduction-section">
          <div class="deduction-section-title">📝 补充描述（可选）</div>
          <textarea class="input" id="custom-desc" rows="3" placeholder="描述你想要的风格、角色类型、故事氛围等..."></textarea>
        </div>

        <div class="deduction-section">
          <div class="deduction-section-title">⚙️ 设置</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div>
              <label class="settings-label">难度</label>
              <select class="input" id="custom-difficulty">
                <option value="2">⭐⭐ 入门</option>
                <option value="3" selected>⭐⭐⭐ 进阶</option>
                <option value="4">⭐⭐⭐⭐ 困难</option>
                <option value="5">⭐⭐⭐⭐⭐ 大师</option>
              </select>
            </div>
            <div>
              <label class="settings-label">NPC 数量</label>
              <select class="input" id="custom-npc-count">
                <option value="3">3 人</option>
                <option value="4" selected>4 人</option>
              </select>
            </div>
          </div>
        </div>

        ${!aiService.isConfigured ? `
          <div style="text-align:center;padding:20px;background:rgba(248,113,113,0.08);border-radius:12px;margin-bottom:24px;">
            <p style="color:var(--color-danger);margin-bottom:8px;">⚠️ 需要配置 API Key 才能使用 AI 生成功能</p>
            <button class="btn btn-ghost btn-sm" id="btn-settings-custom">配置 API</button>
          </div>
        ` : ''}

        <div id="generate-status" style="display:none;text-align:center;padding:40px 20px;">
          <div class="typing-indicator" style="justify-content:center;margin-bottom:16px;">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
          </div>
          <p style="color:var(--color-text-secondary);" id="generate-text">AI 正在创作剧本，请稍候...</p>
        </div>

        <div style="display:flex;gap:16px;margin-top:32px;">
          <button class="btn btn-ghost" id="btn-back-home" style="flex:1;">
            ← 返回大厅
          </button>
          <button class="btn btn-primary btn-lg" id="btn-generate" style="flex:2;" ${!aiService.isConfigured ? 'disabled' : ''}>
            🤖 AI 生成剧本
          </button>
        </div>
      </div>
    </div>
  `
}

export function initCustom(router) {
  generating = false

  document.getElementById('btn-back-home')?.addEventListener('click', () => {
    router.navigate('/')
  })

  document.getElementById('btn-settings-custom')?.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('open:settings'))
  })

  document.getElementById('btn-generate')?.addEventListener('click', async () => {
    if (generating) return

    const theme = document.getElementById('custom-theme')?.value?.trim()
    if (!theme) {
      alert('请输入剧本主题')
      return
    }

    const desc = document.getElementById('custom-desc')?.value?.trim() || ''
    const difficulty = parseInt(document.getElementById('custom-difficulty')?.value || '3')
    const npcCount = parseInt(document.getElementById('custom-npc-count')?.value || '4')

    generating = true
    const statusEl = document.getElementById('generate-status')
    const generateBtn = document.getElementById('btn-generate')
    if (statusEl) statusEl.style.display = 'block'
    if (generateBtn) generateBtn.disabled = true

    try {
      const scenario = await generateScenario(theme, desc, difficulty, npcCount)
      if (scenario) {
        addCustomScenario(scenario)
        sessionStorage.setItem('miju-selected-scenario', scenario.id)
        router.navigate('/intro')
      }
    } catch (e) {
      const textEl = document.getElementById('generate-text')
      if (textEl) textEl.textContent = `⚠️ 生成失败：${e.message}`
      if (generateBtn) generateBtn.disabled = false
      generating = false
    }
  })
}

const difficultyLabels = { 2: '入门', 3: '进阶', 4: '困难', 5: '大师' }

async function generateScenario(theme, desc, difficulty, npcCount) {
  const prompt = `你是一个专业的剧本杀编剧。请根据以下要求生成一个完整的推理解谜剧本。

## 要求
- 主题：${theme}
- 补充描述：${desc || '无'}
- 难度：${difficultyLabels[difficulty]}
- NPC数量：${npcCount}人

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

  const response = await aiService.chat(
    '你是一个专业的JSON生成器。只返回合法的JSON对象，不要包含任何其他文字、代码块标记或解释。',
    [],
    prompt
  )

  // 解析 JSON
  const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
  const data = JSON.parse(cleaned)

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
    isCustom: true
  }
}
