import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { recolorSwitch } from './recolor'
import { anim } from '../scroll/anim'
import { layout } from './layout'

export const HERO_URL = '/models/switch-hero.glb'

const ease = (t: number) => t * t * (3 - 2 * t)
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))

/** part name -> exploded offset along the switch axis (metres), bottom to top */
const EXPLODE: Record<string, number> = { Bottom: 0, LED: 0, Spring: 0.013, Stem: 0.027, Top: 0.046 }

/** world-space objects the label overlay projects (filled on mount) */
export const heroParts: Partial<Record<string, THREE.Object3D>> = {}

export function SwitchHero({ low = false }: { low?: boolean }) {
  const { scene } = useGLTF(HERO_URL)
  const root = useMemo(() => scene.clone(true), [scene])
  const holder = useRef<THREE.Group>(null)

  const parts = useMemo(() => {
    const h = root.getObjectByName('SwitchHero')!
    return h.children.map((o) => ({ o, base: o.position.clone() }))
  }, [root])

  useLayoutEffect(() => {
    recolorSwitch(root, low)
    for (const p of parts) heroParts[p.o.name] = p.o
  }, [root, parts, low])

  useFrame(() => {
    const g = holder.current
    if (!g) return
    const visible = anim.focus > 0.02
    g.visible = visible
    if (!visible) return
    g.matrix.copy(layout.hero)
    const f = ease(clamp01(anim.focus))
    // rises out of the plate first, then the parts separate
    const rise = ease(clamp01(f / 0.45)) * 0.026
    const sep = ease(clamp01((f - 0.25) / 0.75))
    for (const p of parts) {
      const off = EXPLODE[p.o.name] ?? 0
      p.o.position.set(p.base.x + (p.o.name === 'LED' ? sep * 0.012 : 0), p.base.y + rise + off * sep, p.base.z)
    }
  })

  return (
    <group ref={holder} matrixAutoUpdate={false} visible={false}>
      <primitive object={root} />
    </group>
  )
}

useGLTF.preload(HERO_URL)
