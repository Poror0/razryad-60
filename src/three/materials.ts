import * as THREE from 'three'

export const COLORS = {
  red: '#c8242a',
  caseRed: '#d42a2e',
  black: '#0e0e0f',
  white: '#ecebe6',
  mint: '#5fd3c6',
  plate: '#0b0b0c',
}

export type Quality = 'high' | 'low'

/** Adds a per-instance legend lookup into a shared atlas (attribute aCell, topUv). */
export function withLegends<T extends THREE.MeshStandardMaterial>(mat: T, atlas: THREE.Texture): T {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uAtlas = { value: atlas }
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute vec4 aCell;
        attribute vec2 topUv;
        varying vec2 vCellUv;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vCellUv = aCell.xy + clamp(topUv, 0.0, 1.0) * aCell.zw;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform sampler2D uAtlas;
        varying vec2 vCellUv;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec4 lg = texture2D(uAtlas, vCellUv);
        diffuseColor.rgb = mix(diffuseColor.rgb, lg.rgb, lg.a);`,
      )
  }
  mat.customProgramCacheKey = () => 'legends'
  return mat
}

export function makeMaterials(q: Quality, atlas: THREE.Texture) {
  const hi = q === 'high'
  const keycap = withLegends(
    hi
      ? new THREE.MeshPhysicalMaterial({ roughness: 0.5, clearcoat: 0.05, clearcoatRoughness: 0.5, sheen: 0.08, sheenRoughness: 0.9, sheenColor: new THREE.Color('#ffffff') })
      : new THREE.MeshStandardMaterial({ roughness: 0.62 }),
    atlas,
  )
  const caseMat = hi
    ? new THREE.MeshPhysicalMaterial({ color: COLORS.caseRed, metalness: 0.55, roughness: 0.38, clearcoat: 0.35, clearcoatRoughness: 0.35 })
    : new THREE.MeshStandardMaterial({ color: COLORS.caseRed, metalness: 0.5, roughness: 0.4 })
  const mint = hi
    ? new THREE.MeshPhysicalMaterial({ color: COLORS.mint, roughness: 0.45, sheen: 0.3, sheenColor: new THREE.Color('#bff5ef') })
    : new THREE.MeshStandardMaterial({ color: COLORS.mint, roughness: 0.5 })
  const clear = new THREE.MeshPhysicalMaterial({
    color: '#e9eef0',
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: hi ? 0.32 : 0.4,
    clearcoat: hi ? 1 : 0,
    ior: 1.5,
    depthWrite: false,
    side: THREE.FrontSide,
  })
  const spring = new THREE.MeshStandardMaterial({ color: '#d9dadc', metalness: 1, roughness: 0.22 })
  const gold = new THREE.MeshStandardMaterial({ color: '#e6c47a', metalness: 0.75, roughness: 0.32, emissive: '#3a2a08', emissiveIntensity: 0.6 })
  const steel = new THREE.MeshStandardMaterial({ color: '#c9c9cc', metalness: 1, roughness: 0.35 })
  return { keycap, caseMat, mint, clear, spring, gold, steel }
}

export type Materials = ReturnType<typeof makeMaterials>
