// Prepares web-ready models from models/_source/*.
//   node scripts/prepare-models.mjs
// 1) keyboard: bakes transforms to metres, splits the "Plane" keycap mesh into 61
//    connected components (one node per keycap, pivot at the cap's bbox centre),
//    names caps by ANSI-60% layout.
// 2) switch-hero: extracts the blue "Mid … .001" switch, resets its exploded parts
//    to the assembled pose (using the assembled "Mid" switch as reference).
// Intermediate files go to models/_build/, then gltf-transform CLI optimizes them
// into public/models/.
import fs from 'node:fs'
import { execSync } from 'node:child_process'
import { NodeIO } from '@gltf-transform/core'
import { ALL_EXTENSIONS } from '@gltf-transform/extensions'
import { transformPrimitive, prune, dedup } from '@gltf-transform/functions'
import { mat4 } from 'gl-matrix'

const SRC = 'models/_source'
const BUILD = 'models/_build'
const OUT = 'public/models'
fs.mkdirSync(BUILD, { recursive: true })
fs.mkdirSync(OUT, { recursive: true })
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)

/** bake node world matrix (premultiplied by `pre`) into its mesh and re-parent to scene root */
function bakeNode(doc, scene, node, pre) {
  const m = mat4.multiply(mat4.create(), pre, node.getWorldMatrix())
  const mesh = node.getMesh()
  if (mesh) for (const p of mesh.listPrimitives()) transformPrimitive(p, m)
  for (const parent of node.listParents()) if (parent !== scene && parent.removeChild) parent.removeChild(node)
  node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]).setMatrix?.(mat4.create())
  scene.addChild(node)
}

function bboxOf(prims) {
  const min = [Infinity, Infinity, Infinity]
  const max = [-Infinity, -Infinity, -Infinity]
  for (const p of prims) {
    const a = p.getAttribute('POSITION')
    const v = [0, 0, 0]
    for (let i = 0; i < a.getCount(); i++) {
      a.getElement(i, v)
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k], v[k])
        max[k] = Math.max(max[k], v[k])
      }
    }
  }
  return { min, max, center: min.map((m, k) => (m + max[k]) / 2), size: min.map((m, k) => max[k] - m) }
}

function translatePrims(prims, d) {
  const m = mat4.fromTranslation(mat4.create(), d)
  for (const p of prims) transformPrimitive(p, m)
}

/** split an indexed primitive into connected components (welded by position) */
function components(prim) {
  const pos = prim.getAttribute('POSITION')
  const n = pos.getCount()
  const idx = prim.getIndices().getArray()
  const key = new Map()
  const id = new Int32Array(n)
  const v = [0, 0, 0]
  for (let i = 0; i < n; i++) {
    pos.getElement(i, v)
    const k = v.map((x) => x.toFixed(5)).join(',')
    if (!key.has(k)) key.set(k, key.size)
    id[i] = key.get(k)
  }
  const P = Int32Array.from({ length: key.size }, (_, i) => i)
  const f = (x) => {
    while (P[x] !== x) x = P[x] = P[P[x]]
    return x
  }
  for (let t = 0; t < idx.length; t += 3) {
    const a = f(id[idx[t]])
    P[f(id[idx[t + 1]])] = a
    P[f(id[idx[t + 2]])] = a
  }
  const groups = new Map() // root -> triangle list
  for (let t = 0; t < idx.length; t += 3) {
    const r = f(id[idx[t]])
    if (!groups.has(r)) groups.set(r, [])
    groups.get(r).push(idx[t], idx[t + 1], idx[t + 2])
  }
  return [...groups.values()]
}

function subPrimitive(doc, buffer, prim, tris) {
  const remap = new Map()
  const newIdx = new Uint32Array(tris.length)
  tris.forEach((oi, i) => {
    if (!remap.has(oi)) remap.set(oi, remap.size)
    newIdx[i] = remap.get(oi)
  })
  const np = doc.createPrimitive().setMaterial(prim.getMaterial()).setMode(prim.getMode())
  const count = remap.size
  const Idx = count < 65535 ? Uint16Array : Uint32Array
  np.setIndices(doc.createAccessor().setType('SCALAR').setArray(Idx.from(newIdx)).setBuffer(buffer))
  for (const sem of prim.listSemantics()) {
    const a = prim.getAttribute(sem)
    const size = a.getElementSize()
    const out = new (a.getArray().constructor)(count * size)
    const el = new Array(size)
    for (const [oi, ni] of remap) {
      a.getElement(oi, el)
      out.set(el, ni * size)
    }
    np.setAttribute(sem, doc.createAccessor().setType(a.getType()).setArray(out).setNormalized(a.getNormalized()).setBuffer(buffer))
  }
  return np
}

// ANSI 60% names per row (front row last)
const LAYOUT = [
  ['Esc', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'Minus', 'Equal', 'Backspace'],
  ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'BracketLeft', 'BracketRight', 'Backslash'],
  ['CapsLock', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Semicolon', 'Quote', 'Enter'],
  ['ShiftLeft', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Comma', 'Period', 'Slash', 'ShiftRight'],
  ['ControlLeft', 'MetaLeft', 'AltLeft', 'Space', 'AltRight', 'MetaRight', 'ContextMenu', 'ControlRight'],
]

async function keyboard() {
  const doc = await io.read(`${SRC}/custom_mechanical_keyboard/scene.gltf`)
  const root = doc.getRoot()
  const scene = root.getDefaultScene() ?? root.listScenes()[0]
  const buffer = root.listBuffers()[0]
  const byName = (n) => root.listNodes().find((x) => x.getName() === n)
  const caseN = byName('Cube')
  const plateN = byName('Cube.001')
  const capsN = byName('Plane')
  const meshNode = (n) => n.listChildren().find((c) => c.getMesh()) ?? n

  // bake world transforms (scale fixed later)
  const parts = { case: meshNode(caseN), plate: meshNode(plateN), caps: meshNode(capsN) }
  for (const n of Object.values(parts)) bakeNode(doc, scene, n, mat4.create())

  // split caps
  const capPrim = parts.caps.getMesh().listPrimitives()[0]
  const comps = components(capPrim).map((tris) => {
    const p = subPrimitive(doc, buffer, capPrim, tris)
    return { prim: p, bb: bboxOf([p]) }
  })
  console.log('keycap components:', comps.length)

  // scale: 1u pitch -> 19.05 mm. pitch = median x-distance between neighbours in a row.
  const zs = [...new Set(comps.map((c) => c.bb.center[2].toFixed(0)))]
  const rowsZ = zs.map(Number).sort((a, b) => a - b)
  const rows = []
  for (const c of comps.sort((a, b) => a.bb.center[2] - b.bb.center[2])) {
    const r = rows.find((r) => Math.abs(r.z - c.bb.center[2]) < 20)
    if (r) r.items.push(c)
    else rows.push({ z: c.bb.center[2], items: [c] })
  }
  rows.forEach((r) => r.items.sort((a, b) => a.bb.center[0] - b.bb.center[0]))
  const gaps = []
  for (const r of rows) for (let i = 1; i < r.items.length; i++) {
    const d = r.items[i].bb.center[0] - r.items[i - 1].bb.center[0]
    if (r.items[i].bb.size[0] < 70 && r.items[i - 1].bb.size[0] < 70) gaps.push(d)
  }
  gaps.sort((a, b) => a - b)
  const pitch = gaps[Math.floor(gaps.length / 2)]
  const s = 0.01905 / pitch
  console.log('rows:', rows.map((r) => r.items.length).join(','), ' pitch(units)=', pitch.toFixed(2), ' scale=', s.toExponential(4), void rowsZ)

  // global transform: scale to metres, centre x/z, case bottom at y=0
  const all = bboxOf([...parts.case.getMesh().listPrimitives(), ...parts.plate.getMesh().listPrimitives()])
  const G = mat4.create()
  mat4.scale(G, G, [s, s, s])
  mat4.translate(G, G, [-all.center[0], -all.min[1], -all.center[2]])
  for (const n of [parts.case, parts.plate]) for (const p of n.getMesh().listPrimitives()) transformPrimitive(p, G)
  parts.case.setName('Case').getMesh().setName('Case')
  parts.plate.setName('Plate').getMesh().setName('Plate')

  // naming: the model's back row may come first or last; front row = the one with 8 keys
  if (rows[0].items.length === 8) rows.reverse()
  const okLayout = rows.length === 5 && rows.every((r, i) => r.items.length === LAYOUT[i].length)
  const capsGroup = doc.createNode('Keycaps')
  scene.addChild(capsGroup)
  rows.forEach((r, ri) =>
    r.items.forEach((c, ci) => {
      transformPrimitive(c.prim, G)
      const bb = bboxOf([c.prim])
      translatePrims([c.prim], bb.center.map((x) => -x))
      const name = okLayout ? `key_${LAYOUT[ri][ci]}` : `key_r${ri}_c${ci}`
      const mesh = doc.createMesh(name).addPrimitive(c.prim)
      const node = doc.createNode(name).setMesh(mesh).setTranslation(bb.center).setExtras({ row: ri, col: ci, w: +(bb.size[0] / 0.01905).toFixed(2) })
      capsGroup.addChild(node)
    }),
  )
  console.log('layout names:', okLayout ? 'ANSI 60%' : 'fallback r/c')

  // drop original caps + leftovers
  parts.caps.getMesh().dispose()
  parts.caps.dispose()
  for (const n of scene.listChildren()) if (!['Case', 'Plate', 'Keycaps'].includes(n.getName())) n.dispose()
  await doc.transform(prune(), dedup())
  const kbAll = bboxOf(root.listMeshes().flatMap((m) => m.listPrimitives()).filter(() => true))
  console.log('keyboard size (m, caps local):', all.size.map((x) => (x * s).toFixed(3)).join(' x '), void kbAll)
  await io.write(`${BUILD}/keyboard.glb`, doc)
}

async function switchHero() {
  const doc = await io.read(`${SRC}/cherry_mx_switches/scene.gltf`)
  const root = doc.getRoot()
  const scene = root.getDefaultScene() ?? root.listScenes()[0]
  const byName = (n) => root.listNodes().find((x) => x.getName() === n)
  const PARTS = { Stem: 'Mid Switch', Top: 'Mid Top', Spring: 'Mid Spring', Bottom: 'Mid Bottom', LED: 'Mid LED' }
  const meshPrims = (n) => [n, ...n.listChildren()].filter((x) => x.getMesh()).flatMap((x) => x.getMesh().listPrimitives())
  const worldBox = (n) => {
    // bbox in world space without modifying
    const W = n.getWorldMatrix()
    const res = { min: [Infinity, Infinity, Infinity], max: [-Infinity, -Infinity, -Infinity] }
    for (const c of [n, ...n.listChildren()]) {
      if (!c.getMesh()) continue
      const M = c.getWorldMatrix()
      for (const p of c.getMesh().listPrimitives()) {
        const a = p.getAttribute('POSITION')
        const v = [0, 0, 0]
        for (let i = 0; i < a.getCount(); i++) {
          a.getElement(i, v)
          const w = [0, 0, 0]
          w[0] = M[0] * v[0] + M[4] * v[1] + M[8] * v[2] + M[12]
          w[1] = M[1] * v[0] + M[5] * v[1] + M[9] * v[2] + M[13]
          w[2] = M[2] * v[0] + M[6] * v[1] + M[10] * v[2] + M[14]
          for (let k = 0; k < 3; k++) {
            res.min[k] = Math.min(res.min[k], w[k])
            res.max[k] = Math.max(res.max[k], w[k])
          }
        }
      }
    }
    void W
    return { ...res, center: res.min.map((m, k) => (m + res.max[k]) / 2) }
  }
  const ref = byName('Mid Bottom')
  const hero = byName('Mid Bottom.001')
  const shift = worldBox(hero).center.map((x, k) => x - worldBox(ref).center[k])
  const heroRoot = doc.createNode('SwitchHero')
  const deltas = {}
  const parts = {}
  for (const [name, src] of Object.entries(PARTS)) {
    const n = byName(`${src}.001`)
    const a = byName(src)
    // assembled pose = reference part position + offset between the two switches
    const d = worldBox(a).center.map((x, k) => x + shift[k] - worldBox(n).center[k])
    deltas[name] = d.map((x) => +(x * 1000).toFixed(2))
    parts[name] = { n, d }
  }
  // bake: every mesh node under each part -> world space + delta
  for (const [name, { n, d }] of Object.entries(parts)) {
    const group = doc.createNode(name)
    heroRoot.addChild(group)
    const meshNodes = [n, ...n.listChildren()].filter((x) => x.getMesh())
    for (const mn of meshNodes) {
      const m = mat4.multiply(mat4.create(), mat4.fromTranslation(mat4.create(), d), mn.getWorldMatrix())
      for (const p of mn.getMesh().listPrimitives()) transformPrimitive(p, m)
    }
    if (meshNodes.length === 1) {
      const mesh = meshNodes[0].getMesh().setName(name)
      group.setMesh(mesh)
    } else {
      for (const mn of meshNodes) {
        const mesh = mn.getMesh()
        const sub = doc.createNode(`${name}_${mesh.listPrimitives()[0].getMaterial()?.getName() ?? 'part'}`).setMesh(mesh)
        group.addChild(sub)
      }
    }
  }
  // centre on bottom housing (x/z), keep MX y (plate level ~ y=0), pivots at part centres
  const allPrims = heroRoot.listChildren().flatMap((g) => [g, ...g.listChildren()]).filter((x) => x.getMesh()).flatMap((x) => x.getMesh().listPrimitives())
  const bottomBox = bboxOf(meshPrims(heroRoot.listChildren().find((g) => g.getName() === 'Bottom')))
  translatePrims(allPrims, [-bottomBox.center[0], 0, -bottomBox.center[2]])
  for (const g of heroRoot.listChildren()) {
    const prims = meshPrims(g)
    const bb = bboxOf(prims)
    translatePrims(prims, bb.center.map((x) => -x))
    g.setTranslation(bb.center)
  }
  // remove everything else (other switches, lights, camera)
  for (const n of scene.listChildren()) n.dispose()
  scene.addChild(heroRoot)
  for (const n of root.listNodes()) if (n.getCamera() || n.getExtension?.('KHR_lights_punctual')) n.dispose()
  await doc.transform(prune(), dedup())
  console.log('switch part deltas to assembled pose (mm):', JSON.stringify(deltas))
  console.log('switch parts:', heroRoot.listChildren().map((g) => g.getName() + '@' + g.getTranslation().map((x) => (x * 1000).toFixed(1)).join(',')).join('  '))
  await io.write(`${BUILD}/switch-hero.glb`, doc)
}

await keyboard()
await switchHero()

const common = '--compress meshopt --flatten false --join false --instance false --simplify false --palette false'
const run = (c) => {
  console.log('> ' + c)
  execSync(c, { stdio: 'inherit' })
}
// legends live in baseColor -> keep 2048 (whole file is still ~0.5 MB)
run(`npx gltf-transform optimize ${BUILD}/keyboard.glb ${OUT}/keyboard.glb ${common} --texture-compress webp --texture-size 2048`)
run(`npx gltf-transform optimize ${BUILD}/switch-hero.glb ${OUT}/switch-hero.glb ${common} --texture-compress webp --texture-size 1024`)
for (const f of ['keyboard.glb', 'switch-hero.glb']) console.log(f, (fs.statSync(`${OUT}/${f}`).size / 1024 / 1024).toFixed(2), 'MB')
