# 迷局 AI — API Key 安全加固 PRD

> **版本**: v1.0 | **日期**: 2026-03-27 | **优先级**: P1 | **预估工期**: 0.5 天（Web）/ 含在小程序 MVP 中  
> **关联限制项**: API Key 明文存储

---

## 1. 背景

### 1.1 现状

`ai-service.js:27` 将 API Key 以明文形式写入 `localStorage`：

```javascript
localStorage.setItem(API_KEY_STORAGE, apiKey)  // 明文存储
```

同时 `.env` 文件中也硬编码了 API Key，存在版本控制泄露风险。

### 1.2 风险评估

| 风险 | 严重程度 | 攻击场景 |
|------|----------|----------|
| 浏览器扩展窃取 | 🟡 中 | 恶意扩展读取 localStorage |
| XSS 窃取 | 🟡 中 | 页面 XSS 漏洞导致 Key 被发送到攻击者服务器 |
| .env 泄露 | 🔴 高 | 代码推送到公开仓库 |
| 控制台查看 | 🟢 低 | 用户自行查看，非安全威胁 |

---

## 2. 方案设计

### 2.1 Web 端 — 加密存储（过渡方案）

使用 Web Crypto API 对 API Key 进行 AES-GCM 加密后存储：

```
用户输入 API Key
    │
    ▼
Web Crypto API 加密
├── 密钥材料: PBKDF2(UA + 固定盐)
├── 算法: AES-GCM-256
├── IV: 随机 12 字节
    │
    ▼
存储密文到 localStorage
    │
    ▼
使用时解密为明文
```

### 2.2 小程序端 — 云函数代理（根本方案）

API Key 仅存于云函数环境变量，前端完全不接触：

```
小程序前端 → 云函数(aiChat) → LLM API
              ↑
          环境变量: AI_API_KEY
```

### 2.3 .env 安全加固

| 措施 | 说明 |
|------|------|
| `.env` 加入 `.gitignore` | 防止推送到远程仓库 |
| 提供 `.env.example` | 仅包含键名，不含值 |
| 清理 Git 历史 | 如已推送则 `git filter-branch` 清理 |

---

## 3. 技术实现

### 3.1 涉及文件

| 文件 | 操作 | 变更内容 |
|------|------|----------|
| `src/game/ai-service.js` | 修改 | 加密/解密 API Key |
| `src/game/crypto-utils.js` | 新建 | Web Crypto 工具模块 |
| `.gitignore` | 修改 | 确保 `.env` 被忽略 |
| `.env.example` | 新建 | API Key 模板（无值） |

### 3.2 加密工具模块

```javascript
// src/game/crypto-utils.js

const SALT = 'miju-ai-2026'

async function getKey() {
  const encoder = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(navigator.userAgent + SALT),
    'PBKDF2',
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode(SALT), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

export async function encrypt(text) {
  const key = await getKey()
  const encoder = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(text)
  )
  return JSON.stringify({
    iv: Array.from(iv),
    data: Array.from(new Uint8Array(encrypted))
  })
}

export async function decrypt(ciphertext) {
  try {
    const { iv, data } = JSON.parse(ciphertext)
    const key = await getKey()
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: new Uint8Array(iv) },
      key,
      new Uint8Array(data)
    )
    return new TextDecoder().decode(decrypted)
  } catch {
    return ''  // 解密失败返回空
  }
}
```

### 3.3 `ai-service.js` 改造

```javascript
import { encrypt, decrypt } from './crypto-utils.js'

class AIService {
  constructor() {
    this._apiKeyPromise = this._loadApiKey()
    // apiBase 和 model 非敏感，保持明文
    this.apiBase = localStorage.getItem(API_BASE_STORAGE) || '...'
    this.model = localStorage.getItem(API_MODEL_STORAGE) || '...'
  }

  async _loadApiKey() {
    // 1. 尝试解密存储的 Key
    const encrypted = localStorage.getItem(API_KEY_STORAGE)
    if (encrypted) {
      const key = await decrypt(encrypted)
      if (key) { this.apiKey = key; return }
    }
    // 2. 兼容旧版明文 Key（迁移）
    const oldKey = localStorage.getItem('miju-ai-api-key-legacy')
    if (oldKey) {
      this.apiKey = oldKey
      await this.saveSettings(oldKey, this.apiBase, this.model)
      localStorage.removeItem('miju-ai-api-key-legacy')
      return
    }
    // 3. 环境变量
    this.apiKey = import.meta.env.VITE_API_KEY || ''
  }

  async saveSettings(apiKey, apiBase, model) {
    this.apiKey = apiKey
    this.apiBase = apiBase || 'https://api.deepseek.com/v1'
    this.model = model || 'deepseek-chat'

    // 加密存储 API Key
    const encrypted = await encrypt(apiKey)
    localStorage.setItem(API_KEY_STORAGE, encrypted)
    localStorage.setItem(API_BASE_STORAGE, this.apiBase)
    localStorage.setItem(API_MODEL_STORAGE, this.model)
  }

  get isConfigured() {
    return !!this.apiKey
  }

  // chat() 等方法保持不变
}
```

### 3.4 向后兼容

首次启动检测旧版明文 Key 并自动迁移加密：

```javascript
// 迁移逻辑：旧 Key 名 → 加密存储 → 删除旧条目
const oldKey = localStorage.getItem('miju-ai-api-key')
if (oldKey && !oldKey.startsWith('{')) {
  // 是旧版明文格式
  localStorage.setItem('miju-ai-api-key-legacy', oldKey)
  localStorage.removeItem('miju-ai-api-key')
}
```

---

## 4. 验收标准

| # | 场景 | 预期结果 |
|---|------|----------|
| AC-1 | 首次配置 API Key | Key 加密后存入 localStorage，DevTools 中看不到明文 |
| AC-2 | 页面刷新 | 自动解密恢复，AI 对话正常 |
| AC-3 | 旧版用户升级 | 自动将明文 Key 迁移为加密格式 |
| AC-4 | 更换浏览器/设备 | UA 不同导致密钥不同，需重新输入（预期行为） |
| AC-5 | `.env` 推送验证 | `.gitignore` 包含 `.env`，不会被提交 |

---

## 5. 安全提示

> [!WARNING]
> 前端加密本质上是 **提升攻击门槛**，无法根本性解决安全问题（密钥推导参数在前端可见）。真正安全的方案是小程序版的 **云函数代理**，API Key 完全不出现在前端。
