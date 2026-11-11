import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Lightweight MX-style switch for instancing under every keycap.
 * Metres, origin = plate surface, +Y = switch axis. Sized to match switch-hero.glb
 * (top housing ~15.6 → 10.8 mm, ~5 mm tall, stem top ~10 mm) and to stay hidden inside a keycap.
 */

function frustum(bw: number, bd: number, tw: number, td: number, h: number) {
  // 4-sided frustum via a 4-segment cylinder rotated 45°, then scaled
  const g = new THREE.CylinderGeometry(Math.SQRT1_2, Math.SQRT1_2, 1, 4, 1, false)
  g.rotateY(Math.PI / 4)
  const p = g.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < p.count; i++) {
    const top = p.getY(i) > 0
    p.setX(i, p.getX(i) * (top ? tw : bw))
    p.setZ(i, p.getZ(i) * (top ? td : bd))
    p.setY(i, (p.getY(i) + 0.5) * h)
  }
  g.computeVertexNormals()
  return g.toNonIndexed()
}

export function simpleHousingGeometry() {
  const top = frustum(0.0156, 0.0156, 0.0108, 0.0122, 0.0050)
  top.computeVertexNormals()
  return top
}

export function simpleStemGeometry() {
  const body = new THREE.BoxGeometry(0.0072, 0.0036, 0.0056).toNonIndexed()
  body.translate(0, 0.0028, 0)
  const a = new THREE.BoxGeometry(0.0041, 0.0050, 0.0012).toNonIndexed()
  a.translate(0, 0.0072, 0)
  const b = new THREE.BoxGeometry(0.0012, 0.0050, 0.0041).toNonIndexed()
  b.translate(0, 0.0072, 0)
  return mergeGeometries([body, a, b], false)!
}

export function simpleBaseGeometry() {
  // black flange that reads as the bottom housing seen through the clear top
  const g = new THREE.BoxGeometry(0.0150, 0.0012, 0.0150).toNonIndexed()
  g.translate(0, 0.0006, 0)
  return g
}
