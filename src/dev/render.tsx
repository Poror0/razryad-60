// Dev-only product renders for the kit cards, transparent background:
//   /render.html?item=switch | keycap | keyboard   → scripts/renders.mjs saves public/renders/<item>.webp
import { Suspense, useEffect, useMemo } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useThree } from '@react-three/fiber'
import { Bounds, ContactShadows, useBounds, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { StudioEnv } from '../three/StudioEnv'
import { recolorKeyboard, recolorSwitch } from '../three/recolor'

const q = new URLSearchParams(location.search)
const item = q.get('item') ?? 'switch'

function Item() {
  const kb = useGLTF('/models/keyboard.glb')
  const sw = useGLTF('/models/switch-hero.glb')
  const root = useMemo(() => {
    if (item === 'switch') {
      const r = sw.scene.clone(true)
      recolorSwitch(r)
      return r
    }
    const r = kb.scene.clone(true)
    recolorKeyboard(r)
    if (item === 'keycap') {
      // one red modifier and one graphite alpha, side by side
      const g = new THREE.Group()
      for (const [name, x] of [['key_Esc', -0.011], ['key_G', 0.011]] as const) {
        const src = r.getObjectByName(name)!
        const m = src.clone(true)
        m.quaternion.identity()
        m.updateMatrixWorld(true)
        const bb = new THREE.Box3().setFromObject(m)
        const c = bb.getCenter(new THREE.Vector3())
        m.position.x += x - c.x
        m.position.y -= bb.min.y
        m.position.z -= c.z
        g.add(m)
      }
      return g
    }
    return r
  }, [kb, sw])
  return <primitive object={root} />
}

/** refit once the model is in (Bounds' first fit can run before the GLTF clone is attached) */
function Fit() {
  const api = useBounds()
  useEffect(() => {
    const t = setTimeout(() => api.refresh().clip().fit(), 200)
    return () => clearTimeout(t)
  }, [api])
  return null
}

function Ready() {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    setTimeout(() => ((window as unknown as { __ready: boolean }).__ready = true), 1500)
  }, [gl])
  return null
}

const cam: Record<string, [number, number, number]> = {
  switch: [0.035, 0.03, 0.05],
  keycap: [0.03, 0.035, 0.05],
  keyboard: [0.18, 0.3, 0.32],
}

createRoot(document.getElementById('root')!).render(
  <Canvas dpr={2} gl={{ antialias: true, alpha: true, preserveDrawingBuffer: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.85 }} camera={{ position: cam[item], fov: 26, near: 0.001, far: 10 }}>
    <StudioEnv intensity={0.6} />
    <directionalLight position={[0.1, 0.25, -0.6]} intensity={1.2} />
    <Suspense fallback={null}>
      <Bounds fit clip margin={item === 'keyboard' ? 1.0 : 1.2}>
        <Item />
        <Fit />
      </Bounds>
      <ContactShadows position={[0, -0.0002, 0]} opacity={0.5} scale={item === 'keyboard' ? 0.5 : 0.08} blur={2.2} far={0.05} />
      <Ready />
    </Suspense>
  </Canvas>,
)
