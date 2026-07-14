export class GameState {
  constructor(events) {
    this.events = events
    this.combo = 0
    this.comboTimer = 0
    this.intensity = 1.22
    this.soundEnabled = true
    this.totalHits = 0
  }

  registerHit() {
    this.combo += 1
    this.totalHits += 1
    this.comboTimer = 1.35
    this.events.emit('state:combo', { combo: this.combo, totalHits: this.totalHits })
  }

  setIntensity(level) {
    this.intensity = [0.82, 1.22, 1.75][level - 1] ?? 1.22
    this.events.emit('state:intensity', { level, multiplier: this.intensity })
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled
    this.events.emit('state:sound', { enabled: this.soundEnabled })
  }

  reset() {
    this.combo = 0
    this.comboTimer = 0
    this.events.emit('state:reset')
  }

  update(delta) {
    if (this.comboTimer <= 0) return
    this.comboTimer -= delta
    if (this.comboTimer <= 0) {
      this.combo = 0
      this.events.emit('state:combo-ended')
    }
  }

  snapshot() {
    return {
      combo: this.combo,
      intensity: this.intensity,
      soundEnabled: this.soundEnabled,
      totalHits: this.totalHits,
    }
  }
}
