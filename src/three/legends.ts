import * as THREE from 'three'
import type { KeyDef, Legend, CapColor } from './layout'
import { U } from './parts'

export const FONT = '"Unbounded Variable", "Unbounded", system-ui, sans-serif'

const P = (rows: string) => rows.trim().split('\n').map((r) => r.trim())

export const ICONS: Record<string, string[]> = {
  heart: P(`
    .##.##.
    #######
    #######
    .#####.
    ..###..
    ...#...`),
  heartO: P(`
    .##...##.
    #..#.#..#
    #...#...#
    #.......#
    .#.....#.
    ..#...#..
    ...#.#...
    ....#....`),
  moon: P(`
    ...####..
    .###.....
    .##......
    ##.......
    ##.......
    ##.......
    .##......
    .###.....
    ...####..`),
  star: P(`
    .....#.....
    ....###....
    ....###....
    ###########
    .#########.
    ..#######..
    ..#######..
    .####.####.
    .###...###.
    .#.......#.`),
  sparkle: P(`
    ...#...
    ...#...
    ..###..
    #######
    ..###..
    ...#...
    ...#...`),
  burst: P(`
    #...#...#
    .#..#..#.
    ..#####..
    ..##.##..
    ####.####
    ..##.##..
    ..#####..
    .#..#..#.
    #...#...#`),
  flower: P(`
    ...###...
    ..#####..
    ###.#.###
    #########
    ##.###.##
    #########
    ###.#.###
    ..#####..
    ...###...`),
  flame: P(`
    ...#...
    ...##..
    ..###..
    ..####.
    .#####.
    .##.##.
    ###.###
    ##...##
    ##...##
    .#####.`),
  crystal: P(`
    ...#...
    ..###..
    .#####.
    ##.####
    ##.####
    ##.####
    ##.####
    .#####.
    ..###..
    ...#...`),
  thumb: P(`
    ....##...
    ....##...
    ...###...
    .########
    ##.######
    ##.######
    ##.######
    ##.#####.
    ##.####..`),
  spiral: P(`
    #########
    #.......#
    #.#####.#
    #.#...#.#
    #.#.#.#.#
    #.#.###.#
    #.#.....#
    #.#######`),
  excl: P(`
    ###
    ###
    ###
    ###
    ###
    .#.
    ...
    ###
    ###`),
  bell: P(`
    ....#....
    ..#####..
    .#######.
    .#######.
    .#######.
    .#######.
    #########
    .........
    ...###...`),
  house: P(`
    ....#....
    ...###...
    ..#####..
    .#######.
    #########
    .##...##.
    .##.#.##.
    .##...##.`),
  bunny: P(`
    .##.....##.
    .##.....##.
    .##.....##.
    ..##...##..
    ..#######..
    .#########.
    .##.###.##.
    .#########.
    .####.####.
    ..#######..`),
  lock: P(`
    ..###..
    .#...#.
    .#...#.
    #######
    ###.###
    ###.###
    #######`),
  chevL: P(`
    ...#
    ..##
    .##.
    ##..
    .##.
    ..##
    ...#`),
  cross: P(`
    #...#
    .#.#.
    ..#..
    .#.#.
    #...#`),
}

function mirror(rows: string[]) {
  return rows.map((r) => r.split('').reverse().join(''))
}
ICONS.chevR = mirror(ICONS.chevL)

function drawPixels(ctx: CanvasRenderingContext2D, rows: string[], cx: number, cy: number, px: number) {
  const h = rows.length
  const w = rows[0].length
  const x0 = Math.round(cx - (w * px) / 2)
  const y0 = Math.round(cy - (h * px) / 2)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) if (rows[y][x] === '#') ctx.fillRect(x0 + x * px, y0 + y * px, Math.ceil(px), Math.ceil(px))
}

const INK: Record<CapColor, string> = { black: '#f1efe9', red: '#fbf3f0', white: '#121212' }
export const RED = '#d42a2e'

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function drawArrowKey(ctx: CanvasRenderingContext2D, dir: string, cx: number, cy: number, s: number) {
  ctx.lineWidth = s * 0.07
  roundRect(ctx, cx - s / 2, cy - s / 2, s, s, s * 0.14)
  ctx.stroke()
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate({ arrowU: 0, arrowR: Math.PI / 2, arrowD: Math.PI, arrowL: -Math.PI / 2 }[dir] ?? 0)
  ctx.beginPath()
  const t = s * 0.26
  ctx.moveTo(0, -t)
  ctx.lineTo(t * 1.05, t * 0.75)
  ctx.lineTo(-t * 1.05, t * 0.75)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

/** draws a legend into the box (x, y, w, h) — the top face of the key */
function drawLegend(ctx: CanvasRenderingContext2D, key: KeyDef, x: number, y: number, w: number, h: number) {
  const L: Legend = key.legend
  const ink = INK[key.color]
  ctx.fillStyle = ink
  ctx.strokeStyle = ink
  ctx.textBaseline = 'alphabetic'
  const pad = h * 0.17
  switch (L.kind) {
    case 'dual': {
      const short = L.main.length === 1
      const size = h * (short ? 0.25 : 0.2)
      ctx.font = `600 ${size}px ${FONT}`
      ctx.textAlign = 'left'
      const by = y + pad + size * 0.85
      ctx.fillText(L.main, x + pad, by)
      if (L.sub) {
        const mw = ctx.measureText(L.main).width
        ctx.font = `400 ${size * 0.82}px ${FONT}`
        ctx.globalAlpha = 0.72
        ctx.fillText(L.sub, x + pad + mw + size * 0.35, by)
        ctx.globalAlpha = 1
      }
      break
    }
    case 'text': {
      const size = h * 0.2
      ctx.font = `800 ${size}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.save()
      ctx.translate(x + w / 2, y + h / 2 + size * 0.36)
      ctx.transform(1, 0, -0.2, 1, 0, 0)
      ctx.fillText(L.text, 0, 0)
      ctx.restore()
      break
    }
    case 'icon': {
      const cx = x + w / 2
      const cy = y + h / 2
      const name = L.icon
      if (name.startsWith('arrow')) {
        drawArrowKey(ctx, name, cx, cy, h * 0.42)
        break
      }
      if (name === 'chevL' || name === 'chevR') {
        const n = key.w >= 2.2 ? 4 : 3
        const px = h * 0.05
        const step = px * 4.6
        for (let i = 0; i < n; i++) drawPixels(ctx, ICONS[name], cx + (i - (n - 1) / 2) * step, cy, px)
        break
      }
      if (name === 'hearts') {
        const px = h * 0.04
        drawPixels(ctx, ICONS.heart, cx - px * 9, cy, px)
        drawPixels(ctx, ICONS.heartO, cx, cy, px * 0.8)
        drawPixels(ctx, ICONS.heart, cx + px * 9, cy, px)
        break
      }
      if (name === 'heartCursor') {
        const px = h * 0.045
        drawPixels(ctx, ICONS.heartO, cx, cy, px)
        ctx.beginPath()
        const ax = cx + px * 1.5
        const ay = cy + px * 0.5
        ctx.moveTo(ax, ay)
        ctx.lineTo(ax, ay + px * 6)
        ctx.lineTo(ax + px * 1.6, ay + px * 4.5)
        ctx.lineTo(ax + px * 4.2, ay + px * 4.4)
        ctx.closePath()
        ctx.fill()
        break
      }
      const rows = ICONS[name]
      if (!rows) break
      const big = name === 'moon' ? 0.62 : name === 'star' && key.w > 2 ? 0.62 : 0.4
      const px = (h * big) / Math.max(rows.length, rows[0].length)
      drawPixels(ctx, rows, cx, cy, px)
      break
    }
    case 'enter': {
      const px = h * 0.032
      const cy = y + h / 2
      ctx.fillStyle = '#141414'
      drawPixels(ctx, ICONS.sparkle, x + w * 0.27, cy, px)
      drawPixels(ctx, ICONS.heartO, x + w * 0.5, cy, px)
      drawPixels(ctx, ICONS.cross, x + w * 0.73, cy, px * 1.2)
      break
    }
    case 'space': {
      const cy = y + h / 2
      // halftone diamonds fading towards the left
      ctx.fillStyle = '#d9d6cf'
      const g = h * 0.07
      for (let gx = 0; gx < w * 0.55; gx += g) {
        const t = gx / (w * 0.55)
        const s = g * 0.42 * t
        for (let gy = g * 0.6; gy < h - g * 0.4; gy += g) {
          const ox = x + w * 0.45 + gx + ((gy / g) % 2 ? g / 2 : 0)
          ctx.beginPath()
          ctx.moveTo(ox, y + gy - s)
          ctx.lineTo(ox + s, y + gy)
          ctx.lineTo(ox, y + gy + s)
          ctx.lineTo(ox - s, y + gy)
          ctx.fill()
        }
      }
      // ≡ bars
      ctx.fillStyle = '#141414'
      const bx = x + h * 0.32
      for (let i = -1; i <= 1; i++) ctx.fillRect(bx, cy + i * h * 0.075 - h * 0.022, h * 0.22, h * 0.044)
      drawPixels(ctx, ICONS.sparkle, bx + h * 0.42, cy, h * 0.03)
      // pill with name
      const pw = h * 1.5
      const ph = h * 0.26
      const pxl = bx + h * 0.62
      ctx.strokeStyle = '#141414'
      ctx.lineWidth = h * 0.022
      roundRect(ctx, pxl, cy - ph / 2, pw, ph, ph / 2)
      ctx.stroke()
      ctx.fillStyle = RED
      ctx.font = `800 ${h * 0.14}px ${FONT}`
      ctx.textAlign = 'center'
      ctx.save()
      ctx.translate(pxl + pw / 2, cy + h * 0.05)
      ctx.transform(1, 0, -0.2, 1, 0, 0)
      ctx.fillText('ИСКРА', 0, 0)
      ctx.restore()
      // red crescent on the right
      drawPixels(ctx, ICONS.moon, x + w - h * 0.6, cy, h * 0.05)
      break
    }
  }
}

export interface Atlas {
  texture: THREE.CanvasTexture
  /** per key: u0, v0, du, dv */
  cells: Map<string, [number, number, number, number]>
}

/** top-face aspect for a key of width w (matches keycapGeometry) */
export function topAspect(w: number) {
  const bw = w * U - 0.9
  const bd = U - 0.9
  return (bw - 5.6) / (bd - 4.2)
}

export async function buildAtlas(keys: KeyDef[], size = 2048): Promise<Atlas> {
  try {
    await Promise.all([
      document.fonts.load(`400 40px ${FONT}`, 'Aй'),
      document.fonts.load(`600 40px ${FONT}`, 'Aй'),
      document.fonts.load(`800 40px ${FONT}`, 'CTRLИСКРА'),
    ])
  } catch {
    /* fall back to system font */
  }
  const H = Math.floor(size / 12)
  const gut = 10
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const cells = new Map<string, [number, number, number, number]>()
  let cx = gut
  let cy = gut
  for (const key of keys) {
    const w = Math.round(H * topAspect(key.w))
    if (cx + w + gut > size) {
      cx = gut
      cy += H + gut
    }
    drawLegend(ctx, key, cx, cy, w, H)
    cells.set(key.id, [cx / size, 1 - (cy + H) / size, w / size, H / size])
    cx += w + gut
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  return { texture: tex, cells }
}
