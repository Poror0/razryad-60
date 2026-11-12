import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { BracketButton } from './BracketButton'
import { Icon } from './Icons'
import { playKeystroke } from './sound'
import { FAQ, FOOTER_COLS, KIT, PRODUCT, SOUND, SPECS } from '../content/page'

const pad = (n: number) => String(n).padStart(2, '0')

/** heading that slides up word by word (see .rv-words) */
function Words({ text, as: Tag = 'h2', className = '' }: { text: string; as?: 'h2' | 'h3'; className?: string }) {
  return (
    <Tag className={`rv-words ${className}`} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <Fragment key={i}>
          {i > 0 && ' '}
          <span className="w" aria-hidden="true">
            <span style={{ transitionDelay: `${i * 60}ms` }}>{w}</span>
          </span>
        </Fragment>
      ))}
    </Tag>
  )
}

function SectionHead({ n, title, id }: { n: string; title: string; id?: string }) {
  return (
    <header className="sec__head">
      <p className="sec__num rv" id={id}>
        ( {n} )
      </p>
      <Words text={title} className="sec__title" />
    </header>
  )
}

export function Specs() {
  return (
    <section className="sec" id="specs" aria-labelledby="specs-t">
      <div className="sec__in">
        <SectionHead n="характеристики" title="а в остальном — всё по делу" id="specs-t" />
        <ol className="specs">
          {SPECS.map((s, i) => (
            <li key={s.title} className="specs__item rv" style={{ transitionDelay: `${(i % 2) * 80}ms` }}>
              <span className="specs__n">( {i + 1} )</span>
              <div>
                <h3 className="specs__t">{s.title}</h3>
                <p className="specs__d">{s.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function Kit() {
  return (
    <section className="sec" id="kit" aria-labelledby="kit-t">
      <div className="sec__in">
        <SectionHead n="комплектация" title="внутри коробки" id="kit-t" />
        <ul className="kit">
          {KIT.map((k, i) => (
            <li key={k.title} className={`kit__card rv${k.render ? ' kit__card--render' : ''}`} style={{ transitionDelay: `${i * 70}ms` }}>
              <div className="kit__pic">
                {k.render ? <img src={k.render} alt="" loading="lazy" decoding="async" width={480} height={480} /> : k.icon && <Icon name={k.icon} />}
              </div>
              <p className="kit__n">{pad(i + 1)}</p>
              <h3 className="kit__t">{k.title}</h3>
              <p className="kit__d">{k.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function Sound() {
  // is-playing is toggled with classList on a ref — no React state, so the element's className
  // (and anything other code put on it) is never rewritten
  const vis = useRef<HTMLDivElement>(null)
  const timer = useRef<number>(0)
  const play = useCallback(() => {
    const d = playKeystroke()
    const el = vis.current
    if (!el) return
    el.classList.remove('is-playing')
    void el.offsetWidth // restart the CSS animations on repeated clicks
    el.classList.add('is-playing')
    clearTimeout(timer.current)
    timer.current = window.setTimeout(() => el.classList.remove('is-playing'), d * 1000 + 120)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <section className="sec sec--sound" id="sound" aria-labelledby="sound-t">
      <div className="sec__in sound">
        <div className="sound__copy">
          <SectionHead n="звук" title={SOUND.title} id="sound-t" />
          <p className="sec__lead rv">{SOUND.text}</p>
          <div className="rv sound__cta">
            <BracketButton onClick={play} size="lg">
              послушать
            </BracketButton>
            <span className="sound__note">синтезируется в браузере, звук только по нажатию</span>
          </div>
        </div>
        <div ref={vis} className="sound__vis rv" aria-hidden="true">
          <img src="/renders/keycap.webp" alt="" loading="lazy" decoding="async" width={480} height={480} />
          <div className="sound__wave">
            {Array.from({ length: 28 }, (_, i) => (
              <i key={i} style={{ animationDelay: `${(i % 7) * 30}ms`, ['--h' as string]: `${20 + Math.abs(Math.sin(i * 1.7)) * 80}%` }} />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export function Faq() {
  return (
    <section className="sec" id="faq" aria-labelledby="faq-t">
      <div className="sec__in faq-wrap">
        <SectionHead n="вопросы" title="коротко о главном" id="faq-t" />
        <div className="faq">
          {FAQ.map((f, i) => (
            <details key={f.q} className="faq__item rv" style={{ transitionDelay: `${i * 50}ms` }}>
              <summary>
                <span className="faq__n">( {i + 1} )</span>
                <span className="faq__q">{f.q}</span>
                <span className="faq__x" aria-hidden="true" />
              </summary>
              <p className="faq__a">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Buy card: the fixed 3D canvas shows through on the left (final angle), the card sits on the right. */
export function Buy() {
  const [toast, setToast] = useState(false)
  const t = useRef<number>(0)
  const buy = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setToast(true)
    clearTimeout(t.current)
    t.current = window.setTimeout(() => setToast(false), 2600)
  }, [])
  useEffect(() => () => clearTimeout(t.current), [])
  return (
    <section className="sec sec--buy" id="buy" aria-labelledby="buy-t">
      <div className="buy-card rv">
        <p className="sec__num">( купить )</p>
        <h2 className="buy-card__t" id="buy-t">
          <span className="grad">{PRODUCT.name}</span>
        </h2>
        <p className="buy-card__lead">{PRODUCT.lead}</p>
        <div className="buy-card__row">
          <p className="price">{PRODUCT.price}</p>
          <BracketButton href="#buy" onClick={buy} size="lg">
            купить
          </BracketButton>
        </div>
        <details className="buy-card__more">
          <summary>
            характеристики <span className="faq__x" aria-hidden="true" />
          </summary>
          <ul>
            {SPECS.map((s) => (
              <li key={s.title}>
                <b>{s.title}</b> — {s.text}
              </li>
            ))}
          </ul>
        </details>
        <details className="buy-card__more">
          <summary>
            комплектация <span className="faq__x" aria-hidden="true" />
          </summary>
          <ul>
            {KIT.map((k) => (
              <li key={k.title}>
                <b>{k.title}</b> — {k.note}
              </li>
            ))}
          </ul>
        </details>
      </div>
      <div className={`toast${toast ? ' is-on' : ''}`} role="status" aria-live="polite">
        {toast ? 'Это концепт — купить пока нельзя. Но спасибо, что хотели.' : ''}
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__top">
        <a className="logo" href="#top" aria-label="РАЗРЯД — наверх">
          <span className="logo__mark" aria-hidden="true" />
          РАЗРЯД
        </a>
        <nav className="footer__cols" aria-label="Ссылки">
          {FOOTER_COLS.map((c) => (
            <div key={c.title}>
              <p className="footer__h">{c.title}</p>
              <ul>
                {c.links.map((l) => (
                  <li key={l}>
                    <a href="#top" onClick={(e) => e.preventDefault()}>
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>
      <p className="footer__concept">Концепт для портфолио. Бренд и товар вымышленные.</p>
      <p className="credits">
        3D models: “Custom - Mechanical Keyboard” (<a href="https://skfb.ly/oDNzq">https://skfb.ly/oDNzq</a>) by unknown.fbx; “Cherry MX Switches” (
        <a href="https://skfb.ly/ovvxx">https://skfb.ly/ovvxx</a>) by BlackCube — licensed under CC BY 4.0 (
        <a href="http://creativecommons.org/licenses/by/4.0/">http://creativecommons.org/licenses/by/4.0/</a>)
      </p>
    </footer>
  )
}
