# 迷局AI — 后端架构 Phase 2: 数据库与用户体系 PRD

> **版本**：v1.0  |  **日期**：2026-03-30  |  **状态**：待实施

---

## 1. 目标与背景

在 **Phase 1** 中，我们已经完成了基于 Express 5.x 的后端服务骨架，并且将核心的「AI 接口直连」平滑迁移到后端进行代理，解决了前端暴露 `API Key` 的重大安全缺陷。

**Phase 2 的核心目标：实现数据持久化与用户体系。**
当前前端的所有数据（自定义剧本、游戏存档配置等）强依赖 `localStorage`，存在极大的数据丢失风险和夸设备不同步的痛点。本阶段将彻底解决这一问题：

- 🎯 **引入容器化数据库**：基于 Docker 配置本地化可快速部署的 MongoDB 与 Redis 环境。
- 🎯 **建立无痛注册机制（游客基建）**：保留现有的“即开即玩”体验，玩家初次访问无感知生成“游客身份 (Guest)”，拥有自己的云端沙盒，并在后续引导转正。
- 🎯 **实现云端存档**：支持玩家的多剧本记录（游戏进度、获得的线索、剩余回合等）向云端实时或心跳式同步。
- 🎯 **实现剧本上云**：自定义生成的剧本及预设剧本均保存在核心数据库中。

---

## 2. 核心功能与用例

### 2.1 数据库容器化 (Docker Compose)
为了减轻未来的运维负担，必须提供标准的开发/生产数据库声明：
- `mongo:6`：持久化核心业务数据。
- `redis:alpine`：管理游戏高频状态通信、限制频繁请求和未来的分布式会话。

### 2.2 账户认证中心 (Auth)
为了最低限度打扰用户，采用渐进式账户策略：
1. **自动派发游客 (Guest)**：前端初始化时请求后端，后端直接响应一对基于 `JWT` 的访问凭证和自动生成的设备化 `Guest ID`。
2. **账号绑定与合并**：游客状态下游玩产生的记录，在玩家提供手机/邮箱注册时，平滑并入正式账户，并变更身份字段。

### 2.3 剧本与存档云同步
- **状态快照同步**：由于游戏每时每刻都在更新，采用“增量事件”或“15次流式打字结束做全量快照”的设计，保护数据库写入频率。
- **自定义剧本上传**：创作工坊生成的返回体，直接从后端完成数据库落盘，返回唯一对应的 `ObjectId` 供前端存取。

---

## 3. 技术设计 & 接口规范

### 3.1 核心数据架构规范
- **User (用户)**：`_id`, `nickname`, `email`, `role`, `isGuest`, `deviceId`, 游玩统计 `stats`
- **Scenario (剧本)**：`_id`, `authorId`, `title`, 复杂元数据 (`npcs`, `clues`, `answer`)
- **GameSession (游戏会话)**：`_id`, `userId`, `scenarioId`, `conversations`(记录数组), `phase`(当前阶段), `usedRounds`(剩余回合计算源), `score`

### 3.2 Phase 2 实施 API 列表

| 模块 | 方法 | 路由 | 描述 | 请求核心体 |
|------|------|------|------|------------|
| **认证** | POST | `/api/auth/guest` | 颁发游客凭证 | `{ deviceId }` |
| **认证** | POST | `/api/auth/register` | 用户转正或注册 | `{ email, password, guestId(选填) }` |
| **认证** | POST | `/api/auth/login` | 常规登录发票 | `{ email, password }` |
| **剧本** | POST | `/api/scenarios` | 将剧本入库 | `{ title, targetNpcs, ...AI_Generated_Data }` |
| **存档** | POST | `/api/games` | 新开剧本实例 | `{ scenarioId }` |
| **存档** | PATCH| `/api/games/:id/sync` | 进度快照保存 | `{ conversations, clues, phase }` |
| **存档** | GET  | `/api/games/saves` | 拉取账号下云存档 | `Pagination Queries` |

---

## 4. 前端对接指南 (重要指引)

当 Phase 2 接口就绪后，前端（Vite 项目）需进行如下深度重构改造以契合云端服务：

1. **移除对 LocalStorage 的重度依赖**：
   - 保留的 LocalStorage：仅保存主题样式首选项 `theme/fontsize`，以及最新的 `Auth Token` 和 `Refresh Token`。
   - 被抛弃的 LocalStorage：`miju-custom-scenarios`（由拉取我的创作 API 替代）、`miju-ai-game-state`（由 `/api/games/saves` 云取替代）、明文 `miju-ai-api-key`。

2. **拦截器注入 (Axios / Fetch Wrapper)**：
   - 配置前端全局 HTTP 请求拦截，无脑附带 `Authorization: Bearer <token>` 头部信息。
   - 侦听 401 报错，自动调用 `refresh` 静默重签或将用户退回认证视图。

3. **对用户透明的冷启动**：
   - 打开网站 `main.js` 初次鉴权：检查有无本地凭证，无则调用静默接口换取 Guest Token，建立安全的业务基础通信协议层，然后再渲染剧本大厅。

---

## 5. 项目落地步骤与排期（行动清单）

- [ ] **Step 1 - DevOps 准备**：在 `/backend` 目录下编写 `docker-compose.yml`，一键启动持久化的 Mongo & Redis 本地服务实例。
- [ ] **Step 2 - Model 实体建模**：基于 Mongoose 编写 User、Scenario 和 GameSession 的 Schema （建立严格约束与对应联查索引）。
- [ ] **Step 3 - Auth 业务落地**：集成 `bcrypt` 处理账户密码脱敏，编写完整的 JWT 分发和解签保护模块。
- [ ] **Step 4 - 资源 CRUD 落地**：完成个人剧本与游戏局长内容的增删改查。
- [ ] **Step 5 - 前端联调验证**：确保前端丢掉 LocalStorage 后，在完全依赖网络请求的云端架构下，核心游戏循环不再报废。

> 该文档可以保存作为接下来的行动指令集合。当我执行的时候可以直接将其加载为上下文任务列表。
