import { useEffect, useRef } from 'react'

/**
 * Pixel-diamond grid behind the hero keyboard. Generated on a canvas (no images):
 * diamonds shrink and fade towards the edges (elliptical falloff around the glow centre),
 * a few random cells flicker red. Flicker is off for reduced motion / low quality and
 * pauses while the hero is off screen.
 */
export function DiamondGrid({ flicker = true, cx = 0.5, cy = 0.62 }: { flicker?: boolean; cx?: number; cy?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const base = document.createElement('canvas')
    const bctx = base.getContext('2d')!
    const PITCH = 14
    let cells: { x: number; y: number; s: number; f: number }[] = []
    let w = 0
    let h = 0

    const diamond = (c: CanvasRenderingContext2D, x: number, y: number, s: number) => {
      // crisp pixel diamond: stacked rows, width 1,3,5..
      for (let r = -s; r <= s; r++) {
        const half = s - Math.abs(r)
        c.fillRect(x - half, y + r, half * 2 + 1, 1)
      }
    }

    const layout = () => {
      const r = canvas.getBoundingClientRect()
      w = canvas.width = base.width = Math.max(1, Math.round(r.width))
      h = canvas.height = base.height = Math.max(1, Math.round(r.height))
      cells = []
      bctx.clearRect(0, 0, w, h)
      const ox = w * cx
      const oy = h * cy
      const rx = w * 0.55
      const ry = h * 0.62
      for (let y = PITCH / 2, row = 0; y < h; y += PITCH / 2, row++) {
        for (let x = row % 2 ? PITCH / 2 : 0; x < w; x += PITCH) {
          const d = Math.hypot((x - ox) / rx, (y - oy) / ry)
          const f = Math.max(0, 1 - d) // 1 at centre → 0 at the edge
          if (f <= 0.02) continue
          const s = Math.round(1 + f * 2.2) // 1..3 px half-size
          cells.push({ x: Math.round(x), y: Math.round(y), s, f })
          bctx.fillStyle = `rgba(238,234,226,${(0.03 + f * 0.12).toFixed(3)})`
          diamond(bctx, Math.round(x), Math.round(y), s)
        }
      }
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(base, 0, 0)
    }

    layout()
    const ro = new ResizeObserver(layout)
    ro.observe(canvas)

    let raf = 0
    let last = 0
    let visible = true
    const lit: { i: number; t0: number; dur: number }[] = []
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting))
    io.observe(canvas)

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick)
      if (!visible || t - last < 80 || !cells.length) return // ~12 fps is plenty
      last = t
      // spawn a few, weighted towards the centre
      for (let k = 0; k < 3; k++) {
        const i = Math.floor(Math.random() * cells.length)
        if (Math.random() < cells[i].f * 1.4) lit.push({ i, t0: t, dur: 600 + Math.random() * 900 })
      }
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(base, 0, 0)
      for (let j = lit.length - 1; j >= 0; j--) {
        const l = lit[j]
        const p = (t - l.t0) / l.dur
        if (p >= 1) {
          lit.splice(j, 1)
          continue
        }
        const a = Math.sin(p * Math.PI) * (0.35 + cells[l.i].f * 0.6)
        ctx.fillStyle = `rgba(214,40,48,${a.toFixed(3)})`
        const c = cells[l.i]
        diamond(ctx, c.x, c.y, c.s)
      }
    }
    if (flicker) raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
    }
  }, [flicker, cx, cy])

  return <canvas ref={ref} className="diamonds" aria-hidden="true" />
}
