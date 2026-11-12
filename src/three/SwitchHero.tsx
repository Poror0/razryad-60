import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { PALETTE, recolorSwitch } from './recolor'
import { anim } from '../scroll/anim'
import { layout } from './layout'
import { glowObjects } from './glowRegistry'
import { asset } from '../asset'

export const HERO_URL = asset('models/switch-hero.glb')

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

  // LED glow inside the clear top housing (under its LED window): small HDR-emissive block, bloom makes it "burn"
  const led = useMemo(() => {
    const top = root.getObjectByName('Top')
    if (!top) return null
    const box = new THREE.Box3().setFromObject(top)
    top.worldToLocal(box.min)
    top.worldToLocal(box.max)
    const b = new THREE.Box3().setFromPoints([box.min, box.max])
    const size = b.getSize(new THREE.Vector3())
    const c = b.getCenter(new THREE.Vector3())
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.red).multiplyScalar(2.2), toneMapped: false })
    // depth-only proxy: the clear housing doesn't write depth, so DoF would read it as background (blur).
    // (recolorSwitch skips userData.proxy meshes)
    // drawn AFTER the housing (transparent queue, higher renderOrder) so it doesn't hide the housing's inner faces
    const proxyMat = new THREE.MeshBasicMaterial({ colorWrite: false, transparent: true, depthWrite: true })
    const meshes: THREE.Mesh[] = []
    top.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !o.userData.proxy && !o.children.some((c) => c.userData.proxy)) meshes.push(o as THREE.Mesh)
    })
    for (const m of meshes) {
      const p = new THREE.Mesh(m.geometry, proxyMat)
      p.userData.proxy = true
      p.renderOrder = 10
      m.add(p)
    }
    // LED window: a thin glowing plate on the top face, towards the back (−z)
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x * 0.2, size.y * 0.02, size.z * 0.16), mat)
    // sits just above the top face so the selective bloom's depth mask sees it in front of the proxy
    mesh.position.set(c.x, b.max.y + size.y * 0.012, c.z - size.z * 0.25)
    mesh.renderOrder = 6
    mesh.userData.glow = true
    top.add(mesh)
    glowObjects.add(mesh)
    return { mesh, mat }
  }, [root])

  useLayoutEffect(() => {
    const mats = recolorSwitch(root, low)
    topMat.current = mats.top
    for (const p of parts) heroParts[p.o.name] = p.o
  }, [root, parts, low])
  const topMat = useRef<THREE.MeshPhysicalMaterial | null>(null)

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
    // housing lights up from inside once the parts have separated
    const glow = ease(clamp01((f - 0.5) / 0.5))
    if (led) {
      led.mesh.visible = glow > 0.01
      led.mesh.scale.setScalar(Math.max(0.01, glow))
    }
    if (topMat.current) topMat.current.emissiveIntensity = glow
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
