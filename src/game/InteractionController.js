import * as THREE from 'three'

export class InteractionController {
  constructor({ world, dummy, events }) {
    this.world = world
    this.dummy = dummy
    this.events = events
    this.canvas = world.renderer.domElement
    this.raycaster = new THREE.Raycaster()
    this.pointer = new THREE.Vector2()
    this.pointerDown = null
    this.lastPointer = null
    this.#bind()
  }

  #getHit(event) {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
    this.raycaster.setFromCamera(this.pointer, this.world.camera)
    return this.raycaster.intersectObjects(this.dummy.parts, true)[0]
  }

  #bind() {
    this.canvas.addEventListener('pointerdown', (event) => {
      const hit = this.#getHit(event)
      if (!hit) return
      this.canvas.setPointerCapture(event.pointerId)
      this.pointerDown = { x: event.clientX, y: event.clientY, time: performance.now(), hit }
      this.lastPointer = { x: event.clientX, y: event.clientY }
      this.canvas.classList.add('grabbing')
    })

    this.canvas.addEventListener('pointermove', (event) => {
      const hit = this.#getHit(event)
      this.canvas.classList.toggle('targeting', Boolean(hit))
      if (!this.pointerDown) return
      const deltaX = event.clientX - this.lastPointer.x
      const deltaY = event.clientY - this.lastPointer.y
      this.dummy.drag(this.pointerDown.hit.object.userData.part, deltaX, deltaY)
      this.lastPointer = { x: event.clientX, y: event.clientY }
    })

    this.canvas.addEventListener('pointerup', (event) => this.#release(event))
    this.canvas.addEventListener('pointercancel', () => this.#cancel())
  }

  #release(event) {
    if (!this.pointerDown) return
    const deltaX = event.clientX - this.pointerDown.x
    const deltaY = event.clientY - this.pointerDown.y
    const distance = Math.hypot(deltaX, deltaY)
    const elapsed = Math.max(40, performance.now() - this.pointerDown.time)
    const power = Math.min(2.4, 0.7 + (distance / elapsed) * 1.6)
    const side = distance > 12 ? Math.sign(deltaX || 1) : (this.pointerDown.hit.point.x >= 0 ? 1 : -1)
    this.events.emit('impact:request', {
      part: this.pointerDown.hit.object.userData.part,
      side,
      power,
      point: this.pointerDown.hit.point,
      screen: { x: event.clientX, y: event.clientY },
      source: distance > 12 ? 'drag' : 'pointer',
    })
    this.#cancel()
  }

  #cancel() {
    this.pointerDown = null
    this.canvas.classList.remove('grabbing')
  }
}
