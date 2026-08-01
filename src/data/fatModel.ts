import { FAT_REGIONS, FatRegion, RegionWeights, Sex } from '../state/store'

/**
 * Physiologically-grounded regional adipose model.
 *
 * Baseline weights `w`, growth exponents `p`, floors/caps and thickness bands
 * come from the body-composition research spec: android (male, trunk/visceral)
 * vs gynoid (female, hips/glutes/thighs) storage, with mobilization order
 * driving what deflates first on a cut. All distributions sum to 1 and the
 * regional drag provably conserves total fat mass.
 */

interface RegionConst {
  w: number // baseline share at reference BF (sums to 1 per sex)
  p: number // growth exponent — >1 accumulates & sheds first, <1 lags
  floor: number // min as fraction of reference fat
  cap: number // max as fraction of reference fat
  area: number // morphable surface area (m^2)
  tMin: number // subcutaneous thickness at floor (m)
  tMax: number // subcutaneous thickness at cap (m)
  order: number // mobilization order (1 = lost first)
}

export const REF_BF: Record<Sex, number> = { male: 0.2, female: 0.28 }
export const BF_MIN: Record<Sex, number> = { male: 0.04, female: 0.11 }
export const BF_MAX = 0.5
export const BF_DEFINITION_GATE: Record<Sex, number> = { male: 0.18, female: 0.25 }

export const REGION_CONST: Record<Sex, Record<FatRegion, RegionConst>> = {
  male: {
    face: { w: 0.08, p: 0.7, floor: 0.45, cap: 3.0, area: 0.03, tMin: 0.004, tMax: 0.02, order: 9 },
    chest: { w: 0.08, p: 1.1, floor: 0.15, cap: 4.0, area: 0.05, tMin: 0.003, tMax: 0.035, order: 6 },
    abdomen: { w: 0.22, p: 1.55, floor: 0.08, cap: 6.0, area: 0.06, tMin: 0.003, tMax: 0.05, order: 1 },
    flanks: { w: 0.09, p: 1.4, floor: 0.08, cap: 5.0, area: 0.04, tMin: 0.003, tMax: 0.045, order: 3 },
    lowerBack: { w: 0.06, p: 1.3, floor: 0.12, cap: 4.5, area: 0.04, tMin: 0.003, tMax: 0.035, order: 4 },
    upperBack: { w: 0.07, p: 1.2, floor: 0.12, cap: 4.5, area: 0.04, tMin: 0.003, tMax: 0.035, order: 5 },
    glutes: { w: 0.08, p: 0.95, floor: 0.2, cap: 3.5, area: 0.05, tMin: 0.005, tMax: 0.05, order: 11 },
    hips: { w: 0.04, p: 0.9, floor: 0.25, cap: 3.5, area: 0.04, tMin: 0.004, tMax: 0.045, order: 10 },
    frontThigh: { w: 0.08, p: 1.0, floor: 0.2, cap: 3.5, area: 0.06, tMin: 0.004, tMax: 0.04, order: 8 },
    hamstring: { w: 0.06, p: 0.95, floor: 0.2, cap: 3.5, area: 0.06, tMin: 0.004, tMax: 0.04, order: 12 },
    upperArm: { w: 0.1, p: 0.9, floor: 0.3, cap: 4.0, area: 0.05, tMin: 0.003, tMax: 0.03, order: 7 },
    calf: { w: 0.04, p: 0.65, floor: 0.4, cap: 2.5, area: 0.04, tMin: 0.002, tMax: 0.018, order: 13 },
  },
  female: {
    face: { w: 0.06, p: 0.75, floor: 0.45, cap: 3.0, area: 0.03, tMin: 0.004, tMax: 0.02, order: 9 },
    chest: { w: 0.11, p: 1.15, floor: 0.4, cap: 3.5, area: 0.05, tMin: 0.003, tMax: 0.035, order: 5 },
    abdomen: { w: 0.13, p: 1.2, floor: 0.08, cap: 6.0, area: 0.06, tMin: 0.003, tMax: 0.05, order: 3 },
    flanks: { w: 0.07, p: 1.1, floor: 0.08, cap: 5.0, area: 0.04, tMin: 0.003, tMax: 0.045, order: 4 },
    lowerBack: { w: 0.05, p: 1.1, floor: 0.12, cap: 4.5, area: 0.04, tMin: 0.003, tMax: 0.035, order: 6 },
    upperBack: { w: 0.05, p: 1.05, floor: 0.12, cap: 4.5, area: 0.04, tMin: 0.003, tMax: 0.035, order: 7 },
    glutes: { w: 0.12, p: 1.35, floor: 0.35, cap: 5.0, area: 0.05, tMin: 0.005, tMax: 0.05, order: 12 },
    hips: { w: 0.09, p: 1.45, floor: 0.35, cap: 5.0, area: 0.04, tMin: 0.004, tMax: 0.045, order: 13 },
    frontThigh: { w: 0.1, p: 1.3, floor: 0.3, cap: 4.5, area: 0.06, tMin: 0.004, tMax: 0.04, order: 10 },
    hamstring: { w: 0.08, p: 1.3, floor: 0.3, cap: 4.5, area: 0.06, tMin: 0.004, tMax: 0.04, order: 11 },
    upperArm: { w: 0.1, p: 0.95, floor: 0.3, cap: 4.0, area: 0.05, tMin: 0.003, tMax: 0.03, order: 8 },
    calf: { w: 0.04, p: 0.7, floor: 0.4, cap: 2.5, area: 0.04, tMin: 0.002, tMax: 0.018, order: 14 },
  },
}

const FAT_DENSITY = 900 // kg/m^3

/** Baseline per-region fat mass (kg) for a target BF via the normalized power law. */
export function baselineDistribution(sex: Sex, bodyMass: number, bodyFat: number): Record<FatRegion, number> {
  const g = bodyFat * bodyMass
  const gRef = REF_BF[sex] * bodyMass
  const consts = REGION_CONST[sex]
  const u: Record<string, number> = {}
  let sum = 0
  for (const r of FAT_REGIONS) {
    u[r] = consts[r].w * Math.pow(g / gRef, consts[r].p - 1)
    sum += u[r]
  }
  const out = {} as Record<FatRegion, number>
  for (const r of FAT_REGIONS) out[r] = (g * u[r]) / sum
  return out
}

/**
 * Apply a "more/less region X" drag while conserving total fat mass.
 * The -delta is redistributed across the other regions weighted by their
 * headroom above floor, times a co-mobilization affinity so torso deflates
 * with the belly rather than the calves.
 */
export function redistribute(
  sex: Sex,
  bodyMass: number,
  fat: Record<FatRegion, number>,
  region: FatRegion,
  delta: number,
): Record<FatRegion, number> {
  const consts = REGION_CONST[sex]
  const gRef = REF_BF[sex] * bodyMass
  const floor = (r: FatRegion) => consts[r].floor * gRef * consts[r].w
  const cap = (r: FatRegion) => consts[r].cap * gRef * consts[r].w

  const tau = 2
  const others = FAT_REGIONS.filter((r) => r !== region)
  const avail: Record<string, number> = {}
  let S = 0
  for (const r of others) {
    const affinity = Math.exp(-Math.abs(consts[r].order - consts[region].order) / tau)
    avail[r] = Math.max(0, fat[r] - floor(r)) * affinity
    S += avail[r]
  }
  // clamp delta so we can neither pull more than exists nor exceed the cap
  const room = Math.min(cap(region) - fat[region], S)
  const d = Math.max(-(fat[region] - floor(region)), Math.min(delta, room))

  const out = { ...fat }
  out[region] = fat[region] + d
  if (S > 0) {
    for (const r of others) out[r] = fat[r] - (d * avail[r]) / S
  }
  // one clamp/redistribute pass for any region that dipped below floor
  let residual = 0
  for (const r of others) {
    const f = floor(r)
    if (out[r] < f) {
      residual += f - out[r]
      out[r] = f
    }
  }
  if (residual > 0.0001) {
    const headroom = others.map((r) => Math.max(0, out[r] - floor(r)))
    const hSum = headroom.reduce((a, b) => a + b, 0)
    if (hSum > 0) others.forEach((r, i) => (out[r] -= (residual * headroom[i]) / hSum))
  }
  return out
}

/** Region fat mass (kg) → visual inflation weight 0..1 for the morph target. */
export function inflationFor(sex: Sex, region: FatRegion, fatKg: number): number {
  const c = REGION_CONST[sex][region]
  const t = fatKg / (FAT_DENSITY * c.area)
  const n = (t - c.tMin) / (c.tMax - c.tMin)
  return Math.pow(Math.min(1, Math.max(0, n)), 0.85)
}

/** Visceral fraction of the abdomen depot (pushes belly forward, not along normals). */
export function visceralFraction(sex: Sex, bodyFat: number): number {
  const base = sex === 'male' ? 0.4 : 0.2
  const gain = ((bodyFat - REF_BF[sex]) / 0.3) * 0.15
  return Math.min(0.55, Math.max(0.1, base + gain))
}

/** 0..1 "definition gate" — how visible abs/vascularity are (1 = shredded). */
export function definitionGate(sex: Sex, bodyFat: number): number {
  const gate = BF_DEFINITION_GATE[sex]
  const min = BF_MIN[sex]
  return Math.min(1, Math.max(0, (gate - bodyFat) / (gate - min)))
}

export interface BodyFatCategory {
  label: string
  range: string
  desc: string
}

export function categoryFor(sex: Sex, bodyFat: number): BodyFatCategory {
  const pct = bodyFat * 100
  if (sex === 'male') {
    if (pct < 6) return { label: 'Essential', range: '2–5%', desc: 'Full striations & dense vascularity. Not sustainable.' }
    if (pct < 14) return { label: 'Athletic', range: '6–13%', desc: 'Clear six-pack at rest, sharp jawline, visible serratus.' }
    if (pct < 18) return { label: 'Fitness', range: '14–17%', desc: 'Abs show when flexed; light forearm veins; jaw still defined.' }
    if (pct < 25) return { label: 'Average', range: '18–24%', desc: 'No visible abs; flat-to-round belly; fuller face.' }
    return { label: 'Obese', range: '25%+', desc: 'Protruding abdomen, rounder face, musculature buried.' }
  }
  if (pct < 14) return { label: 'Essential', range: '10–13%', desc: 'Visible abs, vascular forearms; rarely sustainable.' }
  if (pct < 21) return { label: 'Athletic', range: '14–20%', desc: 'Toned limbs, ab outline, defined rounded glutes.' }
  if (pct < 25) return { label: 'Fitness', range: '21–24%', desc: 'Soft ab shadow; jaw defined; small lower-belly softness.' }
  if (pct < 32) return { label: 'Average', range: '25–31%', desc: 'No visible abs; softer hips & thighs; fuller face.' }
  return { label: 'Obese', range: '32%+', desc: 'Rounded hips/glutes & abdomen, fuller face, buried muscle.' }
}

export function normalizedWeights(fat: Record<FatRegion, number>): RegionWeights {
  const total = FAT_REGIONS.reduce((a, r) => a + fat[r], 0) || 1
  const out = {} as RegionWeights
  for (const r of FAT_REGIONS) out[r] = fat[r] / total
  return out
}
