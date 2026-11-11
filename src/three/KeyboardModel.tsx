import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { recolorKeyboard, PALETTE } from './recolor'
import { simpleBaseGeometry, simpleHousingGeometry, simpleStemGeometry } from './simpleSwitch'
import { anim, pointer } from '../scroll/anim'
import { SwitchHero } from './SwitchHero'
import { layout } from './layout'

export const KEYBOARD_URL = '/models/keyboard.glb'
export const HERO_KEY = 'key_H'

const ease = (t: number) => t * t * (3 - 2 * t)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
function rnd(i: number, s: number) {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453
  return x - Math.floor(x)
}

interface Cap {
  node: THREE.Object3D
  i: number
  row: number
  basePos: THREE.Vector3
  baseQuat: THREE.Quaternion
  /** centre of the cap's footprint on the plate, keyboard space */
  seat: THREE.Vector3
}

export function KeyboardModel({ low = false }: { low?: boolean }) {
  const { scene } = useGLTF(KEYBOARD_URL)
  const root = useMemo(() => scene.clone(true), [scene])
  const group = useRef<THREE.Group>(null)

  useLayoutEffect(() => {
    recolorKeyboard(root, { legend: 'black', finish: 'metal', low })
  }, [root, low])

  // ---- caps + seats on the tilted plate
  const caps = useMemo<Cap[]>(() => {
    root.updateWorldMatrix(true, true)
    const holder = root.getObjectByName('Keycaps')!
    const list = holder.children.map((node, i) => {
      const box = new THREE.Box3().setFromObject(node)
      return { node, i, row: (node.userData.row as number) ?? 0, box }
    })
    // plate line y = a + b·z from the caps' lowest (front-bottom) edges
    let sz = 0, sy = 0, szz = 0, szy = 0
    for (const c of list) {
      const z = c.box.max.z
      const y = c.box.min.y
      sz += z; sy += y; szz += z * z; szy += z * y
    }
    const n = list.length
    const b = (n * szy - sz * sy) / (n * szz - sz * sz)
    const a = (sy - b * sz) / n
    layout.tilt = Math.atan(-b)
    return list.map((c) => {
      const center = c.box.getCenter(new THREE.Vector3())
      return {
        node: c.node,
        i: c.i,
        row: c.row,
        basePos: c.node.position.clone(),
        baseQuat: c.node.quaternion.clone(),
        seat: new THREE.Vector3(center.x, a + b * center.z - 0.0006, center.z),
      }
    })
  }, [root])

  const heroIndex = useMemo(() => caps.findIndex((c) => c.node.name === HERO_KEY), [caps])

  // ---- instanced simple switches
  const geos = useMemo(() => ({ housing: simpleHousingGeometry(), stem: simpleStemGeometry(), base: simpleBaseGeometry() }), [])
  const mats = useMemo(
    () => ({
      housing: new THREE.MeshPhysicalMaterial({ color: '#e8eef2', roughness: 0.15, transparent: true, opacity: 0.28, depthWrite: false, clearcoat: low ? 0 : 0.8 }),
      stem: new THREE.MeshStandardMaterial({ color: PALETTE.red, roughness: 0.4 }),
      base: new THREE.MeshStandardMaterial({ color: '#0c0c0d', roughness: 0.35 }),
    }),
    [low],
  )
  const housingRef = useRef<THREE.InstancedMesh>(null)
  const stemRef = useRef<THREE.InstancedMesh>(null)
  const baseRef = useRef<THREE.InstancedMesh>(null)
  const seatMatrices = useMemo(() => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), layout.tilt)
    // model caps are thin shells sitting ~0.6 mm above the plate: squash the simple switch so the
    // stem stays inside the cap when assembled (the detailed hero switch keeps real proportions)
    const s = new THREE.Vector3(1, 0.72, 1)
    return caps.map((c) => new THREE.Matrix4().compose(c.seat, q, s))
  }, [caps])

  useEffect(() => {
    if (heroIndex >= 0) {
      const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), layout.tilt)
      layout.hero.compose(caps[heroIndex].seat, q, new THREE.Vector3(1, 1, 1))
      layout.heroPos.copy(caps[heroIndex].seat)
    }
    for (const m of [housingRef.current, stemRef.current, baseRef.current]) {
      if (!m) continue
      seatMatrices.forEach((mat, i) => m.setMatrixAt(i, mat))
      m.instanceMatrix.needsUpdate = true
      m.computeBoundingSphere()
    }
  }, [seatMatrices, heroIndex, caps])

  const heroHidden = useRef(false)
  const zero = useMemo(() => new THREE.Matrix4().makeScale(0, 0, 0), [])
  const tmpQ = useMemo(() => new THREE.Quaternion(), [])
  const tmpE = useMemo(() => new THREE.Euler(), [])
  const last = useRef('')
  const idle = useRef({ ry: 0, rx: 0 })

  useFrame((state, dt) => {
    // ---- idle: slow sway + pointer, fades out once scrolling starts
    const t = state.clock.elapsedTime
    const k = anim.idle
    const targetRy = (Math.sin(t * 0.3) * 0.1 + pointer.x * 0.18) * k
    const targetRx = pointer.y * 0.06 * k
    const damp = 1 - Math.exp(-dt * 3)
    idle.current.ry += (targetRy - idle.current.ry) * damp
    idle.current.rx += (targetRx - idle.current.rx) * damp
    if (group.current) {
      group.current.rotation.y = idle.current.ry
      group.current.rotation.x = idle.current.rx
    }

    // ---- caps (only when scroll state changed)
    const sig = `${anim.lift.toFixed(4)}|${anim.explode.toFixed(4)}|${anim.focus.toFixed(4)}`
    if (sig === last.current) return
    last.current = sig
    const f = ease(clamp01(anim.focus))
    for (const c of caps) {
      const delay = (c.row / 4) * 0.5
      const tl = ease(clamp01((anim.lift - delay) / 0.5))
      const tx = ease(clamp01((anim.explode - rnd(c.i, 1) * 0.25) / 0.75))
      const spread = 1 + f * 1.6
      const dx = (c.seat.x * 0.55 + (rnd(c.i, 2) - 0.5) * 0.02) * tx * spread
      const dz = (c.seat.z * 1.7 + (rnd(c.i, 3) - 0.5) * 0.015) * tx * spread
      const dy = tl * 0.02 + tx * (0.045 + rnd(c.i, 4) * 0.05) + f * 0.08
      c.node.position.set(c.basePos.x + dx, c.basePos.y + dy, c.basePos.z + dz)
      tmpE.set((rnd(c.i, 5) - 0.5) * 0.9 * tx, (rnd(c.i, 6) - 0.5) * 0.7 * tx, (rnd(c.i, 7) - 0.5) * 0.9 * tx)
      c.node.quaternion.copy(c.baseQuat).multiply(tmpQ.setFromEuler(tmpE))
    }
    // swap simple switch <-> hero
    const hide = anim.focus > 0.001
    if (hide !== heroHidden.current && heroIndex >= 0) {
      heroHidden.current = hide
      for (const m of [housingRef.current, stemRef.current, baseRef.current]) {
        if (!m) continue
        m.setMatrixAt(heroIndex, hide ? zero : seatMatrices[heroIndex])
        m.instanceMatrix.needsUpdate = true
      }
    }
  })

  const n = caps.length
  return (
    <group ref={group}>
      <primitive object={root} />
      <instancedMesh ref={baseRef} args={[geos.base, mats.base, n]} />
      <instancedMesh ref={stemRef} args={[geos.stem, mats.stem, n]} />
      <instancedMesh ref={housingRef} args={[geos.housing, mats.housing, n]} renderOrder={2} />
      <SwitchHero low={low} />
    </group>
  )
}

useGLTF.preload(KEYBOARD_URL)
