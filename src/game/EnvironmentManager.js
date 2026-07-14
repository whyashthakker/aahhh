import * as THREE from 'three'

const ENVIRONMENTS = {
  studio: { background: 0xeae5f8, fog: 0xede9ff, density: 0.045, key: 0xffffff, rim: 0xbca5ff, rimIntensity: 24 },
  office: { background: 0xb7c5d5, fog: 0xc7d1dd, density: 0.024, key: 0xfff0d0, rim: 0x83bfff, rimIntensity: 22 },
  garden: { background: 0xccecff, fog: 0xd9f2e2, density: 0.019, key: 0xfff1c2, rim: 0x83ddaa, rimIntensity: 17 },
}

export class EnvironmentManager {
  constructor(scene, lights) {
    this.scene = scene
    this.lights = lights
    this.groups = new Map()
    this.animated = new Map()
    this.current = 'studio'
    this.#createStudio()
    this.#createOffice()
    this.#createGarden()
    this.set('studio')
  }

  #material(color, options = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...options })
  }

  #mesh(geometry, material, position, options = {}) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(...position)
    if (options.rotation) mesh.rotation.set(...options.rotation)
    if (options.scale) mesh.scale.set(...options.scale)
    mesh.castShadow = options.castShadow ?? true
    mesh.receiveShadow = options.receiveShadow ?? true
    return mesh
  }

  #addGroup(id) {
    const group = new THREE.Group()
    group.name = `environment-${id}`
    this.scene.add(group)
    this.groups.set(id, group)
    this.animated.set(id, [])
    return group
  }

  #createStudio() {
    const group = this.#addGroup('studio')
    const purple = this.#material(0x8e73d6, { roughness: 0.62, metalness: 0.08 })
    const platform = this.#mesh(new THREE.CylinderGeometry(2.55, 2.8, 0.18, 64), purple, [0, -2.15, 0])
    group.add(platform)

    const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xc9bdf2, transparent: true, opacity: 0.86 })
    const floorRing = this.#mesh(new THREE.TorusGeometry(2.34, 0.028, 8, 80), lineMaterial, [0, -2.045, 0], { rotation: [Math.PI / 2, 0, 0], castShadow: false })
    group.add(floorRing)
    for (let index = 0; index < 3; index += 1) {
      const ring = this.#mesh(
        new THREE.RingGeometry(0.7 + index * 0.57, 0.72 + index * 0.57, 64),
        new THREE.MeshBasicMaterial({ color: 0xb5a0e8, transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
        [0, -2.04, 0],
        { rotation: [-Math.PI / 2, 0, 0], castShadow: false },
      )
      group.add(ring)
    }

    const halo = this.#mesh(
      new THREE.TorusGeometry(2.72, 0.035, 12, 96),
      new THREE.MeshBasicMaterial({ color: 0x9a7ce8, transparent: true, opacity: 0.35 }),
      [0, 0.18, -2.85],
      { castShadow: false },
    )
    group.add(halo)
    this.animated.get('studio').push((time) => { halo.rotation.z = time * 0.045 })

    const acid = new THREE.MeshStandardMaterial({ color: 0xd9ff61, emissive: 0x5c7900, emissiveIntensity: 1.2 })
    ;[-1, 1].forEach((side) => {
      const pillar = this.#mesh(new THREE.CapsuleGeometry(0.08, 2.6, 6, 12), acid, [side * 3.35, 0.05, -2.5], { castShadow: false })
      pillar.rotation.z = side * -0.12
      group.add(pillar)
    })

    for (let index = 0; index < 7; index += 1) {
      const orb = this.#mesh(
        new THREE.IcosahedronGeometry(0.045 + (index % 3) * 0.02, 1),
        new THREE.MeshBasicMaterial({ color: index % 2 ? 0xffffff : 0xd9ff61 }),
        [-2.7 + index * 0.9, 2.3 + Math.sin(index) * 0.55, -2.3],
        { castShadow: false },
      )
      group.add(orb)
      const baseY = orb.position.y
      this.animated.get('studio').push((time) => {
        orb.position.y = baseY + Math.sin(time * 1.2 + index) * 0.13
        orb.rotation.y = time * (0.3 + index * 0.02)
      })
    }
  }

  #createOffice() {
    const group = this.#addGroup('office')
    const floor = this.#mesh(
      new THREE.BoxGeometry(12, 0.22, 8),
      this.#material(0x8e7969, { roughness: 0.83 }),
      [0, -2.18, -0.2],
    )
    group.add(floor)
    for (let index = -6; index <= 6; index += 1) {
      const seam = this.#mesh(
        new THREE.BoxGeometry(0.012, 0.008, 7.6),
        new THREE.MeshBasicMaterial({ color: 0x604f44, transparent: true, opacity: 0.3 }),
        [index * 0.75, -2.06, -0.2],
        { castShadow: false },
      )
      group.add(seam)
    }

    const wall = this.#mesh(new THREE.BoxGeometry(12, 6.5, 0.18), this.#material(0xd9dde0), [0, 0.45, -3.35])
    group.add(wall)
    const windowMat = new THREE.MeshStandardMaterial({ color: 0x6b8aa5, emissive: 0x365a78, emissiveIntensity: 0.65, roughness: 0.25 })
    ;[-3.65, 0, 3.65].forEach((x, windowIndex) => {
      const pane = this.#mesh(new THREE.BoxGeometry(2.75, 2.72, 0.06), windowMat, [x, 1.18, -3.23], { castShadow: false })
      group.add(pane)
      const frameMat = this.#material(0x3a4650, { metalness: 0.35, roughness: 0.4 })
      ;[-1, 1].forEach((side) => {
        group.add(this.#mesh(new THREE.BoxGeometry(0.07, 2.86, 0.1), frameMat, [x + side * 1.39, 1.18, -3.16]))
      })
      group.add(this.#mesh(new THREE.BoxGeometry(2.82, 0.07, 0.1), frameMat, [x, 1.18, -3.16]))
      for (let tower = 0; tower < 5; tower += 1) {
        const height = 0.35 + ((tower * 7 + windowIndex * 3) % 6) * 0.17
        const building = this.#mesh(
          new THREE.BoxGeometry(0.35, height, 0.035),
          new THREE.MeshBasicMaterial({ color: tower % 2 ? 0x24394d : 0x314c61 }),
          [x - 1 + tower * 0.48, -0.16 + height / 2, -3.11],
          { castShadow: false },
        )
        group.add(building)
      }
    })

    const deskMat = this.#material(0x6a4e3b, { roughness: 0.58 })
    const metal = this.#material(0x303941, { metalness: 0.45, roughness: 0.38 })
    const desk = this.#mesh(new THREE.BoxGeometry(2.45, 0.16, 0.92), deskMat, [-3.0, -1.16, -1.15])
    group.add(desk)
    ;[-1, 1].forEach((side) => group.add(this.#mesh(new THREE.BoxGeometry(0.12, 0.92, 0.12), metal, [-3 + side * 0.98, -1.61, -1.15])))
    const screen = this.#mesh(
      new THREE.BoxGeometry(0.95, 0.62, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x17272d, emissive: 0x4bd6bf, emissiveIntensity: 0.45 }),
      [-3, -0.65, -1.35],
      { rotation: [0, -0.08, 0] },
    )
    group.add(screen)
    group.add(this.#mesh(new THREE.BoxGeometry(0.08, 0.34, 0.08), metal, [-3, -1, -1.34]))

    const chair = new THREE.Group()
    chair.position.set(-3.05, -1.42, 0.05)
    chair.add(this.#mesh(new THREE.BoxGeometry(0.9, 0.12, 0.78), this.#material(0x34414c), [0, 0, 0]))
    chair.add(this.#mesh(new THREE.BoxGeometry(0.88, 0.92, 0.13), this.#material(0x34414c), [0, 0.48, 0.34], { rotation: [-0.12, 0, 0] }))
    group.add(chair)

    const cabinet = this.#mesh(new THREE.BoxGeometry(1.35, 2.05, 0.65), this.#material(0xb9b3a9), [3.45, -1.05, -2.65])
    group.add(cabinet)
    for (let row = 0; row < 3; row += 1) {
      group.add(this.#mesh(new THREE.BoxGeometry(1.12, 0.035, 0.06), metal, [3.45, -0.52 - row * 0.55, -2.29]))
    }

    this.#addPlant(group, [2.85, -1.68, -0.92], 0.75)
    ;[-2.8, 0, 2.8].forEach((x) => {
      const light = this.#mesh(
        new THREE.BoxGeometry(1.55, 0.06, 0.35),
        new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2ce, emissiveIntensity: 2.2 }),
        [x, 3.45, -0.8],
        { castShadow: false },
      )
      group.add(light)
    })

    const clockFace = this.#mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.07, 32), this.#material(0xf5f3ed), [2.1, 2.45, -3.18], { rotation: [Math.PI / 2, 0, 0] })
    group.add(clockFace)
    const hand = this.#mesh(new THREE.BoxGeometry(0.025, 0.24, 0.025), metal, [2.1, 2.55, -3.1], { castShadow: false })
    group.add(hand)
    this.animated.get('office').push((time) => { hand.rotation.z = -time * 0.06 })
  }

  #addPlant(group, position, scale = 1) {
    const pot = this.#mesh(new THREE.CylinderGeometry(0.3 * scale, 0.23 * scale, 0.5 * scale, 18), this.#material(0xb86647), position)
    group.add(pot)
    const stemMat = this.#material(0x356b3f)
    for (let index = 0; index < 7; index += 1) {
      const leaf = this.#mesh(
        new THREE.SphereGeometry(0.26 * scale, 14, 10),
        stemMat,
        [position[0] + Math.sin(index * 2.1) * 0.22 * scale, position[1] + 0.38 * scale + index * 0.1 * scale, position[2]],
        { scale: [0.48, 1, 0.35], rotation: [0, 0, Math.sin(index) * 0.7] },
      )
      group.add(leaf)
    }
  }

  #createGarden() {
    const group = this.#addGroup('garden')
    const grass = this.#material(0x70a95c, { roughness: 0.95 })
    group.add(this.#mesh(new THREE.CylinderGeometry(5.6, 5.8, 0.28, 64), grass, [0, -2.22, -0.2]))

    const pathMat = this.#material(0xc9b99c, { roughness: 0.92 })
    for (let index = 0; index < 9; index += 1) {
      const stone = this.#mesh(
        new THREE.CylinderGeometry(0.42 + (index % 2) * 0.08, 0.45, 0.055, 12),
        pathMat,
        [Math.sin(index * 0.7) * 0.28, -2.04, -1.2 - index * 0.48],
        { rotation: [0, index * 0.37, 0], scale: [1.25, 1, 0.72] },
      )
      group.add(stone)
    }

    ;[-3.65, 3.65].forEach((x, treeIndex) => {
      const trunk = this.#mesh(new THREE.CylinderGeometry(0.28, 0.4, 3.2, 14), this.#material(0x76523b), [x, -0.55, -2.3])
      group.add(trunk)
      for (let blob = 0; blob < 6; blob += 1) {
        const crown = this.#mesh(
          new THREE.IcosahedronGeometry(0.9 + (blob % 2) * 0.18, 2),
          this.#material(blob % 2 ? 0x4e914c : 0x69aa56),
          [x + Math.sin(blob * 2.4) * 0.62, 1.18 + Math.cos(blob * 1.7) * 0.45, -2.3 + Math.cos(blob) * 0.32],
        )
        group.add(crown)
        const baseY = crown.position.y
        this.animated.get('garden').push((time) => { crown.position.y = baseY + Math.sin(time * 0.8 + blob + treeIndex) * 0.025 })
      }
    })

    for (let index = 0; index < 11; index += 1) {
      const side = index % 2 ? -1 : 1
      const bush = this.#mesh(
        new THREE.IcosahedronGeometry(0.34 + (index % 3) * 0.06, 1),
        this.#material(index % 2 ? 0x4f934a : 0x65a956),
        [side * (1.8 + (index % 5) * 0.55), -1.76 + (index % 2) * 0.05, -1.7 + (index % 4) * 0.32],
        { scale: [1.2, 0.82, 1] },
      )
      group.add(bush)
      for (let flower = 0; flower < 3; flower += 1) {
        const bloom = this.#mesh(
          new THREE.SphereGeometry(0.055, 10, 8),
          new THREE.MeshStandardMaterial({ color: [0xffd76a, 0xff84a5, 0xf3e8ff][(index + flower) % 3], emissiveIntensity: 0.2 }),
          [bush.position.x + (flower - 1) * 0.16, bush.position.y + 0.31 + Math.abs(flower - 1) * 0.05, bush.position.z + 0.2],
          { castShadow: false },
        )
        group.add(bloom)
      }
    }

    const fenceMat = this.#material(0xf3eee1, { roughness: 0.75 })
    for (let index = -8; index <= 8; index += 1) {
      group.add(this.#mesh(new THREE.BoxGeometry(0.12, 1.35, 0.12), fenceMat, [index * 0.62, -1.25, -3.45]))
    }
    ;[-1.65, -0.65].forEach((y) => group.add(this.#mesh(new THREE.BoxGeometry(10.5, 0.12, 0.12), fenceMat, [0, y, -3.42])))

    const benchMat = this.#material(0x8a5938)
    ;[0, 0.52].forEach((y) => group.add(this.#mesh(new THREE.BoxGeometry(2.2, 0.14, 0.24), benchMat, [2.5, -1.55 + y, -1.55])))
    ;[-0.82, 0.82].forEach((x) => group.add(this.#mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), this.#material(0x34444b), [2.5 + x, -1.62, -1.55])))

    const sun = this.#mesh(
      new THREE.SphereGeometry(0.34, 24, 18),
      new THREE.MeshBasicMaterial({ color: 0xffed9f }),
      [3.2, 2.65, -3.05],
      { castShadow: false },
    )
    group.add(sun)

    for (let index = 0; index < 5; index += 1) {
      const butterfly = new THREE.Group()
      const wingMat = new THREE.MeshBasicMaterial({ color: index % 2 ? 0xff8fad : 0xf3d968, side: THREE.DoubleSide })
      const leftWing = this.#mesh(new THREE.CircleGeometry(0.08, 10), wingMat, [-0.055, 0, 0], { scale: [1, 0.65, 1], castShadow: false })
      const rightWing = this.#mesh(new THREE.CircleGeometry(0.08, 10), wingMat, [0.055, 0, 0], { scale: [1, 0.65, 1], castShadow: false })
      butterfly.add(leftWing, rightWing)
      butterfly.position.set(-2 + index, 0.7 + (index % 2) * 0.65, -1.7)
      const basePosition = butterfly.position.clone()
      group.add(butterfly)
      this.animated.get('garden').push((time) => {
        butterfly.position.x = basePosition.x + Math.sin(time * 1.2 + index) * 0.16
        butterfly.position.y = basePosition.y + Math.sin(time * 1.8 + index) * 0.09
        leftWing.rotation.y = Math.sin(time * 10 + index) * 0.8
        rightWing.rotation.y = -Math.sin(time * 10 + index) * 0.8
      })
    }
  }

  set(id) {
    if (!ENVIRONMENTS[id] || !this.groups.has(id)) return
    this.current = id
    this.groups.forEach((group, groupId) => { group.visible = groupId === id })
    const config = ENVIRONMENTS[id]
    this.scene.background = new THREE.Color(config.background)
    this.scene.fog.color.setHex(config.fog)
    this.scene.fog.density = config.density
    this.lights.key.color.setHex(config.key)
    this.lights.rim.color.setHex(config.rim)
    this.lights.key.intensity = id === 'garden' ? 4.2 : id === 'office' ? 2.7 : 3.4
    this.rimIntensity = config.rimIntensity
    this.lights.rim.intensity = this.rimIntensity
  }

  update(elapsed) {
    this.animated.get(this.current)?.forEach((update) => update(elapsed))
  }
}
