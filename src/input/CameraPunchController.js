const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export class CameraPunchController {
  constructor({ video, canvas, events }) {
    this.video = video
    this.canvas = canvas
    this.context = canvas.getContext('2d')
    this.events = events
    this.active = false
    this.loading = false
    this.lastVideoTime = -1
    this.lastPunchAt = new Map()
    this.tracks = new Map()
    this.frameRequest = null
    this.sessionId = 0
    this.sensitivity = 1
    this.quality = 'high'
    this.lastProcessedAt = 0
  }

  async toggle() {
    if (this.active || this.loading) {
      this.stop()
      return
    }
    await this.start()
  }

  setSensitivity(value) {
    this.sensitivity = clamp(Number(value), 0.65, 1.45)
  }

  setQuality(quality) {
    this.quality = quality === 'low' ? 'low' : 'high'
  }

  async start() {
    if (!navigator.mediaDevices?.getUserMedia) {
      this.#emitState('error', 'Camera access is not supported in this browser.')
      return
    }

    this.loading = true
    const sessionId = ++this.sessionId
    this.#emitState('loading', 'Loading hand tracking…')
    try {
      const [{ FilesetResolver, GestureRecognizer }, stream] = await Promise.all([
        import('@mediapipe/tasks-vision'),
        navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 30, max: 60 },
          },
          audio: false,
        }),
      ])

      this.stream = stream
      if (sessionId !== this.sessionId) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      this.video.srcObject = stream
      await this.video.play()
      const fileset = await FilesetResolver.forVisionTasks('/mediapipe/wasm')
      const options = {
        baseOptions: {
          modelAssetPath: '/mediapipe/models/gesture_recognizer.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.55,
        minHandPresenceConfidence: 0.55,
        minTrackingConfidence: 0.5,
        cannedGesturesClassifierOptions: {
          scoreThreshold: 0.5,
          categoryAllowlist: ['Closed_Fist', 'Open_Palm'],
        },
      }

      try {
        this.recognizer = await GestureRecognizer.createFromOptions(fileset, options)
      } catch {
        options.baseOptions.delegate = 'CPU'
        this.recognizer = await GestureRecognizer.createFromOptions(fileset, options)
      }
      if (sessionId !== this.sessionId) {
        this.recognizer.close()
        stream.getTracks().forEach((track) => track.stop())
        return
      }
      this.connections = GestureRecognizer.HAND_CONNECTIONS
      this.canvas.width = this.video.videoWidth || 640
      this.canvas.height = this.video.videoHeight || 480
      this.active = true
      this.loading = false
      this.lastVideoTime = -1
      this.#emitState('ready', 'Make a fist, pull back, then punch toward the camera.')
      this.#loop()
    } catch (error) {
      this.loading = false
      this.stop(false)
      const denied = error?.name === 'NotAllowedError'
      this.#emitState('error', denied ? 'Camera permission was denied.' : 'Could not start camera punch mode.')
    }
  }

  stop(emit = true) {
    this.sessionId += 1
    this.active = false
    this.loading = false
    if (this.frameRequest) cancelAnimationFrame(this.frameRequest)
    this.frameRequest = null
    this.stream?.getTracks().forEach((track) => track.stop())
    this.stream = null
    this.video.srcObject = null
    this.recognizer?.close()
    this.recognizer = null
    this.tracks.clear()
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    if (emit) this.#emitState('off', 'Camera punch is off.')
  }

  #loop = () => {
    if (!this.active) return
    const now = performance.now()
    const processInterval = this.quality === 'low' ? 72 : 32
    if (this.video.readyState >= 2 && this.video.currentTime !== this.lastVideoTime && now - this.lastProcessedAt >= processInterval) {
      this.lastProcessedAt = now
      this.lastVideoTime = this.video.currentTime
      try {
        const result = this.recognizer.recognizeForVideo(this.video, now)
        this.#process(result, now)
        this.#draw(result)
      } catch {
        this.#emitState('error', 'Hand tracking paused. Toggle the camera to retry.')
        this.stop(false)
        return
      }
    }
    this.frameRequest = requestAnimationFrame(this.#loop)
  }

  #process(result, now) {
    if (!result.landmarks?.length) {
      this.tracks.clear()
      this.#emitTracking(false, 'Show your fist', 0)
      return
    }

    let strongestCharge = 0
    let sawFist = false
    result.landmarks.forEach((landmarks, index) => {
      const gesture = result.gestures?.[index]?.[0]
      const gestureName = gesture?.categoryName ?? 'None'
      const isFist = gestureName === 'Closed_Fist' && (gesture?.score ?? 0) >= 0.5
      const isOpenPalm = gestureName === 'Open_Palm' && (gesture?.score ?? 0) >= 0.5
      sawFist ||= isFist

      const handedness = result.handedness?.[index]?.[0]?.categoryName ?? `hand-${index}`
      const trackKey = handedness
      const center = averageLandmarks(landmarks, [0, 5, 9, 13, 17])
      const palmSpan = distance(landmarks[5], landmarks[17]) + distance(landmarks[0], landmarks[9]) * 0.72
      const previous = this.tracks.get(trackKey)
      const deltaSeconds = previous ? Math.max(0.016, (now - previous.time) / 1000) : 0
      const expansionRate = previous
        ? ((palmSpan - previous.palmSpan) / Math.max(previous.palmSpan, 0.03)) / deltaSeconds
        : 0
      const screenVelocity = previous ? distance(center, previous.center) / deltaSeconds : 0
      const velocityX = previous ? (center.x - previous.center.x) / deltaSeconds : 0
      const velocityY = previous ? (center.y - previous.center.y) / deltaSeconds : 0
      const closedFrames = isFist ? (previous?.closedFrames ?? 0) + 1 : 0
      const openFrames = isOpenPalm ? (previous?.openFrames ?? 0) + 1 : 0
      const charge = clamp((expansionRate - 0.08) / 1.25, 0, 1)
      strongestCharge = Math.max(strongestCharge, charge)

      const lastPunch = this.lastPunchAt.get(trackKey) ?? 0
      const threshold = 1 / this.sensitivity
      const forwardPunch = expansionRate > 0.48 * threshold || (expansionRate > 0.2 * threshold && screenVelocity > 1.25 * threshold)
      const hook = isFist && Math.abs(velocityX) > 1.15 * threshold && Math.abs(velocityX) > Math.abs(velocityY) * 1.25
      const uppercut = isFist && velocityY < -0.92 * threshold && Math.abs(velocityY) > Math.abs(velocityX) * 0.82
      const slap = isOpenPalm && openFrames >= 2 && Math.abs(velocityX) > 1.05 * threshold
      const palmShove = isOpenPalm && openFrames >= 2 && forwardPunch
      const moveType = slap ? 'slap' : palmShove ? 'shove' : uppercut ? 'uppercut' : hook ? 'hook' : forwardPunch ? 'jab' : null

      if (moveType && ((isFist && closedFrames >= 2) || (isOpenPalm && openFrames >= 2)) && now - lastPunch > 560) {
        const visualX = 1 - center.x
        const side = visualX >= 0.5 ? 1 : -1
        const part = ['slap', 'uppercut', 'hook'].includes(moveType) || center.y < 0.52 ? 'head' : 'torso'
        const moveBonus = moveType === 'shove' ? 0.5 : moveType === 'uppercut' ? 0.35 : moveType === 'slap' ? 0.2 : 0
        const power = clamp(1.1 + Math.max(0, expansionRate) * 0.62 + screenVelocity * 0.24 + moveBonus, 1.2, 3.1)
        this.lastPunchAt.set(trackKey, now)
        this.events.emit('camera:punch', { part, side, power, source: 'camera', handedness, moveType })
        this.events.emit('camera:flash', { visualX, visualY: center.y })
        this.events.emit('camera:move', { moveType, power })
      }

      this.tracks.set(trackKey, { center, palmSpan, time: now, closedFrames, openFrames })
    })

    const sawPalm = result.gestures?.some((gestures) => gestures?.[0]?.categoryName === 'Open_Palm')
    this.#emitTracking(true, sawFist ? 'Fist locked — jab, hook or uppercut!' : sawPalm ? 'Palm ready — slap or shove!' : 'Make a fist or open palm', strongestCharge, sawFist || sawPalm)
  }

  #draw(result) {
    const context = this.context
    context.clearRect(0, 0, this.canvas.width, this.canvas.height)
    result.landmarks?.forEach((landmarks, handIndex) => {
      const isFist = result.gestures?.[handIndex]?.[0]?.categoryName === 'Closed_Fist'
      context.strokeStyle = isFist ? '#d9ff61' : 'rgba(255,255,255,.72)'
      context.fillStyle = isFist ? '#d9ff61' : '#ffffff'
      context.lineWidth = isFist ? 4 : 2
      context.lineCap = 'round'
      this.connections.forEach(({ start, end }) => {
        context.beginPath()
        context.moveTo(landmarks[start].x * this.canvas.width, landmarks[start].y * this.canvas.height)
        context.lineTo(landmarks[end].x * this.canvas.width, landmarks[end].y * this.canvas.height)
        context.stroke()
      })
      landmarks.forEach((landmark, index) => {
        context.beginPath()
        context.arc(landmark.x * this.canvas.width, landmark.y * this.canvas.height, index === 0 ? 5 : 3, 0, Math.PI * 2)
        context.fill()
      })
    })
  }

  #emitState(state, message) {
    this.events.emit('camera:state', { state, message })
  }

  #emitTracking(hasHand, message, charge, fist = false) {
    this.events.emit('camera:tracking', { hasHand, message, charge, fist })
  }
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function averageLandmarks(landmarks, indices) {
  const total = indices.reduce((point, index) => ({
    x: point.x + landmarks[index].x,
    y: point.y + landmarks[index].y,
  }), { x: 0, y: 0 })
  return { x: total.x / indices.length, y: total.y / indices.length }
}
