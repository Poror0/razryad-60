import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { anim } from '../scroll/anim'
import { heroParts } from './SwitchHero'
import { layout } from './layout'
import { CALLOUTS, PANELS, STAGE_COUNT, type Anchor } from '../content/stages'

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const ease = (t: number) => t * t * (3 - 2 * t)
/** stage progress 0 → 1 (in) → 2 (gone) as visibility 0..1..0 */
const vis = (p: number) => clamp01(p <= 1 ? p : 2 - p)
const stageP = (n: number) => anim[`p${n}` as 'p1'] ?? 0

const p = new THREE.Vector3()
const right = new THREE.Vector3()
const nodes = new Map<string, THREE.Object3D | null>()

/** last written value per element+prop: skip redundant DOM writes */
const last = new WeakMap<Element, Map<string, string>>()
function put(el: Element, key: string, value: string, write: (v: string) => void) {
  let m = last.get(el)
  if (!m) last.set(el, (m = new Map()))
  if (m.get(key) === value) return
  m.set(key, value)
  write(value)
}
const style = (el: HTMLElement | SVGElement, prop: string, value: string) =>
  put(el, prop, value, (v) => el.style.setProperty(prop, v))
const attr = (el: Element, name: string, value: string) => put(el as SVGElement, '@' + name, value, (v) => el.setAttribute(name, v))

/** anchor → world position (into `p`), false if not available yet */
function resolve(a: Anchor, camera: THREE.Camera): boolean {
  const g = layout.group
  if (!g) return false
  switch (a.kind) {
    case 'node': {
      if (!nodes.has(a.name)) nodes.set(a.name, layout.root?.getObjectByName(a.name) ?? null)
      const o = nodes.get(a.name)
      if (!o) return false
      o.getWorldPosition(p)
      return true
    }
    case 'seat': {
      p.set(0, 0, 0)
      let n = 0
      for (const k of a.keys) {
        const s = layout.seats[k]
        if (s) (p.add(s), n++)
      }
      if (!n) return false
      p.divideScalar(n)
      p.y += a.up ?? 0
      p.applyMatrix4(g.matrixWorld)
      return true
    }
    case 'point':
      p.fromArray(a.at).applyMatrix4(g.matrixWorld)
      return true
    case 'hero': {
      const o = heroParts[a.part]
      if (!o) return false
      o.getWorldPosition(p)
      right.set(1, 0, 0).applyQuaternion(camera.quaternion)
      p.addScaledVector(right, a.edge)
      return true
    }
  }
}

/**
 * Drives the DOM overlay every frame, straight from the scroll state (no React state):
 * stage panels (#panel-N), the stage progress rail (#rail) and callouts (#co-<id>, #co-label-<id>)
 * whose anchors are projected from 3D to screen.
 */
export function Overlay() {
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  useFrame(() => {
    const w = size.width
    const h = size.height
    const narrow = w < 768

    // ---- once the page scrolls past the 3D track, fixed panels + rail scroll away with it
    const track = document.querySelector('.track')
    const past = track ? Math.max(0, h - track.getBoundingClientRect().bottom) : 0
    style(document.documentElement, '--past', `${Math.round(past)}px`)

    // ---- panels: fade + rise in, keep rising out when the next stage starts
    for (const panel of PANELS) {
      const el = document.getElementById(`panel-${panel.n}`)
      if (!el) continue
      const sp = stageP(panel.n)
      const v = vis(sp)
      const dy = sp <= 1 ? (1 - ease(clamp01(sp))) * 28 : -(sp - 1) * 28
      style(el, 'opacity', v.toFixed(3))
      style(el, '--dy', `${dy.toFixed(1)}px`)
      style(el, 'visibility', v > 0.01 ? 'visible' : 'hidden')
      style(el, 'pointer-events', v > 0.6 ? 'auto' : 'none')
    }

    // ---- progress rail
    const rail = document.getElementById('rail')
    if (rail) {
      let reached = 0
      for (let n = 1; n <= STAGE_COUNT; n++) reached += clamp01(stageP(n))
      style(rail, 'opacity', clamp01(stageP(1)).toFixed(3))
      style(rail, 'visibility', stageP(1) > 0.01 ? 'visible' : 'hidden')
      style(rail, '--fill', clamp01((reached - 1) / (STAGE_COUNT - 1)).toFixed(4))
      let current = 0
      for (let n = 1; n <= STAGE_COUNT; n++) if (stageP(n) >= 0.5) current = n
      put(rail, 'data-current', String(current), () =>
        rail.querySelectorAll('.rail__dot').forEach((d, i) => {
          d.classList.toggle('is-done', i + 1 <= current)
          d.classList.toggle('is-current', i + 1 === current)
        }),
      )
    }

    // ---- callouts
    const k = narrow ? Math.min(0.55, w / 720) : Math.min(1, Math.max(0.7, w / 1440))
    for (const c of CALLOUTS) {
      const g = document.getElementById(`co-${c.id}`)
      const label = document.getElementById(`co-label-${c.id}`)
      if (!g || !label) continue
      const d = narrow && !c.main ? 0 : vis(stageP(c.stage))
      const on = d > 0.01 && resolve(c.anchor, camera)
      if (on) p.project(camera)
      if (!on || p.z > 1) {
        style(g, 'visibility', 'hidden')
        style(label, 'visibility', 'hidden')
        continue
      }
      const ax = (p.x * 0.5 + 0.5) * w
      const ay = (-p.y * 0.5 + 0.5) * h
      const lw = label.offsetWidth
      const lh = label.offsetHeight
      // phones may override the offset (px), otherwise the desktop one is scaled
      const [ox, oy] = narrow && c.m ? c.m : [c.dx * k, c.dy * k]
      const dir = Math.sign(ox) || 1
      const reach = Math.abs(ox)
      // label end of the leader, kept on screen
      let lx = ax + dir * reach
      // phones: keep callouts above the panel
      const ly = Math.min(narrow ? h * 0.52 : h - lh - 16, Math.max(lh + 72, ay + oy))
      // desktop: keep clear of the progress rail on the right
      lx = dir > 0 ? Math.min(lx, w - lw - (narrow ? 26 : 96)) : Math.max(lx, lw + 26)
      // 45° elbow, then horizontal to the label
      const rise = ly - ay
      const ex = ax + dir * Math.min(Math.abs(rise), Math.abs(lx - ax) * 0.6)
      const path = g.querySelector('path')
      const dot = g.querySelector('circle')
      const draw = ease(clamp01(d / 0.75))
      style(g, 'visibility', 'visible')
      if (path) {
        attr(path, 'd', `M${ax.toFixed(1)} ${ay.toFixed(1)}L${ex.toFixed(1)} ${ly.toFixed(1)}L${lx.toFixed(1)} ${ly.toFixed(1)}`)
        style(path, 'stroke-dashoffset', (1 - draw).toFixed(4))
      }
      if (dot) {
        attr(dot, 'cx', ax.toFixed(1))
        attr(dot, 'cy', ay.toFixed(1))
        style(dot, 'opacity', clamp01(d * 4).toFixed(3))
      }
      const lo = clamp01((d - 0.55) / 0.4)
      style(label, 'visibility', lo > 0.01 ? 'visible' : 'hidden')
      style(label, 'opacity', lo.toFixed(3))
      const tx = dir > 0 ? lx + 10 : lx - 10 - lw
      style(label, 'transform', `translate(${tx.toFixed(1)}px, ${(ly - lh / 2).toFixed(1)}px)`)
    }
  })
  return null
}
