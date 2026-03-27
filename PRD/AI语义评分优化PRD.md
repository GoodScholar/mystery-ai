# 迷局 AI — AI 语义评分优化 PRD

> **版本**: v1.0 | **日期**: 2026-03-27 | **优先级**: P1 | **预估工期**: 1 天  
> **关联限制项**: 评分方式（关键词匹配 → AI 语义评估）

---

## 1. 背景

### 1.1 现状

当前动机/手法评分基于硬编码关键词匹配（`deduction.js:165-200`）：

```javascript
// 当前方式：关键词命中数 / 3 × 满分
const motiveMatches = motiveKeywords.filter(kw => motive.includes(kw)).length
motiveScore = Math.min(30, Math.round((motiveMatches / 3) * 30))
```

### 1.2 痛点

| 问题 | 示例 |
|------|------|
| 同义词无法识别 | 标准答案关键词「嫉妒」，玩家写「羡慕成恨」→ 0 分 |
| 分数颗粒度粗糙 | 仅有 0/10/20/30 四档，无法精细区分 |
| 精细描述不奖励 | 详细推理与简单堆砌关键词得分相同 |
| 预设关键词有限 | 每个剧本仅 3-6 个关键词，覆盖面窄 |

---

## 2. 目标

- 🎯 让认真推理的玩家获得更公正的评分
- 🎯 AI 评分 + 关键词评分双轨并行，取较高值，确保兜底
- 🎯 AI 评分失败时静默降级，不影响用户体验

---

## 3. 方案设计

### 3.1 评分流程

```
玩家提交推理
    │
    ├──── 1. 关键词匹配（同步，instant）
    │         → keyword_score
    │
    ├──── 2. AI 语义评分（异步，云函数/直接调用）
    │         → ai_score
    │         → 超时 8 秒自动跳过
    │
    └──── 3. 取较高值
              motive_final = max(keyword_motive, ai_motive)
              method_final = max(keyword_method, ai_method)
```

### 3.2 AI 评分 Prompt

```text
你是剧本杀游戏的推理评分裁判。请严格根据标准答案，公正评估玩家推理的准确度。

## 标准答案
- 凶手: ${correctNpcName}
- 动机: ${answer.motive}
- 手法: ${answer.method}

## 玩家回答
- 选择的凶手: ${selectedNpcName}
- 动机描述: ${deduction.motive}
- 手法描述: ${deduction.method}

## 评分标准
动机评分（0-30分）：
- 25-30分：核心动机完全正确，描述准确
- 15-24分：动机方向正确，部分细节偏差
- 8-14分：触及部分要素，但整体理解有误
- 0-7分：完全偏离或未提及核心动机

手法评分（0-30分）：
- 25-30分：作案手法完全正确，逻辑清晰
- 15-24分：手法大体正确，遗漏部分环节
- 8-14分：涉及部分正确要素，但推理链不完整
- 0-7分：完全偏离真实手法

请严格返回以下 JSON 格式（不要包含其他内容）：
{"motive_score": 数字, "method_score": 数字, "motive_comment": "一句话点评动机推理", "method_comment": "一句话点评手法推理"}
```

### 3.3 超时与降级策略

| 场景 | 处理 |
|------|------|
| AI 评分成功 | 与关键词评分对比取 max |
| AI 返回格式异常 | JSON 解析失败，使用关键词评分 |
| AI 请求超时（8秒） | 使用关键词评分 |
| API 未配置 | 仅使用关键词评分 |

### 3.4 结果页增强

AI 评分成功时，结果页动机/手法行显示 AI 点评：

```
💡 动机分析    25/30
   "准确识别了财产纠纷的核心动机"

🔪 手法推理    20/30
   "毒药投放方式正确，但遗漏了转移注意力的环节"
```

---

## 4. 技术实现

### 4.1 涉及文件

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/game/ai-service.js` | 修改 | 新增 `scoreDeduction()` 方法 |
| `src/pages/deduction.js` | 修改 | 提交后先显示评分中状态，再跳转 |
| `src/pages/result.js` | 修改 | 展示 AI 点评文案 |
| `src/game/state.js` | 修改 | `score` 增加 `motiveComment` / `methodComment` 字段 |

### 4.2 核心代码

#### `ai-service.js` 新增方法

```javascript
async scoreDeduction(answer, deduction, npcNames) {
  if (!this.isConfigured) return null

  const prompt = `...` // 上述 Prompt 模板

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('评分超时')), 8000)
    )
    const response = await Promise.race([
      this.chat('你是一个精确的JSON分析器。只返回合法的JSON。', [], prompt),
      timeoutPromise
    ])

    const cleaned = response.replace(/```json?\n?/g, '').replace(/```/g, '').trim()
    const result = JSON.parse(cleaned)

    // 校验分数范围
    return {
      motive_score: Math.min(30, Math.max(0, Math.round(result.motive_score))),
      method_score: Math.min(30, Math.max(0, Math.round(result.method_score))),
      motive_comment: result.motive_comment || '',
      method_comment: result.method_comment || ''
    }
  } catch (e) {
    console.warn('AI scoring failed:', e)
    return null
  }
}
```

#### `deduction.js` 评分逻辑修改

```javascript
async function calculateScore(suspect, motive, method) {
  // 1. 关键词评分（同步）
  const keywordScore = calculateKeywordScore(suspect, motive, method)

  // 2. AI 评分（异步，可能失败）
  const aiResult = await aiService.scoreDeduction(
    scenario.answer,
    { suspect, motive, method },
    { selected: suspectNpc?.name, correct: correctNpc?.name }
  )

  // 3. 合并：取各项较高值
  const finalScore = {
    suspect: keywordScore.suspect,
    motive: aiResult ? Math.max(keywordScore.motive, aiResult.motive_score) : keywordScore.motive,
    method: aiResult ? Math.max(keywordScore.method, aiResult.method_score) : keywordScore.method,
    efficiency: keywordScore.efficiency,
    motiveComment: aiResult?.motive_comment || '',
    methodComment: aiResult?.method_comment || ''
  }
  finalScore.total = finalScore.suspect + finalScore.motive + finalScore.method + finalScore.efficiency

  return finalScore
}
```

---

## 5. 验收标准

| # | 场景 | 预期结果 |
|---|------|----------|
| AC-1 | 配置 API Key，提交推理 | 显示「评分中...」→ 结果页展示 AI 评分 + 点评 |
| AC-2 | 用同义词描述正确动机 | AI 评分高于关键词评分，最终取 AI 分 |
| AC-3 | AI 评分超时（模拟慢网络） | 8 秒后使用关键词评分，无报错 |
| AC-4 | 未配置 API Key | 仅使用关键词评分，行为与当前完全一致 |
| AC-5 | AI 返回非法 JSON | 静默降级为关键词评分 |
