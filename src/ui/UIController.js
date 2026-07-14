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
          <a class="brand" href="#" aria-label="Ragdoll Room home">
            <span class="brand-mark" aria-hidden="true"><i></i><i></i></span>
            <span>RAGDOLL<br><b>ROOM</b></span>
          </a>
          <div class="environment-picker" aria-label="Choose an environment">
            <span class="environment-label"><i></i> SCENE</span>
            <button class="active" data-environment="studio" type="button"><span>✦</span> Studio</button>
            <button data-environment="office" type="button"><span>▦</span> Office</button>
            <button data-environment="garden" type="button"><span>♣</span> Garden</button>
          </div>
          <button class="icon-button" id="sound-toggle" type="button" aria-label="Mute sound" title="Toggle sound">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 9v6h4l5 4V5L9 9H5Zm12.2-1.3a6 6 0 0 1 0 8.6M19.8 5a10 10 0 0 1 0 14"/></svg>
          </button>
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
            </div>
          </aside>
        </section>

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
  }

  #bind() {
    this.root.querySelectorAll('.action-card').forEach((button) => {
      button.addEventListener('click', () => this.events.emit('action:request', { actionId: button.dataset.action, source: 'button' }))
    })
    this.root.querySelector('#reset-button').addEventListener('click', () => this.events.emit('room:reset'))
    this.soundButton.addEventListener('click', () => this.events.emit('sound:toggle'))
    this.root.querySelectorAll('button[data-environment]').forEach((button) => {
      button.addEventListener('click', () => {
        this.root.querySelectorAll('button[data-environment]').forEach((item) => item.classList.toggle('active', item === button))
        this.root.querySelector('.stage-wrap').dataset.environment = button.dataset.environment
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

  reset() {
    this.comboNumber.textContent = '0'
    this.combo.classList.remove('visible')
    this.stageHint.classList.remove('hidden')
  }
}
