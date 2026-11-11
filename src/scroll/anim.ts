/** Mutable animation state, written by GSAP (scroll) and read in useFrame. */
export const anim = {
  /** stage 1: caps lift in a wave, 0..1 */
  lift: 0,
  /** stage 2: exploded view, 0..1 */
  explode: 0,
  /** stage 3: hero switch disassembly, 0..1 */
  focus: 0,
  /** labels opacity for stage 3 */
  labels: 0,
}
export type AnimState = typeof anim
