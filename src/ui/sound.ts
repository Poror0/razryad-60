/**
 * Synthetic keystroke (Web Audio, no audio files): a damped low "thock" for the bottom-out,
 * a short band-passed noise tick for the stem hitting the housing, then a quieter release.
 * Created lazily on the first click — never autoplays.
 */
let ctx: AudioContext | null = null

function hit(ac: AudioContext, at: number, gain: number, pitch: number) {
  const out = ac.createGain()
  out.gain.value = gain
  out.connect(ac.destination)

  // body: sine sweep down, fast decay
  const osc = ac.createOscillator()
  const og = ac.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(pitch, at)
  osc.frequency.exponentialRampToValueAtTime(pitch * 0.45, at + 0.06)
  og.gain.setValueAtTime(0.0001, at)
  og.gain.exponentialRampToValueAtTime(0.9, at + 0.003)
  og.gain.exponentialRampToValueAtTime(0.0001, at + 0.09)
  osc.connect(og).connect(out)
  osc.start(at)
  osc.stop(at + 0.12)

  // tick: 12 ms of noise through a band-pass
  const len = Math.floor(ac.sampleRate * 0.012)
  const buf = ac.createBuffer(1, len, ac.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2
  const noise = ac.createBufferSource()
  noise.buffer = buf
  const bp = ac.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = 2400
  bp.Q.value = 0.9
  const ng = ac.createGain()
  ng.gain.value = 0.55
  noise.connect(bp).connect(ng).connect(out)
  noise.start(at)
}

/** press + release; returns the total duration (s) */
export function playKeystroke(): number {
  ctx ??= new AudioContext()
  const ac = ctx
  if (ac.state === 'suspended') void ac.resume()
  const t = ac.currentTime + 0.01
  hit(ac, t, 0.5, 190)
  hit(ac, t + 0.11, 0.22, 260)
  return 0.25
}
