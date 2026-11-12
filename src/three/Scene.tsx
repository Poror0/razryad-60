import { Suspense, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { KeyboardModel } from './KeyboardModel'
import { StudioEnv } from './StudioEnv'
import { layout } from './layout'
import { anim } from '../scroll/anim'
import { Overlay } from './Overlay'
import { Glow } from './Glow'

type V3 = [number, number, number]
interface Shot {
  pos: V3
  target: V3
  /** desktop: horizontal screen shift of the frame centre (fraction of width, + = right), keeps the model clear of the panel */
  sx?: number
  /** phones: vertical shift (fraction of height, − = up), the panel sits under the model */
  sy?: number
  /** phones: horizontal shift, only where callouts need room */
  mx?: number
}

/** camera keyframes in keyboard space (metres); index = anim.cam */
function shots(): Shot[] {
  const h = layout.heroPos
  return [
    { pos: [0, 0.27, 0.4], target: [0, 0.03, 0.004] }, // 0 hero (keyboard low, overlapping the title)
    { pos: [0.09, 0.44, 0.34], target: [0, 0.02, 0], sx: -0.22, sy: -0.15 }, // 1 lift: camera tilts down (panel right)
    { pos: [0, 0.56, 0.5], target: [0, 0.05, 0], sx: 0.2, sy: -0.15 }, // 2 exploded (panel left)
    { pos: [h.x + 0.07, h.y + 0.12, h.z + 0.15], target: [h.x + 0.008, h.y + 0.05, h.z], sx: -0.1, sy: -0.07, mx: 0.17 }, // 3 close-up (panel right)
    { pos: [0.37, 0.11, 0.18], target: [0.085, 0.006, 0.0], sx: 0.14, sy: -0.15 }, // 4 case edge (panel left)
    { pos: [-0.25, 0.3, 0.56], target: [0.085, 0.0, 0.01], sx: -0.04, sy: -0.15 }, // 5 final, model left of the panel
  ]
}

const v1 = new THREE.Vector3()
const v2 = new THREE.Vector3()
const look = new THREE.Vector3()
const lerp = (a = 0, b = 0, t: number) => a + (b - a) * t

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
    const k = Math.max(1, 1.3 / aspect)
    camera.position.copy(look).add(v1.sub(look).multiplyScalar(k))
    camera.lookAt(look)
    // shift the frame (not the camera) so the model sits clear of the stage panel
    const narrow = size.width < 768
    const sx = narrow ? lerp(a.mx, b.mx, t) : lerp(a.sx, b.sx, t)
    const sy = narrow ? lerp(a.sy, b.sy, t) : 0
    const cam = camera as THREE.PerspectiveCamera
    const ox = Math.round(-sx * size.width)
    const oy = Math.round(-sy * size.height)
    const v = cam.view
    if (!v || v.offsetX !== ox || v.offsetY !== oy || v.fullWidth !== size.width || v.fullHeight !== size.height) {
      cam.setViewOffset(size.width, size.height, ox, oy, size.width, size.height)
    }
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
      gl={{ antialias: true, alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.85, powerPreference: 'high-performance' }}
      camera={{ fov: 30, near: 0.01, far: 10, position: [0, 0.26, 0.4] }}
      style={{ position: 'fixed', inset: 0, zIndex: 1 }}
    >
      <StudioEnv intensity={0.55} />
      {/* rim / back light: catches the top-back edges of the graphite caps */}
      <directionalLight position={[0.1, 0.25, -0.6]} intensity={1.1} color="#ffffff" />
      <Suspense fallback={null}>
        <KeyboardModel low={low} />
        <Glow />
        <ContactShadows position={[0, 0, 0]} opacity={0.55} scale={0.7} blur={2.4} far={0.08} resolution={low ? 256 : 512} frames={low ? 1 : Infinity} color="#000000" />
        <Ready />
      </Suspense>
      <CameraRig />
      <Overlay />
    </Canvas>
  )
}
