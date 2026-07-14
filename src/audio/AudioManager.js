const ASSETS = {
  light: ['/audio/sfx/hit_light_1.mp3', '/audio/sfx/hit_light_2.mp3'],
  heavy: ['/audio/sfx/hit_heavy.mp3', '/audio/sfx/shove.mp3'],
  flurry: ['/audio/sfx/flurry.mp3'],
  reaction: ['/audio/sfx/reaction_1.mp3', '/audio/sfx/reaction_2.mp3', '/audio/sfx/reaction_3.mp3'],
}

export class AudioManager {
  constructor() {
    this.enabled = true
    this.lastIndex = -1
    this.reactionIndex = -1
    this.music = new Audio('/audio/music/purple_playground.mp3')
    this.music.loop = true
    this.music.volume = 0.2
    this.unlocked = false
  }

  setEnabled(enabled) {
    this.enabled = enabled
    this.music.volume = enabled ? 0.2 : 0
    if (enabled) this.unlock()
  }

  unlock() {
    if (this.unlocked || !this.enabled) return
    this.unlocked = true
    this.music.play().catch(() => { this.unlocked = false })
  }

  playImpact(power = 1) {
    if (!this.enabled) return
    this.unlock()
    const bank = power > 1.35 ? ASSETS.heavy : ASSETS.light
    const index = bank.length > 1 ? (this.lastIndex + 1) % bank.length : 0
    this.lastIndex = index
    const audio = new Audio(bank[index])
    audio.volume = Math.min(0.72, 0.32 + power * 0.16)
    audio.playbackRate = 0.94 + Math.random() * 0.13
    audio.play().catch(() => this.#playSynthFallback(power))
    if (power > 1.1 || Math.random() > 0.63) this.#playReaction(power)
  }

  playFlurry() {
    if (!this.enabled) return
    const audio = new Audio(ASSETS.flurry[0])
    audio.volume = 0.38
    audio.play().catch(() => {})
  }

  #playReaction(power) {
    this.reactionIndex = (this.reactionIndex + 1) % ASSETS.reaction.length
    const audio = new Audio(ASSETS.reaction[this.reactionIndex])
    audio.volume = Math.min(0.52, 0.25 + power * 0.1)
    audio.playbackRate = 0.96 + Math.random() * 0.08
    setTimeout(() => audio.play().catch(() => {}), 45 + Math.random() * 70)
  }

  #playSynthFallback(power) {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
    if (!AudioContextClass) return
    this.context ??= new AudioContextClass()
    const now = this.context.currentTime
    const oscillator = this.context.createOscillator()
    const gain = this.context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(115 + Math.random() * 28, now)
    oscillator.frequency.exponentialRampToValueAtTime(42, now + 0.11)
    gain.gain.setValueAtTime(Math.min(0.18, 0.08 * power), now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13)
    oscillator.connect(gain).connect(this.context.destination)
    oscillator.start(now)
    oscillator.stop(now + 0.14)
  }
}
