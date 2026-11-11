import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { loft } from './loft'

/** 1u in millimetres */
export const U = 19.05

export type Row = 1 | 2 | 3 | 4

/** Cherry-like sculpted profile: height of top edge and tilt per row */
export const PROFILE: Record<Row, { h: number; tilt: number }> = {
  1: { h: 9.6, tilt: 9 },
  2: { h: 8.0, tilt: 4.5 },
  3: { h: 7.4, tilt: 0 },
  4: { h: 8.2, tilt: -7 },
}

/** keycap rim height above the plate when assembled */
export const CAP_BASE = 7.0
/** top housing height above the plate */
export const TOP_H = 6.4
export const STEM_TOP = 10.2

function stripUv(g: THREE.BufferGeometry) {
  const n = g.attributes.position.count
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(n * 2).fill(-1), 2))
  return g
}


const capCache = new Map<string, THREE.BufferGeometry>()

/** keycap of width w (in u) for profile row */
export function keycapGeometry(w: number, row: Row): THREE.BufferGeometry {
  const key = `${w}-${row}`
  const hit = capCache.get(key)
  if (hit) return hit
  const p = PROFILE[row]
  const bw = w * U - 0.9
  const bd = U - 0.9
  const isSpace = w >= 6
  const shell = loft({
    bw,
    bd,
    br: 1.1,
    tw: bw - 5.6,
    td: bd - 4.2,
    tr: 2.2,
    h: p.h,
    fillet: 1.1,
    bulge: 0.35,
    dish: isSpace ? 0.35 : 0.6,
    tilt: p.tilt,
    topShift: -0.5,
    k: 6,
    hollow: { wall: 1.3, depth: 4.0 },
  })
  // cross socket inside the hollow
  const socket = stripUv(new THREE.CylinderGeometry(2.75, 2.75, 3.4, 20, 1, false))
  socket.translate(0, 0.6 + 1.7, 0)
  const parts = [shell, socket]
  // stabiliser sockets for long keys
  if (w >= 2) {
    const off = w >= 6 ? 50 : 11.9
    for (const s of [-1, 1]) {
      const st = stripUv(new THREE.CylinderGeometry(2.4, 2.4, 3.4, 16))
      st.translate(s * off, 2.3, 0)
      parts.push(st)
    }
  }
  const g = mergeGeometries(parts, false)!
  g.setAttribute('topUv', g.attributes.uv)
  capCache.set(key, g)
  return g
}

/** --- MX-style switch parts. Origin: plate top surface. --- */

export function bottomHousingGeometry(): THREE.BufferGeometry {
  const body = loft({ bw: 13.9, bd: 13.9, br: 0.6, tw: 13.9, td: 13.9, tr: 0.6, h: 4.6, k: 3 })
  body.translate(0, -5.0, 0)
  // flange that sits on the plate
  const flange = loft({ bw: 15.6, bd: 15.6, br: 0.9, tw: 15.4, td: 15.4, tr: 0.8, h: 0.8, k: 3 })
  flange.translate(0, -2.4, 0) // just under the plate (avoids z-fighting with plate top)
  const pole = new THREE.CylinderGeometry(1.95, 1.95, 3.2, 20)
  pole.translate(0, -5.0 - 1.6, 0)
  const pin1 = new THREE.CylinderGeometry(0.85, 0.85, 3.0, 10)
  pin1.translate(-5.08, -6.5, 0)
  const pin2 = new THREE.CylinderGeometry(0.85, 0.85, 3.0, 10)
  pin2.translate(5.08, -6.5, 0)
  // guide post in the middle (visible through the clear top)
  const post = new THREE.CylinderGeometry(1.4, 1.6, 2.6, 16)
  post.translate(0, 1.3, 0)
  return mergeGeometries([body, flange, pole, pin1, pin2, post].map(stripUv), false)!
}

export function topHousingGeometry(): THREE.BufferGeometry {
  const g = loft({
    bw: 15.4,
    bd: 15.4,
    br: 1.0,
    tw: 10.8,
    td: 12.2,
    tr: 1.0,
    h: TOP_H,
    fillet: 0.6,
    k: 4,
    hollow: { wall: 1.2, depth: TOP_H - 1.2 },
  })
  // LED window lip at the back
  const lip = new THREE.BoxGeometry(5.6, 1.6, 1.2)
  lip.translate(0, 1.8, -6.6)
  return mergeGeometries([stripUv(g), stripUv(lip)], false)!
}

export function stemGeometry(): THREE.BufferGeometry {
  const body = new THREE.BoxGeometry(7.4, 4.0, 5.8)
  body.translate(0, 1.0 + 2.0, 0)
  const neck = new THREE.CylinderGeometry(2.8, 2.8, 1.4, 20)
  neck.translate(0, 5.0 + 0.7, 0)
  const crossA = new THREE.BoxGeometry(4.1, 4.4, 1.3)
  crossA.translate(0, STEM_TOP - 2.2, 0)
  const crossB = new THREE.BoxGeometry(1.3, 4.4, 4.1)
  crossB.translate(0, STEM_TOP - 2.2, 0)
  const legL = new THREE.BoxGeometry(1.0, 3.0, 2.0)
  legL.translate(-2.6, -0.5, 1.8)
  const legR = new THREE.BoxGeometry(1.0, 3.0, 2.0)
  legR.translate(2.6, -0.5, 1.8)
  return mergeGeometries([body, neck, crossA, crossB, legL, legR].map(stripUv), false)!
}

/** helical spring as a tube. y from -4.6 to 3.6 when assembled */
export function springGeometry(coils = 10, radialSegments = 6): THREE.BufferGeometry {
  const r = 2.55
  const y0 = -4.6
  const y1 = 3.6
  const turns = coils
  const e = 0.08
  const pts: THREE.Vector3[] = []
  const N = coils * 24
  for (let i = 0; i <= N; i++) {
    const t = i / N
    const a = t * turns * Math.PI * 2
    let s: number
    if (t < e) s = (t / e) * 0.02
    else if (t > 1 - e) s = 0.98 + ((t - (1 - e)) / e) * 0.02
    else s = 0.02 + ((t - e) / (1 - 2 * e)) * 0.96
    pts.push(new THREE.Vector3(r * Math.cos(a), y0 + s * (y1 - y0), r * Math.sin(a)))
  }
  const curve = new THREE.CatmullRomCurve3(pts)
  const g = new THREE.TubeGeometry(curve, coils * 24, 0.22, radialSegments, false)
  return stripUv(g)
}

/** gold contact leaf (hero switch only) */
export function leafGeometry(): THREE.BufferGeometry {
  const a = new THREE.BoxGeometry(5.2, 3.4, 0.25)
  a.translate(-3.2, -2.2, -4.2)
  const b = new THREE.BoxGeometry(0.25, 3.0, 3.2)
  b.translate(-5.6, -2.0, -2.8)
  const pin = new THREE.BoxGeometry(0.9, 3.4, 0.25)
  pin.translate(-3.2, -5.2, -4.2)
  return mergeGeometries([a, b, pin].map(stripUv), false)!
}
