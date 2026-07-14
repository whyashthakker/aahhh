import * as THREE from 'three'
import { EnvironmentManager } from './EnvironmentManager.js'

export class SceneWorld {
  constructor(container) {
    this.container = container
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.FogExp2(0xede9ff, 0.055)
    this.camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100)
    this.baseCameraPosition = new THREE.Vector3(0, 1.45, 9.2)
    this.camera.position.copy(this.baseCameraPosition)
    this.camera.lookAt(0, 0.8, 0)
    this.shakeStrength = 0

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    container.appendChild(this.renderer.domElement)

    this.#buildEnvironment()
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
  }

  #buildEnvironment() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x8272b5, 2.7))
    this.keyLight = new THREE.DirectionalLight(0xffffff, 3.4)
    this.keyLight.position.set(-4, 7, 5)
    this.keyLight.castShadow = true
    this.keyLight.shadow.mapSize.set(1024, 1024)
    this.keyLight.shadow.camera.left = -5
    this.keyLight.shadow.camera.right = 5
    this.keyLight.shadow.camera.top = 7
    this.keyLight.shadow.camera.bottom = -3
    this.scene.add(this.keyLight)

    this.rimLight = new THREE.PointLight(0xbca5ff, 24, 11)
    this.rimLight.position.set(4.5, 3, 2)
    this.scene.add(this.rimLight)

    this.environment = new EnvironmentManager(this.scene, { key: this.keyLight, rim: this.rimLight })

    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1.35, 40),
      new THREE.MeshBasicMaterial({ color: 0x4a337a, transparent: true, opacity: 0.24, depthWrite: false }),
    )
    this.shadow.rotation.x = -Math.PI / 2
    this.shadow.scale.y = 0.45
    this.shadow.position.set(0, -2.035, 0.15)
    this.scene.add(this.shadow)
  }

  add(object) {
    this.scene.add(object)
  }

  setEnvironment(id) {
    this.environment.set(id)
  }

  spawnParticles(point, power) {
    const count = 7 + Math.floor(power * 3)
    for (let index = 0; index < count; index += 1) {
      const particle = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.035 + Math.random() * 0.045),
        new THREE.MeshBasicMaterial({ color: index % 2 ? 0xf8c950 : 0xffffff, transparent: true }),
      )
      particle.position.copy(point)
      particle.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3.5,
        (Math.random() - 0.1) * 3.2,
        0.8 + Math.random() * 2,
      ).multiplyScalar(power * 0.65)
      particle.userData.life = 0.55 + Math.random() * 0.25
      particle.userData.maxLife = particle.userData.life
      particle.userData.particle = true
      this.scene.add(particle)
    }
  }

  spawnProjectile(point, propId, side = 1) {
    if (propId !== 'foam-dart') return
    const dart = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.035, 0.52, 12),
      new THREE.MeshStandardMaterial({ color: side > 0 ? 0xff6688 : 0x77dfff, roughness: 0.42 }),
    )
    const tip = new THREE.Mesh(
      new THREE.ConeGeometry(0.085, 0.16, 16),
      new THREE.MeshStandardMaterial({ color: 0xd9ff61, roughness: 0.7 }),
    )
    tip.position.y = 0.34
    dart.add(body, tip)
    dart.rotation.x = Math.PI / 2
    dart.rotation.z = side * 0.14
    dart.position.set(side * -2.8, 0.25 + Math.random() * 1.25, 5.2)
    dart.scale.setScalar(1.45)
    dart.userData.projectile = true
    dart.userData.origin = dart.position.clone()
    dart.userData.target = point.clone()
    dart.userData.life = 0
    this.scene.add(dart)
  }

  shake(power) {
    this.shakeStrength = Math.max(this.shakeStrength, Math.min(0.19, power * 0.055))
    this.rimLight.intensity = Math.min(58, 28 + power * 13)
  }

  toScreen(worldPoint) {
    const projected = worldPoint.clone().project(this.camera)
    const rect = this.container.getBoundingClientRect()
    return {
      x: rect.left + (projected.x * 0.5 + 0.5) * rect.width,
      y: rect.top + (-projected.y * 0.5 + 0.5) * rect.height,
    }
  }

  resize() {
    const width = this.container.clientWidth
    const height = this.container.clientHeight
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / Math.max(1, height)
    this.camera.updateProjectionMatrix()
  }

  update(delta, dummy, elapsed) {
    this.shadow.position.x = dummy.nodes.pelvis.position.x * 0.4
    this.shadow.scale.x = 1 - Math.min(0.18, Math.abs(dummy.nodes.pelvis.position.z) * 0.1)
    if (this.shakeStrength > 0.001) {
      this.camera.position.copy(this.baseCameraPosition).add(new THREE.Vector3(
        (Math.random() - 0.5) * this.shakeStrength,
        (Math.random() - 0.5) * this.shakeStrength,
        Math.random() * this.shakeStrength * 0.35,
      ))
      this.shakeStrength *= Math.pow(0.72, delta * 60)
    } else {
      this.camera.position.lerp(this.baseCameraPosition, 0.25)
    }
    this.camera.lookAt(0, 0.72, 0)
    this.rimLight.intensity = THREE.MathUtils.lerp(this.rimLight.intensity, this.environment.rimIntensity, 0.09)
    this.environment.update(elapsed)
    this.scene.children.filter((child) => child.userData.particle).forEach((particle) => {
      particle.userData.life -= delta
      particle.userData.velocity.y -= 4.2 * delta
      particle.position.addScaledVector(particle.userData.velocity, delta)
      particle.rotation.x += delta * 8
      particle.rotation.y += delta * 6
      particle.material.opacity = Math.max(0, particle.userData.life / particle.userData.maxLife)
      if (particle.userData.life <= 0) {
        particle.geometry.dispose()
        particle.material.dispose()
        this.scene.remove(particle)
      }
    })
    this.scene.children.filter((child) => child.userData.projectile).forEach((projectile) => {
      projectile.userData.life += delta * 5.4
      const progress = Math.min(1, projectile.userData.life)
      projectile.position.lerpVectors(projectile.userData.origin, projectile.userData.target, 1 - ((1 - progress) ** 3))
      projectile.rotation.z += delta * 7
      if (progress >= 1) {
        projectile.traverse((child) => {
          child.geometry?.dispose()
          child.material?.dispose()
        })
        this.scene.remove(projectile)
      }
    })
  }

  render() {
    this.renderer.render(this.scene, this.camera)
  }
}
