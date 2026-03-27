# 迷局 AI — 已知限制自动优化 PRD

> **版本**: v1.0.0  
> **日期**: 2026-03-27  
> **基于**: 项目整体PRD v1.0.0 · 全部核心源码审查  
> **范围**: PRD 第十二章「已知限制」+ 第十三章「潜在优化方向」中可在 Web 端直接实施的优化项

---

## 一、当前限制项状态审计

> [!IMPORTANT]
> 经过全部核心源码（8 个文件）逐行审查，PRD 中列出的 7 个限制项中 **1 项已完全修复**，**2 项已部分修复**（对话截断 + 线索超时），需更新 PRD。

| # | 限制项 | PRD 原始描述 | 实际状态 | 代码依据 |
|---|--------|-------------|----------|----------|
| 1 | 单人模式 | 仅支持 1 名玩家 | ⬜ 仍存在 | 纯前端架构，无多人协议 |
| 2 | 无后端 | localStorage 存储，清除即丢失 | ⬜ 仍存在 | `state.js` → `localStorage` |
| 3 | 评分方式 | 动机/手法基于关键词匹配 | ⬜ 仍存在 | `deduction.js:165-188` 硬编码关键词 |
| 4 | 剧本质量 | LLM 输出可能逻辑不一致 | 🟡 部分修复 | `custom-scenario.js:641` 有 JSON 重试，但无结构化校验 |
| 5 | 无游戏存档 | 仅保存最近一局 | ⬜ 仍存在 | `state.js:6` 单一 Key `miju-ai-game-state` |
| 6 | ~~流式回复~~ | ~~非流式模式~~ | ✅ 已修复 | `game.js:258-270` 流式 `onChunk` 回调 |
| 7 | API Key 明文 | localStorage 明文保存 | ⬜ 仍存在 | `ai-service.js:27` 明文写入 |

**已额外修复的问题**（来自项目优化分析.md）：

| 问题 | 修复位置 |
|------|----------|
| 对话历史无截断 | `game.js:252` → `slice(-20)` 仅发送最近 20 条 |
| 线索提取无超时 | `clue-extractor.js:33-34` → 5 秒超时降级 |
| Step2 风格/时代未校验 | `custom-scenario.js:428-435` → 已添加必选验证 |
| XSS 注入风险（设置弹窗） | `main.js:50-51` → `escapeAttr()` 转义 |

---

## 二、本次可直接实施的优化项（6 项）

> [!NOTE]
> 以下 6 项均为**纯前端可实施**的优化，无需后端或小程序支持，可在当前 Web 版直接落地。

### 优化 1：AI 语义评分（替代纯关键词匹配）

**优先级**: 🔴 P0 — 直接影响核心游戏体验

**问题分析**：

当前 `deduction.js:165-188` 中评分逻辑：
```javascript
// 关键词命中数 / 3 × 满分，颗粒度粗糙（仅 0/10/20/30 四档）
const motiveMatches = motiveKeywords.filter(kw => motive.includes(kw)).length
motiveScore = Math.min(30, Math.round((motiveMatches / 3) * 30))
```

**核心问题**：
- 同义词表达无法识别（"嫉妒" vs "羡慕成恨" vs "心生妒意"）
- 分数跳跃严重，精心描述和随意输入可能得相同分数
- 无法评估推理链的完整性

**优化方案**：

```
┌──────────────────────────────────┐
│  1. 先执行关键词匹配（零延迟）    │
│     → keyword_score              │
├──────────────────────────────────┤
│  2. 异步调用 AI 语义评分（≤8秒）  │
│     → ai_score                   │
├──────────────────────────────────┤
│  3. final = max(keyword, ai)     │
│     + AI 点评反馈                │
│     （AI 失败时静默使用关键词分数）│
└──────────────────────────────────┘
```

**涉及文件**：

| 文件 | 改动 |
|------|------|
| `ai-service.js` | 新增 `scoreDeduction(answer, deduction)` 方法 |
| `deduction.js` | 提交逻辑改为异步，先关键词评分 → 再 AI 评分取 max |
| `result.js` | 新增 AI 点评展示区域；加载时显示"AI 深度评估中..." |

**AI 评分 Prompt**：

```
你是剧本杀游戏的评分裁判。请评估玩家推理的准确度。

## 标准答案
动机: ${answer.motive}
手法: ${answer.method}

## 玩家回答
动机: ${deduction.motive}
手法: ${deduction.method}

## 评分规则
- 动机满分 30 分，手法满分 30 分
- 核心要素完全正确 → 满分
- 核心要素部分正确 → 15-25 分
- 方向正确但细节偏差 → 8-15 分
- 完全偏离 → 0-5 分

请返回 JSON：
{"motive_score": N, "method_score": N, "comment": "一句话点评"}
```

**容错设计**：
- 8 秒超时 → 静默使用关键词分数
- JSON 解析失败 → fallback 关键词分数
- 结果页先展示关键词分数 → AI 评分完成后平滑更新

---

### 优化 2：自定义剧本质量校验

**优先级**: 🔴 P0 — 生成的剧本如果结构有误将导致游戏无法正常进行

**问题分析**：

当前 `custom-scenario.js` 在 Step 3 生成后直接进入 Step 4 预览，无结构化校验。可能出现：
- 凶手 ID 与 NPC 列表不匹配 → 游戏无法评分
- 线索来源 NPC 不存在 → 线索系统失效
- 某个 NPC 无关联线索 → 该 NPC 的对话无意义
- 关键词缺失 → Mock 模式下线索无法触发

**优化方案 — 三层质量保障**：

#### Layer 1：结构化校验（生成后即刻执行）

```javascript
function validateScenario(scenario) {
  const errors = []
  const warnings = []
  
  // 1. 必填字段检查
  const required = ['title', 'intro', 'npcs', 'clues', 'answer', 'truthReveal']
  required.forEach(key => {
    if (!scenario[key]) errors.push(`缺少必填字段: ${key}`)
  })
  
  // 2. NPC 数量校验（≥3）
  if (scenario.npcs?.length < 3) errors.push('NPC 数量不足 3 人')
  
  // 3. 凶手必须在 NPC 列表中
  const npcIds = scenario.npcs?.map(n => n.id) || []
  if (!npcIds.includes(scenario.answer?.suspect)) {
    errors.push(`凶手"${scenario.answer?.suspect}"不在 NPC 列表中`)
  }
  
  // 4. 线索来源 NPC 必须存在
  scenario.clues?.forEach(clue => {
    if (!npcIds.includes(clue.source)) {
      errors.push(`线索"${clue.title}"的来源 NPC "${clue.source}" 不存在`)
    }
  })
  
  // 5. 每个 NPC 至少有 1 条线索
  npcIds.forEach(id => {
    const npcName = scenario.npcs.find(n => n.id === id)?.name || id
    if (!scenario.clues?.some(c => c.source === id)) {
      warnings.push(`${npcName} 没有关联任何线索`)
    }
  })
  
  // 6. 关键词非空（影响 Mock 模式）
  scenario.clues?.forEach(clue => {
    if (!clue.keywords?.length) {
      warnings.push(`线索"${clue.title}"缺少触发关键词`)
    }
  })
  
  // 7. 动机/手法关键词非空
  if (!scenario.answer?.motiveKeywords?.length) {
    warnings.push('动机评分关键词为空')
  }
  if (!scenario.answer?.methodKeywords?.length) {
    warnings.push('手法评分关键词为空')
  }
  
  return { 
    valid: errors.length === 0, 
    errors, 
    warnings,
    hasWarnings: warnings.length > 0
  }
}
```

#### Layer 2：AI 自修复（校验失败时）

```
验证失败 → 将错误列表 + 原始剧本 JSON 发回 AI
         → 要求修复具体问题
         → 最多重试 2 次
         → 仍然失败 → 展示错误详情 + 重新生成按钮
```

#### Layer 3：预览页质量提示

Step 4 预览页增加校验状态展示：

| 校验结果 | 展示 |
|----------|------|
| 全部通过 | `✅ 剧本结构完整` 绿色提示 |
| 有警告 | `⚠️ 2 项建议优化` 黄色提示，可展开详情 |
| 有错误 | `❌ 结构异常` 红色提示 + 禁用"开始游玩" + 提供"AI 修复"按钮 |

**涉及文件**：

| 文件 | 改动 |
|------|------|
| `custom-scenario.js` | 新增 `validateScenario()` 函数；Step3→4 间执行校验；失败时 AI 自修复重试；Step4 展示校验状态 |

---

### 优化 3：多槽位存档系统

**优先级**: 🟡 P1 — 提升用户留存和游玩意愿

**问题分析**：

当前 `state.js:6` 使用单一 key `miju-ai-game-state`，开始新游戏直接覆盖旧数据。玩家无法：
- 同时进行多个剧本
- 暂停一个剧本去玩另一个
- 找回之前未完成的游戏

**优化方案**：

**存储结构变更**：

```javascript
// 旧方案：单一 Key
localStorage.setItem('miju-ai-game-state', JSON.stringify(state))

// 新方案：索引 + 独立存档
// 索引：存档元数据列表
localStorage.setItem('miju-game-saves-index', JSON.stringify([
  { 
    id: 'save-xxx', 
    scenarioId: 'midnight-gallery', 
    scenarioTitle: '午夜画廊',
    scenarioEmoji: '🖼️',
    phase: 'playing', 
    progress: '12/25',    // 已用回合/总回合
    clueCount: 3,
    updatedAt: 1711519200000
  }
]))

// 每个存档独立存储
localStorage.setItem('miju-game-save-xxx', JSON.stringify({...fullState}))
```

**核心功能**：

| 功能 | 行为 |
|------|------|
| 自动存档 | 每轮对话后自动更新当前存档 |
| 新建游戏 | 检查是否有同剧本进行中的存档 → 提示覆盖或新建 |
| 继续游戏 | 首页显示"继续游戏"浮动卡片（最近未完成存档） |
| 存档管理 | 首页底部或设置入口查看所有存档，支持加载/删除 |
| 存档上限 | 最多 10 个存档，超出时提示删除最旧的已完成存档 |

**涉及文件**：

| 文件 | 改动 |
|------|------|
| `state.js` | 重构为 `GameSaveManager`，管理多存档索引和读写 |
| `home.js` | 新增"继续游戏"浮动卡片 + 存档列表入口 |
| `intro.js` | 开始新游戏时检查同剧本存档冲突 |

**向后兼容**：
- 首次启动检测旧的 `miju-ai-game-state` key
- 如果存在 → 自动迁移为新格式的第一个存档
- 迁移后删除旧 key

---

### 优化 4：API Key 安全加密

**优先级**: 🟡 P1 — 安全性提升

**问题分析**：

当前 `ai-service.js:27` → `localStorage.setItem(API_KEY_STORAGE, apiKey)` 明文存储。任何浏览器扩展或 XSS 攻击可直接读取。

**优化方案 — Web Crypto API 加密**：

```javascript
// 使用 Web Crypto API + 设备指纹作为密钥
const ENCRYPTION_SALT = 'miju-ai-2026'

async function deriveKey() {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(navigator.userAgent + ENCRYPTION_SALT),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('miju-ai-key-salt'),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

async function encryptApiKey(apiKey) {
  const key = await deriveKey()
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(apiKey)
  )
  return JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  })
}

async function decryptApiKey(stored) {
  const { iv, data } = JSON.parse(stored)
  const key = await deriveKey()
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(iv) },
    key,
    new Uint8Array(data)
  )
  return new TextDecoder().decode(decrypted)
}
```

> [!CAUTION]
> 前端加密只能提升攻击门槛，无法根本性解决安全问题。生产环境应使用后端代理（云函数）。此方案作为 Web 端过渡方案。

**涉及文件**：

| 文件 | 改动 |
|------|------|
| `ai-service.js` | `saveSettings()` 改为异步 + 加密存储；`constructor` 改为异步初始化 + 解密读取；新增 `crypto-helper.js` 辅助模块 |
| `main.js` | `AIService` 初始化改为异步（`await aiService.init()`） |

**向后兼容**：
- 读取时先尝试解密（新格式），失败则按明文处理（旧格式）
- 按明文读取成功后，自动迁移为加密格式

---

### 优化 5：移动端适配修复

**优先级**: 🔴 P0 — 移动端游戏完全无法进行

**问题分析**：

`style.css` 中 `.npc-sidebar-actions { display: none; }` 直接隐藏了移动端的"线索板"和"提交推理"按钮，导致移动端用户**无法查看线索，也无法提交推理**。

**优化方案**：

```css
@media (max-width: 768px) {
  /* NPC 侧边栏改为顶部横向滚动 */
  .game-body {
    flex-direction: column;
  }
  
  .npc-sidebar {
    width: 100%;
    flex-direction: row;
    padding: 8px;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
  }
  
  .npc-sidebar-title {
    display: none;
  }
  
  .npc-list {
    display: flex;
    flex-direction: row;
    overflow-x: auto;
    gap: 8px;
    padding-bottom: 4px;
  }
  
  .npc-item {
    flex-shrink: 0;
    min-width: auto;
    padding: 8px 12px;
  }
  
  /* 关键：恢复底部操作按钮 */
  .npc-sidebar-actions {
    display: flex !important;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 16px;
    background: var(--color-bg-primary);
    border-top: 1px solid var(--color-border);
    z-index: 100;
    gap: 12px;
  }
  
  /* 为固定底栏留出空间 */
  .chat-input-area {
    padding-bottom: 72px;
  }
  
  /* 推理页/结果页移动端适配 */
  .deduction-section {
    padding: 0 4px;
  }
  
  .result-card {
    padding: 24px 16px;
    margin: 16px 8px;
  }
}
```

**涉及文件**：

| 文件 | 改动 |
|------|------|
| `style.css` | 修复移动端布局，恢复操作按钮，添加响应式规则 |

---

### 优化 6：回合用完交互优化

**优先级**: 🟢 P2 — 提升用户体感

**问题分析**：

当前回合用完后 `game.js:302` 1 秒后调用 `reRenderGame` 全量重绘，只是静默刷新页面。用户可能困惑为什么输入框消失了。

**优化方案**：

```javascript
// 回合用完 → 弹出提示弹窗而非静默刷新
if (gameState.getRemainingRounds() <= 0) {
  showRoundExhaustedDialog(router)
}

function showRoundExhaustedDialog(router) {
  const overlay = document.createElement('div')
  overlay.className = 'overlay'
  overlay.innerHTML = `
    <div class="modal" style="text-align:center;">
      <div style="font-size:3rem;margin-bottom:16px;">⏰</div>
      <h3 class="text-title" style="margin-bottom:12px;">对话回合已用完</h3>
      <p style="color:var(--color-text-secondary);margin-bottom:24px;">
        根据你收集到的线索，是时候提交你的推理了！
      </p>
      <div style="display:flex;gap:12px;">
        <button class="btn btn-ghost" id="btn-stay">查看线索</button>
        <button class="btn btn-primary btn-lg" id="btn-go-deduction" style="flex:2;">
          🔍 提交推理
        </button>
      </div>
    </div>
  `
  document.body.appendChild(overlay)
  
  document.getElementById('btn-go-deduction')?.addEventListener('click', () => {
    overlay.remove()
    router.navigate('/deduction')
  })
  
  document.getElementById('btn-stay')?.addEventListener('click', () => {
    overlay.remove()
    reRenderGame(router) // 刷新页面，禁用输入框但保留线索板
  })
}
```

**涉及文件**：

| 文件 | 改动 |
|------|------|
| `game.js` | 替换 `setTimeout(reRenderGame, 1000)` 为弹窗交互 |

---

## 三、优化优先级总览

| 优先级 | 优化项 | 工作量 | 收益 | 复杂度 |
|--------|--------|--------|------|--------|
| 🔴 P0 | 移动端适配修复 | 0.5 天 | 🔥高 | ⭐⭐ |
| 🔴 P0 | AI 语义评分 | 1 天 | 🔥高 | ⭐⭐⭐ |
| 🔴 P0 | 剧本质量校验 | 1 天 | 🔥高 | ⭐⭐⭐ |
| 🟡 P1 | 多槽位存档系统 | 1.5 天 | 高 | ⭐⭐⭐⭐ |
| 🟡 P1 | API Key 安全加密 | 0.5 天 | 中 | ⭐⭐⭐ |
| 🟢 P2 | 回合用完交互优化 | 0.5 小时 | 中 | ⭐ |

**合计预估**: ~4.5 个工作日

---

## 四、不在本次实施范围的优化

以下优化项需要后端支持或更长周期规划，列在此处供参考：

| 优化项 | 原因 | 建议阶段 |
|--------|------|----------|
| 单人模式 → 好友挑战 | 需要云数据库（存储挑战记录 + 分数对比） | 小程序 Phase 2 |
| 无后端 → 分层存储 | 需要云数据库或 Supabase | 小程序转型 |
| 社区剧本广场 | 需要后端 API + 存储 | 小程序 Phase 3 |
| 语音交互 | 需要 ASR/TTS 服务 | 远期规划 |
| 成就系统 | 前端可实现但需要持久化统计数据 | 存档系统完成后 |
| 多语言 | 需要 i18n 框架 + 翻译 | 远期规划 |

---

## 五、PRD 第十二章更新建议

将项目整体 PRD 第十二章更新为：

```markdown
## 十二、当前已知限制

| 限制项 | 说明 | 状态 |
|--------|------|------|
| 单人模式 | 仅支持 1 名玩家 | 待优化（好友挑战模式 · 需后端） |
| 无后端 | localStorage 存储，清除即丢失 | 小程序版将接入云数据库 |
| 评分方式 | 动机/手法评分基于关键词匹配 | 🔧 优化中（AI 语义评分 + 关键词兜底） |
| 自定义剧本质量 | 依赖 LLM 输出质量 | 🔧 优化中（结构化校验 + AI 自检） |
| 无游戏存档 | 仅保存最近一局游戏状态 | 🔧 优化中（多槽位存档系统） |
| ~~流式回复渲染~~ | ~~非流式模式~~ | ✅ 已实现（流式 onChunk 回调） |
| ~~对话历史截断~~ | ~~全量发送 Token 溢出~~ | ✅ 已实现（最近 20 条） |
| ~~线索提取超时~~ | ~~无超时控制~~ | ✅ 已实现（5 秒超时降级） |
| API Key 明文存储 | localStorage 中明文保存 | 🔧 优化中（Web Crypto 加密 · 过渡方案） |
```

---

## 六、验证方案

### 6.1 AI 语义评分

1. 配置有效 API Key
2. 完成一局游戏 → 故意用同义词描述动机/手法
3. 验证：AI 评分应 ≥ 关键词评分
4. 断开网络 → 验证降级为关键词评分，无报错

### 6.2 剧本质量校验

1. 使用 AI 生成一个新剧本
2. 验证 Step 3 → 4 之间出现"✅ 剧本结构完整"提示
3. 手动模拟一个错误剧本（凶手 ID 不在 NPC 列表）→ 验证错误提示和"AI 修复"按钮

### 6.3 多槽位存档

1. 开始游戏 A → 对话几轮 → 返回大厅
2. 开始游戏 B → 验证首页出现"继续游戏"卡片
3. 点击"继续游戏" → 验证加载游戏 A 的状态
4. 清除所有数据后打开 → 验证无崩溃

### 6.4 API Key 加密

1. 配置 API Key → 检查 localStorage 中存储的值为加密格式
2. 刷新页面 → 验证 API Key 正确恢复
3. 旧明文 Key 存在时 → 验证自动迁移为加密格式

### 6.5 移动端适配

1. 浏览器模拟手机视口（375×667）
2. 进入游戏页 → 验证底部固定栏显示"线索板"和"提交推理"按钮
3. NPC 列表应为横向滚动

### 6.6 回合用完交互

1. 进入游戏 → 使用 Mock 模式消耗所有回合
2. 最后一次对话后 → 验证弹出提示弹窗
3. 点击"提交推理" → 正常跳转到推理页
