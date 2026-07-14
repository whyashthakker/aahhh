const STORAGE_KEY = 'aahhh:punch-profile:v1'

const DEFAULT_PROFILE = {
  points: 0,
  bestCombo: 0,
  totalHits: 0,
  sessions: 0,
  moves: {},
  achievements: [],
}

export class ProgressionSystem {
  constructor(events) {
    this.events = events
    this.profile = this.#load()
    this.session = { hits: 0, points: 0, moves: new Set(), startedAt: Date.now() }
    this.profile.sessions += 1
    this.#save()

    events.on('impact:applied', (impact) => this.#registerImpact(impact))
    events.on('state:combo', ({ combo }) => {
      if (combo > this.profile.bestCombo) {
        this.profile.bestCombo = combo
        this.#saveAndEmit()
      }
      if (combo >= 10) this.#unlock('combo-10', 'Certified Unhinged')
      if (combo >= 25) this.#unlock('combo-25', 'Keyboard Warranty Voided')
    })
    queueMicrotask(() => this.#emit())
  }

  #registerImpact(impact) {
    const move = impact.moveType || impact.propId || impact.source || 'bonk'
    const varietyBonus = this.session.moves.has(move) ? 0 : 3
    const points = Math.max(1, Math.round(impact.power * 2 + varietyBonus))
    this.session.hits += 1
    this.session.points += points
    this.session.moves.add(move)
    this.profile.points += points
    this.profile.totalHits += 1
    this.profile.moves[move] = (this.profile.moves[move] || 0) + 1
    if (this.profile.totalHits >= 1) this.#unlock('first-bonk', 'First Bonk')
    if (this.session.moves.size >= 5) this.#unlock('variety-pack', 'Variety Pack')
    if (impact.source === 'camera') this.#unlock('hands-on', 'Hands On')
    if (impact.source === 'remote') this.#unlock('long-distance', 'Long-distance Bonk')
    this.#saveAndEmit()
  }

  #unlock(id, label) {
    if (this.profile.achievements.includes(id)) return
    this.profile.achievements.push(id)
    this.#save()
    this.events.emit('progress:achievement', { id, label })
  }

  recap() {
    const elapsedSeconds = Math.max(1, Math.round((Date.now() - this.session.startedAt) / 1000))
    const variety = this.session.moves.size
    const grade = variety >= 7 ? 'S' : variety >= 5 ? 'A' : variety >= 3 ? 'B' : this.session.hits >= 1 ? 'C' : '—'
    return { ...this.session, moves: [...this.session.moves], elapsedSeconds, grade, bestCombo: this.profile.bestCombo }
  }

  #load() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
      return { ...DEFAULT_PROFILE, ...saved, moves: saved?.moves || {}, achievements: saved?.achievements || [] }
    } catch {
      return { ...DEFAULT_PROFILE, moves: {}, achievements: [] }
    }
  }

  #save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.profile)) } catch { /* storage is optional */ }
  }

  #saveAndEmit() {
    this.#save()
    this.#emit()
  }

  #emit() {
    this.events.emit('progress:update', { profile: { ...this.profile }, session: this.recap() })
  }
}
