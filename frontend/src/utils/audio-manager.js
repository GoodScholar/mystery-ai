/**
 * 纯前端 Web Audio 音效与 BGM 管理器
 * 依靠程序合成，不需要外挂实体 mp3 文件。
 */
class AudioManager {
  constructor() {
    this.ctx = null
    this.bgmOsc = null
    this.bgmGain = null
    this.isUnlocked = false
    this.isMuted = false
  }

  unlock() {
    if (this.isUnlocked) return
    const AudioContext = window.AudioContext || window.webkitAudioContext
    if (!AudioContext) return
    
    this.ctx = new AudioContext()
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    gain.gain.value = 0
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.start(0)
    osc.stop(0.01)
    
    this.isUnlocked = true
    if (this.ctx.state === 'suspended') {
      this.ctx.resume()
    }
  }

  playTypeWriter() {
    if (this.isMuted || !this.isUnlocked || !this.ctx) return
    
    const t = this.ctx.currentTime
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    
    osc.type = 'square'
    osc.frequency.setValueAtTime(300 + Math.random() * 300, t)
    
    gain.gain.setValueAtTime(0.03, t)
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05)
    
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    
    osc.start(t)
    osc.stop(t + 0.05)
  }

  playSuspenseBGM() {
    if (this.isMuted || !this.isUnlocked || !this.ctx) return
    if (this.bgmOsc) return

    this.bgmOsc = this.ctx.createOscillator()
    this.bgmGain = this.ctx.createGain()
    
    this.bgmOsc.type = 'sine'
    this.bgmOsc.frequency.value = 55 
    
    const lfo = this.ctx.createOscillator()
    lfo.frequency.value = 0.15 
    const lfoGain = this.ctx.createGain()
    lfoGain.gain.value = 3 
    lfo.connect(lfoGain)
    lfoGain.connect(this.bgmOsc.frequency)
    lfo.start()

    this.bgmGain.gain.setValueAtTime(0, this.ctx.currentTime)
    this.bgmGain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 3)

    this.bgmOsc.connect(this.bgmGain)
    this.bgmGain.connect(this.ctx.destination)
    this.bgmOsc.start()
  }

  stopBGM() {
    if (this.bgmOsc && this.bgmGain && this.ctx) {
      const t = this.ctx.currentTime
      this.bgmGain.gain.setValueAtTime(this.bgmGain.gain.value, t)
      this.bgmGain.gain.linearRampToValueAtTime(0, t + 2)
      this.bgmOsc.stop(t + 2)
      
      this.bgmOsc = null
      this.bgmGain = null
    }
  }
}

export const audioManager = new AudioManager()
