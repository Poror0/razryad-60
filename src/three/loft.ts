import * as THREE from 'three'

/**
 * Builds closed "lofted" rounded-rectangle solids: keycaps, switch top housings.
 * Coordinates in millimetres. x — width, y — up, z — towards the viewer (front).
 */

export interface LoftOptions {
  /** bottom footprint */
  bw: number
  bd: number
  br: number
  /** flat top face */
  tw: number
  td: number
  tr: number
  /** height of top face edge above the base */
  h: number
  /** rounding between walls and top */
  fillet?: number
  /** outward bulge of walls at mid height */
  bulge?: number
  /** cylindrical dish depth on top (concave across width) */
  dish?: number
  /** top tilt in degrees, positive = back edge higher */
  tilt?: number
  /** shift of the top face along z (negative = back) */
  topShift?: number
  /** samples per corner */
  k?: number
  /** hollow bottom: wall thickness and recess depth */
  hollow?: { wall: number; depth: number }
}

type Ring = { pts: [number, number, number][] }

function rrect(hw: number, hd: number, r: number, k: number, cz = 0): [number, number][] {
  r = Math.max(0, Math.min(r, hw, hd))
  const out: [number, number][] = []
  const corners: [number, number, number][] = [
    [hw - r, hd - r, 0],
    [-(hw - r), hd - r, Math.PI / 2],
    [-(hw - r), -(hd - r), Math.PI],
    [hw - r, -(hd - r), (3 * Math.PI) / 2],
  ]
  for (const [cx, cz0, a0] of corners) {
    for (let i = 0; i < k; i++) {
      const a = a0 + (i / (k - 1)) * (Math.PI / 2)
      out.push([cx + r * Math.cos(a), cz0 + r * Math.sin(a) + cz])
    }
  }
  return out
}

/** stitches consecutive rings into a strip (all rings same point count) */
function strip(rings: Ring[], pos: number[], uv: number[], idx: number[], uvFn: (p: [number, number, number]) => [number, number]) {
  const n = rings[0].pts.length
  const base = pos.length / 3
  for (const r of rings) {
    for (const p of r.pts) {
      pos.push(p[0], p[1], p[2])
      const t = uvFn(p)
      uv.push(t[0], t[1])
    }
  }
  for (let ri = 0; ri < rings.length - 1; ri++) {
    for (let j = 0; j < n; j++) {
      const j1 = (j + 1) % n
      const a = base + ri * n + j
      const b = base + ri * n + j1
      const d = base + (ri + 1) * n + j
      const c = base + (ri + 1) * n + j1
      idx.push(a, c, b, a, d, c)
    }
  }
}

export function loft(o: LoftOptions): THREE.BufferGeometry {
  const k = o.k ?? 6
  const fillet = o.fillet ?? 0
  const bulge = o.bulge ?? 0
  const dish = o.dish ?? 0
  const tanT = Math.tan(((o.tilt ?? 0) * Math.PI) / 180)
  const shift = o.topShift ?? 0
  const thw = o.tw / 2
  const thd = o.td / 2

  // vertical offset for points near the top: tilt + dish
  const topDy = (x: number, z: number) => {
    const zz = z - shift
    const xn = Math.min(1, Math.abs(x) / thw)
    return -zz * tanT - dish * (1 - xn * xn)
  }

  const pos: number[] = []
  const uv: number[] = []
  const idx: number[] = []
  const noUv = () => [-1, -1] as [number, number]
  const topUv = (p: [number, number, number]) =>
    [(p[0] + thw) / (2 * thw), (thd - (p[2] - shift)) / (2 * thd)] as [number, number]

  // ---- outer walls + fillet + top face (one smooth strip)
  const rings: Ring[] = []
  const sideSteps = 6
  const wallTopW = o.tw + 2 * fillet
  const wallTopD = o.td + 2 * fillet
  const wallTopR = o.tr + fillet
  const wallTopH = o.h - fillet
  for (let i = 0; i <= sideSteps; i++) {
    const t = i / sideSteps
    const b = bulge * Math.sin(Math.PI * t)
    const w = THREE.MathUtils.lerp(o.bw, wallTopW, t) + 2 * b
    const d = THREE.MathUtils.lerp(o.bd, wallTopD, t) + 2 * b
    const r = THREE.MathUtils.lerp(o.br, wallTopR, t)
    const cz = shift * t
    const y = wallTopH * t
    rings.push({
      pts: rrect(w / 2, d / 2, r, k, cz).map(([x, z]) => [x, y + topDy(x, z) * t, z]),
    })
  }
  const filletSteps = fillet > 0 ? 4 : 0
  for (let i = 1; i <= filletSteps; i++) {
    const a = (i / filletSteps) * (Math.PI / 2)
    const off = fillet * Math.cos(a)
    const y = wallTopH + fillet * Math.sin(a)
    rings.push({
      pts: rrect(thw + off, thd + off, o.tr + off, k, shift).map(([x, z]) => [x, y + topDy(x, z), z]),
    })
  }
  // concentric rings across the top face
  const topSteps = 6
  for (let i = 1; i <= topSteps; i++) {
    const s = 1 - i / topSteps
    rings.push({
      pts: rrect(thw * s, thd * s, o.tr * s, k, shift).map(([x, z]) => [x, o.h + topDy(x, z), z]),
    })
  }
  strip(rings, pos, uv, idx, (p) => {
    // UV everywhere is the projection onto the top face; the shader clamps it,
    // and atlas cells are padded, so walls sample transparent pixels.
    return topUv(p)
  })

  // ---- bottom
  const bw2 = o.bw / 2
  const bd2 = o.bd / 2
  const ring = (hw: number, hd: number, r: number, y: number): Ring => ({
    pts: rrect(hw, hd, r, k).map(([x, z]) => [x, y, z]),
  })
  if (o.hollow) {
    const iw = bw2 - o.hollow.wall
    const id = bd2 - o.hollow.wall
    const ir = Math.max(0.2, o.br - o.hollow.wall * 0.5)
    const dy = o.hollow.depth
    strip([ring(0.001, 0.001, 0, dy), ring(iw, id, ir, dy)], pos, uv, idx, noUv) // recess ceiling
    strip([ring(iw, id, ir, dy), ring(iw, id, ir, 0)], pos, uv, idx, noUv) // inner wall
    strip([ring(iw, id, ir, 0), ring(bw2, bd2, o.br, 0)], pos, uv, idx, noUv) // rim
  } else {
    strip([ring(0.001, 0.001, 0, 0), ring(bw2, bd2, o.br, 0)], pos, uv, idx, noUv)
  }

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}
