import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { DepthOfField, EffectComposer, SelectiveBloom, ToneMapping } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode, type DepthOfFieldEffect, type SelectiveBloomEffect } from 'postprocessing'
import { N8AOPostPass } from 'n8ao'
import * as THREE from 'three'
import { anim } from '../scroll/anim'
import { heroParts } from './SwitchHero'
import { glowObjects } from './glowRegistry'

export type Quality = 'high' | 'mid' | 'low'


/** Ambient occlusion: contact darkening in cap gaps, at switch bases, in case corners (metres). */
function AO() {
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const pass = useMemo(() => {
    const p = new N8AOPostPass(scene, camera, size.width, size.height)
    Object.assign(p.configuration, {
      aoRadius: 0.012,
      distanceFalloff: 0.004,
      intensity: 2.6,
      aoSamples: 16,
      denoiseSamples: 8,
      denoiseRadius: 8,
      halfRes: true,
      depthAwareUpsampling: true,
      gammaCorrection: false,
      transparencyAware: true,
    })
    // n8ao 2.0.1 vs three r187: its half-res MRT target overrides `texture` with the textures ARRAY,
    // three's setupRenderTarget then reads texture.mipmaps → crash. n8ao itself only uses `.textures`.
    const mrt = (p as unknown as { depthDownsampleTarget?: THREE.WebGLRenderTarget }).depthDownsampleTarget
    if (mrt) Object.defineProperty(mrt, 'texture', { get: () => mrt.textures[0], configurable: true })
    return p
  }, [scene, camera]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => pass.dispose(), [pass])
  return <primitive object={pass} />
}

const box = new THREE.Box3()
const box2 = new THREE.Box3()

/** Stage 03: the exploded hero switch stays sharp, the keyboard behind blurs. */
function StageDoF() {
  const ref = useRef<DepthOfFieldEffect>(null)
  const target = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const e = ref.current
    if (!e) return
    const f = THREE.MathUtils.smoothstep(anim.focus, 0.3, 1)
    // focus on the centre of the whole exploded switch (part origins sit at the switch base)
    const t = e.target ?? target
    if (f > 0 && heroParts.Top && heroParts.Bottom) {
      box.setFromObject(heroParts.Top).union(box2.setFromObject(heroParts.Bottom)).getCenter(t)
    }
    e.cocMaterial.focusRange = 0.028
    e.bokehScale = 3.2 * f
    // skip entirely outside stage 03 (it also forces alpha to 1, hiding the HTML backdrop)
    e.blendMode.blendFunction = f > 0.001 ? BlendFunction.NORMAL : BlendFunction.SKIP
  })
  return <DepthOfField ref={ref} target={target} bokehScale={0} />
}

/** Only the registered emissives glow (underglow band, Esc bolt, switch LED) — never the red caps. */
function Glow() {
  const ref = useRef<SelectiveBloomEffect>(null)
  const light = useRef<THREE.AmbientLight>(null)
  useFrame(() => {
    const sel = ref.current?.selection
    if (!sel) return
    for (const o of glowObjects) if (!sel.has(o)) sel.add(o)
  })
  return (
    <>
      {/* SelectiveBloom wants a light in its layer; the glow materials are unlit anyway */}
      <ambientLight ref={light} intensity={0} />
      <SelectiveBloom ref={ref} lights={[light]} ignoreBackground mipmapBlur luminanceThreshold={0.05} luminanceSmoothing={0.2} intensity={0.9} radius={0.75} />
    </>
  )
}

/**
 * Post chain (only on capable devices):
 *   N8AO → DoF (stage 03) → selective Bloom → ACES tone mapping (the composer turns renderer tone mapping off).
 * The vignette is a CSS overlay: the canvas is transparent over the HTML hero backdrop.
 */

export function Effects({ quality }: { quality: Quality }) {
  if (quality === 'low') return null
  const high = quality === 'high'
  return (
    <EffectComposer multisampling={high ? 4 : 0} frameBufferType={THREE.HalfFloatType}>
      <>{high && <AO />}</>
      <>{high && <StageDoF />}</>
      <Glow />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
