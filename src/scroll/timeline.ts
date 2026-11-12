import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { anim, motion } from './anim'

gsap.registerPlugin(ScrollTrigger)

/**
 * Stage targets. The scroll track is 6 sections (hero + 5 stages); stage N finishes
 * when section N reaches the top, so scrolling 0/20/40/60/80/100% lands exactly on stages 0–5.
 */
const S = (lift: number, explode: number, focus: number, idle: number, cam: number) => ({ lift, explode, focus, idle, cam })
export const STAGES = [
  S(0, 0, 0, 1, 0), // 0 hero
  S(1, 0, 0, 0, 1), // 1 caps rise
  S(1, 1, 0, 0, 2), // 2 exploded view, hot-swap
  S(1, 1, 1, 0, 3), // 3 switch close-up
  S(0, 0, 0, 0, 4), // 4 reassembled, close-up on the case edge
  S(0, 0, 0, 0.35, 5), // 5 final angle → buy
] as const

const PANEL_KEYS = ['p1', 'p2', 'p3', 'p4', 'p5'] as const

/** jump to a stage (dev ?stage=N): panel N shown, earlier ones gone, later ones hidden */
export function setStage(i: number) {
  Object.assign(anim, STAGES[i])
  anim.hero = i === 0 ? 1 : 0
  PANEL_KEYS.forEach((k, j) => (anim[k] = j + 1 < i ? 2 : j + 1 === i ? 1 : 0))
}

/** smooth scroll + scrubbed timeline. Returns cleanup. */
export function initScroll(track: HTMLElement, reducedMotion: boolean) {
  // Everyone gets the same smooth, scroll-scrubbed animation (no stage jumps).
  // prefers-reduced-motion only removes extras: Lenis inertia, idle sway, diamond flicker.
  motion.reduced = reducedMotion
  let lenis: Lenis | null = null
  let raf: ((time: number) => void) | null = null
  if (!reducedMotion) {
    lenis = new Lenis({ duration: 1.1, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)
    const l = lenis
    raf = (time: number) => l.raf(time * 1000)
    gsap.ticker.add(raf)
    gsap.ticker.lagSmoothing(0)
  }

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: { trigger: track, start: 'top top', end: 'bottom bottom', scrub: reducedMotion ? true : 0.6 },
  })
  // each stage: 0.8 transition + 0.2 hold, so text can be read at rest.
  // Panel N fades in over the end of its transition, leaves as soon as stage N+1 starts.
  for (let i = 1; i < STAGES.length; i++) {
    const at = i - 1
    const s = STAGES[i]
    // stage 1: the hero line + button fade out first, the model only starts moving after that
    if (i === 1) tl.to(anim, { hero: 0, duration: 0.12, ease: 'none' }, 0)
    const lead = i === 1 ? 0.15 : 0
    tl.to(anim, { lift: s.lift, explode: s.explode, idle: s.idle, cam: s.cam, duration: 0.8 - lead }, at + lead)
    if (i === 3) tl.to(anim, { focus: 1, duration: 0.8 }, at)
    if (i === 4) tl.to(anim, { focus: 0, duration: 0.45 }, at)
    const key = PANEL_KEYS[i - 1]
    tl.fromTo(anim, { [key]: 0 }, { [key]: 1, duration: 0.35, ease: 'power1.out', immediateRender: false }, at + 0.45)
    if (i < STAGES.length - 1) tl.to(anim, { [key]: 2, duration: 0.22, ease: 'power1.in' }, at + 1.03)
    tl.to({}, { duration: 0.2 }, at + 0.8)
  }

  return () => {
    tl.scrollTrigger?.kill()
    tl.kill()
    if (raf) gsap.ticker.remove(raf)
    lenis?.destroy()
  }
}
