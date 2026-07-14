import * as THREE from 'three'
import { EventBus } from '../core/EventBus.js'
import { GameState } from '../core/GameState.js'
import { AudioManager } from '../audio/AudioManager.js'
import { ACTIONS_BY_ID, ACTIONS_BY_KEY } from '../game/actions.js'
import { Dummy } from '../game/Dummy.js'
import { SceneWorld } from '../game/SceneWorld.js'
import { InteractionController } from '../game/InteractionController.js'
import { UIController } from '../ui/UIController.js'
import { CameraPunchController } from '../input/CameraPunchController.js'
import { FitnessRound } from '../input/FitnessRound.js'
import { MultiplayerClient } from '../multiplayer/MultiplayerClient.js'
import { ProgressionSystem } from '../progression/ProgressionSystem.js'
import { ReplaySystem } from '../replay/ReplaySystem.js'

export function bootstrapPunchGame(root) {
  document.title = 'Ragdoll Room — Let it out'
  const events = new EventBus()
  const state = new GameState(events)
  const audio = new AudioManager()
  const ui = new UIController(root, events)
  const world = new SceneWorld(ui.stage)
  const dummy = new Dummy(world.renderer)
  const cameraPunch = new CameraPunchController({ video: ui.cameraVideo, canvas: ui.cameraCanvas, events })
  const multiplayer = new MultiplayerClient(events)
  const progression = new ProgressionSystem(events)
  const replay = new ReplaySystem(events)
  const fitness = new FitnessRound(events)

  world.add(dummy.group)
  new InteractionController({ world, dummy, events })

  function applyImpact(request) {
    if (request.source !== 'remote' && request.source !== 'replay' && !multiplayer.canAct()) {
      events.emit('multiplayer:state', { state: 'joined', message: 'Wait for your turn — five seconds each.' })
      return
    }
    const power = request.power * state.intensity
    const point = request.point ?? dummy.getWorldPoint(request.part)
    const screen = request.screen ?? world.toScreen(point)
    world.spawnProjectile(point, request.propId, request.side)
    dummy.impact(request.part, request.side, power)
    world.spawnParticles(point, Math.min(power, 2.4))
    world.shake(power)
    audio.playImpact(power)
    state.registerHit()
    events.emit('impact:applied', {
      part: request.part,
      side: request.side,
      power,
      rawPower: request.power,
      screen,
      source: request.source,
      moveType: request.moveType,
      propId: request.propId,
    })
  }

  function runAction(actionId, source = 'unknown') {
    const action = ACTIONS_BY_ID[actionId]
    if (!action) return
    ui.setActiveAction(actionId)
    if (actionId === 'storm') audio.playFlurry()
    action.hits.forEach((hit) => {
      setTimeout(() => {
        const side = hit.side === 'random' ? (Math.random() > 0.5 ? 1 : -1) : hit.side
        const point = dummy.getWorldPoint(hit.part)
        point.x += side * 0.2
        events.emit('impact:request', { ...hit, side, point, source: `action:${source}` })
      }, hit.delay)
    })
    events.emit('action:performed', { actionId, source, timestamp: Date.now() })
  }

  events.on('impact:request', applyImpact)
  events.on('action:request', ({ actionId, source }) => runAction(actionId, source))
  events.on('room:reset', () => {
    dummy.reset()
    state.reset()
  })
  events.on('sound:toggle', () => state.toggleSound())
  events.on('state:sound', ({ enabled }) => audio.setEnabled(enabled))
  events.on('intensity:change', ({ level }) => state.setIntensity(level))
  events.on('face:ready', ({ image }) => dummy.setFaceImage(image))
  events.on('environment:change', ({ environmentId }) => world.setEnvironment(environmentId))
  events.on('camera:toggle', () => cameraPunch.toggle())
  events.on('camera:stop', () => cameraPunch.stop())
  events.on('camera:sensitivity', ({ value }) => cameraPunch.setSensitivity(value))
  events.on('camera:quality', ({ quality }) => cameraPunch.setQuality(quality))
  events.on('camera:punch', (punch) => events.emit('impact:request', punch))
  events.on('impact:applied', (impact) => multiplayer.sendImpact(impact))
  events.on('multiplayer:create', ({ name, mode }) => multiplayer.create(name, mode))
  events.on('multiplayer:join', ({ code, name }) => multiplayer.join(code, name))
  events.on('multiplayer:leave', () => multiplayer.disconnect())
  events.on('multiplayer:copy-link', async () => {
    const url = multiplayer.shareUrl()
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      events.emit('multiplayer:link-copied')
    } catch {
      window.prompt('Copy this room link:', url)
    }
  })
  events.on('key:pressed', ({ key }) => {
    if (key === 'r') events.emit('room:reset')
    if (ACTIONS_BY_KEY[key]) runAction(ACTIONS_BY_KEY[key].id, 'keyboard')
  })

  const clock = new THREE.Clock()
  let elapsed = 0
  let frameRequest
  function animate() {
    const delta = Math.min(clock.getDelta(), 0.033)
    elapsed += delta
    state.update(delta)
    dummy.update(delta, elapsed)
    world.update(delta, dummy, elapsed)
    world.render()
    frameRequest = requestAnimationFrame(animate)
  }
  animate()

  const roomCode = new URLSearchParams(window.location.search).get('room')
  if (roomCode) {
    ui.toggleRooms(true)
    const roomInput = root.querySelector('#room-code-input')
    if (roomInput) roomInput.value = roomCode.toUpperCase().slice(0, 6)
  }

  window.addEventListener('beforeunload', () => {
    cancelAnimationFrame(frameRequest)
    cameraPunch.stop(false)
    fitness.stop()
    multiplayer.disconnect()
  }, { once: true })

  return { events, state, audio, ui, world, dummy, cameraPunch, multiplayer, progression, replay, fitness }
}
