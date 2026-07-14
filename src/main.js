import './style.css'
import * as THREE from 'three'
import { EventBus } from './core/EventBus.js'
import { GameState } from './core/GameState.js'
import { AudioManager } from './audio/AudioManager.js'
import { ACTIONS_BY_ID, ACTIONS_BY_KEY } from './game/actions.js'
import { Dummy } from './game/Dummy.js'
import { SceneWorld } from './game/SceneWorld.js'
import { InteractionController } from './game/InteractionController.js'
import { UIController } from './ui/UIController.js'

const events = new EventBus()
const state = new GameState(events)
const audio = new AudioManager()
const ui = new UIController(document.querySelector('#app'), events)
const world = new SceneWorld(ui.stage)
const dummy = new Dummy(world.renderer)

world.add(dummy.group)
new InteractionController({ world, dummy, events })

function applyImpact(request) {
  const power = request.power * state.intensity
  const point = request.point ?? dummy.getWorldPoint(request.part)
  const screen = request.screen ?? world.toScreen(point)
  dummy.impact(request.part, request.side, power)
  world.spawnParticles(point, Math.min(power, 2.4))
  world.shake(power)
  audio.playImpact(power)
  state.registerHit()
  events.emit('impact:applied', {
    part: request.part,
    side: request.side,
    power,
    screen,
    source: request.source,
  })
  // The payload above is deliberately serializable: a future network adapter
  // can relay player actions without coupling multiplayer to Three.js objects.
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
events.on('key:pressed', ({ key }) => {
  if (key === 'r') events.emit('room:reset')
  if (ACTIONS_BY_KEY[key]) runAction(ACTIONS_BY_KEY[key].id, 'keyboard')
})

const clock = new THREE.Clock()
let elapsed = 0

function animate() {
  const delta = Math.min(clock.getDelta(), 0.033)
  elapsed += delta
  state.update(delta)
  dummy.update(delta, elapsed)
  world.update(delta, dummy)
  world.render()
  requestAnimationFrame(animate)
}

animate()
