const WINDOW_MS = 10_000

export class ReplaySystem {
  constructor(events) {
    this.events = events
    this.impacts = []
    this.replaying = false
    events.on('impact:applied', (impact) => {
      if (this.replaying || impact.source === 'replay') return
      const now = performance.now()
      this.impacts.push({ at: now, impact: this.#serializable(impact) })
      this.impacts = this.impacts.filter((entry) => now - entry.at <= WINDOW_MS)
      events.emit('replay:availability', { count: this.impacts.length })
    })
    events.on('replay:request', () => this.play())
  }

  play() {
    if (this.replaying || !this.impacts.length) return
    const clip = [...this.impacts]
    const startAt = clip[0].at
    this.replaying = true
    this.events.emit('replay:state', { replaying: true })
    clip.forEach(({ at, impact }, index) => {
      setTimeout(() => {
        this.events.emit('impact:request', { ...impact, source: 'replay', power: impact.power * 0.88 })
        if (index === clip.length - 1) {
          this.replaying = false
          this.events.emit('replay:state', { replaying: false })
        }
      }, Math.min(WINDOW_MS, at - startAt))
    })
  }

  #serializable(impact) {
    return {
      part: impact.part,
      side: impact.side,
      power: impact.power,
      moveType: impact.moveType,
      propId: impact.propId,
    }
  }
}
