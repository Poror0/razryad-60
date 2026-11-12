import { useEffect, useRef } from 'react'
import { Scene } from './three/Scene'
import { initScroll, setStage } from './scroll/timeline'
import { pointer } from './scroll/anim'
import { Header } from './ui/Header'
import { BracketButton } from './ui/BracketButton'
import { DiamondGrid } from './ui/DiamondGrid'
import { StagePanel, StageRail } from './ui/StagePanel'
import { CALLOUTS, PANELS, PRICE } from './content/stages'

const lowQuality = typeof window !== 'undefined' && (matchMedia('(max-width: 768px)').matches || matchMedia('(pointer: coarse)').matches)
const reducedMotion = typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

export default function App() {
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!track.current) return
    // dev: ?stage=N freezes the scene on a stage (for screenshots)
    const fixed = new URLSearchParams(location.search).get('stage')
    if (fixed != null) setStage(Number(fixed))
    const cleanup = fixed != null ? () => {} : initScroll(track.current, reducedMotion)
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1
      pointer.y = (e.clientY / innerHeight) * 2 - 1
    }
    addEventListener('pointermove', onMove)
    return () => {
      cleanup()
      removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <>
      <Header />

      {/* hero backdrop sits BEHIND the transparent WebGL canvas: glow, diamonds, giant title */}
      <div className="hero-bg" aria-hidden="false">
        <div className="hero-bg__glow" />
        <DiamondGrid flicker={!reducedMotion && !lowQuality} />
        <h1 className="hero-title">
          <span className="grad">РАЗРЯД</span> <span className="grad">60</span>
        </h1>
      </div>

      <Scene low={lowQuality} />

      {/* callouts: leader lines + labels, positioned per frame from 3D anchors (Overlay) */}
      <div className="callouts" aria-hidden="true">
        <svg className="callouts__lines">
          {CALLOUTS.map((c) => (
            <g key={c.id} id={`co-${c.id}`} className={c.main ? 'is-main' : undefined}>
              <path pathLength={1} />
              <circle r={2.5} />
            </g>
          ))}
        </svg>
        {CALLOUTS.map((c) => {
          const [head, ...rest] = c.text.split(' — ')
          return (
            <div key={c.id} id={`co-label-${c.id}`} className="callouts__label">
              {head}
              {rest.length > 0 && <span> — {rest.join(' — ')}</span>}
            </div>
          )
        })}
      </div>
      <StageRail />

      <main ref={track} className="track">
        <section data-stage="0" className="stage stage--hero" id="top">
          <div className="hero-cta">
            <p className="hero-cta__line">алюминий, 61 клавиша и ничего лишнего</p>
            <BracketButton href="#buy" size="md">
              купить
            </BracketButton>
          </div>
        </section>
        {PANELS.map((panel) => (
          <section key={panel.n} data-stage={panel.n} className="stage" id={panel.id}>
            <StagePanel panel={panel}>
              {panel.n === PANELS.length && (
                <div className="panel__buy">
                  <p className="price">{PRICE}</p>
                  <BracketButton href="#buy">купить</BracketButton>
                </div>
              )}
            </StagePanel>
          </section>
        ))}
      </main>

      <footer className="credits">
        3D models: “Custom - Mechanical Keyboard” (<a href="https://skfb.ly/oDNzq">https://skfb.ly/oDNzq</a>) by unknown.fbx; “Cherry MX Switches” (
        <a href="https://skfb.ly/ovvxx">https://skfb.ly/ovvxx</a>) by BlackCube — licensed under CC BY 4.0 (
        <a href="http://creativecommons.org/licenses/by/4.0/">http://creativecommons.org/licenses/by/4.0/</a>)
      </footer>
    </>
  )
}
