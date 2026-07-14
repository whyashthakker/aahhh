export class MultiplayerClient {
  constructor(events) {
    this.events = events
    this.state = 'offline'
    this.playerId = null
    this.room = null
    this.manualClose = false
    this.reconnectAttempts = 0
  }

  create(name, mode = 'chaos') {
    this.#connect({ type: 'create', name, mode })
  }

  join(code, name) {
    this.#connect({ type: 'join', code: code?.trim().toUpperCase(), name })
  }

  disconnect() {
    this.manualClose = true
    clearTimeout(this.reconnectTimer)
    this.socket?.close()
    this.socket = null
    this.room = null
    this.#setState('offline', 'Room disconnected.')
  }

  setMode(mode) {
    this.#send({ type: 'mode', mode })
  }

  sendImpact(impact) {
    if (this.state !== 'joined' || impact.source === 'remote' || impact.source === 'replay') return
    this.#send({
      type: 'impact',
      payload: {
        part: impact.part,
        side: impact.side,
        power: impact.rawPower ?? impact.power,
        moveType: impact.moveType,
        propId: impact.propId,
      },
    })
  }

  canAct() {
    return !this.room || this.room.mode !== 'pass' || this.room.turnPlayerId === this.playerId
  }

  shareUrl() {
    if (!this.room) return null
    const url = new URL('/punch', window.location.origin)
    url.searchParams.set('room', this.room.code)
    return url.toString()
  }

  #connect(joinMessage) {
    this.disconnect()
    this.manualClose = false
    this.pendingJoin = joinMessage
    this.reconnectAttempts = 0
    this.#openSocket()
  }

  #openSocket() {
    const configuredUrl = import.meta.env.VITE_MULTIPLAYER_URL
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = configuredUrl || `${protocol}//${window.location.host}/ws`
    this.#setState('connecting', 'Connecting to room server…')
    try { this.socket = new WebSocket(url) } catch { return this.#setState('error', 'Invalid multiplayer server URL.') }

    this.socket.addEventListener('open', () => {
      this.reconnectAttempts = 0
      this.#send(this.pendingJoin)
    })
    this.socket.addEventListener('message', (event) => this.#handleMessage(event.data))
    this.socket.addEventListener('close', () => this.#handleClose())
    this.socket.addEventListener('error', () => this.#setState('error', 'Room server is unavailable.'))
  }

  #handleMessage(raw) {
    let message
    try { message = JSON.parse(raw) } catch { return }
    if (message.type === 'connected') this.playerId = message.playerId
    if (message.type === 'joined') {
      this.playerId = message.playerId
      this.room = message.room
      this.pendingJoin = { type: 'join', code: message.room.code, name: message.room.players.find((player) => player.id === this.playerId)?.name }
      this.#setState('joined', `Room ${message.room.code} connected.`)
      this.events.emit('multiplayer:room', { room: this.room, playerId: this.playerId })
    }
    if (message.type === 'presence' || message.type === 'turn') {
      this.room = message.room
      this.events.emit('multiplayer:room', { room: this.room, playerId: this.playerId })
    }
    if (message.type === 'impact') {
      this.events.emit('impact:request', {
        ...message.payload,
        source: 'remote',
        remotePlayer: message.player,
      })
      this.events.emit('multiplayer:remote-hit', { player: message.player, impact: message.payload })
    }
    if (message.type === 'error') this.#setState('error', message.message)
  }

  #handleClose() {
    if (this.manualClose) return
    if (this.reconnectAttempts >= 5 || !this.pendingJoin) {
      this.#setState('error', 'Room connection lost.')
      return
    }
    this.reconnectAttempts += 1
    const delay = Math.min(5000, 500 * (2 ** (this.reconnectAttempts - 1)))
    this.#setState('connecting', `Reconnecting… (${this.reconnectAttempts}/5)`)
    this.reconnectTimer = setTimeout(() => this.#openSocket(), delay)
  }

  #send(message) {
    if (message && this.socket?.readyState === WebSocket.OPEN) this.socket.send(JSON.stringify(message))
  }

  #setState(state, message) {
    this.state = state
    this.events.emit('multiplayer:state', { state, message })
  }
}
