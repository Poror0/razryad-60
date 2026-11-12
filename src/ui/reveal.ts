/**
 * Scroll reveal: `.rv` blocks fade + rise 24px, `.rv-words` headings slide up word by word behind a mask.
 * One IntersectionObserver; with prefers-reduced-motion everything is shown at once.
 */
export function initReveal(reduced: boolean) {
  const els = Array.from(document.querySelectorAll<HTMLElement>('.rv, .rv-words'))
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('is-in'))
    return () => {}
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.classList.add('is-in')
        io.unobserve(e.target)
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  )
  els.forEach((e) => io.observe(e))
  return () => io.disconnect()
}
