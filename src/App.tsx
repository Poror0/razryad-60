import { useEffect, useRef } from 'react'
import { Scene } from './three/Scene'
import { initScroll } from './scroll/timeline'
import { pointer } from './scroll/anim'
import { Header } from './ui/Header'
import { BracketButton } from './ui/BracketButton'
import { DiamondGrid } from './ui/DiamondGrid'
import { StagePanel, StageRail } from './ui/StagePanel'
import { CALLOUTS, PANELS } from './content/stages'
import { Buy, Faq, Footer, Kit, Sound, Specs } from './ui/Sections'
import { initReveal } from './ui/reveal'

const lowQuality = typeof window !== 'undefined' && (matchMedia('(max-width: 768px)').matches || matchMedia('(pointer: coarse)').matches)
/**
 * Motion preference: the system setting (prefers-reduced-motion), overridable with ?motion=full|reduced.
 * Exposed to CSS as <html data-motion="full|reduced">.
 */
const reducedMotion = (() => {
  if (typeof window === 'undefined') return false
  const q = new URLSearchParams(location.search).get('motion')
  const reduced = q === 'reduced' ? true : q === 'full' ? false : matchMedia('(prefers-reduced-motion: reduce)').matches
  document.documentElement.dataset.motion = reduced ? 'reduced' : 'full'
  return reduced
})()

export default function App() {
  const track = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!track.current) return
    const cleanup = initScroll(track.current, reducedMotion)
    const onMove = (e: PointerEvent) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1
      pointer.y = (e.clientY / innerHeight) * 2 - 1
    }
    addEventListener('pointermove', onMove)
    const stopReveal = initReveal(reducedMotion)
    return () => {
      stopReveal()
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
      {/* frame: soft vignette over the canvas, under the UI */}
      <div className="frame-fx" aria-hidden="true" />

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
                  <BracketButton href="#buy">к покупке</BracketButton>
                </div>
              )}
            </StagePanel>
          </section>
        ))}
      </main>

      {/* after the 3D track: opaque sections cover the fixed canvas; the buy block lets it show through */}
      <div className="after">
        <Specs />
        <Kit />
        <Sound />
        <Faq />
        <Buy />
        <Footer />
      </div>
    </>
  )
}
