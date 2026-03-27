# 迷局 AI — 自定义剧本质量校验 PRD

> **版本**: v1.0 | **日期**: 2026-03-27 | **优先级**: P1 | **预估工期**: 1 天  
> **关联限制项**: 自定义剧本质量（LLM 输出可能逻辑不一致）

---

## 1. 背景

### 1.1 现状

`custom-scenario.js` 中 AI 生成剧本后直接展示预览，无任何结构化校验：

```javascript
// custom-scenario.js Step 3 → Step 4
const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
const scenario = JSON.parse(cleaned)
// 直接进入 Step 4 预览，无校验
```

### 1.2 常见问题

| 问题类型 | 发生频率 | 示例 |
|----------|----------|------|
| 凶手 ID 不匹配 | 高 | `answer.suspect = "zhang-san"` 但 NPC 列表无此 ID |
| 线索来源错误 | 中 | 线索的 `source` 指向不存在的 NPC |
| NPC 数量不足 | 低 | 要求 4 人，实际生成 2 人 |
| 字段缺失 | 中 | 缺少 `truthReveal` 或 `systemPrompt` |
| 关键词为空 | 高 | 线索无触发关键词，游戏中永远无法发现 |
| 孤立 NPC | 中 | 某 NPC 无关联线索，审讯该 NPC 不会有收获 |

---

## 2. 目标

- 🎯 AI 生成后自动执行结构化校验，拦截不合格剧本
- 🎯 校验不通过时自动让 AI 修复，最多重试 2 次
- 🎯 Step 4 预览页展示质量评估结果
- 🎯 不增加用户操作步骤

---

## 3. 方案设计

### 3.1 三层质量保障

```
AI 返回 JSON
    │
    ▼
Layer 1: JSON 解析 + 基础类型校验
    │ 失败 → 报错，提供重试按钮
    ▼
Layer 2: 业务逻辑校验（10 项规则）
    │ 失败 → 自动将错误列表发给 AI 修复（最多 2 次）
    ▼
Layer 3: 用户预览确认（Step 4）
    │ 展示质量评估标签
    ▼
开始游玩 / 发布
```

### 3.2 校验规则（10 项）

| # | 规则 | 级别 | 说明 |
|---|------|------|------|
| V1 | 必填字段完整 | 🔴 阻断 | title/intro/npcs/clues/answer/truthReveal 必须存在 |
| V2 | NPC 数量匹配 | 🔴 阻断 | NPC 数量 ≥ 用户设定值 |
| V3 | NPC 必要字段 | 🔴 阻断 | 每个 NPC 需有 id/name/emoji/role/systemPrompt |
| V4 | 凶手在 NPC 中 | 🔴 阻断 | `answer.suspect` 必须匹配某个 `npc.id` |
| V5 | 线索来源有效 | 🔴 阻断 | 每条线索的 `source` 必须匹配某个 `npc.id` |
| V6 | 线索有关键词 | 🟡 警告 | 每条线索至少有 2 个触发关键词 |
| V7 | 每 NPC 有线索 | 🟡 警告 | 每个 NPC 至少关联 1 条线索 |
| V8 | 答案有关键词 | 🟡 警告 | motiveKeywords/methodKeywords 各至少 3 个 |
| V9 | ID 唯一性 | 🔴 阻断 | NPC ID 和线索 ID 不重复 |
| V10 | 文本长度 | 🟡 警告 | intro ≥ 50 字，truthReveal ≥ 100 字 |

### 3.3 AI 自动修复

校验失败时，将错误列表连同原始剧本发回 AI 修复：

```text
以下剧本数据存在问题，请修复后返回完整的 JSON：

## 问题列表
1. 凶手 ID "zhang-san" 不在 NPC 列表中（现有: chen-mei, li-qiang, wang-lao）
2. 线索 "clue-3" 的来源 NPC "zhao-wu" 不存在
3. NPC "wang-lao" 没有关联任何线索

## 原始剧本 JSON
${JSON.stringify(scenario, null, 2)}

请修复上述问题并返回完整的修正后 JSON（不要包含其他内容）。
```

### 3.4 Step 4 质量标签

校验通过后在预览页展示：

```
✅ 质量检查通过
├── ✅ 4 个角色结构完整
├── ✅ 凶手设定正确
├── ✅ 8 条线索关联有效
├── ✅ 评分关键词充足
└── ⚠️ NPC「王老」仅关联 1 条线索（建议 ≥ 2）
```

---

## 4. 技术实现

### 4.1 涉及文件

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/pages/custom-scenario.js` | 修改 | Step 3→4 间增加校验 + 修复逻辑 |
| `src/game/scenario-validator.js` | 新建 | 校验器模块 |
| `src/style.css` | 追加 | 质量标签样式 |

### 4.2 校验器核心代码

```javascript
// src/game/scenario-validator.js

export function validateScenario(scenario, expectedNpcCount = 4) {
  const errors = []   // 阻断级
  const warnings = [] // 警告级

  // V1: 必填字段
  const required = ['title', 'intro', 'npcs', 'clues', 'answer', 'truthReveal']
  required.forEach(key => {
    if (!scenario[key]) errors.push({ code: 'V1', msg: `缺少必填字段: ${key}` })
  })
  if (errors.length > 0) return { valid: false, errors, warnings }

  const npcIds = scenario.npcs.map(n => n.id)

  // V2: NPC 数量
  if (scenario.npcs.length < expectedNpcCount)
    errors.push({ code: 'V2', msg: `NPC 数量不足: 期望 ${expectedNpcCount}，实际 ${scenario.npcs.length}` })

  // V3: NPC 字段
  scenario.npcs.forEach((npc, i) => {
    ['id', 'name', 'emoji', 'role', 'systemPrompt'].forEach(key => {
      if (!npc[key]) errors.push({ code: 'V3', msg: `NPC[${i}] 缺少字段: ${key}` })
    })
  })

  // V4: 凶手匹配
  if (scenario.answer?.suspect && !npcIds.includes(scenario.answer.suspect))
    errors.push({ code: 'V4', msg: `凶手 "${scenario.answer.suspect}" 不在 NPC 列表 [${npcIds.join(', ')}]` })

  // V5: 线索来源
  scenario.clues?.forEach(clue => {
    if (!npcIds.includes(clue.source))
      errors.push({ code: 'V5', msg: `线索 "${clue.title}" 来源 "${clue.source}" 不存在` })
  })

  // V6: 线索关键词
  scenario.clues?.forEach(clue => {
    if (!clue.keywords?.length || clue.keywords.length < 2)
      warnings.push({ code: 'V6', msg: `线索 "${clue.title}" 关键词不足 2 个` })
  })

  // V7: NPC 线索覆盖
  npcIds.forEach(id => {
    if (!scenario.clues?.some(c => c.source === id)) {
      const name = scenario.npcs.find(n => n.id === id)?.name || id
      warnings.push({ code: 'V7', msg: `NPC "${name}" 没有关联任何线索` })
    }
  })

  // V8: 答案关键词
  if ((scenario.answer?.motiveKeywords?.length || 0) < 3)
    warnings.push({ code: 'V8', msg: '动机评分关键词不足 3 个' })
  if ((scenario.answer?.methodKeywords?.length || 0) < 3)
    warnings.push({ code: 'V8', msg: '手法评分关键词不足 3 个' })

  // V9: ID 唯一性
  if (new Set(npcIds).size !== npcIds.length)
    errors.push({ code: 'V9', msg: 'NPC ID 存在重复' })
  const clueIds = scenario.clues?.map(c => c.id) || []
  if (new Set(clueIds).size !== clueIds.length)
    errors.push({ code: 'V9', msg: '线索 ID 存在重复' })

  // V10: 文本长度
  if ((scenario.intro?.length || 0) < 50)
    warnings.push({ code: 'V10', msg: `开场故事过短 (${scenario.intro?.length || 0} 字，建议 ≥ 50)` })
  if ((scenario.truthReveal?.length || 0) < 100)
    warnings.push({ code: 'V10', msg: `真相揭秘过短 (${scenario.truthReveal?.length || 0} 字，建议 ≥ 100)` })

  return { valid: errors.length === 0, errors, warnings }
}
```

---

## 5. 验收标准

| # | 场景 | 预期结果 |
|---|------|----------|
| AC-1 | AI 生成正常剧本 | 校验通过，Step 4 显示 ✅ |
| AC-2 | AI 生成凶手 ID 错误 | 自动修复 → 重新校验 → 通过则展示 |
| AC-3 | AI 修复 2 次仍失败 | 展示错误详情 + 「重新生成」按钮 |
| AC-4 | 线索无关键词（警告） | Step 4 展示 ⚠️ 提示，不阻断游玩 |
| AC-5 | 预览页质量标签 | 展示各项校验结果（✅/⚠️） |
