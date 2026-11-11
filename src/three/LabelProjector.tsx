import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { anim } from '../scroll/anim'
import { heroParts, LABELED_PARTS } from './SwitchHero'

const p = new THREE.Vector3()
const edge = new THREE.Vector3()
const right = new THREE.Vector3()

/**
 * Projects hero switch parts to screen and positions the DOM labels (#label-<Part>)
 * and their leader lines (#line-<Part>) — written directly, no React state.
 */
export function LabelProjector() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  useFrame(() => {
    const root = document.getElementById('labels')
    if (!root) return
    const o = anim.labels
    root.style.opacity = String(o)
    root.style.visibility = o > 0.01 ? 'visible' : 'hidden'
    if (o <= 0.01) return
    right.set(1, 0, 0).applyQuaternion(camera.quaternion)
    const narrow = size.width < 640
    for (const name of LABELED_PARTS) {
      const obj = heroParts[name]
      const label = document.getElementById(`label-${name}`)
      const line = document.getElementById(`line-${name}`) as SVGLineElement | null
      if (!obj || !label || !line) continue
      obj.getWorldPosition(p)
      edge.copy(p).addScaledVector(right, 0.0085)
      p.project(camera)
      edge.project(camera)
      const ex = (edge.x * 0.5 + 0.5) * size.width
      const ey = (-edge.y * 0.5 + 0.5) * size.height
      const lx = narrow ? size.width - 16 : Math.min(size.width - 24, ex + Math.max(90, size.width * 0.12))
      line.setAttribute('x1', ex.toFixed(1))
      line.setAttribute('y1', ey.toFixed(1))
      line.setAttribute('x2', (narrow ? lx - label.offsetWidth - 8 : lx).toFixed(1))
      line.setAttribute('y2', ey.toFixed(1))
      label.style.transform = narrow
        ? `translate(${(lx - label.offsetWidth).toFixed(1)}px, ${(ey - label.offsetHeight / 2).toFixed(1)}px)`
        : `translate(${(lx + 10).toFixed(1)}px, ${(ey - label.offsetHeight / 2).toFixed(1)}px)`
    }
  })
  return null
}
