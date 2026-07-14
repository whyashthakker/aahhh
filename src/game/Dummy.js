import * as THREE from 'three'

const UP = new THREE.Vector3(0, 1, 0)
const FLOOR_Y = -1.97

export class Dummy {
  constructor(renderer) {
    this.group = new THREE.Group()
    this.parts = []
    this.nodes = {}
    this.constraints = []
    this.segments = []
    this.joints = []
    this.time = 0
    this.#createMaterials()
    this.#createRig()
    this.#createBody(renderer)
  }

  #createMaterials() {
    const fabric = this.#createFabricTexture()
    this.materials = {
      body: new THREE.MeshPhysicalMaterial({ color: 0x6f46c7, roughness: 0.76, sheen: 0.85, sheenColor: new THREE.Color(0xcbb7ff), bumpMap: fabric, bumpScale: 0.022 }),
      bodyLight: new THREE.MeshPhysicalMaterial({ color: 0xa889ed, roughness: 0.72, sheen: 0.75, sheenColor: new THREE.Color(0xe3d8ff), bumpMap: fabric, bumpScale: 0.018 }),
      joint: new THREE.MeshStandardMaterial({ color: 0x3e286f, roughness: 0.38, metalness: 0.08 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x2b1d50, roughness: 0.62 }),
      face: new THREE.MeshPhysicalMaterial({ color: 0xe7d5c1, roughness: 0.74, sheen: 0.4, sheenColor: new THREE.Color(0xffffff), bumpMap: fabric, bumpScale: 0.01 }),
      stitch: new THREE.MeshStandardMaterial({ color: 0xd9ff61, roughness: 0.42, emissive: 0x304500, emissiveIntensity: 0.22 }),
    }
  }

  #createFabricTexture() {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext('2d')
    context.fillStyle = '#bdbdbd'
    context.fillRect(0, 0, 128, 128)
    for (let index = 0; index < 128; index += 2) {
      context.strokeStyle = index % 4 ? 'rgba(255,255,255,.16)' : 'rgba(20,20,20,.12)'
      context.lineWidth = 1
      context.beginPath(); context.moveTo(0, index); context.lineTo(128, index + 16); context.stroke()
      context.beginPath(); context.moveTo(index, 0); context.lineTo(index + 16, 128); context.stroke()
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(5, 5)
    return texture
  }

  #addNode(name, x, y, z, spring = 32, drag = 0.925) {
    const rest = new THREE.Vector3(x, y, z)
    this.nodes[name] = {
      name,
      position: rest.clone(),
      previous: rest.clone(),
      rest,
      spring,
      drag,
    }
  }

  #link(a, b, stiffness = 1) {
    const nodeA = this.nodes[a]
    const nodeB = this.nodes[b]
    this.constraints.push({ a, b, length: nodeA.rest.distanceTo(nodeB.rest), stiffness })
  }

  #createRig() {
    this.#addNode('pelvis', 0, -0.42, 0, 44)
    this.#addNode('chest', 0, 0.56, 0, 25)
    this.#addNode('head', 0, 1.65, 0.02, 15, 0.935)
    this.#addNode('leftShoulder', -0.72, 0.86, 0, 20)
    this.#addNode('leftElbow', -0.98, 0.15, 0.01, 11, 0.94)
    this.#addNode('leftHand', -0.9, -0.57, 0.04, 7, 0.945)
    this.#addNode('rightShoulder', 0.72, 0.86, 0, 20)
    this.#addNode('rightElbow', 0.98, 0.15, 0.01, 11, 0.94)
    this.#addNode('rightHand', 0.9, -0.57, 0.04, 7, 0.945)
    this.#addNode('leftHip', -0.34, -0.63, 0, 35)
    this.#addNode('leftKnee', -0.39, -1.28, 0.02, 28)
    this.#addNode('leftFoot', -0.42, -1.88, 0.2, 82, 0.9)
    this.#addNode('rightHip', 0.34, -0.63, 0, 35)
    this.#addNode('rightKnee', 0.39, -1.28, 0.02, 28)
    this.#addNode('rightFoot', 0.42, -1.88, 0.2, 82, 0.9)

    ;[
      ['pelvis', 'chest', 1], ['chest', 'head', 0.98],
      ['chest', 'leftShoulder', 1], ['leftShoulder', 'leftElbow', 1], ['leftElbow', 'leftHand', 1],
      ['chest', 'rightShoulder', 1], ['rightShoulder', 'rightElbow', 1], ['rightElbow', 'rightHand', 1],
      ['pelvis', 'leftHip', 1], ['leftHip', 'leftKnee', 1], ['leftKnee', 'leftFoot', 1],
      ['pelvis', 'rightHip', 1], ['rightHip', 'rightKnee', 1], ['rightKnee', 'rightFoot', 1],
      ['leftShoulder', 'rightShoulder', 0.9], ['leftHip', 'rightHip', 0.9],
      ['leftShoulder', 'pelvis', 0.32], ['rightShoulder', 'pelvis', 0.32],
    ].forEach(([a, b, stiffness]) => this.#link(a, b, stiffness))
  }

  #register(mesh, part) {
    mesh.userData.part = part
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.parts.push(mesh)
    return mesh
  }

  #createSegment(part, a, b, radius, material, tapered = false) {
    const innerLength = Math.max(0.04, 1 - radius * 2)
    const baseLength = innerLength + radius * 2
    const geometry = new THREE.CapsuleGeometry(radius, innerLength, 8, tapered ? 24 : 20)
    const mesh = this.#register(new THREE.Mesh(geometry, material), part)
    this.group.add(mesh)
    this.segments.push({ mesh, a, b, baseLength })
    return mesh
  }

  #createJoint(part, node, radius, material, scale = null) {
    const mesh = this.#register(new THREE.Mesh(new THREE.SphereGeometry(radius, 24, 18), material), part)
    if (scale) mesh.scale.copy(scale)
    this.group.add(mesh)
    this.joints.push({ mesh, node })
    return mesh
  }

  #createBody(renderer) {
    const { body, bodyLight, joint, dark, face, stitch } = this.materials
    const torsoMesh = this.#createSegment('torso', 'pelvis', 'chest', 0.5, body, true)
    this.#createSegment('head', 'chest', 'head', 0.19, joint, true)
    this.#createSegment('leftArm', 'leftShoulder', 'leftElbow', 0.2, body)
    this.#createSegment('leftArm', 'leftElbow', 'leftHand', 0.17, bodyLight, true)
    this.#createSegment('rightArm', 'rightShoulder', 'rightElbow', 0.2, body)
    this.#createSegment('rightArm', 'rightElbow', 'rightHand', 0.17, bodyLight, true)
    this.#createSegment('leftLeg', 'leftHip', 'leftKnee', 0.24, body)
    this.#createSegment('leftLeg', 'leftKnee', 'leftFoot', 0.21, bodyLight, true)
    this.#createSegment('rightLeg', 'rightHip', 'rightKnee', 0.24, body)
    this.#createSegment('rightLeg', 'rightKnee', 'rightFoot', 0.21, bodyLight, true)

    ;[-1, 1].forEach((side) => {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.58, 0.035), bodyLight)
      strap.position.set(side * 0.27, 0.04, 0.445)
      strap.rotation.z = side * -0.06
      strap.castShadow = true
      torsoMesh.add(strap)
      for (let stitchIndex = 0; stitchIndex < 4; stitchIndex += 1) {
        const stitchMark = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.014, 0.018), stitch)
        stitchMark.position.set(side * 0.27, -0.18 + stitchIndex * 0.12, 0.47)
        torsoMesh.add(stitchMark)
      }
    })
    const waistBand = new THREE.Mesh(new THREE.TorusGeometry(0.445, 0.052, 10, 36), joint)
    waistBand.rotation.x = Math.PI / 2
    waistBand.position.y = -0.38
    waistBand.scale.z = 0.82
    torsoMesh.add(waistBand)

    const badge = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.13, 0.035), stitch)
    badge.position.set(0, 0.23, 0.515)
    badge.rotation.z = -0.07
    torsoMesh.add(badge)

    this.#createJoint('torso', 'pelvis', 0.5, body, new THREE.Vector3(1.08, 0.72, 0.83))
    this.#createJoint('leftArm', 'leftShoulder', 0.25, joint)
    this.#createJoint('leftArm', 'leftElbow', 0.215, joint)
    this.#createJoint('leftArm', 'leftHand', 0.285, bodyLight, new THREE.Vector3(0.86, 1.08, 0.82))
    this.#createJoint('rightArm', 'rightShoulder', 0.25, joint)
    this.#createJoint('rightArm', 'rightElbow', 0.215, joint)
    this.#createJoint('rightArm', 'rightHand', 0.285, bodyLight, new THREE.Vector3(0.86, 1.08, 0.82))
    this.#createJoint('leftLeg', 'leftHip', 0.27, joint)
    this.#createJoint('leftLeg', 'leftKnee', 0.245, joint)
    this.#createJoint('leftLeg', 'leftFoot', 0.31, dark, new THREE.Vector3(0.9, 0.58, 1.55))
    this.#createJoint('rightLeg', 'rightHip', 0.27, joint)
    this.#createJoint('rightLeg', 'rightKnee', 0.245, joint)
    this.#createJoint('rightLeg', 'rightFoot', 0.31, dark, new THREE.Vector3(0.9, 0.58, 1.55))

    this.headGroup = new THREE.Group()
    this.group.add(this.headGroup)
    const headMesh = this.#register(new THREE.Mesh(new THREE.SphereGeometry(0.72, 40, 32), face), 'head')
    headMesh.scale.z = 0.9
    this.headGroup.add(headMesh)

    const earGeometry = new THREE.SphereGeometry(0.16, 18, 14)
    ;[-1, 1].forEach((side) => {
      const ear = this.#register(new THREE.Mesh(earGeometry, face), 'head')
      ear.position.set(side * 0.69, 0, 0)
      ear.scale.set(0.7, 1, 0.72)
      this.headGroup.add(ear)
    })

    this.faceCanvas = document.createElement('canvas')
    this.faceCanvas.width = 512
    this.faceCanvas.height = 512
    this.faceContext = this.faceCanvas.getContext('2d')
    this.#drawDefaultFace()
    this.faceTexture = new THREE.CanvasTexture(this.faceCanvas)
    this.faceTexture.colorSpace = THREE.SRGBColorSpace
    this.faceTexture.anisotropy = renderer.capabilities.getMaxAnisotropy()

    const curvedFace = new THREE.Mesh(
      new THREE.SphereGeometry(0.725, 36, 24, Math.PI / 2 - 0.82, 1.64, 0.32, Math.PI - 0.64),
      new THREE.MeshStandardMaterial({
        map: this.faceTexture,
        transparent: true,
        roughness: 0.76,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    )
    curvedFace.scale.z = 0.91
    this.#register(curvedFace, 'head')
    this.headGroup.add(curvedFace)

    const headSeamCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.42, 0.56, 0.42),
      new THREE.Vector3(-0.64, 0.18, 0.34),
      new THREE.Vector3(-0.65, -0.2, 0.32),
      new THREE.Vector3(-0.42, -0.57, 0.42),
    ])
    const headSeam = new THREE.Mesh(new THREE.TubeGeometry(headSeamCurve, 20, 0.017, 7, false), stitch)
    headSeam.castShadow = true
    this.headGroup.add(headSeam)

    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.065, 10, 28), stitch)
    collar.rotation.x = Math.PI / 2
    collar.position.y = -0.72
    collar.userData.part = 'head'
    this.headGroup.add(collar)

    this.#syncMeshes()
  }

  #drawDefaultFace() {
    const context = this.faceContext
    context.clearRect(0, 0, 512, 512)
    context.fillStyle = '#f7ead9'
    context.fillRect(0, 0, 512, 512)
    context.fillStyle = '#3f3151'
    context.beginPath(); context.arc(174, 220, 18, 0, Math.PI * 2); context.fill()
    context.beginPath(); context.arc(338, 220, 18, 0, Math.PI * 2); context.fill()
    context.strokeStyle = '#3f3151'
    context.lineWidth = 18
    context.lineCap = 'round'
    context.beginPath(); context.arc(256, 278, 88, 0.2, Math.PI - 0.2); context.stroke()
    this.#featherFace()
  }

  #featherFace() {
    const context = this.faceContext
    context.save()
    context.globalCompositeOperation = 'destination-in'
    const mask = context.createRadialGradient(256, 250, 155, 256, 256, 260)
    mask.addColorStop(0, 'rgba(255,255,255,1)')
    mask.addColorStop(0.72, 'rgba(255,255,255,.98)')
    mask.addColorStop(1, 'rgba(255,255,255,0)')
    context.fillStyle = mask
    context.fillRect(0, 0, 512, 512)
    context.restore()
  }

  setFaceImage(image) {
    const side = Math.min(image.naturalWidth, image.naturalHeight)
    const sourceX = (image.naturalWidth - side) / 2
    const sourceY = (image.naturalHeight - side) / 2
    const context = this.faceContext
    context.clearRect(0, 0, 512, 512)
    context.globalCompositeOperation = 'source-over'
    context.drawImage(image, sourceX, sourceY, side, side, 0, 0, 512, 512)
    this.#featherFace()
    this.faceTexture.needsUpdate = true
  }

  #nodesForPart(part) {
    const mapping = {
      head: ['head', 'chest', 'leftShoulder', 'rightShoulder'],
      torso: ['chest', 'pelvis', 'leftShoulder', 'rightShoulder'],
      leftArm: ['leftHand', 'leftElbow', 'leftShoulder'],
      rightArm: ['rightHand', 'rightElbow', 'rightShoulder'],
      leftLeg: ['leftKnee', 'leftHip', 'leftFoot'],
      rightLeg: ['rightKnee', 'rightHip', 'rightFoot'],
    }
    return mapping[part] ?? mapping.torso
  }

  impact(part = 'torso', side = 1, power = 1) {
    const targets = this.#nodesForPart(part)
    targets.forEach((name, index) => {
      const node = this.nodes[name]
      const falloff = Math.max(0.22, 1 - index * 0.2)
      const impulse = new THREE.Vector3(
        -side * (0.28 + Math.random() * 0.08),
        (0.07 + Math.random() * 0.15) * (part === 'head' ? 1 : -0.15),
        0.12 + Math.random() * 0.1,
      ).multiplyScalar(power * falloff)
      node.previous.sub(impulse)
      node.position.addScaledVector(impulse, 0.18)
    })

    // A hard hit loosens the opposite side too, producing the characteristic
    // full-body whip instead of moving only the selected mesh.
    const oppositeHand = side > 0 ? this.nodes.leftHand : this.nodes.rightHand
    oppositeHand.previous.x += side * 0.18 * power
    oppositeHand.previous.y += 0.12 * power
  }

  drag(part, deltaX, deltaY) {
    const primary = this.nodes[this.#nodesForPart(part)[0]]
    primary.position.x += deltaX * 0.012
    primary.position.y -= deltaY * 0.012
    primary.position.z += Math.abs(deltaX) * 0.002
  }

  reset() {
    Object.values(this.nodes).forEach((node) => {
      node.position.copy(node.rest)
      node.previous.copy(node.rest)
    })
    this.#syncMeshes()
  }

  getWorldPoint(part) {
    const nodeName = this.#nodesForPart(part)[0]
    return this.group.localToWorld(this.nodes[nodeName].position.clone())
  }

  #solveConstraints() {
    for (let iteration = 0; iteration < 8; iteration += 1) {
      this.constraints.forEach((constraint) => {
        const a = this.nodes[constraint.a]
        const b = this.nodes[constraint.b]
        const delta = new THREE.Vector3().subVectors(b.position, a.position)
        const distance = Math.max(delta.length(), 0.0001)
        const correction = delta.multiplyScalar(((distance - constraint.length) / distance) * 0.5 * constraint.stiffness)
        a.position.add(correction)
        b.position.sub(correction)
      })

      Object.values(this.nodes).forEach((node) => {
        if (node.position.y < FLOOR_Y) node.position.y = FLOOR_Y
        node.position.x = THREE.MathUtils.clamp(node.position.x, -3.2, 3.2)
        node.position.z = THREE.MathUtils.clamp(node.position.z, -1.5, 1.8)
      })
    }
  }

  #syncSegment({ mesh, a, b, baseLength }) {
    const start = this.nodes[a].position
    const end = this.nodes[b].position
    const direction = new THREE.Vector3().subVectors(end, start)
    const length = Math.max(direction.length(), 0.001)
    mesh.position.copy(start).add(end).multiplyScalar(0.5)
    mesh.quaternion.setFromUnitVectors(UP, direction.normalize())
    mesh.scale.y = length / baseLength
  }

  #syncMeshes() {
    this.segments.forEach((segment) => this.#syncSegment(segment))
    this.joints.forEach(({ mesh, node }) => mesh.position.copy(this.nodes[node].position))
    this.headGroup.position.copy(this.nodes.head.position)
    const headDirection = new THREE.Vector3().subVectors(this.nodes.head.position, this.nodes.chest.position).normalize()
    this.headGroup.quaternion.setFromUnitVectors(UP, headDirection)
  }

  update(delta, elapsed) {
    this.time = elapsed
    const frame = Math.min(delta * 60, 1.6)
    Object.values(this.nodes).forEach((node) => {
      const velocity = new THREE.Vector3().subVectors(node.position, node.previous).multiplyScalar(Math.pow(node.drag, frame))
      node.previous.copy(node.position)
      node.position.add(velocity)
      node.position.y -= 0.0038 * frame * frame
      const springForce = new THREE.Vector3().subVectors(node.rest, node.position)
      node.position.addScaledVector(springForce, node.spring * delta * delta)
    })

    // A tiny living idle keeps the silhouette from freezing when untouched.
    this.nodes.chest.position.y += Math.sin(elapsed * 2) * 0.0008
    this.nodes.head.position.x += Math.sin(elapsed * 1.35) * 0.0007
    this.#solveConstraints()
    this.#syncMeshes()
  }
}
