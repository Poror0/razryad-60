import { useEffect, useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { KEYS } from './layout'
import { buildAtlas, type Atlas } from './legends'
import { makeMaterials } from './materials'
import { Keyboard } from './Keyboard'
import { Studio } from './Studio'
import { anim } from '../scroll/anim'

/** ?demo=key[&focus=1] or ?demo=board[&lift=..&explode=..] — dev views for checking the model */
export function Demo({ mode }: { mode: 'key' | 'board' }) {
  const params = new URLSearchParams(location.search)
  anim.lift = Number(params.get('lift') ?? 0)
  anim.explode = Number(params.get('explode') ?? 0)
  anim.focus = Number(params.get('focus') ?? 0)
  const keys = useMemo(() => (mode === 'key' ? KEYS.filter((k) => k.id === 'q') : KEYS), [mode])
  const [atlas, setAtlas] = useState<Atlas | null>(null)
  useEffect(() => {
    buildAtlas(keys).then(setAtlas)
  }, [keys])
  const mats = useMemo(() => (atlas ? makeMaterials('high', atlas.texture) : null), [atlas])
  const num = (k: string) => params.get(k)?.split(',').map(Number) as [number, number, number] | undefined
  const camQ = num('cam')
  const target = num('target') ?? (mode === 'key' ? [0, 0.12, 0] : [0, 0.2, 0])
  const cam0 = mode === 'key' ? { position: [0.42, 0.36, 0.62] as [number, number, number], fov: 30 } : { position: [0, 3.2, 3.6] as [number, number, number], fov: 32 }
  const cam = camQ ? { ...cam0, position: camQ } : cam0
  return (
    <Canvas dpr={[1, 2]} camera={cam} gl={{ antialias: true }} style={{ position: 'fixed', inset: 0, background: '#0d0d0e' }}
      onCreated={(s) => Object.assign(window, { __ready: false, __three: s })}>
      <Studio />
      {atlas && mats && (
        <Keyboard keys={keys} atlas={atlas} mats={mats} quality="high" showCase={mode === 'board'} />
      )}
      <ContactShadows position={[0, 0, 0]} opacity={0.6} scale={mode === 'key' ? 1 : 6} blur={2.4} far={0.6} resolution={512} />
      <OrbitControls target={target} makeDefault />
      <ReadyFlag ready={!!atlas} />
    </Canvas>
  )
}

function ReadyFlag({ ready }: { ready: boolean }) {
  useEffect(() => {
    if (ready) setTimeout(() => ((window as unknown as { __ready: boolean }).__ready = true), 800)
  }, [ready])
  return null
}
