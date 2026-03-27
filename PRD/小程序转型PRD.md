# 迷局 AI — 微信小程序版 PRD

> **版本**: v1.0.0  
> **日期**: 2026-03-27  
> **产品定位**: 沉浸式 AI 剧本杀推理游戏（微信小程序端）  
> **前置依赖**: Web 端 v1.0 已完成

---

## 一、项目背景与目标

### 1.1 背景

「迷局 AI」Web 端已具备完整的剧本杀推理游戏体验，包含 5 个预设剧本、AI 自定义剧本生成、NPC 对话、线索收集、推理评分等核心功能。但当前存在以下问题：

| 问题 | 现状 | 影响 |
|------|------|------|
| 获客渠道单一 | 仅 Web 端，需手动输入 URL | 用户触达困难，推广成本高 |
| 社交裂变缺失 | 无分享机制 | 无法借助社交网络自然增长 |
| 用户留存低 | 无登录/推送能力 | 浏览器关闭后难以召回 |
| 数据安全性差 | localStorage 存储，清除即丢失 | 换设备/清缓存数据全丢 |
| 支付能力空白 | 无付费入口 | 无法实现商业变现 |

### 1.2 目标

将「迷局 AI」从 Web 端迁移到 **微信小程序**，实现以下核心目标：

- 🎯 **降低获客成本**：微信生态内搜索即达，分享即玩
- 🎯 **激活社交裂变**：剧本分享卡片、游戏结果晒单、好友邀请
- 🎯 **提升用户留存**：模板消息召回、订阅通知、收藏即入口
- 🎯 **云端数据持久化**：接入云数据库，多端同步，不怕丢数据
- 🎯 **商业变现基础**：付费剧本、会员体系、广告位预留

---

## 二、技术架构

### 2.1 技术选型

| 层级 | 技术方案 | 说明 |
|------|----------|------|
| 前端框架 | **Taro 4.x + Vue 3** | 跨端框架，一套代码编译为小程序/H5 |
| UI 库 | **NutUI 4.x** | Taro 生态 Vue3 组件库 |
| 状态管理 | **Pinia** | Vue3 推荐状态管理方案 |
| 样式方案 | **SCSS** | 模块化样式，支持变量/嵌套 |
| 后端服务 | **微信云开发** | 云函数 + 云数据库 + 云存储 |
| AI 服务 | **云函数代理** | 后端转发 AI 请求，保护 API Key |
| 包管理 | **pnpm** | 高效依赖管理 |

### 2.2 系统架构图

```
┌──────────────────────────────────────────────────────┐
│                   微信小程序前端                       │
│   Taro 4 + Vue 3 + NutUI + Pinia                    │
├──────────────────────────────────────────────────────┤
│                                                      │
│  ┌─────────┐ ┌─────────┐ ┌──────────┐ ┌──────────┐  │
│  │ 剧本大厅 │ │ 游戏核心 │ │ 创作工坊  │ │ 个人中心  │  │
│  └────┬────┘ └────┬────┘ └────┬─────┘ └────┬─────┘  │
│       │          │          │            │          │
│  ┌────┴──────────┴──────────┴────────────┴─────┐   │
│  │            Pinia 全局状态管理                  │   │
│  └──────────────────┬───────────────────────────┘   │
│                     │                               │
├─────────────────────┼───────────────────────────────┤
│                     ▼                               │
│  ┌──────────────────────────────────────────────┐   │
│  │          微信云开发 CloudBase                  │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │   │
│  │  │ 云函数    │ │ 云数据库  │ │ 云存储       │  │   │
│  │  │ • AI代理  │ │ • 用户   │ │ • 剧本资源   │  │   │
│  │  │ • 剧本CRD │ │ • 剧本   │ │ • 分享图片   │  │   │
│  │  │ • 评分    │ │ • 评价   │ │              │  │   │
│  │  └─────┬────┘ │ • 存档   │ └──────────────┘  │   │
│  │        │      └──────────┘                    │   │
│  └────────┼──────────────────────────────────────┘   │
│           │                                         │
│           ▼                                         │
│  ┌──────────────────┐                               │
│  │  LLM API 服务     │                               │
│  │  DeepSeek / Gemini │                               │
│  └──────────────────┘                               │
└──────────────────────────────────────────────────────┘
```

### 2.3 与 Web 端的核心技术差异

| 维度 | Web 端（当前） | 小程序端（规划） |
|------|---------------|-----------------|
| 路由 | Hash-based SPA Router | Taro Router（基于页面栈） |
| 数据存储 | localStorage | 云数据库 + wx.setStorageSync 缓存 |
| AI 请求 | 前端直接调用 API | 云函数代理（保护 Key） |
| 用户体系 | 无 | 微信登录（openId） |
| 分享 | 无 | 小程序转发卡片 + 海报 |
| 支付 | 无 | 微信支付 |
| 推送 | 无 | 订阅消息 |

---

## 三、功能模块设计

### 3.1 页面结构

```
pages/
├── index/index                # 首页 - 剧本大厅（TabBar）
├── discover/index             # 发现 - 社区广场（TabBar）
├── profile/index              # 我的 - 个人中心（TabBar）
│
├── scenario/intro             # 剧本介绍页
├── scenario/game              # 游戏核心页（NPC对话）
├── scenario/deduction         # 推理提交页
├── scenario/result            # 结果评分页
│
├── workshop/index             # 创作工坊入口
├── workshop/step1             # Step1 灵感激发
├── workshop/step2             # Step2 剧本设定
├── workshop/step3             # Step3 AI生成
├── workshop/step4             # Step4 预览微调
│
├── community/detail           # 社区剧本详情
├── community/reviews          # 剧本评价列表
│
└── settings/index             # 设置页
```

### 3.2 TabBar 设计

| Tab | 图标 | 标题 | 页面 |
|-----|------|------|------|
| 1 | 🎭 | 剧本 | `pages/index/index` |
| 2 | 🌐 | 发现 | `pages/discover/index` |
| 3 | 👤 | 我的 | `pages/profile/index` |

---

### 3.3 模块详细说明

#### 3.3.1 首页 — 剧本大厅

**功能清单**：

| 功能项 | 说明 | 优先级 |
|--------|------|--------|
| 顶部 Banner | 推荐剧本轮播（Swiper），展示精选/新上线剧本 | P1 |
| 预设剧本卡片 | 网格布局展示 5 个内置剧本，含封面渐变、Emoji、标题、难度标签 | P0 |
| 自定义剧本卡片 | 展示用户创建的自定义剧本，支持滑动删除 | P0 |
| 创建新剧本 | 独立入口卡片，跳转创作工坊 | P0 |
| 继续游戏 | 如有进行中的游戏，顶部显示浮动卡片快速恢复 | P1 |
| 下拉刷新 | 刷新剧本列表和推荐内容 | P2 |

**交互要点**：
- 卡片点击进入 `scenario/intro` 剧本介绍页
- 自定义剧本卡片支持左滑显示删除按钮（符合小程序交互习惯）
- 首次进入检查云端是否有未完成的游戏存档

---

#### 3.3.2 发现 — 社区广场

**功能清单**：

| 功能项 | 说明 | 优先级 |
|--------|------|--------|
| 搜索栏 | 模糊搜索剧本标题、简介、标签 | P0 |
| 分类标签 | 横向滚动标签栏：全部/推理/恐怖/校园/科幻/古风/搞笑 | P0 |
| 排序切换 | 热门 / 最新 / 评分最高 三种排序 | P0 |
| 剧本卡片流 | 瀑布流或列表布局，展示评分/游玩次数/作者 | P0 |
| 分页加载 | 触底加载更多（每页 20 条） | P1 |
| 精选推荐 | 顶部精选剧本横向滚动区 | P2 |

---

#### 3.3.3 个人中心

**功能清单**：

| 功能项 | 说明 | 优先级 |
|--------|------|--------|
| 用户信息 | 微信头像、昵称（授权获取） | P0 |
| 游戏统计 | 已完成局数、平均分、最高分、S级次数 | P1 |
| 我的剧本 | 我创建的自定义剧本列表 | P0 |
| 我发布的 | 已发布到社区的剧本（含评分/游玩数据反馈） | P1 |
| 我收藏的 | 从社区收藏的剧本 | P1 |
| 游戏存档 | 进行中的游戏记录，支持多局存档 | P1 |
| 游戏历史 | 已完成的游戏记录（剧本名、评分、耗时） | P2 |
| 成就徽章 | 根据游戏表现解锁的成就（首次S级、全剧本通关等） | P2 |
| 设置 | AI 模型配置（非必须，云端统一配置） | P1 |

---

#### 3.3.4 剧本介绍页

从 Web 端移植，小程序适配要点：

| 功能项 | 适配说明 |
|--------|----------|
| 背景故事 | 打字机效果保留，使用 `setInterval` 实现逐字显示 |
| 角色卡片 | 横向滚动展示（`scroll-view`），每张卡片固定宽度 |
| 规则提示 | 底部固定区域显示回合数说明 |
| 开始调查 | 底部安全区固定按钮，初始化游戏后跳转 `scenario/game` |

---

#### 3.3.5 游戏核心页（核心体验）

这是产品最核心的页面，需要重点设计：

**布局方案**（小程序适配）：

```
┌────────────────────────┐
│ ← 返回   午夜画廊   ⚙️ │  ← 导航栏
├────────────────────────┤
│ 剩余回合: 20/25  🔍📝  │  ← 状态栏（回合+线索+推理入口）
├────────────────────────┤
│ ┌──┐ ┌──┐ ┌──┐ ┌──┐   │
│ │👧│ │🧑│ │👴│ │💃│   │  ← NPC 头像横向滚动
│ │陈│ │李│ │王│ │林│   │    当前对话 NPC 高亮
│ └──┘ └──┘ └──┘ └──┘   │
├────────────────────────┤
│                        │
│  [对话消息区域]         │  ← scroll-view 可滚动
│  NPC: 你好，侦探...    │
│  你: 那天晚上...       │
│  NPC: 其实那天...      │
│  ···                   │
│                        │
├────────────────────────┤
│ 💬 输入你的问题...  [发]│  ← 底部固定输入区
└────────────────────────┘
```

**关键交互**：

| 功能项 | 说明 |
|--------|------|
| NPC 切换 | 头像栏横向滑动切换，保留各 NPC 独立对话历史 |
| 对话发送 | 点击发送按钮或软键盘确认发送 |
| AI 回复 | 显示"正在输入..."指示器，回复完成后自动滚动到底部 |
| 流式输出 | 支持流式逐字显示 NPC 回复（优化等待体验） |
| 线索通知 | 发现新线索时顶部 `wx.showToast` 提示 |
| 线索板 | 状态栏 🔍 按钮打开半屏弹窗（`page-container`），展示已收集线索 |
| 提交推理 | 状态栏 📝 按钮跳转 `scenario/deduction` |
| 回合警告 | 剩余 ≤5 次时状态栏回合数变红闪烁 |
| 键盘适配 | 输入框聚焦时页面自动上推，避免键盘遮挡 |

---

#### 3.3.6 推理提交页

| 功能项 | 说明 |
|--------|------|
| 凶手选择 | 嫌疑人卡片单选（横向滚动、点击高亮） |
| 动机描述 | `textarea` 自由输入，最多 200 字 |
| 手法描述 | `textarea` 自由输入，最多 200 字 |
| 线索参考 | 可展开/折叠的已收集线索列表 |
| 提交按钮 | 底部固定，三项均填写后才可点击 |
| 返回继续 | 支持返回游戏页继续调查 |

---

#### 3.3.7 结果评分页

| 功能项 | 说明 |
|--------|------|
| 分数动画 | 数字从 0 递增至最终分数（CSS animation） |
| 等级评定 | S/A/B/C/D 评级，大号 Emoji + 评语 |
| 分数明细 | 凶手/动机/手法/效率/线索数/对话数明细卡片 |
| 真相揭秘 | 可展开的完整真相故事（rich-text 渲染 Markdown） |
| 分享战绩 | 生成带成绩的分享海报 → 转发/保存到相册 |
| 再玩一次 | 重置当前剧本 |
| 返回大厅 | 返回首页 |
| 社区评分 | 如果是社区剧本，弹出 1-5 星评分弹窗 |

---

#### 3.3.8 创作工坊（4步向导）

从 Web 端完整移植，小程序适配要点：

| 步骤 | 适配说明 |
|------|----------|
| Step 1 灵感激发 | 12 个主题模板改为 3 列 Grid（小屏适配），输入框保留 |
| Step 2 剧本设定 | 选项胶囊改为 NutUI Tag 组件，纵向排列更友好 |
| Step 3 AI 生成 | 保留 4 阶段播报动画，中央 loading + 文案切换 |
| Step 4 预览微调 | 卡片式预览，标题/简介点击即编辑，底部按钮固定 |

新增功能：
- **发布到社区**：Step 4 新增「📤 发布到社区」按钮
- **保存草稿**：生成失败或中途退出时自动保存配置

---

## 四、数据模型设计

### 4.1 云数据库集合

#### 4.1.1 `users` — 用户表

```javascript
{
  _id: String,              // 云数据库自动生成
  openId: String,           // 微信 openId（唯一索引）
  unionId: String,          // 微信 unionId（可选）
  nickname: String,         // 昵称
  avatarUrl: String,        // 头像
  stats: {
    gamesPlayed: Number,    // 总游戏局数
    gamesCompleted: Number, // 完成局数
    averageScore: Number,   // 平均分
    highestScore: Number,   // 最高分
    sRankCount: Number,     // S级次数
    totalCluesFound: Number // 总收集线索数
  },
  achievements: [String],   // 已解锁成就 ID 列表
  settings: {
    aiModel: String,        // 偏好 AI 模型（如支持用户自选）
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 4.1.2 `scenarios` — 剧本表（社区剧本）

```javascript
{
  _id: String,
  title: String,
  emoji: String,
  difficulty: Number,
  difficultyLabel: String,
  playerCount: String,
  estimatedTime: String,
  maxRounds: Number,
  tags: [String],
  cover: { gradient: String, emoji: String },
  brief: String,
  intro: String,
  playerRole: String,
  npcs: [{
    id: String,
    name: String,
    emoji: String,
    role: String,
    status: String,
    description: String,
    systemPrompt: String
  }],
  clues: [{
    id: String,
    source: String,
    title: String,
    content: String,
    keywords: [String]
  }],
  answer: {                  // ⚠️ 仅在用户选择游玩时返回
    suspect: String,
    motive: String,
    method: String,
    motiveKeywords: [String],
    methodKeywords: [String]
  },
  truthReveal: String,
  // === 社区相关字段 ===
  authorOpenId: String,      // 创建者 openId
  authorNickname: String,    // 创建者昵称
  isPublished: Boolean,      // 是否发布到社区
  isFeatured: Boolean,       // 是否精选
  playCount: Number,         // 游玩次数
  rating: Number,            // 综合评分（1-5）
  ratingCount: Number,       // 评分人数
  status: String,            // draft / published / removed
  createdAt: Date,
  publishedAt: Date,
  updatedAt: Date
}
```

#### 4.1.3 `game_saves` — 游戏存档表

```javascript
{
  _id: String,
  openId: String,            // 玩家
  scenarioId: String,        // 剧本 ID（预设剧本为内置ID，社区剧本为_id）
  scenarioTitle: String,     // 剧本标题（冗余，方便列表展示）
  activeNpcId: String,
  conversations: {
    [npcId]: [{
      role: String,
      content: String,
      timestamp: Number
    }]
  },
  clues: [{
    id: String,
    source: String,
    sourceName: String,
    title: String,
    content: String,
    timestamp: Number
  }],
  maxRounds: Number,
  usedRounds: Number,
  phase: String,             // playing / deducting / finished
  deduction: {
    suspect: String,
    motive: String,
    method: String
  },
  score: {
    suspect: Number,
    motive: Number,
    method: Number,
    efficiency: Number,
    total: Number
  },
  createdAt: Date,
  updatedAt: Date
}
```

#### 4.1.4 `reviews` — 评价表

```javascript
{
  _id: String,
  scenarioId: String,        // 剧本 ID
  openId: String,            // 评价者
  nickname: String,          // 评价者昵称
  rating: Number,            // 1-5 星
  comment: String,           // 评价内容（最多 200 字）
  createdAt: Date
}
```

#### 4.1.5 `favorites` — 收藏表

```javascript
{
  _id: String,
  openId: String,
  scenarioId: String,
  scenarioTitle: String,
  scenarioEmoji: String,
  scenarioBrief: String,
  createdAt: Date
}
```

### 4.2 本地缓存策略

| 缓存 Key | 用途 | 过期策略 |
|-----------|------|----------|
| `user_info` | 用户基本信息 | 每次启动刷新 |
| `preset_scenarios` | 内置剧本数据 | 版本更新时刷新 |
| `current_game` | 当前进行中的游戏快照 | 每次对话后更新，完成时清除 |
| `draft_scenario` | 创作工坊草稿 | 完成/取消时清除 |

---

## 五、云函数设计

### 5.1 云函数清单

| 云函数 | 触发方式 | 功能 |
|--------|----------|------|
| `login` | 小程序启动 | 获取 openId，创建/更新用户记录 |
| `aiChat` | 游戏对话 | 代理转发 AI 请求（保护 API Key） |
| `aiGenerate` | 创作工坊 | 代理 AI 生成剧本请求 |
| `aiExtractClue` | 游戏对话后 | 代理线索提取 AI 请求 |
| `scenarioPublish` | 发布剧本 | 校验并保存剧本到社区 |
| `scenarioList` | 社区广场 | 分页查询社区剧本（带筛选/排序） |
| `scenarioDetail` | 剧本详情 | 获取完整剧本数据（含答案，仅游玩时） |
| `reviewSubmit` | 提交评价 | 保存评价 + 更新剧本评分 |
| `gameSave` | 游戏进行中 | 保存/更新游戏存档 |
| `gameComplete` | 游戏结束 | 记录完成数据 + 更新用户统计 |

### 5.2 AI 代理云函数示例

```javascript
// cloudfunctions/aiChat/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

exports.main = async (event) => {
  const { systemPrompt, history, userMessage } = event

  const response = await fetch(`${process.env.AI_API_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.AI_API_KEY}`
    },
    body: JSON.stringify({
      model: process.env.AI_MODEL || 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history,
        { role: 'user', content: userMessage }
      ],
      max_tokens: 500,
      temperature: 0.8
    })
  })

  const data = await response.json()
  return {
    success: true,
    reply: data.choices[0].message.content
  }
}
```

> [!IMPORTANT]
> 小程序端 **不再** 前端直接调用 AI API，所有 AI 请求均通过云函数代理，API Key 存储在云函数环境变量中，杜绝泄露风险。

---

## 六、微信生态能力集成

### 6.1 分享能力

| 分享场景 | 触发方式 | 分享内容 |
|----------|----------|----------|
| 剧本分享 | 剧本介绍页右上角菜单 | 卡片标题 + 简介 + 封面 |
| 战绩分享 | 结果页「分享战绩」按钮 | 带评分等级的海报图 |
| 社区剧本 | 社区详情页分享按钮 | 剧本卡片 + 评分 |
| 小程序码 | 生成海报 | 扫码直达指定剧本 |

**分享卡片规格**：
- 尺寸：5:4
- 内容：渐变背景 + Emoji + 标题 + 一行简介
- 路径参数：`/pages/scenario/intro?id=xxx`

### 6.2 订阅消息

| 模板场景 | 触发时机 | 消息内容 |
|----------|----------|----------|
| 新剧本上线 | 社区有精选剧本上线时 | 剧本标题 + 难度 + 简介 |
| 剧本评价通知 | 我发布的剧本收到新评价 | 评分 + 评价摘要 |
| 游戏存档提醒 | 有未完成的游戏超过 3 天 | 剧本名 + 进度 |

### 6.3 广告位规划（预留）

| 位置 | 广告类型 | 触发条件 |
|------|----------|----------|
| 结果页底部 | Banner 广告 | 查看完结果后 |
| 社区广场列表 | 原生模板广告 | 每 10 条剧本插入 1 条 |
| 激励视频 | 激励视频广告 | 额外获得 5 回合（可选） |

---

## 七、UI/UX 设计规范

### 7.1 设计风格

| 维度 | 规范 |
|------|------|
| 主色调 | 深色系（`#0a0a1a` 背景），紫金渐变高亮 |
| 配色方案 | 保持 Web 端暗色主题：`#686888` 次要文字、`#c8a8ff` ~ `#ffd700` 渐变强调 |
| 字体 | 系统默认字体（小程序不支持自定义 Web 字体） |
| 圆角 | 卡片 `16rpx`，按钮 `12rpx`，头像 `50%` |
| 间距 | 基础单位 `16rpx`，卡片内 `24rpx`，模块间 `32rpx` |
| 动效 | `transition: all 0.3s ease`，避免过于复杂的 CSS 动画（小程序性能限制） |

### 7.2 暗色主题 CSS 变量

```scss
// 设计令牌（Design Tokens）
$color-bg-primary: #0a0a1a;
$color-bg-card: rgba(255, 255, 255, 0.05);
$color-bg-card-hover: rgba(255, 255, 255, 0.08);
$color-text-primary: #e8e8f0;
$color-text-secondary: #a0a0b8;
$color-text-muted: #686888;
$color-accent: #c8a8ff;
$color-gold: #ffd700;
$color-danger: #ff4757;
$color-success: #2ed573;
$border-glow: 1px solid rgba(200, 168, 255, 0.2);
```

### 7.3 关键页面交互差异（Web → 小程序）

| Web 交互 | 小程序替代方案 |
|----------|---------------|
| hover 悬浮效果 | `hover-class` + 按压态 |
| 右键菜单 | 长按菜单（`bindlongpress`） |
| Shift+Enter 换行 | 输入框内回车即换行，发送用按钮 |
| 侧滑线索面板 | `page-container` 半屏弹窗 |
| hash 路由 | `Taro.navigateTo` / `Taro.switchTab` |
| localStorage | `wx.setStorageSync` + 云数据库 |
| 确认弹窗 | `wx.showModal` |
| Toast 提示 | `wx.showToast` |
| 下拉选择 | `nut-picker` |

---

## 八、预设剧本数据迁移

### 8.1 迁移策略

5 个预设剧本（`午夜画廊`、`消失的列车`、`毒宴`、`数字幽灵`、`古刹迷踪`）作为 **内置数据** 打包在小程序包内：

```
src/
└── data/
    └── presets/
        ├── index.ts              # 剧本注册中心
        ├── midnight-gallery.ts   # 午夜画廊
        ├── vanishing-train.ts    # 消失的列车
        ├── poison-banquet.ts     # 毒宴
        ├── digital-ghost.ts      # 数字幽灵
        └── ancient-temple.ts     # 古刹迷踪
```

- 数据结构与 Web 端 **完全一致**，无需修改
- 使用 TypeScript 类型定义确保数据完整性
- 预设剧本不存入云数据库，减少云端存储成本

### 8.2 `MockResponses` 处理

小程序版 **去除** `mockResponses` 字段：
- Web 端 Mock 模式是为无 API Key 场景准备的
- 小程序端 API Key 存在云端，用户无需自行配置
- 去除 Mock 数据可减少约 30% 剧本数据体积

---

## 九、性能优化策略

### 9.1 小程序包体积控制

| 策略 | 说明 |
|------|------|
| 分包加载 | 主包仅含 TabBar 3 页面；`scenario`、`workshop`、`community` 各一个分包 |
| 预设剧本按需加载 | 剧本数据放入分包，进入介绍页时才加载对应剧本 |
| 图片压缩 | 所有图片资源使用 WebP 格式 |
| 代码压缩 | Taro 生产构建自动 Tree Shaking + Minify |

**分包策略**：

```
主包（< 2MB）
├── pages/index
├── pages/discover
└── pages/profile

分包 scenario（< 2MB）
├── pages/scenario/intro
├── pages/scenario/game
├── pages/scenario/deduction
├── pages/scenario/result
└── data/presets/*

分包 workshop（< 2MB）
├── pages/workshop/step1
├── pages/workshop/step2
├── pages/workshop/step3
└── pages/workshop/step4

分包 community（< 2MB）
├── pages/community/detail
└── pages/community/reviews
```

### 9.2 运行时性能

| 场景 | 优化策略 |
|------|----------|
| 对话列表渲染 | 虚拟列表（`recycle-view`），仅渲染可视区域消息 |
| AI 响应等待 | Skeleton 骨架屏 + 打字指示器 |
| 线索提取 | 不阻塞主对话流，后台异步处理 |
| 页面切换 | `preloadPage` 预加载下一页 |
| 云函数冷启动 | 使用预置并发，减少冷启动延迟 |

---

## 十、安全设计

### 10.1 数据安全

| 风险点 | 解决方案 |
|--------|----------|
| API Key 泄露 | Key 仅存在云函数环境变量，前端不可见 |
| 剧本答案泄露 | 社区剧本列表/详情 API 不返回 `answer` 和 `truthReveal`，仅评分云函数使用 |
| XSS 注入 | Taro/Vue 自动转义 + `rich-text` 组件白名单渲染 |
| 数据篡改 | 云数据库安全规则限制：用户只能读写自己的数据 |

### 10.2 云数据库安全规则

```json
{
  "users": {
    ".read": "auth.openid == doc.openId",
    ".write": "auth.openid == doc.openId"
  },
  "scenarios": {
    ".read": true,
    ".write": "auth.openid == doc.authorOpenId"
  },
  "game_saves": {
    ".read": "auth.openid == doc.openId",
    ".write": "auth.openid == doc.openId"
  },
  "reviews": {
    ".read": true,
    ".write": "auth.openid == doc.openId"
  },
  "favorites": {
    ".read": "auth.openid == doc.openId",
    ".write": "auth.openid == doc.openId"
  }
}
```

---

## 十一、核心业务流程

### 11.1 新用户首次体验流

```
打开小程序
    │
    ▼
微信静默登录（获取 openId）
    │
    ▼
首页 - 剧本大厅
    │ 选择一个预设剧本
    ▼
剧本介绍页（背景故事 + 角色展示）
    │ 点击"开始调查"
    ▼
游戏核心页
    │ 与 NPC 对话、收集线索
    │ 切换 NPC、查看线索板
    ▼
推理提交页
    │ 选凶手、填动机手法
    ▼
结果评分页
    │ 查看评分、真相揭秘
    │ 分享战绩 / 再玩一次 / 返回大厅
    ▼
首页（形成闭环）
```

### 11.2 社区剧本创作发布流

```
创作工坊入口
    │
    ▼
Step 1 灵感激发（选/输主题）
    │
    ▼
Step 2 剧本设定（风格/时代/难度/NPC）
    │
    ▼
Step 3 AI 生成（云函数调用 LLM）
    │
    ▼
Step 4 预览微调
    ├── 开始游玩 → 保存到本地 → 进入游戏
    └── 发布到社区 → 云函数校验 → 写入云数据库
                              → 在社区广场可被发现
```

---

## 十二、项目里程碑

### Phase 1 — MVP（预计 3-4 周）

| 周 | 任务 | 交付物 |
|----|------|--------|
| W1 | 项目初始化 + 基础页面框架 | Taro 项目、TabBar、路由、基础样式 |
| W2 | 游戏核心流程移植 | 剧本介绍 → 游戏对话 → 推理 → 结果 |
| W3 | 云开发接入 + AI 代理 | 登录、云函数、AI 对话、存档 |
| W4 | 联调优化 + 提审 | Bug 修复、性能优化、体验评审、提审 |

**MVP 功能范围**：
- [x] 微信登录
- [x] 5 个预设剧本完整游戏流程
- [x] AI NPC 对话（云函数代理）
- [x] 线索收集 + 推理评分
- [x] 游戏存档（云端）
- [x] 基础分享（转发卡片）

### Phase 2 — 社区生态（预计 2-3 周）

- [ ] 自定义剧本创作工坊
- [ ] 社区广场（搜索、筛选、排序）
- [ ] 剧本发布 + 评价系统
- [ ] 收藏功能
- [ ] 分享海报生成

### Phase 3 — 商业化 + 增长（预计 2-3 周）

- [ ] 成就系统
- [ ] 广告位接入
- [ ] 订阅消息推送
- [ ] 数据统计面板
- [ ] 付费剧本 / 会员体系（可选）

---

## 十三、验收标准

### 13.1 MVP 核心验收

| # | 场景 | 预期结果 |
|---|------|----------|
| AC-1 | 首次打开小程序 | 静默登录成功，显示首页剧本大厅 |
| AC-2 | 点击预设剧本 | 跳转介绍页，背景故事逐字显示，角色卡片正常 |
| AC-3 | 开始调查 | 进入游戏页，显示 NPC 头像栏和对话区 |
| AC-4 | 发送消息给 NPC | 显示打字指示器 → NPC 回复 → 回合数 -1 |
| AC-5 | 切换 NPC 对话 | 各 NPC 对话历史独立 |
| AC-6 | 发现新线索 | Toast 提示 + 线索板新增记录 |
| AC-7 | 回合用完 | 提示并引导提交推理 |
| AC-8 | 提交推理评分 | 显示分数动画 + 等级 + 真相揭秘 |
| AC-9 | 分享战绩 | 生成分享卡片，好友可通过卡片进入小程序 |
| AC-10 | 中途退出重进 | 云端存档恢复，继续游戏 |
| AC-11 | 切换设备登录 | 同一微信号数据同步 |

### 13.2 性能验收

| 指标 | 目标值 |
|------|--------|
| 首屏加载 | ≤ 2 秒 |
| 页面切换 | ≤ 300ms |
| AI 响应（首 Token） | ≤ 3 秒 |
| 内存占用 | ≤ 200MB |
| 主包大小 | ≤ 2MB |
| 整包大小 | ≤ 12MB |

---

## 十四、风险评估与应对

| 风险 | 概率 | 影响 | 应对策略 |
|------|------|------|----------|
| AI API 响应慢 | 中 | 游戏体验卡顿 | 云函数超时 30s + 前端超时提示 + 重试 |
| 云函数冷启动延迟 | 中 | 首次对话慢 | 预置并发 1 实例 + Skeleton 加载态 |
| 小程序审核不通过 | 低 | 上线延迟 | 提前研究审核规范，避免敏感内容 |
| 流量激增 | 低 | 云函数/数据库压力 | 云开发按量计费，弹性扩容 |
| AI 生成剧本质量差 | 中 | 用户体验差 | 增加 prompt 约束 + 输出校验 + 重试机制 |

---

## 十五、与 Web 端的关系

| 维度 | 策略 |
|------|------|
| 代码复用 | 游戏核心逻辑（评分算法、状态管理）抽离为独立模块，两端共用 |
| 数据互通 | Web 端未来可接入同一云数据库，实现数据同步 |
| 功能对齐 | 小程序 Phase 2 完成后功能与 Web 端对齐 |
| 差异化 | 小程序独有：微信分享、订阅消息、广告变现、微信支付 |
| 维护策略 | 以小程序为主要迭代方向，Web 端维持基础功能 |
