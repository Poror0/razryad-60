// Product renders for the kit cards (transparent WebP) from our own 3D models.
//   npm run dev  →  node scripts/renders.mjs   →  public/renders/{switch,keycap,keyboard}.webp
import fs from 'node:fs'
import { chromium } from 'playwright'

const base = process.argv[2] ?? 'http://localhost:5173'
fs.mkdirSync('public/renders', { recursive: true })
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] })
const page = await browser.newPage({ viewport: { width: 480, height: 480 }, deviceScaleFactor: 1 })
for (const item of ['switch', 'keycap', 'keyboard']) {
  await page.goto(`${base}/render.html?item=${item}`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 60000 })
  // canvas renders at dpr 2 → 960² source; re-encode to WebP in the page
  const data = await page.evaluate(async () => {
    const c = document.querySelector('canvas')
    const blob = await new Promise((r) => c.toBlob(r, 'image/webp', 0.86))
    const buf = new Uint8Array(await blob.arrayBuffer())
    let s = ''
    for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i])
    return btoa(s)
  })
  fs.writeFileSync(`public/renders/${item}.webp`, Buffer.from(data, 'base64'))
  console.log('saved', `public/renders/${item}.webp`, Math.round(data.length * 0.75 / 1024) + ' KB')
}
await browser.close()
