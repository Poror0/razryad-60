import { useEffect, useMemo, useRef } from 'react'
import { glowObjects } from './glowRegistry'
import * as THREE from 'three'
import { PALETTE } from './recolor'

/** Soft red under-glow: an additive radial gradient on the floor under the case.
 *  (A red point light was tried: at ~7 cm it blew the space bar out to orange.) */
export function Glow() {
  const tex = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 256
    const x = c.getContext('2d')!
    const g = x.createRadialGradient(128, 128, 0, 128, 128, 128)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    x.fillStyle = g
    x.fillRect(0, 0, 256, 256)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    return t
  }, [])
  return (
    <>
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.0004, 0.01]} scale={[0.62, 0.3, 1]} renderOrder={-1}>
        <planeGeometry />
        <meshBasicMaterial map={tex} color={PALETTE.red} transparent opacity={0.42} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    </>
  )
}

/** rounded-rect glow band texture: bright on the outline, soft falloff outwards (fake blur by stacked strokes) */
function bandTexture(w: number, h: number, margin: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const x = c.getContext('2d')!
  const rr = (inset: number) => {
    const r = 18
    x.beginPath()
    x.roundRect(inset, inset, w - inset * 2, h - inset * 2, r)
  }
  for (let i = 18; i >= 0; i--) {
    const k = i / 18
    x.lineWidth = 2 + k * margin * 1.6
    x.strokeStyle = `rgba(255,255,255,${(0.07 * (1 - k) ** 1.6).toFixed(3)})`
    rr(margin)
    x.stroke()
  }
  x.lineWidth = 3
  x.strokeStyle = 'rgba(255,255,255,0.9)'
  rr(margin)
  x.stroke()
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/**
 * Underglow: a red light band on the floor hugging the base of the case (keyboard space).
 * HDR colour, unlit, fed to the selective bloom so it softly spills onto the floor.
 */
export function Underglow({ hx = 0.147, hz = 0.0526, intensity = 0.9 }: { hx?: number; hz?: number; intensity?: number }) {
  const pad = 0.022
  const ref = useRef<THREE.Mesh>(null)
  const tex = useMemo(() => {
    const ppm = 3000 // px per metre
    return bandTexture(Math.round((hx + pad) * 2 * ppm), Math.round((hz + pad) * 2 * ppm), Math.round((pad - 0.0012) * ppm))
  }, [hx, hz])
  useEffect(() => {
    const m = ref.current
    if (!m) return
    glowObjects.add(m)
    return () => void glowObjects.delete(m)
  }, [])
  return (
    <mesh ref={ref} rotation-x={-Math.PI / 2} position={[0, 0.0003, 0]} renderOrder={2}>
      <planeGeometry args={[(hx + pad) * 2, (hz + pad) * 2]} />
      {/* writes depth so the selective bloom's depth mask picks it up */}
      <meshBasicMaterial map={tex} color={new THREE.Color(PALETTE.red).multiplyScalar(intensity)} transparent blending={THREE.AdditiveBlending} toneMapped={false} />
    </mesh>
  )
}
