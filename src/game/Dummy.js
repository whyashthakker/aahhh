import * as THREE from 'three'

const BODY_COLOR = 0x7654c8

export class Dummy {
  constructor(renderer) {
    this.group = new THREE.Group()
    this.group.position.y = 0.05
    this.parts = []
    this.limbPivots = {}
    this.state = {
      rotation: new THREE.Vector3(),
      angularVelocity: new THREE.Vector3(),
      offset: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      headRotation: new THREE.Vector3(),
      headVelocity: new THREE.Vector3(),
      limbVelocity: { leftArm: 0, rightArm: 0, leftLeg: 0, rightLeg: 0 },
    }
    this.#build(renderer)
  }

  #registerPart(object, part) {
    object.userData.part = part
    this.parts.push(object)
    object.traverse((child) => {
      child.userData.part = part
      child.castShadow = true
      child.receiveShadow = true
    })
    return object
  }

  #capsule(radius, length, material, radial = 20) {
    return new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 8, radial), material)
  }

  #build(renderer) {
    const bodyMat = new THREE.MeshStandardMaterial({ color: BODY_COLOR, roughness: 0.58, metalness: 0.04 })
    const bodyLightMat = new THREE.MeshStandardMaterial({ color: 0x9576df, roughness: 0.52 })
    const jointMat = new THREE.MeshStandardMaterial({ color: 0x4a327e, roughness: 0.55 })
    const faceBackingMat = new THREE.MeshStandardMaterial({ color: 0xefe7dc, roughness: 0.75 })
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x2f2450, roughness: 0.7 })

    const torso = this.#registerPart(this.#capsule(0.67, 1.05, bodyMat, 28), 'torso')
    torso.scale.set(1, 1, 0.75)
    torso.position.y = 0.32
    this.group.add(torso)

    const chestPatch = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.5, 6, 20), bodyLightMat)
    chestPatch.scale.set(1.25, 1, 0.18)
    chestPatch.position.set(0, 0.38, 0.58)
    chestPatch.userData.part = 'torso'
    chestPatch.castShadow = true
    torso.add(chestPatch)
    this.parts.push(chestPatch)

    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.085, 12, 32), jointMat)
    belt.rotation.x = Math.PI / 2
    belt.scale.z = 0.74
    belt.position.y = -0.58
    belt.userData.part = 'torso'
    torso.add(belt)

    this.headPivot = new THREE.Group()
    this.headPivot.position.y = 1.62
    this.group.add(this.headPivot)

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.35, 20), jointMat)
    neck.position.y = -0.29
    neck.castShadow = true
    this.headPivot.add(neck)

    const head = this.#registerPart(new THREE.Mesh(new THREE.SphereGeometry(0.69, 36, 28), faceBackingMat), 'head')
    head.scale.z = 0.86
    this.headPivot.add(head)

    this.faceCanvas = document.createElement('canvas')
    this.faceCanvas.width = 512
    this.faceCanvas.height = 512
    this.faceContext = this.faceCanvas.getContext('2d')
    this.#drawDefaultFace()

    this.faceTexture = new THREE.CanvasTexture(this.faceCanvas)
    this.faceTexture.colorSpace = THREE.SRGBColorSpace
    this.faceTexture.anisotropy = renderer.capabilities.getMaxAnisotropy()

    const facePlate = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 64),
      new THREE.MeshStandardMaterial({ map: this.faceTexture, roughness: 0.72, side: THREE.DoubleSide }),
    )
    facePlate.position.z = 0.605
    facePlate.userData.part = 'head'
    head.add(facePlate)
    this.parts.push(facePlate)

    const earGeometry = new THREE.SphereGeometry(0.16, 16, 12)
    ;[-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(earGeometry, faceBackingMat)
      ear.position.set(side * 0.65, 0, 0)
      ear.scale.set(0.65, 1, 0.7)
      ear.userData.part = 'head'
      head.add(ear)
      this.parts.push(ear)
    })

    this.leftArm = this.#addLimb('leftArm', -1, 0.92, false, bodyMat, bodyLightMat, jointMat, darkMat)
    this.rightArm = this.#addLimb('rightArm', 1, 0.92, false, bodyMat, bodyLightMat, jointMat, darkMat)
    this.leftLeg = this.#addLimb('leftLeg', -1, -0.55, true, bodyMat, bodyLightMat, jointMat, darkMat)
    this.rightLeg = this.#addLimb('rightLeg', 1, -0.55, true, bodyMat, bodyLightMat, jointMat, darkMat)
  }

  #drawDefaultFace() {
    const context = this.faceContext
    const gradient = context.createRadialGradient(210, 170, 30, 256, 256, 270)
    gradient.addColorStop(0, '#fff8ed')
    gradient.addColorStop(1, '#d6c7b6')
    context.fillStyle = gradient
    context.fillRect(0, 0, 512, 512)
    context.fillStyle = '#40334a'
    context.beginPath(); context.arc(176, 220, 18, 0, Math.PI * 2); context.fill()
    context.beginPath(); context.arc(336, 220, 18, 0, Math.PI * 2); context.fill()
    context.strokeStyle = '#40334a'
    context.lineWidth = 18
    context.lineCap = 'round'
    context.beginPath(); context.arc(256, 270, 94, 0.25, Math.PI - 0.25); context.stroke()
    context.fillStyle = 'rgba(232,120,130,.28)'
    context.beginPath(); context.arc(130, 292, 34, 0, Math.PI * 2); context.fill()
    context.beginPath(); context.arc(382, 292, 34, 0, Math.PI * 2); context.fill()
  }

  #addLimb(name, side, upperY, isLeg, bodyMat, bodyLightMat, jointMat, darkMat) {
    const pivot = new THREE.Group()
    pivot.position.set(side * (isLeg ? 0.42 : 0.79), upperY, 0)
    this.group.add(pivot)
    this.limbPivots[name] = pivot

    const upper = this.#registerPart(this.#capsule(isLeg ? 0.23 : 0.2, isLeg ? 0.75 : 0.64, bodyMat), name)
    upper.position.y = isLeg ? -0.47 : -0.4
    upper.rotation.z = side * (isLeg ? -0.06 : -0.16)
    pivot.add(upper)

    const lowerPivot = new THREE.Group()
    lowerPivot.position.set(side * (isLeg ? 0.05 : 0.1), isLeg ? -0.94 : -0.82, 0)
    pivot.add(lowerPivot)

    const joint = new THREE.Mesh(new THREE.SphereGeometry(isLeg ? 0.24 : 0.21, 18, 14), jointMat)
    joint.userData.part = name
    joint.castShadow = true
    lowerPivot.add(joint)
    this.parts.push(joint)

    const lower = this.#registerPart(this.#capsule(isLeg ? 0.21 : 0.18, isLeg ? 0.68 : 0.59, bodyLightMat), name)
    lower.position.y = isLeg ? -0.48 : -0.42
    lowerPivot.add(lower)

    const end = new THREE.Mesh(
      new THREE.SphereGeometry(isLeg ? 0.29 : 0.25, 18, 14),
      isLeg ? darkMat : bodyLightMat,
    )
    end.scale.set(isLeg ? 0.9 : 1, isLeg ? 0.62 : 1, isLeg ? 1.5 : 1)
    end.position.set(0, isLeg ? -0.9 : -0.78, isLeg ? 0.12 : 0)
    end.userData.part = name
    end.castShadow = true
    lowerPivot.add(end)
    this.parts.push(end)
    return { pivot, lowerPivot }
  }

  setFaceImage(image) {
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    const sourceX = (image.naturalWidth - side) / 2
    const sourceY = (image.naturalHeight - side) / 2
    const context = this.faceContext
    context.clearRect(0, 0, 512, 512)
    context.drawImage(image, sourceX, sourceY, side, side, 0, 0, 512, 512)
    const vignette = context.createRadialGradient(256, 240, 160, 256, 256, 320)
    vignette.addColorStop(0.58, 'rgba(255,255,255,0)')
    vignette.addColorStop(1, 'rgba(50,35,70,.22)')
    context.fillStyle = vignette
    context.fillRect(0, 0, 512, 512)
    this.faceTexture.needsUpdate = true
  }

  impact(part = 'torso', side = 1, power = 1) {
    const state = this.state
    state.angularVelocity.z += -side * 1.25 * power
    state.angularVelocity.x += (Math.random() - 0.35) * 0.7 * power
    state.angularVelocity.y += side * 0.36 * power
    state.velocity.x += -side * 0.55 * power
    state.velocity.z -= 0.16 * power
    if (part === 'head') {
      state.headVelocity.z += -side * 2.6 * power
      state.headVelocity.y += side * 1.7 * power
    } else if (part in state.limbVelocity) {
      state.limbVelocity[part] += -side * 2.5 * power
    } else {
      state.headVelocity.z += -side * 0.75 * power
    }
  }

  reset() {
    const state = this.state
    state.angularVelocity.set(0, 0, 0)
    state.velocity.set(0, 0, 0)
    state.headVelocity.set(0, 0, 0)
    state.rotation.set(0, 0, 0)
    state.offset.set(0, 0, 0)
    state.headRotation.set(0, 0, 0)
    Object.keys(state.limbVelocity).forEach((key) => { state.limbVelocity[key] = 0 })
  }

  getWorldPoint(part) {
    this.group.updateMatrixWorld(true)
    const local = part === 'head' ? new THREE.Vector3(0, 1.65, 0.65) : new THREE.Vector3(0, 0.35, 0.65)
    return local.applyMatrix4(this.group.matrixWorld)
  }

  update(delta, elapsed) {
    const state = this.state
    ;['x', 'y', 'z'].forEach((axis) => {
      ;[state.rotation[axis], state.angularVelocity[axis]] = spring(state.rotation[axis], state.angularVelocity[axis], 15, 0.89, delta)
      ;[state.offset[axis], state.velocity[axis]] = spring(state.offset[axis], state.velocity[axis], 18, 0.86, delta)
      ;[state.headRotation[axis], state.headVelocity[axis]] = spring(state.headRotation[axis], state.headVelocity[axis], 25, 0.84, delta)
    })

    Object.keys(state.limbVelocity).forEach((key) => {
      const [next, velocity] = spring(this.limbPivots[key].rotation.z, state.limbVelocity[key], 19, 0.86, delta)
      this.limbPivots[key].rotation.z = next
      state.limbVelocity[key] = velocity
    })

    const idle = Math.sin(elapsed * 2.1) * 0.018
    this.group.rotation.set(state.rotation.x, state.rotation.y, state.rotation.z + idle)
    this.group.position.set(state.offset.x, 0.05 + state.offset.y + Math.sin(elapsed * 1.65) * 0.015, state.offset.z)
    this.headPivot.rotation.set(state.headRotation.x, state.headRotation.y, state.headRotation.z)
    this.leftArm.lowerPivot.rotation.z = -0.07 + Math.sin(elapsed * 2.2) * 0.025
    this.rightArm.lowerPivot.rotation.z = 0.07 - Math.sin(elapsed * 2.2) * 0.025
    this.leftLeg.lowerPivot.rotation.z = 0.02
    this.rightLeg.lowerPivot.rotation.z = -0.02
  }
}

function spring(value, velocity, stiffness, damping, delta) {
  velocity += (-value * stiffness) * delta
  velocity *= Math.pow(damping, delta * 60)
  value += velocity * delta
  return [value, velocity]
}
