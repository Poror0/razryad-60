import { Suspense, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { KeyboardModel } from './KeyboardModel'
import { StudioEnv } from './StudioEnv'
import { layout } from './layout'
import { anim } from '../scroll/anim'
import { LabelProjector } from './LabelProjector'

type V3 = [number, number, number]
interface Shot {
  pos: V3
  target: V3
}

/** camera keyframes in keyboard space (metres); index = anim.cam */
function shots(): Shot[] {
  const h = layout.heroPos
  return [
    { pos: [0, 0.26, 0.4], target: [0, 0.012, 0.004] }, // 0 hero
    { pos: [0.1, 0.36, 0.25], target: [0, 0.02, 0] }, // 1 lift: camera tilts down
    { pos: [0, 0.5, 0.42], target: [0, 0.05, 0] }, // 2 exploded
    { pos: [h.x + 0.07, h.y + 0.12, h.z + 0.15], target: [h.x + 0.008, h.y + 0.05, h.z] }, // 3 close-up
    { pos: [-0.25, 0.3, 0.56], target: [0.085, 0.0, 0.01] }, // 4 final, model sits left of the buy block
  ]
}

const v1 = new THREE.Vector3()
const v2 = new THREE.Vector3()
const look = new THREE.Vector3()

function CameraRig() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useFrame(() => {
    const list = shots()
    const c = Math.min(list.length - 1, Math.max(0, anim.cam))
    const i = Math.min(list.length - 2, Math.floor(c))
    const t = c - i
    const a = list[i]
    const b = list[i + 1]
    v1.fromArray(a.pos).lerp(v2.fromArray(b.pos), t)
    look.fromArray(a.target).lerp(v2.fromArray(b.target), t)
    // portrait screens: back off so the 30 cm board fits horizontally
    const aspect = size.width / size.height
    const k = Math.max(1, 1.5 / aspect)
    camera.position.copy(look).add(v1.sub(look).multiplyScalar(k))
    camera.lookAt(look)
  })
  return null
}

function Ready() {
  const { active, progress } = useProgress()
  useEffect(() => {
    if (!active && progress === 100) {
      const w = window as unknown as { __ready?: boolean }
      // give shaders a couple of frames to compile before screenshots / loader fade-out
      setTimeout(() => (w.__ready = true), 600)
      window.dispatchEvent(new Event('scene-ready'))
    }
  }, [active, progress])
  return null
}

export function Scene({ low = false }: { low?: boolean }) {
  const dpr = useMemo<[number, number]>(() => (low ? [1, 1.5] : [1, 2]), [low])
  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.85, powerPreference: 'high-performance' }}
      camera={{ fov: 30, near: 0.01, far: 10, position: [0, 0.26, 0.4] }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <color attach="background" args={['#0d0d0e']} />
      <StudioEnv intensity={0.55} />
      <Suspense fallback={null}>
        <KeyboardModel low={low} />
        <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={0.7} blur={2.4} far={0.08} resolution={low ? 256 : 512} frames={low ? 1 : Infinity} color="#000000" />
        <Ready />
      </Suspense>
      <CameraRig />
      <LabelProjector />
    </Canvas>
  )
}
