# 迷局 AI — 移动端适配优化 PRD

> **版本**: v1.0 | **日期**: 2026-03-27 | **优先级**: P0 | **预估工期**: 1 天  
> **关联限制项**: 移动端功能缺失 + 布局适配

---

## 1. 背景

### 1.1 现状问题

据 `项目优化分析.md` 和源码审查，移动端存在以下关键问题：

| 问题 | 严重程度 | 代码位置 |
|------|----------|----------|
| 线索板/提交推理按钮被隐藏 | 🔴 致命 | `style.css` `.npc-sidebar-actions { display: none }` |
| NPC 侧边栏挤占对话区 | 🟡 体验差 | 固定宽度侧边栏在小屏溢出 |
| 推理页/结果页无响应式 | 🟡 体验差 | 表单元素间距过大 |
| 角色卡片溢出 | 🟢 小问题 | 160px 固定宽度在极窄屏幕拥挤 |

> [!CAUTION]  
> 移动端线索板和提交推理按钮被 `display: none` 隐藏，导致 **移动端用户无法完成游戏**。这是 P0 级 Bug。

---

## 2. 目标

- 🎯 **修复致命 Bug**：移动端恢复线索板和提交推理按钮
- 🎯 **游戏页重布局**：NPC 侧边栏改为顶部横向头像栏
- 🎯 **全页面适配**：首页/介绍页/推理页/结果页/创作工坊响应式优化
- 🎯 **触控友好**：按钮最小 44px 触控区域，手势操作

---

## 3. 各页面适配方案

### 3.1 游戏页（核心改造）

**桌面端布局（保持不变）**：
```
┌──────────────────────────────────────┐
│              Header                   │
├──────────┬───────────────────────────┤
│ NPC 侧栏  │       对话区域            │
│ (垂直列表) │                          │
│           │                          │
│ [线索板]   │                          │
│ [提交推理] │    [输入区域]             │
└──────────┴───────────────────────────┘
```

**移动端布局（新设计）**：
```
┌────────────────────────┐
│ ← 午夜画廊    剩余 20/25│  ← Header
├────────────────────────┤
│ 😈  👩‍🔬  👴  💃        │  ← NPC 横向头像栏
│ 陈梅 李强 王老 林舞      │    （scroll-x）
├────────────────────────┤
│                        │
│  [对话消息区域]         │  ← 可滚动
│                        │
├────────────────────────┤
│ 💬 输入问题...    [发送]│  ← 输入区
├────────────────────────┤
│  📋线索(5)    🔍提交推理 │  ← 底部固定操作栏
└────────────────────────┘
```

### 3.2 首页

| 调整项 | 桌面端 | 移动端 |
|--------|--------|--------|
| 剧本卡片网格 | 3-4 列 | 2 列 |
| 卡片标题 | 正常字号 | 缩小至 0.9rem |
| 删除按钮 | hover 显示 | 始终可见 |
| API 设置按钮 | 底部固定 | 底部固定 |

### 3.3 介绍页

| 调整项 | 方案 |
|--------|------|
| 角色卡片 | 改为横向滚动 `overflow-x: auto` |
| 卡片宽度 | 移动端 `min-width: 140px`（略缩小） |
| 开始按钮 | 底部安全区固定 |

### 3.4 推理页

| 调整项 | 方案 |
|--------|------|
| 嫌疑人卡片 | 改为横向滚动 |
| textarea | 宽度 100%，适当减小 padding |
| 线索参考 | 默认折叠，点击展开 |
| 按钮组 | 纵向排列（全宽） |

### 3.5 结果页

| 调整项 | 方案 |
|--------|------|
| 分数字号 | 移动端从 4rem 减至 3rem |
| 等级徽章 | 适当缩小 |
| 明细卡片 | 减小 padding |
| 真相揭秘 | 全宽展示 |
| 按钮组 | 纵向排列 |

### 3.6 创作工坊

| 调整项 | 方案 |
|--------|------|
| 主题卡片网格 | 4 列 → 3 列（移动端） → 2 列（极窄） |
| 选项胶囊 | 换行排列 |
| 步骤按钮 | 全宽纵向排列 |

---

## 4. 技术实现

### 4.1 涉及文件

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/style.css` | 修改 | 增加 `@media` 响应式规则 |
| `src/pages/game.js` | 修改 | 移动端底部操作栏逻辑 |

### 4.2 核心 CSS 修改

```css
/* ===== 移动端适配 ===== */
@media (max-width: 768px) {

  /* === 游戏页 NPC 侧边栏 → 横向头像栏 === */
  .game-body {
    flex-direction: column;
  }

  .npc-sidebar {
    width: 100%;
    min-width: unset;
    max-width: unset;
    border-right: none;
    border-bottom: 1px solid var(--color-border);
    padding: 8px 12px;
  }

  .npc-sidebar-title {
    display: none;  /* 移动端隐藏"嫌疑人"标题 */
  }

  .npc-list {
    display: flex;
    flex-direction: row;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 4px;
    -webkit-overflow-scrolling: touch;
  }

  .npc-item {
    flex-shrink: 0;
    min-width: 60px;
    text-align: center;
    padding: 6px 8px;
  }

  .npc-item-info {
    text-align: center;
  }

  .npc-item-role {
    font-size: 0.7rem;
  }

  /* === 关键修复：恢复操作按钮 === */
  .npc-sidebar-actions {
    display: flex !important;    /* 覆盖 display:none */
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px 16px;
    padding-bottom: calc(8px + env(safe-area-inset-bottom));
    background: var(--color-bg-primary);
    border-top: 1px solid var(--color-border);
    z-index: 100;
    gap: 8px;
  }

  .chat-area {
    padding-bottom: 80px; /* 为底部操作栏留空间 */
  }

  .chat-input-area {
    padding-bottom: 60px; /* 为底部操作栏留空间 */
  }

  /* === 首页卡片 === */
  .scenario-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }

  /* === 介绍页角色卡片 === */
  .intro-characters {
    display: flex;
    overflow-x: auto;
    gap: 12px;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
  }

  .character-card {
    min-width: 140px;
    flex-shrink: 0;
  }

  /* === 推理页 === */
  .deduction .deduction-option {
    padding: 12px;
  }

  .deduction .result-actions,
  .deduction div[style*="display:flex;gap:16px"] {
    flex-direction: column;
  }

  /* === 结果页 === */
  .result-score {
    font-size: 3rem;
  }

  .result-actions {
    flex-direction: column;
    gap: 8px;
  }

  .result-actions .btn {
    width: 100%;
  }

  /* === 创作工坊 === */
  .theme-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* 极窄屏幕 */
@media (max-width: 375px) {
  .theme-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .scenario-grid {
    grid-template-columns: 1fr;
  }
}
```

---

## 5. 验收标准

| # | 场景 | 预期结果 |
|---|------|----------|
| AC-1 | iPhone SE（375px）打开游戏页 | NPC 横向滚动展示，底部操作栏可见 |
| AC-2 | 移动端点击线索板 | 线索面板正常打开 |
| AC-3 | 移动端点击提交推理 | 正常跳转推理页 |
| AC-4 | 移动端首页 | 2 列卡片网格，删除按钮可见 |
| AC-5 | 移动端介绍页 | 角色卡片横向滚动，不溢出 |
| AC-6 | 移动端推理页 | 按钮纵向排列，textarea 全宽 |
| AC-7 | 移动端结果页 | 分数和按钮适配，不溢出 |
| AC-8 | iPad（768px）| 自动切换为桌面端布局 |
