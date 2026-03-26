/**
 * 游戏状态管理
 * 管理当前剧本、NPC 对话历史、已获线索、剩余回合等
 */

const STORAGE_KEY = 'miju-ai-game-state'

const initialState = {
  // 当前剧本 ID
  scenarioId: null,
  // 当前正在对话的 NPC ID
  activeNpcId: null,
  // 每个 NPC 的对话历史 { [npcId]: [{role, content}] }
  conversations: {},
  // 已获得的线索 [{id, source, content, timestamp}]
  clues: [],
  // 总对话次数限制
  maxRounds: 25,
  // 已使用的对话次数
  usedRounds: 0,
  // 是否已提交推理
  submitted: false,
  // 推理答案
  deduction: {
    suspect: null,
    motive: '',
    method: ''
  },
  // 分数
  score: null,
  // 游戏阶段: 'idle' | 'playing' | 'deducting' | 'finished'
  phase: 'idle'
}

class GameState {
  constructor() {
    this.state = { ...initialState }
    this.listeners = new Set()
    this._load()
  }

  /** 获取当前状态 */
  get() {
    return this.state
  }

  /** 更新状态 */
  set(updates) {
    this.state = { ...this.state, ...updates }
    this._save()
    this._notify()
  }

  /** 开始新游戏 */
  startGame(scenarioId, maxRounds = 25) {
    this.state = {
      ...initialState,
      scenarioId,
      maxRounds,
      phase: 'playing',
      conversations: {},
      clues: []
    }
    this._save()
    this._notify()
  }

  /** 切换 NPC */
  switchNpc(npcId) {
    this.set({ activeNpcId: npcId })
  }

  /** 添加对话消息 */
  addMessage(npcId, role, content) {
    const conversations = { ...this.state.conversations }
    if (!conversations[npcId]) {
      conversations[npcId] = []
    }
    conversations[npcId] = [...conversations[npcId], { role, content, timestamp: Date.now() }]

    const updates = { conversations }
    // 玩家发言消耗回合
    if (role === 'user') {
      updates.usedRounds = this.state.usedRounds + 1
    }
    this.set(updates)
  }

  /** 获取 NPC 的对话历史 */
  getConversation(npcId) {
    return this.state.conversations[npcId] || []
  }

  /** 获取剩余回合数 */
  getRemainingRounds() {
    return this.state.maxRounds - this.state.usedRounds
  }

  /** 添加线索 */
  addClue(clue) {
    // 防止重复
    if (this.state.clues.some(c => c.id === clue.id)) return false
    this.set({
      clues: [...this.state.clues, { ...clue, timestamp: Date.now() }]
    })
    return true
  }

  /** 提交推理 */
  submitDeduction(deduction) {
    this.set({
      deduction,
      submitted: true,
      phase: 'finished'
    })
  }

  /** 设置分数 */
  setScore(score) {
    this.set({ score })
  }

  /** 重置游戏 */
  reset() {
    this.state = { ...initialState }
    this._save()
    this._notify()
  }

  /** 监听状态变化 */
  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  _notify() {
    this.listeners.forEach(fn => fn(this.state))
  }

  _save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state))
    } catch (e) {
      console.warn('Failed to save game state:', e)
    }
  }

  _load() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        this.state = { ...initialState, ...JSON.parse(saved) }
      }
    } catch (e) {
      console.warn('Failed to load game state:', e)
    }
  }
}

// 单例导出
export const gameState = new GameState()
