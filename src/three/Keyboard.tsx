import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { KeyDef } from './layout'
import { FIELD_D, FIELD_W, INDICATOR, KNOB } from './layout'
import {
  U,
  CAP_BASE,
  keycapGeometry,
  bottomHousingGeometry,
  topHousingGeometry,
  stemGeometry,
  springGeometry,
  leafGeometry,
} from './parts'
import { COLORS, type Materials, type Quality } from './materials'
import type { Atlas } from './legends'
import { bodyGeometry, knobGeometry, plateTexture, rimGeometry, sidePanelGeometry, TILT_DEG, type CaseDims } from './caseGeometry'
import { anim } from '../scroll/anim'

const ease = (t: number) => t * t * (3 - 2 * t)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

/** deterministic pseudo random per key */
function rnd(i: number, s: number) {
  const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453
  return x - Math.floor(x)
}

export const CASE: CaseDims = {
  w: FIELD_W * U + 19,
  d: FIELD_D * U + 20,
  r: 7,
  hMid: 25,
  rimTop: 3.2,
  rimBottom: -10,
  holeW: FIELD_W * U + 5,
  holeD: FIELD_D * U + 5,
}

export const HERO_ID = 'j'

interface Props {
  keys: KeyDef[]
  atlas: Atlas
  mats: Materials
  quality: Quality
  showCase?: boolean
  /** show the individual hero switch (detailed, with labels anchor) */
  heroId?: string
  /** callback with hero group for labels / camera */
  onHero?: (g: THREE.Group) => void
}

interface Placed {
  def: KeyDef
  i: number
  x: number
  z: number
}

export function Keyboard({ keys, atlas, mats, quality, showCase = true, heroId = HERO_ID, onHero }: Props) {
  const placed: Placed[] = useMemo(
    () =>
      keys.map((def, i) => ({
        def,
        i,
        x: keys.length === 1 ? 0 : (def.x + def.w / 2 - FIELD_W / 2) * U,
        z: keys.length === 1 ? 0 : (def.y + 0.5 - FIELD_D / 2) * U,
      })),
    [keys],
  )
  const single = keys.length === 1

  // group caps by geometry
  const capGroups = useMemo(() => {
    const m = new Map<string, Placed[]>()
    for (const p of placed) {
      const k = `${p.def.w}-${p.def.row}`
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(p)
    }
    return [...m.entries()].map(([k, list]) => {
      const geo = keycapGeometry(list[0].def.w, list[0].def.row).clone()
      const cells = new Float32Array(list.length * 4)
      list.forEach((p, j) => cells.set(atlas.cells.get(p.def.id) ?? [0, 0, 0, 0], j * 4))
      geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 4))
      return { key: k, geo, list }
    })
  }, [placed, atlas])

  const geos = useMemo(
    () => ({
      bottom: bottomHousingGeometry(),
      top: topHousingGeometry(),
      stem: stemGeometry(),
      spring: springGeometry(quality === 'high' ? 10 : 6, quality === 'high' ? 6 : 4),
      leaf: leafGeometry(),
    }),
    [quality],
  )

  const capRefs = useRef<(THREE.InstancedMesh | null)[]>([])
  const swRefs = useRef<Record<string, THREE.InstancedMesh | null>>({})
  const heroRef = useRef<THREE.Group>(null)
  const heroParts = useRef<Record<string, THREE.Object3D | null>>({})
  const knobRef = useRef<THREE.Group>(null)

  const heroPlaced = placed.find((p) => p.def.id === heroId) ?? (single ? placed[0] : undefined)

  // static colours
  useEffect(() => {
    capGroups.forEach((g, gi) => {
      const mesh = capRefs.current[gi]
      if (!mesh) return
      const c = new THREE.Color()
      g.list.forEach((p, j) => {
        c.set(p.def.color === 'black' ? COLORS.black : p.def.color === 'red' ? COLORS.red : COLORS.white)
        mesh.setColorAt(j, c)
      })
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    })
  }, [capGroups])

  useEffect(() => {
    if (heroRef.current && onHero) onHero(heroRef.current)
  }, [onHero])

  const last = useRef('')
  const m4 = useMemo(() => new THREE.Matrix4(), [])
  const q = useMemo(() => new THREE.Quaternion(), [])
  const e = useMemo(() => new THREE.Euler(), [])
  const v = useMemo(() => new THREE.Vector3(), [])
  const s1 = useMemo(() => new THREE.Vector3(1, 1, 1), [])
  const s0 = useMemo(() => new THREE.Vector3(0, 0, 0), [])

  useFrame((_, dt) => {
    if (knobRef.current) knobRef.current.rotation.y += dt * 0.25
    const sig = `${anim.lift.toFixed(4)}|${anim.explode.toFixed(4)}|${anim.focus.toFixed(4)}`
    if (sig === last.current) return
    last.current = sig

    const lines = 5
    // ---- caps
    capGroups.forEach((g, gi) => {
      const mesh = capRefs.current[gi]
      if (!mesh) return
      g.list.forEach((p, j) => {
        // stage 1: wave lift by row
        const delay = (p.def.line / lines) * 0.55
        const tl = ease(clamp01((anim.lift - delay) / 0.45))
        // stage 2: exploded view
        const tx = ease(clamp01((anim.explode - rnd(p.i, 1) * 0.25) / 0.75))
        const dx = p.x * 0.42 + (rnd(p.i, 2) - 0.5) * 30
        const dz = p.z * 1.9 + (rnd(p.i, 3) - 0.5) * 20
        const y = CAP_BASE + tl * 26 + tx * (70 + rnd(p.i, 4) * 50)
        v.set(p.x + dx * tx, y, p.z + dz * tx)
        e.set((rnd(p.i, 5) - 0.5) * 0.6 * tx, (rnd(p.i, 6) - 0.5) * 0.5 * tx, (rnd(p.i, 7) - 0.5) * 0.6 * tx)
        q.setFromEuler(e)
        m4.compose(v, q, s1)
        mesh.setMatrixAt(j, m4)
      })
      mesh.instanceMatrix.needsUpdate = true
    })

    // ---- switches (hero rendered separately)
    for (const part of ['bottom', 'top', 'stem', 'spring'] as const) {
      const mesh = swRefs.current[part]
      if (!mesh) continue
      placed.forEach((p, j) => {
        const hidden = heroPlaced && p.i === heroPlaced.i
        v.set(p.x, 0, p.z)
        q.identity()
        m4.compose(v, q, hidden ? s0 : s1)
        mesh.setMatrixAt(j, m4)
      })
      mesh.instanceMatrix.needsUpdate = true
    }

    // ---- hero switch disassembly (stage 3)
    const f = ease(clamp01(anim.focus))
    const hp = heroParts.current
    const lift = f * 22
    if (hp.top) hp.top.position.y = lift + f * 45
    if (hp.stem) hp.stem.position.y = lift + f * 28
    if (hp.spring) hp.spring.position.y = lift + f * 14
    if (hp.leaf) hp.leaf.position.set(-f * 14, lift, 0)
    if (hp.bottom) hp.bottom.position.y = lift
  })

  const plateTex = useMemo(() => (showCase ? plateTexture(CASE.holeW, CASE.holeD) : null), [showCase])
  const caseGeo = useMemo(
    () =>
      showCase
        ? { body: bodyGeometry(CASE), rim: rimGeometry(CASE), sideL: sidePanelGeometry(CASE, -1), sideR: sidePanelGeometry(CASE, 1), knob: knobGeometry() }
        : null,
    [showCase],
  )
  const blackMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#111113', roughness: 0.55, metalness: 0.3 }), [])
  const plateMat = useMemo(
    () => (plateTex ? new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.7, metalness: 0.2 }) : new THREE.MeshStandardMaterial({ color: '#0d0d0e', roughness: 0.7 })),
    [plateTex],
  )
  const whiteMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.4, emissive: '#ffffff', emissiveIntensity: 0.25 }), [])
  const knobTopMat = useMemo(() => new THREE.MeshStandardMaterial({ color: COLORS.red, roughness: 0.4, metalness: 0.4 }), [])

  const n = placed.length
  const tilt = (TILT_DEG * Math.PI) / 180

  const keyField = (
    <group>
      {/* plate */}
      <mesh material={plateMat} position={[0, -0.75, 0]}>
        <boxGeometry args={showCase ? [CASE.holeW, 1.5, CASE.holeD] : [U * 1.6, 1.5, U * 1.6]} />
      </mesh>
      {/* switches */}
      <instancedMesh ref={(m) => void (swRefs.current.bottom = m)} args={[geos.bottom, mats.mint, n]} frustumCulled={false} />
      <instancedMesh ref={(m) => void (swRefs.current.stem = m)} args={[geos.stem, mats.mint, n]} frustumCulled={false} />
      {quality === 'high' && <instancedMesh ref={(m) => void (swRefs.current.spring = m)} args={[geos.spring, mats.spring, n]} frustumCulled={false} />}
      <instancedMesh ref={(m) => void (swRefs.current.top = m)} args={[geos.top, mats.clear, n]} frustumCulled={false} renderOrder={2} />
      {/* caps */}
      {capGroups.map((g, gi) => (
        <instancedMesh
          key={g.key}
          ref={(m) => void (capRefs.current[gi] = m)}
          args={[g.geo, mats.keycap, g.list.length]}
          frustumCulled={false}
        />
      ))}
      {/* hero switch */}
      {heroPlaced && (
        <group ref={heroRef} position={[heroPlaced.x, 0, heroPlaced.z]}>
          <mesh ref={(m) => void (heroParts.current.bottom = m)} geometry={geos.bottom} material={mats.mint} />
          <mesh ref={(m) => void (heroParts.current.leaf = m)} geometry={geos.leaf} material={mats.gold} />
          <mesh ref={(m) => void (heroParts.current.spring = m)} geometry={geos.spring} material={mats.spring} />
          <mesh ref={(m) => void (heroParts.current.stem = m)} geometry={geos.stem} material={mats.mint} />
          <mesh ref={(m) => void (heroParts.current.top = m)} geometry={geos.top} material={mats.clear} renderOrder={3} />
        </group>
      )}
      {showCase && caseGeo && (
        <>
          <mesh geometry={caseGeo.rim} material={mats.caseMat} />
          {/* indicator bars */}
          {[-1, 0, 1].map((i) => (
            <mesh key={i} material={whiteMat} position={[(INDICATOR.x - FIELD_W / 2) * U, 0.6, (INDICATOR.y - FIELD_D / 2) * U + i * 3.6]}>
              <boxGeometry args={[9, 1.2, 1.6]} />
            </mesh>
          ))}
          {/* knob */}
          <group position={[(KNOB.x - FIELD_W / 2) * U, 0, (KNOB.y - FIELD_D / 2) * U]}>
            <mesh material={blackMat} position={[0, 1, 0]}>
              <cylinderGeometry args={[10, 10, 2, 32]} />
            </mesh>
            <group ref={knobRef} position={[0, 2, 0]}>
              <mesh geometry={caseGeo.knob} material={mats.caseMat} />
              <mesh material={knobTopMat} position={[0, 12.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[7.6, 32]} />
              </mesh>
            </group>
          </group>
          {/* nameplate */}
          <mesh material={mats.steel} position={[-95, CASE.rimTop - 0.6, -CASE.d / 2 + 0.6]}>
            <boxGeometry args={[64, 2.4, 3.4]} />
          </mesh>
        </>
      )}
    </group>
  )

  return (
    <group scale={0.01}>
      {showCase && caseGeo && (
        <>
          <mesh geometry={caseGeo.body} material={mats.caseMat} />
          <mesh geometry={caseGeo.sideL} material={blackMat} />
          <mesh geometry={caseGeo.sideR} material={blackMat} />
        </>
      )}
      <group position={[0, showCase ? CASE.hMid : 9, 0]} rotation={[showCase ? tilt : 0, 0, 0]}>
        {keyField}
      </group>
    </group>
  )
}
