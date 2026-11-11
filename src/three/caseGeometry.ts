import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export const TILT_DEG = 6
export const TAN = Math.tan((TILT_DEG * Math.PI) / 180)

function rrShape(w: number, d: number, r: number, path: THREE.Shape | THREE.Path = new THREE.Shape()) {
  const x = -w / 2
  const y = -d / 2
  path.moveTo(x + r, y)
  path.lineTo(x + w - r, y)
  path.quadraticCurveTo(x + w, y, x + w, y + r)
  path.lineTo(x + w, y + d - r)
  path.quadraticCurveTo(x + w, y + d, x + w - r, y + d)
  path.lineTo(x + r, y + d)
  path.quadraticCurveTo(x, y + d, x, y + d - r)
  path.lineTo(x, y + r)
  path.quadraticCurveTo(x, y, x + r, y)
  return path
}

/** extrudes a plan-view shape upwards (y) between y0 and y1 */
function extrudeUp(shape: THREE.Shape, y0: number, y1: number, bevel: number, curveSegments = 6) {
  const depth = Math.max(0.01, y1 - y0 - 2 * bevel)
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments,
  })
  // shape (x, y) -> plan (x, -z); extrusion (z) -> up (y)
  g.rotateX(-Math.PI / 2)
  g.translate(0, y0 + bevel, 0)
  return g
}

export interface CaseDims {
  w: number
  d: number
  r: number
  /** plane-frame origin height above the table at z = 0 */
  hMid: number
  /** rim top above plate */
  rimTop: number
  /** rim bottom (below plate), plane frame */
  rimBottom: number
  holeW: number
  holeD: number
}

/**
 * Wedge-shaped lower body made of stacked bevelled slabs (gives the grooved side).
 * Built flat, then warped so top follows the 6° plane: hTop(z) = hMid + rimBottom - z * tan.
 */
export function bodyGeometry(c: CaseDims, slabs = 4) {
  const parts: THREE.BufferGeometry[] = []
  const H0 = 10
  for (let i = 0; i < slabs; i++) {
    const inset = i === slabs - 1 ? 0 : 0.0
    parts.push(extrudeUp(rrShape(c.w - inset, c.d - inset, c.r) as THREE.Shape, (i * H0) / slabs, ((i + 1) * H0) / slabs, 0.7, 8))
  }
  const g = mergeGeometries(parts, false)!
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i)
    const top = c.hMid + c.rimBottom - z * TAN
    p.setY(i, (p.getY(i) / H0) * top)
  }
  g.computeVertexNormals()
  return g
}

/** black grooved side panel, warped like the body */
export function sidePanelGeometry(c: CaseDims, side: 1 | -1) {
  const parts: THREE.BufferGeometry[] = []
  const depth = c.d * 0.62
  for (let i = 0; i < 3; i++) {
    const b = new THREE.BoxGeometry(1.2, 1, depth - i * 0.01)
    b.translate(side * (c.w / 2 + 0.2), 0.5, -c.d * 0.04)
    // three ribs, each a third of the height with small gaps
    const pp = b.attributes.position as THREE.BufferAttribute
    for (let j = 0; j < pp.count; j++) pp.setY(j, (i + 0.12 + pp.getY(j) * 0.76) / 3)
    parts.push(b)
  }
  const g = mergeGeometries(parts, false)!
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const z = p.getZ(i)
    const top = c.hMid + c.rimBottom - z * TAN
    // occupy middle band of the body height
    p.setY(i, top * (0.22 + p.getY(i) * 0.6))
  }
  g.computeVertexNormals()
  return g
}

/** top rim with the key well, in the tilted plane frame (plate top = 0) */
export function rimGeometry(c: CaseDims) {
  const outer = rrShape(c.w, c.d, c.r) as THREE.Shape
  const hole = rrShape(c.holeW, c.holeD, 3, new THREE.Path())
  outer.holes.push(hole as THREE.Path)
  // two layers -> one more groove
  const a = extrudeUp(outer, c.rimBottom, c.rimBottom + (c.rimTop - c.rimBottom) * 0.45, 0.7, 10)
  const b = extrudeUp(outer, c.rimBottom + (c.rimTop - c.rimBottom) * 0.45, c.rimTop, 0.9, 10)
  return mergeGeometries([a, b], false)!
}

/** plate texture: dark diamond pattern, denser near the edges */
export function plateTexture(w: number, d: number) {
  const pxPerMm = 4
  const cw = Math.round(w * pxPerMm)
  const ch = Math.round(d * pxPerMm)
  const cv = document.createElement('canvas')
  cv.width = cw
  cv.height = ch
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = '#0a0a0b'
  ctx.fillRect(0, 0, cw, ch)
  const g = 5.2 * pxPerMm
  ctx.fillStyle = '#26262a'
  for (let y = 0; y < ch + g; y += g / 2) {
    const row = Math.round(y / (g / 2))
    for (let x = row % 2 ? g / 2 : 0; x < cw + g; x += g) {
      // density: stronger toward right and edges, like the reference
      const nx = x / cw
      const ny = y / ch
      const edge = Math.max(Math.abs(nx - 0.5) * 2, Math.abs(ny - 0.5) * 2)
      const t = Math.min(1, Math.max(0, (edge - 0.35) / 0.6) + (nx > 0.8 ? 0.35 : 0))
      const s = (g / 2) * 0.82 * t
      if (s < 0.6) continue
      ctx.beginPath()
      ctx.moveTo(x, y - s)
      ctx.lineTo(x + s, y)
      ctx.lineTo(x, y + s)
      ctx.lineTo(x - s, y)
      ctx.fill()
    }
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return tex
}

/** knurled knob: cylinder with ribbed side */
export function knobGeometry(r = 9, h = 12, ribs = 48) {
  const g = new THREE.CylinderGeometry(r, r, h, ribs * 2, 1, false)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const z = p.getZ(i)
    const rr = Math.hypot(x, z)
    if (rr > r * 0.98) {
      const a = Math.atan2(z, x)
      const k = Math.round(((a + Math.PI) / (2 * Math.PI)) * ribs * 2) % 2 === 0 ? 1 : 0.955
      p.setX(i, x * k)
      p.setZ(i, z * k)
    }
  }
  g.computeVertexNormals()
  g.translate(0, h / 2, 0)
  return g
}
