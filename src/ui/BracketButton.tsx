import type { ReactNode, MouseEventHandler } from 'react'

/** «[ купить ]» — brackets are separate elements that slide apart on hover. */
export function BracketButton({
  children,
  href,
  onClick,
  size = 'md',
  className = '',
}: {
  children: ReactNode
  href?: string
  onClick?: MouseEventHandler
  size?: 'sm' | 'md' | 'lg'
  className?: string
}) {
  const inner = (
    <>
      <span className="bbtn__b bbtn__b--l" aria-hidden="true">
        [
      </span>
      <span className="bbtn__t">{children}</span>
      <span className="bbtn__b bbtn__b--r" aria-hidden="true">
        ]
      </span>
    </>
  )
  const cls = `bbtn bbtn--${size} ${className}`
  return href ? (
    <a className={cls} href={href} onClick={onClick}>
      {inner}
    </a>
  ) : (
    <button type="button" className={cls} onClick={onClick}>
      {inner}
    </button>
  )
}
