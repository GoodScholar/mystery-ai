/**
 * 游戏状态管理
 * 管理当前剧本、NPC 对话历史、已获线索、剩余回合等
 */

import { getScenario } from '../scenarios/scenario-registry.js'

const INDEX_KEY = 'miju-game-saves-index'
const OLD_STORAGE_KEY = 'miju-ai-game-state'

const initialState = {
  scenarioId: null,
  activeNpcId: null,
  conversations: {},
  clues: [],
  maxRounds: 25,
  usedRounds: 0,
  submitted: false,
  deduction: {
    suspect: null,
    motive: '',
    method: ''
  },
  score: null,
  phase: 'idle'
}

class GameState {
  constructor() {
    this.state = { ...initialState }
    this.listeners = new Set()
    this.currentSaveId = null
    this.savesIndex = []
    
    this._migrateOldSave()
    this._loadIndex()
    
    // Auto-load latest playing save if exists and we are not explicitly loading one
    const latest = this.getSaves().find(s => s.phase === 'playing')
    if (latest && !this.currentSaveId) {
      this.loadSave(latest.id)
    }
  }

  get() { return this.state }

  set(updates) {
    this.state = { ...this.state, ...updates }
    this._save()
    this._notify()
  }

  startGame(scenarioId, maxRounds = 25) {
    this.state = {
      ...initialState,
      scenarioId,
      maxRounds,
      phase: 'playing',
      conversations: {},
      clues: []
    }
    this.currentSaveId = 'save-' + Date.now()
    this._save()
    this._notify()
  }

  switchNpc(npcId) {
    this.set({ activeNpcId: npcId })
  }

  addMessage(npcId, role, content) {
    const conversations = { ...this.state.conversations }
    if (!conversations[npcId]) conversations[npcId] = []
    conversations[npcId] = [...conversations[npcId], { role, content, timestamp: Date.now() }]

    const updates = { conversations }
    if (role === 'user') {
      updates.usedRounds = this.state.usedRounds + 1
    }
    this.set(updates)
  }

  getConversation(npcId) {
    return this.state.conversations[npcId] || []
  }

  getRemainingRounds() {
    return this.state.maxRounds - this.state.usedRounds
  }

  addClue(clue) {
    if (this.state.clues.some(c => c.id === clue.id)) return false
    this.set({
      clues: [...this.state.clues, { ...clue, timestamp: Date.now() }]
    })
    return true
  }

  submitDeduction(deduction) {
    this.set({
      deduction,
      submitted: true,
      phase: 'finished'
    })
  }

  setScore(score) {
    this.set({ score })
  }

  reset() {
    this.state = { ...initialState }
    this.currentSaveId = null
    this._notify()
  }

  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  _notify() {
    this.listeners.forEach(fn => fn(this.state))
  }

  // --- Save Management ---
  
  getSaves() {
    return [...this.savesIndex].sort((a,b) => b.updatedAt - a.updatedAt)
  }

  loadSave(saveId) {
    try {
      const saved = localStorage.getItem(saveId)
      if (saved) {
        this.state = { ...initialState, ...JSON.parse(saved) }
        this.currentSaveId = saveId
        this._notify()
        return true
      }
    } catch(e) {
      console.warn('Load error', e)
    }
    return false
  }

  deleteSave(saveId) {
    this.savesIndex = this.savesIndex.filter(s => s.id !== saveId)
    localStorage.setItem(INDEX_KEY, JSON.stringify(this.savesIndex))
    localStorage.removeItem(saveId)
    if (this.currentSaveId === saveId) {
      this.reset()
    }
  }

  _save() {
    if (!this.currentSaveId) return
    try {
      localStorage.setItem(this.currentSaveId, JSON.stringify(this.state))
      
      const scenario = getScenario(this.state.scenarioId)
      const meta = {
        id: this.currentSaveId,
        scenarioId: this.state.scenarioId,
        scenarioTitle: scenario?.title || '未知',
        scenarioEmoji: scenario?.emoji || '❔',
        phase: this.state.phase,
        progress: `${this.state.usedRounds}/${this.state.maxRounds}`,
        clueCount: this.state.clues.length,
        updatedAt: Date.now()
      }
      
      const idx = this.savesIndex.findIndex(s => s.id === this.currentSaveId)
      if (idx !== -1) {
        this.savesIndex[idx] = meta
      } else {
        this.savesIndex.push(meta)
      }
      
      if (this.savesIndex.length > 10) {
        const finished = this.savesIndex.filter(s => s.phase === 'finished')
        if (finished.length > 0) {
          const oldest = finished.sort((a,b) => a.updatedAt - b.updatedAt)[0]
          this.deleteSave(oldest.id)
        } else {
          const oldest = [...this.savesIndex].sort((a,b) => a.updatedAt - b.updatedAt)[0]
          this.deleteSave(oldest.id)
        }
      }
      
      localStorage.setItem(INDEX_KEY, JSON.stringify(this.savesIndex))
    } catch (e) {
      console.warn('Failed to save game state:', e)
    }
  }

  _loadIndex() {
    try {
      const stored = localStorage.getItem(INDEX_KEY)
      if (stored) {
        this.savesIndex = JSON.parse(stored)
      }
    } catch(e) {}
  }
  
  _migrateOldSave() {
    try {
      const old = localStorage.getItem(OLD_STORAGE_KEY)
      if (old) {
        const fullState = JSON.parse(old)
        const id = 'save-' + Date.now()
        localStorage.setItem(id, old)
        
        const scenario = getScenario(fullState.scenarioId)
        this.savesIndex = [{
          id,
          scenarioId: fullState.scenarioId,
          scenarioTitle: scenario?.title || '迁移存档',
          scenarioEmoji: scenario?.emoji || '❔',
          phase: fullState.phase || 'playing',
          progress: `${fullState.usedRounds || 0}/${fullState.maxRounds || 25}`,
          clueCount: fullState.clues?.length || 0,
          updatedAt: Date.now()
        }]
        localStorage.setItem(INDEX_KEY, JSON.stringify(this.savesIndex))
        localStorage.removeItem(OLD_STORAGE_KEY)
      }
    } catch (e) { console.warn(e) }
  }
}

export const gameState = new GameState()
