import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { anim } from './anim'

gsap.registerPlugin(ScrollTrigger)

/**
 * Stage targets. The scroll track is 5 sections (hero + 4 stages); stage N finishes
 * when section N reaches the top, so scrolling 0/25/50/75/100% lands exactly on stages 0–4.
 */
export const STAGES = [
  { lift: 0, explode: 0, focus: 0, labels: 0, idle: 1, cam: 0 }, // 0 hero
  { lift: 1, explode: 0, focus: 0, labels: 0, idle: 0, cam: 1 }, // 1 caps rise
  { lift: 1, explode: 1, focus: 0, labels: 0, idle: 0, cam: 2 }, // 2 exploded view
  { lift: 1, explode: 1, focus: 1, labels: 1, idle: 0, cam: 3 }, // 3 switch close-up
  { lift: 0, explode: 0, focus: 0, labels: 0, idle: 0.35, cam: 4 }, // 4 reassembled, final angle
] as const

export function setStage(i: number) {
  Object.assign(anim, STAGES[i])
}

/** smooth scroll + scrubbed timeline. Returns cleanup. */
export function initScroll(track: HTMLElement, reducedMotion: boolean) {
  if (reducedMotion) {
    // static frames: jump to each stage when its section becomes the main one
    const sections = Array.from(track.querySelectorAll<HTMLElement>('[data-stage]'))
    const triggers = sections.map((el) =>
      ScrollTrigger.create({
        trigger: el,
        start: 'top 55%',
        end: 'bottom 55%',
        onToggle: (self) => self.isActive && setStage(Number(el.dataset.stage)),
      }),
    )
    setStage(0)
    return () => triggers.forEach((t) => t.kill())
  }

  const lenis = new Lenis({ duration: 1.1, smoothWheel: true })
  lenis.on('scroll', ScrollTrigger.update)
  const raf = (time: number) => lenis.raf(time * 1000)
  gsap.ticker.add(raf)
  gsap.ticker.lagSmoothing(0)

  const tl = gsap.timeline({
    defaults: { ease: 'power2.inOut' },
    scrollTrigger: { trigger: track, start: 'top top', end: 'bottom bottom', scrub: 0.6 },
  })
  // each stage: 0.8 transition + 0.2 hold, so text can be read at rest
  for (let i = 1; i < STAGES.length; i++) {
    const at = i - 1
    const s = STAGES[i]
    tl.to(anim, { lift: s.lift, explode: s.explode, idle: s.idle, cam: s.cam, duration: 0.8 }, at)
    if (i === 3) {
      tl.to(anim, { focus: 1, duration: 0.8 }, at)
      tl.to(anim, { labels: 1, duration: 0.25, ease: 'none' }, at + 0.6)
    }
    if (i === 4) {
      tl.to(anim, { labels: 0, duration: 0.15, ease: 'none' }, at)
      tl.to(anim, { focus: 0, duration: 0.45 }, at)
    }
    tl.to({}, { duration: 0.2 }, at + 0.8)
  }

  return () => {
    tl.scrollTrigger?.kill()
    tl.kill()
    gsap.ticker.remove(raf)
    lenis.destroy()
  }
}
