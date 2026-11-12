import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, MeshReflectorMaterial, PerformanceMonitor, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { KeyboardModel } from './KeyboardModel'
import { StudioEnv } from './StudioEnv'
import { layout } from './layout'
import { anim } from '../scroll/anim'
import { Overlay } from './Overlay'
import { Glow } from './Glow'
import { Effects, type Quality } from './Effects'

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
    { pos: [0, 0.68, 0.61], target: [0, 0.05, 0], sx: 0.1, sy: -0.15 }, // 2 exploded (panel left)
    { pos: [h.x + 0.07, h.y + 0.12, h.z + 0.15], target: [h.x + 0.008, h.y + 0.05, h.z], sx: -0.1, sy: -0.07, mx: 0.17 }, // 3 close-up (panel right)
    { pos: [0.37, 0.11, 0.18], target: [0.085, 0.006, 0.0], sx: 0.14, sy: -0.15 }, // 4 case edge (panel left)
    { pos: [-0.35, 0.315, 0.378], target: [0.065, 0.0, 0.01], sx: -0.06, sy: -0.15 }, // 5 final, model left of the panel
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
    let oy = Math.round(-sy * size.height)
    // after the 3D track the frame is "attached" to the buy block: it slides in from below with it
    // and leaves upwards before the footer, so the keyboard never shows through / gets cut by neighbours
    const track = document.querySelector('.track')
    const buy = document.getElementById('buy')
    if (track && buy && track.getBoundingClientRect().bottom <= 0) {
      const r = buy.getBoundingClientRect()
      const shift = r.top > 0 ? r.top : r.bottom < size.height ? r.bottom - size.height : 0
      oy -= Math.round(Math.max(-size.height, Math.min(size.height, shift)))
    }
    const v = cam.view
    if (!v || v.offsetX !== ox || v.offsetY !== oy || v.fullWidth !== size.width || v.fullHeight !== size.height) {
      cam.setViewOffset(size.width, size.height, ox, oy, size.width, size.height)
    }
  })
  return null
}

/**
 * Stop rendering while the opaque sections after the 3D track cover the whole viewport
 * (between the end of the track and the transparent buy block). Saves the GPU on long reads.
 */
function PauseWhenCovered() {
  const setFrameloop = useThree((s) => s.setFrameloop)
  useEffect(() => {
    let paused = false
    const check = () => {
      const track = document.querySelector('.track')
      const buy = document.getElementById('buy')
      if (!track || !buy) return
      const covered = track.getBoundingClientRect().bottom <= 0 && buy.getBoundingClientRect().top >= innerHeight
      if (covered !== paused) {
        paused = covered
        setFrameloop(covered ? 'never' : 'always')
      }
    }
    addEventListener('scroll', check, { passive: true })
    addEventListener('resize', check)
    check()
    return () => {
      removeEventListener('scroll', check)
      removeEventListener('resize', check)
      setFrameloop('always')
    }
  }, [setFrameloop])
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


/** Dark floor with a soft, blurred reflection; fades out radially into the page background. */
function Floor() {
  const alpha = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const x = c.getContext('2d')!
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, '#fff')
    g.addColorStop(0.12, '#aaa')
    g.addColorStop(0.3, '#000')
    x.fillStyle = g
    x.fillRect(0, 0, 256, 256)
    return new THREE.CanvasTexture(c)
  }, [])
  // the hero shows the HTML backdrop (title, diamonds, glow) through the transparent canvas:
  // the floor fades in only as the scene leaves the hero
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    const m = ref.current
    if (!m) return
    const k = THREE.MathUtils.clamp((0.85 - anim.idle) / 0.6, 0, 1)
    m.visible = k > 0.01
    ;(m.material as THREE.Material).opacity = k
  })
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, -0.0012, 0.02]} renderOrder={-3}>
      <planeGeometry args={[2.4, 2.4]} />
      <MeshReflectorMaterial
        color="#0e0e0e"
        roughness={0.9}
        metalness={0.4}
        blur={[600, 200]}
        resolution={512}
        mixBlur={1}
        mixStrength={0.55}
        mixContrast={1}
        depthScale={0.6}
        minDepthThreshold={0.2}
        maxDepthThreshold={1.2}
        mirror={0}
        transparent
        alphaMap={alpha}
        depthWrite={false}
      />
    </mesh>
  )
}

/** Overhead key light that casts the caps’ shadows onto the plate (and the plate onto the case). */
function ShadowLight({ size }: { size: number }) {
  return (
    <directionalLight
      position={[0.06, 0.6, 0.18]}
      intensity={0.45}
      castShadow
      shadow-mapSize={[size, size]}
      shadow-bias={-0.0002}
      shadow-normalBias={0.0006}
      shadow-radius={10}
      shadow-blurSamples={16}
    >
      <orthographicCamera attach="shadow-camera" args={[-0.26, 0.26, 0.2, -0.2, 0.2, 1.2]} />
    </directionalLight>
  )
}

export function Scene({ low = false }: { low?: boolean }) {
  const [quality, setQuality] = useState<Quality>(low ? 'low' : 'high')
  const [dprMax, setDprMax] = useState(low ? 1.5 : 2)
  const dpr = useMemo<[number, number]>(() => [1, dprMax], [dprMax])
  const shadows = quality !== 'low'
  return (
    <Canvas
      dpr={dpr}
      shadows={!low}
      gl={{ antialias: quality !== 'high', alpha: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.85, powerPreference: 'high-performance' }}
      camera={{ fov: 30, near: 0.01, far: 10, position: [0, 0.26, 0.4] }}
      style={{ position: 'fixed', inset: 0, zIndex: 1 }}
    >
      {/* weak devices: step down high → mid (no AO / DoF / reflections) → low (no post at all), then lower dpr */}
      <PerformanceMonitor
        flipflops={2}
        onDecline={() => {
          setQuality((q) => (q === 'high' ? 'mid' : 'low'))
          setDprMax((d) => (quality === 'low' ? Math.max(1, d - 0.5) : d))
        }}
      />
      <StudioEnv intensity={0.55} />
      {/* rim / back light: bright contour along the back edges of the case and caps */}
      <directionalLight position={[0.1, 0.25, -0.6]} intensity={1.7} color="#ffffff" />
      {shadows && <ShadowLight size={quality === 'high' ? 2048 : 1024} />}
      <Suspense fallback={null}>
        <KeyboardModel low={low} />
        <Glow />
        {quality === 'high' && <Floor />}
        {/* soft floor shadow: with post FX — the shadow-mapped key light on a ShadowMaterial plane (exactly 0 alpha where lit;
            ContactShadows' plane leaves a faint dark rectangle over the HTML backdrop in the half-float chain);
            without post FX (phones) — ContactShadows, rendered once */}
        {quality !== 'low' ? (
          <mesh rotation-x={-Math.PI / 2} position={[0, -0.0002, 0]} receiveShadow renderOrder={-2}>
            <planeGeometry args={[0.9, 0.7]} />
            <shadowMaterial transparent opacity={0.55} color="#000000" depthWrite={false} />
          </mesh>
        ) : (
          <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={0.7} blur={2.6} far={0.08} resolution={256} frames={1} color="#000000" />
        )}
        <Ready />
      </Suspense>
      <CameraRig />
      <Overlay />
      <PauseWhenCovered />
      <Effects quality={quality} />
    </Canvas>
  )
}
