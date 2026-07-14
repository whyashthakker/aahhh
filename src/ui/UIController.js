import { ACTIONS } from '../game/actions.js'

const actionButtons = ACTIONS.map((action, index) => `
  <button class="action-card ${index === 0 ? 'active' : ''}" data-action="${action.id}" type="button">
    <span class="action-icon">${action.icon}</span>
    <span><b>${action.label}</b><small>${action.description}</small></span>
    <kbd>${action.key.toUpperCase()}</kbd>
  </button>
`).join('')

export class UIController {
  constructor(root, events) {
    this.root = root
    this.events = events
    this.#render()
    this.#cache()
    this.#bind()
  }

  #render() {
    this.root.innerHTML = `
      <main class="game-shell">
        <header class="topbar">
          <a class="brand" href="/" aria-label="Aahhh Arcade home">
            <span class="brand-mark" aria-hidden="true"><i></i><i></i></span>
            <span>RAGDOLL<br><b>ROOM</b></span>
          </a>
          <div class="environment-picker" aria-label="Choose an environment">
            <span class="environment-label"><i></i> SCENE</span>
            <button class="active" data-environment="studio" type="button"><span>✦</span> Studio</button>
            <button data-environment="office" type="button"><span>▦</span> Office</button>
            <button data-environment="garden" type="button"><span>♣</span> Garden</button>
          </div>
          <div class="top-actions">
            <span class="points-pill" title="Aahhh Points"><i>✦</i><b id="points-total">0</b></span>
            <button class="room-toggle" id="room-toggle" type="button"><span>◎</span> ROOMS</button>
            <button class="camera-toggle" id="camera-toggle" type="button" aria-label="Enable camera punch mode">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Zm8 9a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/></svg>
              <span>CAM PUNCH</span>
            </button>
            <button class="icon-button" id="sound-toggle" type="button" aria-label="Mute sound" title="Toggle sound">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Zm12.2-1.3a6 6 0 0 1 0 8.6M19.8 5a10 10 0 0 1 0 14"/></svg>
            </button>
          </div>
        </header>

        <section class="play-area">
          <aside class="setup-panel glass-panel">
            <p class="eyebrow">01 / CUSTOMIZE</p>
            <h1>Give the dummy<br><em>a familiar face.</em></h1>
            <p class="panel-copy">Upload a clear photo. It never leaves your device.</p>

            <label class="face-drop" id="face-drop" for="face-input">
              <input id="face-input" type="file" accept="image/png,image/jpeg,image/webp" />
              <span class="face-preview" id="face-preview">
                <svg viewBox="0 0 40 40" aria-hidden="true"><path d="M20 21a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm-12 13c1.2-6 5.2-9 12-9s10.8 3 12 9"/></svg>
              </span>
              <span><b id="upload-label">Choose a face</b><small>PNG, JPG or WEBP · max 10 MB</small></span>
              <svg class="upload-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m0 0L7 9m5-5 5 5M5 14v5h14v-5"/></svg>
            </label>

            <div class="intensity-row">
              <div><span>IMPACT</span><b id="impact-label">MEDIUM</b></div>
              <input id="impact-range" type="range" min="1" max="3" step="1" value="2" aria-label="Impact strength" />
              <div class="range-labels"><span>CHILL</span><span>FERAL</span></div>
            </div>

            <div class="privacy-note">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10V8a5 5 0 0 1 10 0v2m-11 0h12v10H6V10Z"/></svg>
              <span><b>Local & private</b>Your photo is never uploaded.</span>
            </div>
          </aside>

          <section class="stage-wrap" data-environment="studio" aria-label="Interactive 3D training dummy">
            <div id="stage"></div>
            <div class="stage-orbit orbit-one" aria-hidden="true"></div>
            <div class="stage-orbit orbit-two" aria-hidden="true"></div>
            <div class="stage-wash" aria-hidden="true"></div>
            <div class="combo" id="combo" aria-live="polite"><span>COMBO</span><b>0</b><small>x</small></div>
            <div class="hit-layer" id="hit-layer" aria-hidden="true"></div>
            <div class="reaction-bubble" id="reaction-bubble" aria-live="polite"></div>
            <div class="camera-card" id="camera-card" data-state="off">
              <div class="camera-feed">
                <video id="camera-video" muted playsinline></video>
                <canvas id="camera-canvas"></canvas>
                <div class="camera-scan" aria-hidden="true"></div>
                <div class="camera-flash" id="camera-flash" aria-hidden="true"></div>
                <span class="camera-live"><i></i> LOCAL VISION</span>
              </div>
              <div class="camera-details">
                <div><span class="tracking-dot"></span><b id="camera-status">Starting camera…</b></div>
                <p id="camera-message">Make a fist and punch toward the camera.</p>
                <div class="punch-meter"><i id="punch-meter-fill"></i></div>
                <div class="camera-controls">
                  <label>SENSITIVITY <input id="camera-sensitivity" type="range" min="0.65" max="1.45" step="0.05" value="1" /></label>
                  <select id="camera-quality" aria-label="Camera tracking quality"><option value="high">30 FPS</option><option value="low">ECO</option></select>
                  <button id="fitness-toggle" type="button">30S ROUND</button>
                </div>
              </div>
              <button id="camera-close" type="button" aria-label="Turn camera punch off">×</button>
            </div>
            <div class="stage-hint" id="stage-hint">
              <span class="mouse-icon"><i></i></span>
              <span><b>CLICK TO PUNCH</b> · DRAG TO FLING</span>
            </div>
          </section>

          <aside class="action-panel">
            <p class="eyebrow">02 / LET IT OUT</p>
            ${actionButtons}
            <div class="breather-card">
              <span>ENOUGH FOR NOW?</span>
              <b>Take a breath.</b>
              <button id="reset-button" type="button"><span>↻</span> Reset the room <kbd>R</kbd></button>
              <button class="replay-button" id="replay-button" type="button" disabled><span>▶</span> Replay last 10 sec</button>
            </div>
          </aside>
        </section>

        <section class="room-drawer" id="room-drawer" aria-label="Multiplayer rooms" aria-hidden="true">
          <button class="room-close" id="room-close" type="button" aria-label="Close rooms">×</button>
          <p class="eyebrow">PLAY TOGETHER</p>
          <h2>Chaos is better<br>with company.</h2>
          <p id="room-message">Create a room or enter a friend's code. Face photos always stay on your own device.</p>
          <label>YOUR NAME<input id="room-name" maxlength="18" value="Player" autocomplete="nickname" /></label>
          <div class="room-create-row">
            <select id="room-mode" aria-label="Room mode"><option value="chaos">Co-op chaos</option><option value="pass">Pass the dummy</option></select>
            <button id="room-create" type="button">CREATE ROOM</button>
          </div>
          <div class="room-divider"><span>OR JOIN</span></div>
          <div class="room-join-row">
            <input id="room-code-input" maxlength="6" placeholder="CODE" aria-label="Room code" />
            <button id="room-join" type="button">JOIN</button>
          </div>
          <div class="room-live" id="room-live" hidden>
            <div><span>ROOM</span><strong id="room-code">—</strong><button id="room-copy" type="button">COPY LINK</button></div>
            <ul id="room-players"></ul>
            <b id="room-turn">CO-OP CHAOS</b>
            <button id="room-leave" type="button">LEAVE ROOM</button>
          </div>
        </section>

        <div class="achievement-toast" id="achievement-toast" aria-live="polite"><span>ACHIEVEMENT</span><b></b></div>
        <div class="fitness-hud" id="fitness-hud" aria-live="polite"><span>CAMERA ROUND</span><b>30</b><small>0 MOVES</small></div>

        <footer>
          <span>NO DUMMIES WERE HARMED IN THE MAKING OF THIS GAME.</span>
          <span class="footer-center"><i></i> BREATHE IN <i></i> BREATHE OUT <i></i></span>
          <span>THREE.JS EXPERIMENT · 2026</span>
        </footer>
      </main>
    `
  }

  #cache() {
    this.stage = this.root.querySelector('#stage')
    this.hitLayer = this.root.querySelector('#hit-layer')
    this.combo = this.root.querySelector('#combo')
    this.comboNumber = this.combo.querySelector('b')
    this.stageHint = this.root.querySelector('#stage-hint')
    this.faceDrop = this.root.querySelector('#face-drop')
    this.facePreview = this.root.querySelector('#face-preview')
    this.uploadLabel = this.root.querySelector('#upload-label')
    this.soundButton = this.root.querySelector('#sound-toggle')
    this.cameraButton = this.root.querySelector('#camera-toggle')
    this.cameraCard = this.root.querySelector('#camera-card')
    this.cameraVideo = this.root.querySelector('#camera-video')
    this.cameraCanvas = this.root.querySelector('#camera-canvas')
    this.cameraStatus = this.root.querySelector('#camera-status')
    this.cameraMessage = this.root.querySelector('#camera-message')
    this.punchMeter = this.root.querySelector('#punch-meter-fill')
    this.cameraFlash = this.root.querySelector('#camera-flash')
    this.reactionBubble = this.root.querySelector('#reaction-bubble')
    this.pointsTotal = this.root.querySelector('#points-total')
    this.roomDrawer = this.root.querySelector('#room-drawer')
    this.roomMessage = this.root.querySelector('#room-message')
    this.roomLive = this.root.querySelector('#room-live')
    this.replayButton = this.root.querySelector('#replay-button')
    this.fitnessHud = this.root.querySelector('#fitness-hud')
    this.currentEnvironment = 'studio'
    this.hitCounter = 0
  }

  #bind() {
    this.root.querySelectorAll('.action-card').forEach((button) => {
      button.addEventListener('click', () => this.events.emit('action:request', { actionId: button.dataset.action, source: 'button' }))
    })
    this.root.querySelector('#reset-button').addEventListener('click', () => this.events.emit('room:reset'))
    this.soundButton.addEventListener('click', () => this.events.emit('sound:toggle'))
    this.cameraButton.addEventListener('click', () => this.events.emit('camera:toggle'))
    this.root.querySelector('#camera-close').addEventListener('click', () => this.events.emit('camera:stop'))
    this.root.querySelector('#camera-sensitivity').addEventListener('input', (event) => this.events.emit('camera:sensitivity', { value: Number(event.target.value) }))
    this.root.querySelector('#camera-quality').addEventListener('change', (event) => this.events.emit('camera:quality', { quality: event.target.value }))
    this.root.querySelector('#fitness-toggle').addEventListener('click', () => this.events.emit('fitness:toggle'))
    this.root.querySelector('#room-toggle').addEventListener('click', () => this.toggleRooms(true))
    this.root.querySelector('#room-close').addEventListener('click', () => this.toggleRooms(false))
    this.root.querySelector('#room-create').addEventListener('click', () => this.events.emit('multiplayer:create', {
      name: this.root.querySelector('#room-name').value,
      mode: this.root.querySelector('#room-mode').value,
    }))
    this.root.querySelector('#room-join').addEventListener('click', () => this.events.emit('multiplayer:join', {
      name: this.root.querySelector('#room-name').value,
      code: this.root.querySelector('#room-code-input').value,
    }))
    this.root.querySelector('#room-leave').addEventListener('click', () => this.events.emit('multiplayer:leave'))
    this.root.querySelector('#room-copy').addEventListener('click', () => this.events.emit('multiplayer:copy-link'))
    this.replayButton.addEventListener('click', () => this.events.emit('replay:request'))
    this.root.querySelectorAll('button[data-environment]').forEach((button) => {
      button.addEventListener('click', () => {
        this.root.querySelectorAll('button[data-environment]').forEach((item) => item.classList.toggle('active', item === button))
        this.root.querySelector('.stage-wrap').dataset.environment = button.dataset.environment
        this.currentEnvironment = button.dataset.environment
        this.events.emit('environment:change', { environmentId: button.dataset.environment })
      })
    })
    this.root.querySelector('#impact-range').addEventListener('input', (event) => {
      this.events.emit('intensity:change', { level: Number(event.target.value) })
    })

    const faceInput = this.root.querySelector('#face-input')
    faceInput.addEventListener('change', () => this.#loadFace(faceInput.files[0]))
    ;['dragenter', 'dragover'].forEach((name) => this.faceDrop.addEventListener(name, (event) => {
      event.preventDefault()
      this.faceDrop.classList.add('dragging')
    }))
    ;['dragleave', 'drop'].forEach((name) => this.faceDrop.addEventListener(name, (event) => {
      event.preventDefault()
      this.faceDrop.classList.remove('dragging')
    }))
    this.faceDrop.addEventListener('drop', (event) => this.#loadFace(event.dataTransfer.files[0]))

    this.events.on('state:combo', ({ combo }) => this.showCombo(combo))
    this.events.on('state:combo-ended', () => this.combo.classList.remove('visible'))
    this.events.on('state:reset', () => this.reset())
    this.events.on('state:intensity', ({ level }) => {
      this.root.querySelector('#impact-label').textContent = ['CHILL', 'MEDIUM', 'FERAL'][level - 1]
    })
    this.events.on('state:sound', ({ enabled }) => {
      this.soundButton.classList.toggle('muted', !enabled)
      this.soundButton.setAttribute('aria-label', enabled ? 'Mute sound' : 'Turn sound on')
    })
    this.events.on('impact:applied', ({ screen, power }) => {
      this.showHit(screen.x, screen.y, power)
      this.stageHint.classList.add('hidden')
    })
    this.events.on('impact:applied', ({ power, source }) => {
      this.hitCounter += 1
      if (source === 'camera' || power > 1.9 || this.hitCounter % 4 === 0) this.showFunnyReaction()
    })
    this.events.on('camera:state', ({ state, message }) => this.setCameraState(state, message))
    this.events.on('camera:tracking', ({ hasHand, message, charge, fist }) => {
      this.cameraCard.classList.toggle('has-hand', hasHand)
      this.cameraCard.classList.toggle('fist-ready', fist)
      this.cameraStatus.textContent = message
      this.punchMeter.style.width = `${Math.round(charge * 100)}%`
    })
    this.events.on('camera:flash', ({ visualX, visualY }) => {
      this.cameraFlash.style.setProperty('--punch-x', `${visualX * 100}%`)
      this.cameraFlash.style.setProperty('--punch-y', `${visualY * 100}%`)
      this.cameraFlash.classList.remove('pop')
      requestAnimationFrame(() => this.cameraFlash.classList.add('pop'))
    })
    this.events.on('progress:update', ({ profile }) => { this.pointsTotal.textContent = profile.points.toLocaleString() })
    this.events.on('progress:achievement', ({ label }) => this.showAchievement(label))
    this.events.on('replay:availability', ({ count }) => { this.replayButton.disabled = count === 0 })
    this.events.on('replay:state', ({ replaying }) => {
      this.replayButton.disabled = replaying
      this.replayButton.lastChild.textContent = replaying ? ' Replaying…' : ' Replay last 10 sec'
    })
    this.events.on('multiplayer:state', ({ state, message }) => {
      this.roomMessage.textContent = message
      this.root.querySelector('#room-toggle').classList.toggle('active', state === 'joined')
    })
    this.events.on('multiplayer:room', ({ room, playerId }) => this.showRoom(room, playerId))
    this.events.on('multiplayer:remote-hit', ({ player }) => this.showFunnyReaction(`${player.name} BONKED FROM AFAR!`))
    this.events.on('multiplayer:link-copied', () => { this.roomMessage.textContent = 'Invite link copied.' })
    this.events.on('fitness:update', (fitness) => this.showFitness(fitness))

    window.addEventListener('keydown', (event) => {
      if (event.target.matches('input')) return
      this.events.emit('key:pressed', { key: event.key.toLowerCase() })
    })
  }

  #loadFace(file) {
    if (!file?.type.startsWith('image/')) return
    if (file.size > 10 * 1024 * 1024) {
      this.uploadLabel.textContent = 'Photo is too large'
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const image = new Image()
      image.onload = () => {
        this.facePreview.innerHTML = `<img src="${reader.result}" alt="Uploaded face preview" />`
        this.uploadLabel.textContent = 'Face added!'
        this.faceDrop.classList.add('has-face')
        this.events.emit('face:ready', { image })
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  }

  showCombo(value) {
    this.comboNumber.textContent = value
    this.combo.querySelector('span').textContent = value >= 10 ? 'UNHINGED' : value >= 6 ? 'SPICY' : value >= 3 ? 'WARMING UP' : 'COMBO'
    this.combo.classList.add('visible', 'bump')
    setTimeout(() => this.combo.classList.remove('bump'), 120)
  }

  showHit(clientX, clientY, power) {
    const words = ['POW!', 'BONK!', 'BOP!', 'OOF!', 'WHAM!']
    const rect = this.hitLayer.getBoundingClientRect()
    const label = document.createElement('span')
    label.className = `hit-word power-${Math.min(3, Math.ceil(power))}`
    label.textContent = words[Math.floor(Math.random() * words.length)]
    label.style.left = `${clientX - rect.left}px`
    label.style.top = `${clientY - rect.top}px`
    label.style.setProperty('--twist', `${-16 + Math.random() * 32}deg`)
    this.hitLayer.appendChild(label)
    setTimeout(() => label.remove(), 650)
  }

  setActiveAction(actionId) {
    this.root.querySelectorAll('.action-card').forEach((button) => button.classList.toggle('active', button.dataset.action === actionId))
  }

  setCameraState(state, message) {
    this.cameraCard.dataset.state = state
    this.cameraCard.classList.toggle('visible', state !== 'off')
    this.cameraButton.classList.toggle('active', state === 'ready' || state === 'loading')
    this.cameraButton.querySelector('span').textContent = state === 'loading' ? 'LOADING…' : state === 'ready' ? 'CAM LIVE' : 'CAM PUNCH'
    this.cameraStatus.textContent = state === 'loading' ? 'Loading hand tracking…' : state === 'error' ? 'Camera unavailable' : 'Camera ready'
    this.cameraMessage.textContent = message
    if (state === 'error') this.cameraCard.classList.remove('has-hand', 'fist-ready')
  }

  showFunnyReaction(customText = '') {
    const reactions = {
      studio: ['MY GOOD ANGLE!', 'I FELT THAT IN 4K.', 'CAMERA LEFT! CAMERA LEFT!', 'THAT WAS UNSCRIPTED!'],
      office: ["I'M CALLING HR!", "THIS COULD'VE BEEN AN EMAIL!", 'NOT THE SPREADSHEET!', 'MY PTO STARTS NOW.'],
      garden: ['THE TOMATOES SAW THAT!', 'LEAVE THE DAISIES OUT OF THIS!', 'I WAS PHOTOSYNTHESIZING!', 'NOT IN FRONT OF THE BEES!'],
    }
    const pool = reactions[this.currentEnvironment] ?? reactions.studio
    this.reactionBubble.textContent = customText || pool[Math.floor(Math.random() * pool.length)]
    this.reactionBubble.classList.remove('visible')
    requestAnimationFrame(() => this.reactionBubble.classList.add('visible'))
    clearTimeout(this.reactionTimer)
    this.reactionTimer = setTimeout(() => this.reactionBubble.classList.remove('visible'), 1400)
  }

  toggleRooms(open) {
    this.roomDrawer.classList.toggle('visible', open)
    this.roomDrawer.setAttribute('aria-hidden', String(!open))
  }

  showRoom(room, playerId) {
    this.toggleRooms(true)
    this.roomLive.hidden = false
    this.root.querySelector('#room-code').textContent = room.code
    this.root.querySelector('#room-players').innerHTML = room.players.map((player) => `
      <li style="--player-color:${player.color}"><i></i><span>${escapeHtml(player.name)}${player.id === playerId ? ' (YOU)' : ''}</span></li>
    `).join('')
    const active = room.players.find((player) => player.id === room.turnPlayerId)
    this.root.querySelector('#room-turn').textContent = room.mode === 'pass' ? `${active?.name || 'Player'}'S TURN` : 'CO-OP CHAOS'
  }

  showAchievement(label) {
    const toast = this.root.querySelector('#achievement-toast')
    toast.querySelector('b').textContent = label
    toast.classList.remove('visible')
    requestAnimationFrame(() => toast.classList.add('visible'))
    clearTimeout(this.achievementTimer)
    this.achievementTimer = setTimeout(() => toast.classList.remove('visible'), 2800)
  }

  showFitness({ active, remaining, moves }) {
    this.fitnessHud.classList.toggle('visible', active)
    this.fitnessHud.querySelector('b').textContent = Math.ceil(remaining)
    this.fitnessHud.querySelector('small').textContent = `${moves} MOVE${moves === 1 ? '' : 'S'}`
  }

  reset() {
    this.comboNumber.textContent = '0'
    this.combo.classList.remove('visible')
    this.stageHint.classList.remove('hidden')
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
}
