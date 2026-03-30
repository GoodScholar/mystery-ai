const DRAFT_KEY = 'mijuai_custom_draft'

export const draftManager = {
  saveDraft(state) {
    if (!state) return
    const data = {
      timestamp: Date.now(),
      state: state
    }
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(data))
    } catch (e) {
      console.warn('Draft save failed (Storage Quota?):', e)
    }
  },
  
  getDraft() {
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (!raw) return null
      return JSON.parse(raw)
    } catch {
      return null
    }
  },
  
  clearDraft() {
    localStorage.removeItem(DRAFT_KEY)
  }
}
