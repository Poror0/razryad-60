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
function keycapMaterial(src: THREE.MeshStandardMaterial, cap: string, legend: string, invert: boolean, legendOn: boolean, low: boolean, env = 0.8) {
  const Mat = low ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial
  const m = new Mat({
    map: src.map,
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
        `#ifdef USE_MAP
          vec4 kTex = texture2D( map, vMapUv );
          // linear R: beige ≈ 0.84, green ≈ 0.072
          float kT = clamp( ( 0.84 - kTex.r ) / ( 0.84 - 0.072 ), 0.0, 1.0 );
          float kM = mix( kT, 1.0 - kT, uInvert ) * uLegendOn;
          diffuseColor.rgb *= mix( uCap, uLegend, smoothstep( 0.06, 0.5, kM ) );
        #endif`,
      )
  }
  m.customProgramCacheKey = () => 'keycap'
  m.userData.uniforms = uniforms
  return m
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
  const mats = {
    // originally beige caps -> legend = green texels
    alpha: keycapMaterial(src, PALETTE.alpha, PALETTE.alphaLegend, false, true, low, 1.25),
    // originally green caps -> legend = beige texels
    // lower env on red: the overhead softbox + ACES would push it to pink
    red: keycapMaterial(src, PALETTE.red, PALETTE.redLegend, true, true, low, 0.42),
    // large flat top catches more of the overhead light: compensate so it matches the other reds
    space: keycapMaterial(src, '#' + new THREE.Color(PALETTE.red).multiplyScalar(0.82).getHexString(), PALETTE.redLegend, false, false, low, 0.32),
    esc: keycapMaterial(src, PALETTE.esc, PALETTE.escLegend, true, true, low, 0.7),
    case: caseMaterial(low),
    plate: new THREE.MeshStandardMaterial({ color: PALETTE.plate, roughness: 0.7, metalness: 0.2 }),
  }
  caps?.children.forEach((c) => {
    const name = c.name.replace('key_', '')
    const mesh = c as THREE.Mesh
    if (name === 'Esc') mesh.material = mats.esc
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
    opacity: low ? 0.3 : 0.26,
    clearcoat: low ? 0 : 1,
    clearcoatRoughness: 0.05,
    depthWrite: false,
    side: THREE.DoubleSide,
  })
  const set = (name: string, mat: THREE.Material) =>
    root.getObjectByName(name)?.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const old = mesh.material as THREE.MeshStandardMaterial
      if (old?.normalMap && 'normalMap' in mat && !low) (mat as THREE.MeshStandardMaterial).normalMap = old.normalMap
      mesh.material = mat
    })
  set('Stem', stem)
  set('Bottom', bottom)
  set('Top', top)
  return { stem, bottom, top }
}
