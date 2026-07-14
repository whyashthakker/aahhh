export class FitnessRound {
  constructor(events, duration = 30) {
    this.events = events
    this.duration = duration
    this.active = false
    this.moves = 0
    this.cameraActive = false
    events.on('fitness:toggle', () => this.toggle())
    events.on('camera:state', ({ state }) => { this.cameraActive = state === 'ready' || state === 'loading' })
    events.on('camera:move', () => {
      if (this.active) this.moves += 1
    })
  }

  toggle() {
    if (this.active) return this.stop()
    this.active = true
    this.moves = 0
    this.endsAt = performance.now() + this.duration * 1000
    if (!this.cameraActive) this.events.emit('camera:toggle')
    this.#tick()
  }

  #tick = () => {
    if (!this.active) return
    const remaining = Math.max(0, (this.endsAt - performance.now()) / 1000)
    this.events.emit('fitness:update', { active: true, remaining, moves: this.moves })
    if (remaining <= 0) {
      this.stop()
      this.events.emit('progress:achievement', { id: 'camera-round', label: `${this.moves} moves — round complete!` })
      return
    }
    this.frame = requestAnimationFrame(this.#tick)
  }

  stop() {
    this.active = false
    cancelAnimationFrame(this.frame)
    this.events.emit('fitness:update', { active: false, remaining: 0, moves: this.moves })
  }
}
