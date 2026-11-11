import * as THREE from 'three'

/** Palette taken from reference/ photos (top faces of red keycaps ≈ #c2383a under light). */
export const PALETTE = {
  red: '#b0131c',
  white: '#e9e5dc',
  black: '#0f0f10',
  legendDark: '#0c0c0c',
  legendRed: '#b0131c',
  legendLight: '#f6f3ee',
  plate: '#1b1b1d',
  caseBlack: '#111113',
}

export type LegendTone = 'black' | 'red'
export type CaseFinish = 'plastic' | 'metal'

export interface Look {
  legend: LegendTone
  finish: CaseFinish
  /** simplified materials for mobile */
  low?: boolean
}

/** Keys painted red. Original model: all of them except Space were green. */
export const MODIFIERS = new Set([
  'Esc', 'Tab', 'CapsLock', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
  'AltLeft', 'AltRight', 'MetaLeft', 'MetaRight', 'ContextMenu', 'Enter', 'Backspace', 'Space',
])
const ORIGINALLY_BEIGE = new Set(['Space'])

/**
 * Keycap material: the original baseColor texture is two-tone (beige #ecdcc4 / green #4c6444),
 * legends are the opposite tone of their cap. We turn it into a legend mask:
 *   t = "greenness" of the texel (0 beige … 1 green), mask = t on beige caps, 1 - t on green caps.
 * Final albedo = mix(capColor, legendColor, mask).
 */
function keycapMaterial(src: THREE.MeshStandardMaterial, cap: string, legend: string, invert: boolean, legendOn: boolean, low: boolean) {
  const Mat = low ? THREE.MeshStandardMaterial : THREE.MeshPhysicalMaterial
  const m = new Mat({
    map: src.map,
    normalMap: low ? null : src.normalMap,
    roughness: 0.66,
    metalness: 0,
  })
  // PBT: matte, keep env reflections low so colours don't wash out under ACES
  m.envMapIntensity = 0.8
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

export function caseMaterial(finish: CaseFinish, low = false) {
  if (finish === 'metal')
    return low
      ? new THREE.MeshStandardMaterial({ color: PALETTE.caseBlack, metalness: 1, roughness: 0.38 })
      : new THREE.MeshPhysicalMaterial({ color: '#16161a', metalness: 1, roughness: 0.35, clearcoat: 0.2, clearcoatRoughness: 0.4 })
  return new THREE.MeshStandardMaterial({ color: PALETTE.caseBlack, metalness: 0, roughness: 0.5 })
}

/** Applies the palette to keyboard.glb scene (mutates materials, returns them for later tweaks). */
export function recolorKeyboard(root: THREE.Object3D, look: Look) {
  const low = !!look.low
  const caps = root.getObjectByName('Keycaps')
  const anyCap = caps?.children[0] as THREE.Mesh | undefined
  const src = anyCap?.material as THREE.MeshStandardMaterial
  const legendOnWhite = look.legend === 'red' ? PALETTE.legendRed : PALETTE.legendDark
  const mats = {
    white: keycapMaterial(src, PALETTE.white, legendOnWhite, false, true, low),
    red: keycapMaterial(src, PALETTE.red, PALETTE.legendLight, true, true, low),
    space: keycapMaterial(src, PALETTE.red, PALETTE.legendLight, false, false, low),
    case: caseMaterial(look.finish, low),
    plate: new THREE.MeshStandardMaterial({ color: PALETTE.plate, roughness: 0.75, metalness: 0.1 }),
  }
  caps?.children.forEach((c) => {
    const name = c.name.replace('key_', '')
    const mesh = c as THREE.Mesh
    if (name === 'Space' || ORIGINALLY_BEIGE.has(name)) mesh.material = MODIFIERS.has(name) ? mats.space : mats.white
    else mesh.material = MODIFIERS.has(name) ? mats.red : mats.white
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
  const bottom = new THREE.MeshStandardMaterial({ color: '#0d0d0f', roughness: 0.32 })
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
