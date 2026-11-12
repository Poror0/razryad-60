/**
 * Scroll reveal: `.rv` blocks fade + rise 24px, `.rv-words` headings slide up word by word behind a mask.
 * One IntersectionObserver; with reduced motion everything is shown at once.
 * The shown state is a data attribute (data-in), not a class: React rewrites `className` on re-render
 * and would drop a class added from outside.
 */
export function initReveal(reduced: boolean) {
  const els = Array.from(document.querySelectorAll<HTMLElement>('.rv, .rv-words'))
  if (reduced || !('IntersectionObserver' in window)) {
    els.forEach((e) => e.setAttribute('data-in', ''))
    return () => {}
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        e.target.setAttribute('data-in', '')
        io.unobserve(e.target)
      }
    },
    { rootMargin: '0px 0px -12% 0px', threshold: 0.12 },
  )
  els.forEach((e) => io.observe(e))
  return () => io.disconnect()
}
