import { useEffect, useState } from 'react'
import { BracketButton } from './BracketButton'

const LINKS: [string, string][] = [
  ['свитчи', '#switches'],
  ['характеристики', '#specs'],
  ['комплектация', '#kit'],
  ['купить', '#buy'],
]

export function Header() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(scrollY > 12)
    on()
    addEventListener('scroll', on, { passive: true })
    return () => removeEventListener('scroll', on)
  }, [])
  return (
    <header className={`header${scrolled ? ' header--scrolled' : ''}`}>
      <a className="logo" href="#top" aria-label="РАЗРЯД — наверх">
        <span className="logo__mark" aria-hidden="true" />
        РАЗРЯД
      </a>
      <nav className="nav" aria-label="Разделы">
        {LINKS.map(([t, h]) => (
          <a key={h} href={h}>
            {t}
          </a>
        ))}
      </nav>
      <BracketButton href="#buy" size="sm" className="header__buy">
        купить
      </BracketButton>
    </header>
  )
}
