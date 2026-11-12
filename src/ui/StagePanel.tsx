import type { ReactNode } from 'react'
import { STAGE_COUNT, type StagePanel as Panel } from '../content/stages'

const pad = (n: number) => String(n).padStart(2, '0')

/** Fixed info panel of a 3D stage. Opacity / shift are written per frame by the Overlay (#panel-N). */
export function StagePanel({ panel, children }: { panel: Panel; children?: ReactNode }) {
  return (
    <div id={`panel-${panel.n}`} className={`panel panel--${panel.side}`}>
      <p className="panel__num">
        ( {pad(panel.n)} )<span className="panel__of">/ {pad(STAGE_COUNT)}</span>
      </p>
      <h2 className="panel__title">{panel.title}</h2>
      <p className="panel__text">
        <span className="panel__long">{panel.text}</span>
        <span className="panel__short">{panel.short}</span>
      </p>
      <ul className="panel__stats">
        {panel.stats.map((s) => (
          <li key={s.caption}>
            <b className="panel__value">
              {s.value}
              {s.unit && <small> {s.unit}</small>}
            </b>
            <span className="panel__caption">{s.caption}</span>
          </li>
        ))}
      </ul>
      {children}
    </div>
  )
}

/** Thin vertical stage progress 01–05. Fill and dots are driven by the Overlay (#rail). */
export function StageRail() {
  return (
    <div id="rail" className="rail" aria-hidden="true">
      <div className="rail__track">
        <div className="rail__fill" />
      </div>
      {Array.from({ length: STAGE_COUNT }, (_, i) => (
        <span key={i} className="rail__dot" style={{ top: `${(i / (STAGE_COUNT - 1)) * 100}%` }}>
          <i />
          <span className="rail__num">{pad(i + 1)}</span>
        </span>
      ))}
    </div>
  )
}
