import { useMemo } from 'react'
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
