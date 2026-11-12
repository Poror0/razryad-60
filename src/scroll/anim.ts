/**
 * Mutable animation state. GSAP (scroll timeline) writes it, useFrame reads it.
 * Never stored in React state — no re-renders while scrolling.
 */
export const anim = {
  /** stage 1: caps lift in a wave by rows, 0..1 */
  lift: 0,
  /** stage 2: exploded view, 0..1 */
  explode: 0,
  /** stage 3: close-up, hero switch replaces the simple one and comes apart, 0..1 */
  focus: 0,
  /**
   * stage panels + callouts 1..5: 0 hidden → 1 shown (fade in, lines draw) → 2 gone (leaves upwards).
   * Driven by the scroll timeline, read every frame by the Overlay.
   */
  p1: 0,
  p2: 0,
  p3: 0,
  p4: 0,
  p5: 0,
  /** idle motion (hero rotation / mouse), 1 on first screen, fades out after */
  idle: 1,
  /** camera keyframe blend: index-based, see CAMERA in Scene */
  cam: 0,
}

export type AnimState = typeof anim

/** pointer, normalised -1..1 */
export const pointer = { x: 0, y: 0 }

/** user motion preference (set once in initScroll) */
export const motion = { reduced: false }
