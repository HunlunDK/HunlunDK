import { create } from 'zustand'

export type Mode = 'explore' | 'exercise' | 'physique' | 'lab'
export type Sex = 'male' | 'female'

/** Anatomy layers, from outermost to innermost. */
export type LayerKey = 'skin' | 'fat' | 'muscle' | 'tendon' | 'skeleton'

export interface LayerState {
  key: LayerKey
  label: string
  visible: boolean
  /** 0..1 opacity when visible */
  opacity: number
}

/** Regional fat model — order matters for UI. */
export const FAT_REGIONS = [
  'face', 'chest', 'abdomen', 'flanks', 'lowerBack',
  'glutes', 'hips', 'frontThigh', 'hamstring', 'upperArm', 'calf', 'upperBack',
] as const
export type FatRegion = (typeof FAT_REGIONS)[number]

export type RegionWeights = Record<FatRegion, number>

interface KineticaState {
  mode: Mode
  sex: Sex
  layers: Record<LayerKey, LayerState>
  /** overall body-fat percentage 5..40 */
  bodyFat: number
  /** normalized regional fat distribution (sums to ~1); driven by biology model */
  regionFat: RegionWeights
  /** which region the user is actively biasing, if any */
  focusedRegion: FatRegion | null

  selectedExercise: string | null
  /** 0..1 timeline scrub of the current exercise animation */
  exercisePhase: number
  playing: boolean
  /** world-space focus (centroid + radius) of the working muscles, for the camera */
  exerciseFocus: { x: number; y: number; z: number; r: number } | null

  /** currently highlighted muscle/structure id (hover/pin) */
  highlighted: string | null
  pinned: string | null
  /** human-readable anatomical name of the hovered/pinned structure */
  highlightedLabel: string | null

  /** Bicep Lab — target elbow flex the user is steering toward (0..1) */
  labTarget: number
  /** Bicep Lab — current smoothed flex the scene is rendering (0..1) */
  labFlex: number

  setMode: (m: Mode) => void
  setSex: (s: Sex) => void
  toggleLayer: (k: LayerKey) => void
  setLayerOpacity: (k: LayerKey, o: number) => void
  isolateLayer: (k: LayerKey) => void
  showAllLayers: () => void
  setBodyFat: (v: number) => void
  setRegionFat: (r: RegionWeights) => void
  setFocusedRegion: (r: FatRegion | null) => void
  selectExercise: (id: string | null) => void
  setExercisePhase: (p: number) => void
  setPlaying: (p: boolean) => void
  setExerciseFocus: (f: { x: number; y: number; z: number; r: number } | null) => void
  setHighlighted: (id: string | null) => void
  setPinned: (id: string | null) => void
  setHighlightedLabel: (label: string | null) => void

  /** steer elbow flex by a delta (arrow keys / hold buttons), clamped 0..1 */
  nudgeLabTarget: (d: number) => void
  /** set elbow flex target directly (slider), clamped 0..1 */
  setLabTarget: (v: number) => void
  /** scene reports the smoothed flex it is currently rendering */
  setLabFlex: (v: number) => void
}

const defaultLayers: Record<LayerKey, LayerState> = {
  skin: { key: 'skin', label: 'Skin', visible: false, opacity: 0.85 },
  fat: { key: 'fat', label: 'Adipose', visible: false, opacity: 0.9 },
  muscle: { key: 'muscle', label: 'Muscle', visible: true, opacity: 1 },
  tendon: { key: 'tendon', label: 'Tendon', visible: true, opacity: 1 },
  skeleton: { key: 'skeleton', label: 'Skeleton', visible: true, opacity: 1 },
}

/** Baseline (mid body-fat) distributions from the adipose-biology model. */
export const BASELINE_DISTRIBUTION: Record<Sex, RegionWeights> = {
  male: {
    face: 0.05, chest: 0.08, abdomen: 0.20, flanks: 0.12, lowerBack: 0.06,
    glutes: 0.07, hips: 0.05, frontThigh: 0.09, hamstring: 0.07,
    upperArm: 0.05, calf: 0.04, upperBack: 0.12,
  },
  female: {
    face: 0.045, chest: 0.07, abdomen: 0.10, flanks: 0.07, lowerBack: 0.05,
    glutes: 0.16, hips: 0.15, frontThigh: 0.13, hamstring: 0.11,
    upperArm: 0.06, calf: 0.05, upperBack: 0.055,
  },
}

export const useStore = create<KineticaState>((set) => ({
  mode: 'explore',
  sex: 'male',
  layers: defaultLayers,
  bodyFat: 15,
  regionFat: { ...BASELINE_DISTRIBUTION.male },
  focusedRegion: null,
  selectedExercise: null,
  exercisePhase: 0,
  playing: false,
  exerciseFocus: null,
  highlighted: null,
  pinned: null,
  highlightedLabel: null,
  labTarget: 0,
  labFlex: 0,

  setMode: (mode) =>
    set((s) => {
      // Sensible layer preset per mode; physique shows the fleshed body surface.
      const layers = { ...s.layers }
      const vis = (k: LayerKey, v: boolean, o?: number) =>
        (layers[k] = { ...layers[k], visible: v, opacity: o ?? layers[k].opacity })
      if (mode === 'physique') {
        vis('skin', true, 0.96); vis('fat', false); vis('muscle', false); vis('tendon', false); vis('skeleton', false)
      } else if (mode === 'exercise') {
        vis('skin', false); vis('muscle', true, 1); vis('tendon', true, 1); vis('skeleton', true, 1)
      } else {
        vis('skin', false); vis('muscle', true, 1); vis('tendon', true, 1); vis('skeleton', true, 1)
      }
      return { mode, layers }
    }),
  setSex: (sex) => set({ sex, regionFat: { ...BASELINE_DISTRIBUTION[sex] } }),
  toggleLayer: (k) =>
    set((s) => ({
      layers: { ...s.layers, [k]: { ...s.layers[k], visible: !s.layers[k].visible } },
    })),
  setLayerOpacity: (k, o) =>
    set((s) => ({ layers: { ...s.layers, [k]: { ...s.layers[k], opacity: o } } })),
  isolateLayer: (k) =>
    set((s) => {
      const layers = { ...s.layers }
      ;(Object.keys(layers) as LayerKey[]).forEach((key) => {
        layers[key] = { ...layers[key], visible: key === k }
      })
      return { layers }
    }),
  showAllLayers: () =>
    set((s) => {
      const layers = { ...s.layers }
      ;(Object.keys(layers) as LayerKey[]).forEach((key) => {
        layers[key] = { ...layers[key], visible: defaultLayers[key].visible }
      })
      return { layers }
    }),
  setBodyFat: (bodyFat) => set({ bodyFat }),
  setRegionFat: (regionFat) => set({ regionFat }),
  setFocusedRegion: (focusedRegion) => set({ focusedRegion }),
  selectExercise: (selectedExercise) =>
    set({ selectedExercise, exercisePhase: 0, playing: selectedExercise != null }),
  setExercisePhase: (exercisePhase) => set({ exercisePhase }),
  setPlaying: (playing) => set({ playing }),
  setExerciseFocus: (exerciseFocus) => set({ exerciseFocus }),
  setHighlighted: (highlighted) => set({ highlighted }),
  setPinned: (pinned) => set({ pinned }),
  setHighlightedLabel: (highlightedLabel) => set({ highlightedLabel }),
  nudgeLabTarget: (d) => set((s) => ({ labTarget: Math.min(1, Math.max(0, s.labTarget + d)) })),
  setLabTarget: (v) => set({ labTarget: Math.min(1, Math.max(0, v)) }),
  setLabFlex: (v) => set({ labFlex: v }),
}))

/** Prettify a raw BodyParts3D mesh name for display. */
export function prettyAnatomyName(raw: string): string {
  return raw
    .replace(/\.[rl]$/i, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim()
}
