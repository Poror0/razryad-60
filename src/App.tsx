import { useEffect, useRef } from 'react'
import { Scene } from './three/Scene'
import { initScroll, setStage } from './scroll/timeline'
import { pointer } from './scroll/anim'

const LABELS: [string, string][] = [
  ['Top', 'Верхний корпус'],
  ['Stem', 'Шток'],
  ['Spring', 'Пружина'],
  ['Bottom', 'Нижний корпус'],
]

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
      <Scene low={lowQuality} />

      <div id="labels" className="labels" aria-hidden="true">
        <svg className="labels__lines">
          {LABELS.map(([k]) => (
            <line key={k} id={`line-${k}`} />
          ))}
        </svg>
        {LABELS.map(([k, t]) => (
          <div key={k} id={`label-${k}`} className="labels__item">
            {t}
          </div>
        ))}
      </div>

      <main ref={track} className="track">
        <section data-stage="0" className="stage stage--hero">
          <h1>Lunacy Moonlight Искра</h1>
          <p>Механическая клавиатура 60%, собранная вокруг звука.</p>
        </section>
        <section data-stage="1" className="stage">
          <p className="spec">PBT-кейкапы, профиль Cherry</p>
        </section>
        <section data-stage="2" className="stage">
          <p className="spec">61 клавиша, hot-swap</p>
        </section>
        <section data-stage="3" className="stage">
          <p className="spec">Линейные MX-свитчи, 45 гс</p>
        </section>
        <section data-stage="4" className="stage stage--buy" id="buy">
          <div className="buy">
            <p className="spec">Корпус — анодированный алюминий</p>
            <p className="price">11 990 ₽</p>
            <button className="btn">Купить</button>
          </div>
        </section>
      </main>

      <footer className="credits">
        3D models: “Custom - Mechanical Keyboard” (<a href="https://skfb.ly/oDNzq">https://skfb.ly/oDNzq</a>) by unknown.fbx; “Cherry MX Switches” (
        <a href="https://skfb.ly/ovvxx">https://skfb.ly/ovvxx</a>) by BlackCube — licensed under CC BY 4.0 (
        <a href="http://creativecommons.org/licenses/by/4.0/">http://creativecommons.org/licenses/by/4.0/</a>)
      </footer>
    </>
  )
}
