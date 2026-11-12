/** Stage panels and callouts for the 3D scroll scenario (stages 1–5; 0 is the hero). */

export type Side = 'left' | 'right'

export interface Stat {
  value: string
  unit?: string
  caption: string
}

export interface StagePanel {
  /** 1..5 */
  n: number
  id?: string
  title: string
  text: string
  /** one-sentence version for phones */
  short: string
  stats: Stat[]
  /** panel side; the model is pushed to the other side */
  side: Side
}

export type Anchor =
  /** a keyboard node (keycap pivot is its centre), optional keyboard-space offset */
  | { kind: 'node'; name: string; offset?: [number, number, number] }
  /** average of switch seats (on the plate), lifted by `up` metres */
  | { kind: 'seat'; keys: string[]; up?: number }
  /** a hero switch part, pushed sideways (camera right, metres) to its outer edge */
  | { kind: 'hero'; part: string; edge: number }
  /** fixed keyboard-space point (metres) */
  | { kind: 'point'; at: [number, number, number] }

export interface Callout {
  id: string
  stage: number
  text: string
  /** one of the two kept on phones */
  main: boolean
  anchor: Anchor
  /** label offset from the anchor, px at 1440 wide (scaled down on smaller screens) */
  dx: number
  dy: number
  /** phones: label offset in px, when the scaled desktop one does not work */
  m?: [number, number]
}

export const STAGE_COUNT = 5

export const PANELS: StagePanel[] = [
  {
    n: 1,
    title: 'кейкапы — PBT double-shot',
    text: 'Каждый кейкап отлит из двух слоёв пластика: подписи не стираются, а не наносятся сверху. PBT не блестит от пальцев даже через годы.',
    short: 'Подписи отлиты вторым слоём пластика — они не сотрутся.',
    stats: [
      { value: '1.5', unit: 'мм', caption: 'толщина стенки' },
      { value: 'OEM', caption: 'профиль' },
      { value: '61', caption: 'клавиша' },
    ],
    side: 'right',
  },
  {
    n: 2,
    title: 'под ними — hot-swap',
    text: 'Кейкапы разлетаются — и видно, что свитчи не припаяны. Любой можно вытащить съёмником и поставить другой: 3- и 5-пиновые MX-совместимые.',
    short: 'Свитчи не припаяны — любой меняется съёмником.',
    stats: [
      { value: '0', caption: 'пайки' },
      { value: '3/5', unit: 'pin', caption: 'MX-совместимые' },
      { value: '61', caption: 'сокет' },
    ],
    side: 'left',
  },
  {
    n: 3,
    id: 'switches',
    title: 'свитч — с характером',
    text: 'Линейные, со смазкой с завода: ход ровный, без шороха и щелчка. Мягкое начало и уверенный упор в конце.',
    short: 'Линейные, смазанные с завода: ровный ход без щелчка.',
    stats: [
      { value: '45', unit: 'гс', caption: 'нажатие' },
      { value: '2', unit: 'мм', caption: 'срабатывание' },
      { value: '4', unit: 'мм', caption: 'полный ход' },
    ],
    side: 'right',
  },
  {
    n: 4,
    id: 'specs',
    title: 'корпус — алюминий и gasket',
    text: 'Фрезерованный алюминиевый корпус, анодирован в красный. Пластина лежит на силиконовых прокладках — удар мягче, звук ниже и глуше.',
    short: 'Алюминиевый корпус, пластина на силиконовых прокладках.',
    stats: [
      { value: '820', unit: 'г', caption: 'вес' },
      { value: '6061', caption: 'алюминий' },
      { value: '4', caption: 'слоя шумоизоляции' },
    ],
    side: 'left',
  },
  {
    n: 5,
    id: 'buy',
    title: 'собрана — и ничего лишнего',
    text: '61 клавиша, USB-C и съёмный кабель. Всё остальное — на слое Fn.',
    short: '61 клавиша, USB-C, остальное — на слое Fn.',
    stats: [
      { value: 'USB-C', caption: 'съёмный кабель' },
      { value: '1000', unit: 'Гц', caption: 'опрос' },
      { value: 'N-key', caption: 'rollover' },
    ],
    side: 'right',
  },
]

export const CALLOUTS: Callout[] = [
  // 01 — caps lifted
  { id: 'cap', stage: 1, text: 'двухслойное литьё', main: true, anchor: { kind: 'node', name: 'key_G' }, dx: 230, dy: 250 },
  { id: 'esc', stage: 1, text: 'акцентная клавиша', main: true, anchor: { kind: 'node', name: 'key_Esc' }, dx: 130, dy: -100 },
  // 02 — exploded
  { id: 'socket', stage: 2, text: 'hot-swap сокет', main: true, anchor: { kind: 'seat', keys: ['key_J'], up: 0.006 }, dx: -260, dy: 230, m: [-70, 110] },
  { id: 'plate', stage: 2, text: 'стальная пластина', main: true, anchor: { kind: 'seat', keys: ['key_Period', 'key_Slash'], up: 0.0004 }, dx: 170, dy: 190, m: [40, 60] },
  // 03 — switch apart (panel on the right → labels to the left)
  { id: 'top', stage: 3, text: 'верхний корпус — поликарбонат, под подсветку', main: false, anchor: { kind: 'hero', part: 'Top', edge: -0.0095 }, dx: -120, dy: 0 },
  { id: 'stem', stage: 3, text: 'шток — POM, самосмазывающийся', main: true, anchor: { kind: 'hero', part: 'Stem', edge: -0.0055 }, dx: -150, dy: 0 },
  { id: 'spring', stage: 3, text: 'пружина — 45 гс, позолоченная', main: true, anchor: { kind: 'hero', part: 'Spring', edge: -0.003 }, dx: -170, dy: 0 },
  { id: 'bottom', stage: 3, text: 'нижний корпус — нейлон, глуше звук', main: false, anchor: { kind: 'hero', part: 'Bottom', edge: -0.009 }, dx: -130, dy: 0 },
  // 04 — case close-up
  { id: 'cnc', stage: 4, text: 'CNC-алюминий', main: true, anchor: { kind: 'point', at: [0.147, 0.009, 0.0] }, dx: 140, dy: 150 },
  { id: 'gasket', stage: 4, text: 'gasket-mount', main: true, anchor: { kind: 'point', at: [0.1435, 0.0175, 0.03] }, dx: 210, dy: -220 },
]

export const PRICE = '12 990 ₽'
