import * as THREE from 'three'

/**
 * Palette (single source of truth for all colours):
 * graphite alphas with light-grey legends, red modifiers with white legends,
 * a single white Esc, red anodised case, black plate.
 */
export const PALETTE = {
  bg: '#0e0e0e',
  alpha: '#1a1a1c',
  alphaLegend: '#d9d6d0',
  red: '#c3232b',
  redLegend: '#f6f3ee',
  esc: '#eeeae2',
  escLegend: '#121212',
  caseRed: '#b0131c',
  plate: '#0a0a0b',
}

export interface Look {
  /** simplified materials for mobile */
  low?: boolean
}

/** Red keys. Original model: these were green (except Space, which was beige). Esc is handled separately. */
export const MODIFIERS = new Set([
  'Tab', 'CapsLock', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
  'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'ContextMenu', 'Enter', 'Backspace', 'Space',
])

/**
 * Keycap material: the original baseColor texture is two-tone (beige #ecdcc4 / green #4c6444),
 * legends are the opposite tone of their cap. We turn it into a legend mask:
 *   t = "greenness" of the texel (0 beige … 1 green), mask = t on beige caps, 1 - t on green caps.
 * Final albedo = mix(capColor, legendColor, mask).
 */
function keycapMaterial(src: THREE.MeshStandardMaterial, map: THREE.Texture | null, cap: string, legend: string, invert: boolean, legendOn: boolean, low: boolean, env = 0.8) {
  const Mat = low ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial
  const m = new Mat({
    map,
    normalMap: low ? null : src.normalMap,
    roughness: 0.66,
    metalness: 0,
  })
  // PBT: matte, keep env reflections low so colours don't wash out under ACES
  m.envMapIntensity = env
  if (m instanceof THREE.MeshPhysicalMaterial) {
    m.clearcoat = 0.04
    m.clearcoatRoughness = 0.6
  }
  const uniforms = {
    uCap: { value: new THREE.Color(cap) },
    uLegend: { value: new THREE.Color(legend) },
    uInvert: { value: invert ? 1 : 0 },
    uLegendOn: { value: legendOn ? 1 : 0 },
  }
  m.onBeforeCompile = (s) => {
    Object.assign(s.uniforms, uniforms)
    s.fragmentShader = s.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uCap; uniform vec3 uLegend; uniform float uInvert; uniform float uLegendOn;`,
      )
      .replace(
        '#include <map_fragment>',
        `float kLegend = 0.0;
        #ifdef USE_MAP
          vec4 kTex = texture2D( map, vMapUv );
          // linear R: beige ≈ 0.84, green ≈ 0.072
          float kT = clamp( ( 0.84 - kTex.r ) / ( 0.84 - 0.072 ), 0.0, 1.0 );
          float kM = mix( kT, 1.0 - kT, uInvert ) * uLegendOn;
          kLegend = smoothstep( 0.06, 0.5, kM );
          diffuseColor.rgb *= mix( uCap, uLegend, kLegend );
        #endif`,
      )
  }
  m.customProgramCacheKey = () => 'keycap'
  m.userData.uniforms = uniforms
  return m
}

/** Legend-only additive overlay (same mask as the keycap shader): the faint red glow of the Esc bolt, fed to the selective bloom. */
export function legendGlowMaterial(map: THREE.Texture | null, invert: boolean, color: THREE.Color) {
  const m = new THREE.MeshBasicMaterial({
    map,
    color,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  })
  m.onBeforeCompile = (s) => {
    s.uniforms.uInvert = { value: invert ? 1 : 0 }
    s.fragmentShader = s.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uInvert;').replace(
      '#include <map_fragment>',
      `#ifdef USE_MAP
        vec4 kTex = texture2D( map, vMapUv );
        float kT = clamp( ( 0.84 - kTex.r ) / ( 0.84 - 0.072 ), 0.0, 1.0 );
        float kM = smoothstep( 0.06, 0.5, mix( kT, 1.0 - kT, uInvert ) );
        diffuseColor = vec4( diffuseColor.rgb * kM, kM );
      #endif`,
    )
  }
  m.customProgramCacheKey = () => 'legend-glow'
  return m
}

/**
 * Texture patches (2048² keycap baseColor, texel px): decorative twigs/leaves from the source texture are
 * painted over with the surrounding cap colour; where the twig WAS the legend, a text legend is drawn instead.
 * Legend text runs along the texture's vertical axis like the original "Enter"/"Tab" glyphs.
 */
interface Patch {
  rect: [number, number, number, number]
  text?: string
  size?: number
  /** the cap's UV island is mirrored relative to the others */
  mirror?: boolean
}
export const LEGEND_PATCHES: Patch[] = [
  { rect: [243, 503, 80, 50] }, // Enter: twig next to the word
  { rect: [697, 672, 56, 36] }, // Tab: twig above the word
  { rect: [517, 392, 82, 156], text: 'Backspace', size: 30 }, // twig = whole legend
  { rect: [422, 562, 82, 142], text: 'Caps', size: 34, mirror: true }, // leaf = whole legend
]
const LEGEND_FONT = '"Onest Variable", "Arial", sans-serif'

function paintPatches(x: CanvasRenderingContext2D) {
  for (const p of LEGEND_PATCHES) {
    const [px, py, w, h] = p.rect
    // cap colour = texel just outside the patch
    const d = x.getImageData(px - 4, py + (h >> 1), 1, 1).data
    x.fillStyle = `rgb(${d[0]},${d[1]},${d[2]})`
    x.fillRect(px, py, w, h)
    if (!p.text) continue
    x.save()
    x.translate(px + w / 2, py + h / 2)
    x.rotate(LEGEND_ROT)
    if (p.mirror) x.scale(-LEGEND_FLIP, -1)
    else x.scale(LEGEND_FLIP, 1)
    x.fillStyle = '#ecdcc4'
    x.font = `600 ${p.size ?? 32}px ${LEGEND_FONT}`
    x.textAlign = 'center'
    x.textBaseline = 'middle'
    x.fillText(p.text, 0, 0)
    x.restore()
  }
}
const LEGEND_ROT = -Math.PI / 2
const LEGEND_FLIP = -1

function cleanLegendTexture(src: THREE.Texture) {
  const img = src.image as CanvasImageSource & { width: number; height: number }
  const c = document.createElement('canvas')
  c.width = img.width
  c.height = img.height
  const x = c.getContext('2d', { willReadFrequently: true })!
  const k = img.width / 2048
  const draw = () => {
    x.setTransform(1, 0, 0, 1, 0, 0)
    x.drawImage(img, 0, 0)
    x.setTransform(k, 0, 0, k, 0, 0)
    paintPatches(x)
  }
  draw()
  const t = new THREE.CanvasTexture(c)
  t.flipY = src.flipY
  t.colorSpace = src.colorSpace
  t.wrapS = src.wrapS
  t.wrapT = src.wrapT
  t.anisotropy = src.anisotropy
  // redraw once the web font is in (first draw may have used the fallback)
  document.fonts?.load(`600 32px ${LEGEND_FONT}`).then(() => {
    draw()
    t.needsUpdate = true
  })
  return t
}

/** red anodised aluminium */
export function caseMaterial(low = false) {
  return low
    ? new THREE.MeshStandardMaterial({ color: PALETTE.caseRed, metalness: 1, roughness: 0.4 })
    : new THREE.MeshPhysicalMaterial({ color: PALETTE.caseRed, metalness: 1, roughness: 0.4, clearcoat: 0.15, clearcoatRoughness: 0.5 })
}

/** Applies the palette to keyboard.glb scene (mutates materials, returns them for later tweaks). */
export function recolorKeyboard(root: THREE.Object3D, look: Look = {}) {
  const low = !!look.low
  const caps = root.getObjectByName('Keycaps')
  const anyCap = caps?.children[0] as THREE.Mesh | undefined
  const src = anyCap?.material as THREE.MeshStandardMaterial
  const map = src?.map ? cleanLegendTexture(src.map) : null
  const mats = {
    // originally beige caps -> legend = green texels
    alpha: keycapMaterial(src, map, PALETTE.alpha, PALETTE.alphaLegend, false, true, low, 1.25),
    // originally green caps -> legend = beige texels
    // lower env on red: the overhead softbox + ACES would push it to pink
    red: keycapMaterial(src, map, PALETTE.red, PALETTE.redLegend, true, true, low, 0.42),
    // large flat top catches more of the overhead light: compensate so it matches the other reds
    space: keycapMaterial(src, map, '#' + new THREE.Color(PALETTE.red).multiplyScalar(0.82).getHexString(), PALETTE.redLegend, false, false, low, 0.32),
    esc: keycapMaterial(src, map, PALETTE.esc, PALETTE.escLegend, true, true, low, 0.7),
    /** additive overlay on Esc: only the bolt legend */
    escGlow: legendGlowMaterial(map, true, new THREE.Color(PALETTE.red).multiplyScalar(1.4)),
    case: caseMaterial(low),
    plate: new THREE.MeshStandardMaterial({ color: PALETTE.plate, roughness: 0.7, metalness: 0.2 }),
  }
  caps?.children.forEach((c) => {
    const name = c.name.replace('key_', '')
    const mesh = c as THREE.Mesh
    if (name === 'Esc') {
      mesh.material = mats.esc
      // legend glow overlay (same geometry, additive, bloom-selected)
      mesh.getObjectByName('EscGlow')?.removeFromParent()
      const glow = new THREE.Mesh(mesh.geometry, mats.escGlow)
      glow.name = 'EscGlow'
      glow.renderOrder = 3
      // not bloom-selected: the selective bloom masks by depth, which would pick up the whole white cap
      mesh.add(glow)
    }
    else if (name === 'Space') mesh.material = mats.space
    else mesh.material = MODIFIERS.has(name) ? mats.red : mats.alpha
  })
  const caseMesh = root.getObjectByName('Case') as THREE.Mesh | undefined
  if (caseMesh) caseMesh.material = mats.case
  const plate = root.getObjectByName('Plate') as THREE.Mesh | undefined
  if (plate) plate.material = mats.plate
  return mats
}

/** Switch-hero: red stem, black bottom, clear top. */
export function recolorSwitch(root: THREE.Object3D, low = false) {
  const stem = new THREE.MeshPhysicalMaterial({ color: PALETTE.red, roughness: 0.35, clearcoat: 0.3 })
  const bottom = new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.32 })
  // clear polycarbonate: plain alpha blend reads better on a dark page than transmission (which shows the black bg)
  const top = new THREE.MeshPhysicalMaterial({
    color: '#e8eef2',
    roughness: 0.12,
    metalness: 0,
    transparent: true,
    opacity: low ? 0.3 : 0.2,
    clearcoat: low ? 0 : 0.35,
    clearcoatRoughness: 0.08,
    envMapIntensity: low ? 1 : 0.45,
    depthWrite: false,
    side: THREE.DoubleSide,
    // faint red inner glow, driven by the stage-03 LED (emissiveIntensity 0..1)
    emissive: new THREE.Color(PALETTE.red).multiplyScalar(0.12),
    emissiveIntensity: 0,
  })
  const set = (name: string, mat: THREE.Material) =>
    root.getObjectByName(name)?.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh || o.userData.proxy || o.userData.glow) return
      const old = mesh.material as THREE.MeshStandardMaterial
      if (old?.normalMap && 'normalMap' in mat && !low) (mat as THREE.MeshStandardMaterial).normalMap = old.normalMap
      mesh.material = mat
    })
  set('Stem', stem)
  set('Bottom', bottom)
  set('Top', top)
  return { stem, bottom, top }
}
