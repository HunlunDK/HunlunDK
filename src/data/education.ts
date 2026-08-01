/** Training-science content, reviewed by an S&C lens. Concise, current (2020s). */

export interface RepZone {
  id: 'strength' | 'hypertrophy' | 'endurance'
  title: string
  reps: string
  intensity: string
  rest: string
  adaptation: string
  driver: string
  cue: string
  color: string
}

export const REP_ZONES: RepZone[] = [
  {
    id: 'strength',
    title: 'Strength',
    reps: '1–5 reps',
    intensity: '85–100% 1RM',
    rest: '3–5 min',
    adaptation: 'Maximal force — largely neural early on: more motor-unit recruitment, faster rate coding, better coordination, plus stiffer tendons.',
    driver: 'High mechanical tension on maximally recruited high-threshold motor units.',
    cue: 'Move every rep with maximal intent. Keep 1–3 reps in reserve on heavy compounds — grinding to failure taxes the CNS for little gain.',
    color: '#ff5470',
  },
  {
    id: 'hypertrophy',
    title: 'Hypertrophy',
    reps: '6–12 (up to ~20 near failure)',
    intensity: '65–80% 1RM',
    rest: '1.5–3 min',
    adaptation: 'Myofibrillar & sarcoplasmic cross-sectional growth. Longer rest grows more muscle by preserving per-set tension.',
    driver: 'Mechanical tension is primary. The last ~5 reps before failure — the “effective reps” — do most of the work.',
    cue: 'Train most sets at 0–3 RIR. Full ROM, controlled ~2s eccentric. Light loads only grow when taken close to failure.',
    color: '#17e0c4',
  },
  {
    id: 'endurance',
    title: 'Muscular Endurance',
    reps: '15–30+ reps',
    intensity: '50–65% 1RM',
    rest: '30–90 s',
    adaptation: 'Fatigue resistance — mitochondrial density, capillarization, buffering capacity.',
    driver: 'High metabolic stress (H⁺, lactate, Pi accumulation, cell swelling). Lower tension per rep.',
    cue: 'Best for conditioning, connective-tissue prep and finishers. Inefficient for pure size; little strength carryover.',
    color: '#ffc24b',
  },
]

export interface OverloadLever {
  name: string
  detail: string
}

export const OVERLOAD_LEVERS: OverloadLever[] = [
  { name: 'Load', detail: 'Add weight — the strongest driver of mechanical tension.' },
  { name: 'Reps', detail: 'More reps at the same load. Usually the step before adding weight.' },
  { name: 'Sets', detail: 'More working sets adds weekly volume — the primary hypertrophy lever.' },
  { name: 'Tempo', detail: 'Slower eccentrics & pauses raise time under tension at a given load.' },
  { name: 'ROM', detail: 'Greater range — especially loaded lengthened positions — increases stimulus.' },
  { name: 'Density', detail: 'More work in less time. A conditioning lever; use sparingly for size.' },
]

export const OVERLOAD_INTRO =
  'Progressive overload is the systematic increase of training demand over time. Muscle and connective tissue adapt to the stress imposed — once adapted, the same stimulus is only maintenance. Overload gives the body a reason to keep changing. It is the single non-negotiable principle of getting stronger or bigger.'

export const PROGRESSION_RATES = [
  { level: 'Beginner', window: 'Add load most sessions', note: '~2.5–5 kg weekly on lower-body compounds. Fast, near-linear “newbie gains”.' },
  { level: 'Intermediate', window: 'Progress week-to-month', note: 'Weekly/biweekly load bumps or progress via reps & volume within a block.' },
  { level: 'Advanced', window: 'Progress month-to-quarter', note: 'Small, hard-won increments. Relies on periodization & volume management.' },
]

export interface Mechanism {
  name: string
  weight: 'primary' | 'secondary' | 'minor'
  detail: string
}

export const HYPERTROPHY_MECHANISMS: Mechanism[] = [
  {
    name: 'Mechanical Tension',
    weight: 'primary',
    detail: 'Force through the fibers, sensed by mechanotransduction and converted into anabolic signaling. The dominant, possibly near-exclusive driver — accumulated across effective reps and adequate volume, close enough to failure to recruit high-threshold fibers.',
  },
  {
    name: 'Metabolic Stress',
    weight: 'secondary',
    detail: 'Metabolite accumulation and cell swelling (“the pump”). A real but modest contributor, largely because it drives you toward fuller motor-unit recruitment. Not worth chasing at the expense of load.',
  },
  {
    name: 'Muscle Damage',
    weight: 'minor',
    detail: 'Microtrauma (the source of DOMS). Current consensus: more a side effect than a cause — excess damage can impair the next session. You do not need to be sore to grow.',
  },
]

export const VOLUME_LANDMARKS = [
  { key: 'MEV', label: 'Minimum Effective Volume', value: '~4–10 sets/wk', note: 'Least weekly volume that still grows a muscle.' },
  { key: 'MAV', label: 'Maximum Adaptive Volume', value: '~10–20 sets/wk', note: 'The sweet spot — best adaptation for the fatigue. Target zone.' },
  { key: 'MRV', label: 'Maximum Recoverable Volume', value: '20+ sets/wk', note: 'The ceiling — beyond it fatigue outpaces recovery. Deload before here.' },
]

export const RECOVERY_NOTES = [
  { title: 'Protein', value: '1.6–2.2 g/kg/day', note: 'Across 3–5 meals; total daily intake matters most.' },
  { title: 'Frequency', value: 'Each muscle 2×/week', note: 'Spreading volume keeps per-set quality high and protein synthesis elevated more often.' },
  { title: 'Sleep', value: '7–9 hours', note: 'Adaptation happens between sessions; debt suppresses recovery & raises injury risk.' },
  { title: 'Deload', value: 'Every 4–8 weeks', note: 'Let volume & intensity ebb to dissipate accumulated fatigue.' },
]

export interface GlossaryTerm {
  term: string
  def: string
}

export const GLOSSARY: GlossaryTerm[] = [
  { term: 'Concentric', def: 'The muscle-shortening phase, producing movement against a load (the lift).' },
  { term: 'Eccentric', def: 'The muscle-lengthening phase under load — resisting as it stretches (the lower). High force; a major growth stimulus and the source of DOMS.' },
  { term: 'Isometric', def: 'Force with no change in muscle length or joint angle (a plank, a paused hold).' },
  { term: 'Origin', def: 'A muscle’s attachment on the more stationary bone — the fixed anchor.' },
  { term: 'Insertion', def: 'The attachment on the more mobile bone, pulled toward the origin when the muscle shortens.' },
  { term: 'Motor unit', def: 'A motor neuron plus all the fibers it innervates. Recruited by size: low-threshold (Type I) first, high-threshold (Type II) as demand nears maximal.' },
  { term: 'Sarcomere', def: 'The contractile unit between two Z-lines. Myosin cross-bridges pull on actin (sliding-filament) to shorten it and make force.' },
  { term: 'Mechanical tension', def: 'Force experienced by the fibers under load — the primary driver of hypertrophy.' },
  { term: 'Metabolic stress', def: 'Accumulated metabolites and cell swelling from higher-rep, shorter-rest work.' },
  { term: 'RIR', def: 'Reps In Reserve — how many more reps you could have done. RPE = 10 − RIR.' },
  { term: '1RM', def: 'One-rep max — the reference for expressing intensity as %1RM.' },
  { term: 'MEV / MAV / MRV', def: 'Minimum-effective / maximum-adaptive / maximum-recoverable weekly volume. Structures how volume rises across a block.' },
  { term: 'DOMS', def: 'Delayed-onset muscle soreness, peaking ~24–72 h after novel or eccentric work. A poor proxy for workout quality.' },
]
