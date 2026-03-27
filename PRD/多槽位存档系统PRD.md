# 迷局 AI — 多槽位存档系统 PRD

> **版本**: v1.0 | **日期**: 2026-03-27 | **优先级**: P1 | **预估工期**: 1.5 天  
> **关联限制项**: 无游戏存档（仅保存最近一局）

---

## 1. 背景

### 1.1 现状

`state.js` 使用单一 Key `miju-ai-game-state` 存储整个游戏状态，开始新游戏时直接覆盖旧数据：

```javascript
// state.js:6 — 单一存储 Key
const STORAGE_KEY = 'miju-ai-game-state'

// state.js:55 — startGame 直接覆盖
startGame(scenarioId, maxRounds = 25) {
  this.state = { ...initialState, scenarioId, maxRounds, phase: 'playing', ... }
  this._save()  // 旧数据被覆盖
}
```

### 1.2 痛点

| 问题 | 影响 |
|------|------|
| 开始新游戏覆盖旧进度 | 玩家被迫完成当前剧本才能玩新剧本 |
| 刷新/关闭后仅恢复最后一局 | 无法在多个剧本间切换游玩 |
| 无游戏历史记录 | 无成就感和回顾性 |

---

## 2. 目标

- 🎯 支持最多 **10 个** 并行存档槽位
- 🎯 自动存档（每轮对话后）+ 手动存档
- 🎯 首页「继续游戏」快速恢复最近的未完成游戏
- 🎯 保留已完成游戏的历史记录（仅摘要，不含对话）
- 🎯 不影响现有业务逻辑

---

## 3. 方案设计

### 3.1 存储结构

```javascript
// 存档索引（轻量，用于列表展示）
// Key: 'miju-game-saves-index'
[
  {
    id: 'save-uuid-1',
    scenarioId: 'midnight-gallery',
    scenarioTitle: '午夜画廊',
    scenarioEmoji: '🖼️',
    phase: 'playing',         // playing / deducting / finished
    usedRounds: 12,
    maxRounds: 25,
    clueCount: 5,
    score: null,              // 仅 finished 有值
    createdAt: 1711526400000,
    updatedAt: 1711530000000
  },
  // ...
]

// 单个存档完整数据
// Key: 'miju-game-save-{id}'
{
  // 与现有 gameState 结构完全一致
  scenarioId, activeNpcId, conversations, clues,
  maxRounds, usedRounds, submitted, deduction, score, phase
}
```

### 3.2 存档管理规则

| 规则 | 说明 |
|------|------|
| 最大存档数 | 10 个（含已完成） |
| 自动存档 | 每次 `addMessage()` 后写入当前存档 |
| 活跃存档数 | 未完成的存档（phase ≠ finished）最多 5 个 |
| 重复剧本 | 同一剧本允许多个存档 |
| 超出上限 | 弹窗提示删除最旧的存档 |
| 已完成存档 | 保留索引信息（分数、时间），删除对话详情以节省空间 |

### 3.3 交互流程

#### 开始新游戏

```
选择剧本 → 点击"开始调查"
    │
    ├── 无冲突 → 创建新存档 → 进入游戏
    │
    └── 已有同剧本存档 →
        ┌─────────────────────────────┐
        │  检测到你有一局「午夜画廊」   │
        │  进行中，进度 12/25          │
        │                             │
        │  [继续游戏]  [新开一局]       │
        └─────────────────────────────┘
```

#### 首页继续游戏

```
首页顶部（有未完成存档时显示）：
┌─────────────────────────────────┐
│ ▶️ 继续游戏                      │
│ 🖼️ 午夜画廊 · 进度 12/25        │
│ 已收集 5 条线索 · 30 分钟前      │
└─────────────────────────────────┘
```

#### 存档管理（个人中心 / 首页入口）

```
┌─────────────────────────────────┐
│  📁 我的存档 (3/10)              │
├─────────────────────────────────┤
│ 🖼️ 午夜画廊    进行中 12/25     │
│    5 条线索 · 30 分钟前     [▶️] │
├─────────────────────────────────┤
│ 🍷 毒宴        进行中 8/25      │
│    3 条线索 · 2 小时前     [▶️]  │
├─────────────────────────────────┤
│ 🚂 消失的列车   已完成 A 85分    │
│    昨天               [🗑️]     │
└─────────────────────────────────┘
```

- 进行中：点击 ▶️ 加载并进入游戏
- 已完成：左滑/点击 🗑️ 删除
- 触底或溢出时显示：「最多保留 10 条存档」

---

## 4. 技术实现

### 4.1 涉及文件

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/game/state.js` | 重构 | 多存档管理：创建/加载/切换/删除 |
| `src/pages/home.js` | 修改 | 增加「继续游戏」浮动卡片 + 存档管理入口 |
| `src/pages/intro.js` | 修改 | 开始游戏时检查冲突存档 |
| `src/pages/result.js` | 修改 | 完成后标记存档为 finished |
| `src/style.css` | 追加 | 存档卡片、冲突弹窗样式 |

### 4.2 `state.js` 重构核心

```javascript
const SAVES_INDEX_KEY = 'miju-game-saves-index'
const SAVE_DATA_PREFIX = 'miju-game-save-'
const MAX_SAVES = 10

class GameSaveManager {
  constructor() {
    this.currentSaveId = null
    this.state = { ...initialState }
  }

  /** 获取所有存档索引 */
  listSaves() {
    return JSON.parse(localStorage.getItem(SAVES_INDEX_KEY) || '[]')
  }

  /** 创建新存档 */
  createSave(scenarioId, scenarioTitle, scenarioEmoji, maxRounds) {
    const saves = this.listSaves()
    if (saves.length >= MAX_SAVES) {
      throw new Error('SAVE_LIMIT_REACHED')
    }

    const id = 'save-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6)
    this.currentSaveId = id
    this.state = {
      ...initialState,
      scenarioId, maxRounds, phase: 'playing',
      conversations: {}, clues: []
    }

    // 更新索引
    saves.unshift({
      id, scenarioId, scenarioTitle, scenarioEmoji,
      phase: 'playing', usedRounds: 0, maxRounds,
      clueCount: 0, score: null,
      createdAt: Date.now(), updatedAt: Date.now()
    })
    localStorage.setItem(SAVES_INDEX_KEY, JSON.stringify(saves))
    this._saveCurrentData()
    return id
  }

  /** 加载存档 */
  loadSave(saveId) {
    const data = localStorage.getItem(SAVE_DATA_PREFIX + saveId)
    if (!data) return false
    this.currentSaveId = saveId
    this.state = { ...initialState, ...JSON.parse(data) }
    return true
  }

  /** 删除存档 */
  deleteSave(saveId) {
    let saves = this.listSaves()
    saves = saves.filter(s => s.id !== saveId)
    localStorage.setItem(SAVES_INDEX_KEY, JSON.stringify(saves))
    localStorage.removeItem(SAVE_DATA_PREFIX + saveId)
    if (this.currentSaveId === saveId) {
      this.currentSaveId = null
      this.state = { ...initialState }
    }
  }

  /** 查找指定剧本的进行中存档 */
  findActiveSave(scenarioId) {
    return this.listSaves().find(s => s.scenarioId === scenarioId && s.phase !== 'finished')
  }

  // ... 保留所有现有方法（get/set/addMessage/addClue 等）
  // set() 方法内部调用 _saveCurrentData() + _updateIndex()
}
```

### 4.3 向后兼容

首次启动时检测旧数据并迁移：

```javascript
function migrateOldSave() {
  const oldData = localStorage.getItem('miju-ai-game-state')
  if (!oldData) return
  
  const state = JSON.parse(oldData)
  if (state.scenarioId && state.phase !== 'idle') {
    // 将旧存档迁移到新系统
    manager.createSave(state.scenarioId, '迁移存档', '📦', state.maxRounds)
    manager.setState(state)
  }
  localStorage.removeItem('miju-ai-game-state')
}
```

---

## 5. 验收标准

| # | 场景 | 预期结果 |
|---|------|----------|
| AC-1 | 开始新游戏 | 创建新存档，进入游戏 |
| AC-2 | 中途退出，重进小程序 | 首页显示「继续游戏」卡片 |
| AC-3 | 同一剧本有进行中存档 | 弹窗询问「继续游戏」/「新开一局」 |
| AC-4 | 开始另一个剧本 | 旧存档保留，新建存档 |
| AC-5 | 存档列表展示 | 正确显示各存档的剧本名、进度、时间 |
| AC-6 | 删除存档 | 索引和详细数据均删除 |
| AC-7 | 超过 10 个存档 | 提示删除旧存档 |
| AC-8 | 旧版本用户升级 | 自动迁移旧 `miju-ai-game-state` 数据 |
