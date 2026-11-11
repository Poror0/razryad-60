import type { Row } from './parts'

export type CapColor = 'black' | 'red' | 'white'

export type Legend =
  | { kind: 'dual'; main: string; sub?: string }
  | { kind: 'text'; text: string }
  | { kind: 'icon'; icon: string; color?: string }
  | { kind: 'space' }
  | { kind: 'enter' }

export interface KeyDef {
  id: string
  /** left edge, in u */
  x: number
  /** row top, in u */
  y: number
  w: number
  row: Row
  color: CapColor
  legend: Legend
  /** visual row index used for staggered animation (0 = F-row) */
  line: number
}

const keys: KeyDef[] = []
let auto = 0
function k(x: number, y: number, w: number, row: Row, color: CapColor, legend: Legend, line: number, id?: string) {
  keys.push({ id: id ?? `k${auto++}`, x, y, w, row, color, legend, line })
}
const dual = (main: string, sub?: string): Legend => ({ kind: 'dual', main, sub })
const icon = (name: string): Legend => ({ kind: 'icon', icon: name })
const text = (t: string): Legend => ({ kind: 'text', text: t })

// --- F row
const yF = 0
k(0, yF, 1, 1, 'white', icon('moon'), 0, 'esc')
;['F1', 'F2', 'F3', 'F4'].forEach((t, i) => k(2 + i, yF, 1, 1, 'black', dual(t), 0))
;['flower', 'flame', 'burst', 'crystal'].forEach((t, i) => k(6.5 + i, yF, 1, 1, 'red', icon(t), 0))
;['F9', 'F10', 'F11', 'F12'].forEach((t, i) => k(11 + i, yF, 1, 1, 'black', dual(t), 0))
k(15.25, yF, 1, 1, 'red', icon('thumb'), 0)

// --- number row
const y1 = 1.25
const num: [string, string?][] = [['`~'], ['1!'], ['2@'], ['3#'], ['4$'], ['5%'], ['6^'], ['7&'], ['8*'], ['9('], ['0)'], ['-_'], ['=+']]
num.forEach(([m], i) => k(i, y1, 1, 1, 'black', dual(m), 1))
k(13, y1, 2, 1, 'red', icon('chevL'), 1, 'bksp')
;['heart', 'spiral', 'sparkle'].forEach((t, i) => k(15.25 + i, y1, 1, 1, 'red', icon(t), 1))

// --- tab row
const y2 = 2.25
k(0, y2, 1.5, 2, 'red', icon('hearts'), 2, 'tab')
const qrow: [string, string][] = [['Q', 'й'], ['W', 'ц'], ['E', 'у'], ['R', 'к'], ['T', 'е'], ['Y', 'н'], ['U', 'г'], ['I', 'ш'], ['O', 'щ'], ['P', 'з'], ['[{', 'х'], [']}', 'ъ']]
qrow.forEach(([m, s], i) => k(1.5 + i, y2, 1, 2, 'black', dual(m, s), 2, i === 0 ? 'q' : undefined))
k(13.5, y2, 1.5, 2, 'red', icon('bunny'), 2)
;['excl', 'bell', 'house'].forEach((t, i) => k(15.25 + i, y2, 1, 2, 'red', icon(t), 2))

// --- home row
const y3 = 3.25
k(0, y3, 1.75, 3, 'red', icon('lock'), 3, 'caps')
const arow: [string, string][] = [['A', 'ф'], ['S', 'ы'], ['D', 'в'], ['F', 'а'], ['G', 'п'], ['H', 'р'], ['J', 'о'], ['K', 'л'], ['L', 'д'], [';:', 'ж'], ["'\"", 'э']]
arow.forEach(([m, s], i) => k(1.75 + i, y3, 1, 3, 'black', dual(m, s), 3, m === 'F' ? 'f' : m === 'J' ? 'j' : undefined))
k(12.75, y3, 2.25, 3, 'white', { kind: 'enter' }, 3, 'enter')

// --- shift row
const y4 = 4.25
k(0, y4, 2.25, 4, 'red', icon('chevR'), 4, 'lshift')
const zrow: [string, string][] = [['Z', 'я'], ['X', 'ч'], ['C', 'с'], ['V', 'м'], ['B', 'и'], ['N', 'т'], ['M', 'ь'], [',<', 'б'], ['.>', 'ю'], ['/?', '.,']]
zrow.forEach(([m, s], i) => k(2.25 + i, y4, 1, 4, 'black', dual(m, s), 4))
k(12.25, y4, 2.75, 4, 'red', icon('star'), 4, 'rshift')
k(16.25, y4, 1, 4, 'red', icon('arrowU'), 4)

// --- bottom row
const y5 = 5.25
k(0, y5, 1.25, 4, 'red', text('CTRL'), 5)
k(1.25, y5, 1.25, 4, 'red', icon('flame'), 5)
k(2.5, y5, 1.25, 4, 'red', text('ALT'), 5)
k(3.75, y5, 6.25, 4, 'white', { kind: 'space' }, 5, 'space')
k(10, y5, 1.25, 4, 'red', text('ALT'), 5)
k(11.25, y5, 1.25, 4, 'red', text('FN'), 5)
k(12.5, y5, 1.25, 4, 'red', icon('heartCursor'), 5)
k(13.75, y5, 1.25, 4, 'red', text('CTRL'), 5)
;['arrowL', 'arrowD', 'arrowR'].forEach((t, i) => k(15.25 + i, y5, 1, 4, 'red', icon(t), 5))

export const KEYS = keys

/** overall key field in u */
export const FIELD_W = 18.25
export const FIELD_D = 6.25

/** knob centre in u (Pause position) */
export const KNOB = { x: 17.75, y: 0.5 }
/** indicator bars position */
export const INDICATOR = { x: 1.5, y: 0.5 }
