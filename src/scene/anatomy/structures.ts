import { JointName } from './rig'

/**
 * Declarative anatomy. Each structure is placed relative to rig landmarks and
 * rebuilt cheaply per-frame. Muscle ids line up with the exercise library so
 * activation highlighting and origin/insertion callouts resolve by id.
 */

export interface MuscleDef {
  id: string
  label: string
  /** placed as a spindle between two landmarks */
  a: JointName
  b: JointName
  radius: number
  bulge: number // 0..1 belly position
  /** local lateral/ap offset from the bone axis, in metres, [x,y,z] in a
   * frame where y follows the bone; approximated as world offset */
  offset: [number, number, number]
  side?: 'L' | 'R' | 'C'
  color?: string
  /** subtle darker/brighter tint multiplier */
  shade?: number
  /** end fullness 0..1 (higher = more cylindrical, less pointed) */
  taper?: number
  /** stretch the belly length to overlap neighbours */
  lengthExtra?: number
}

export interface BoneDef {
  id: string
  label: string
  kind: 'shaft' | 'ellipsoid' | 'skull' | 'ribcage' | 'pelvis' | 'spine' | 'scapula' | 'hand' | 'foot'
  a?: JointName
  b?: JointName
  at?: JointName
  rA?: number
  rB?: number
  scale?: [number, number, number]
  side?: 'L' | 'R' | 'C'
}

const arm = (side: 'L' | 'R'): MuscleDef[] => {
  const s = side === 'L' ? -1 : 1
  return [
    // deltoid: a rounded cap seated just below the acromion over the upper humerus
    { id: 'deltoid', label: 'Deltoid', a: `shoulder${side}` as JointName, b: `elbow${side}` as JointName, radius: 0.048, bulge: 0.16, offset: [s * 0.028, -0.02, 0.0], side, taper: 0.4 },
    { id: 'triceps', label: 'Triceps brachii', a: `shoulder${side}` as JointName, b: `elbow${side}` as JointName, radius: 0.05, bulge: 0.5, offset: [s * 0.006, -0.03, -0.035], side, shade: 0.92 },
    { id: 'biceps', label: 'Biceps brachii', a: `shoulder${side}` as JointName, b: `elbow${side}` as JointName, radius: 0.046, bulge: 0.55, offset: [s * -0.006, -0.02, 0.035], side },
    { id: 'brachialis', label: 'Brachialis', a: `shoulder${side}` as JointName, b: `elbow${side}` as JointName, radius: 0.04, bulge: 0.75, offset: [s * -0.008, -0.05, 0.012], side, shade: 0.85 },
    { id: 'brachioradialis', label: 'Brachioradialis', a: `elbow${side}` as JointName, b: `wrist${side}` as JointName, radius: 0.04, bulge: 0.22, offset: [s * 0.012, 0, 0.02], side },
    { id: 'forearmFlex', label: 'Forearm flexors', a: `elbow${side}` as JointName, b: `wrist${side}` as JointName, radius: 0.038, bulge: 0.28, offset: [s * -0.006, 0, -0.006], side, shade: 0.88 },
  ]
}

const leg = (side: 'L' | 'R'): MuscleDef[] => {
  const s = side === 'L' ? -1 : 1
  return [
    { id: 'glutes', label: 'Gluteus maximus', a: `hip${side}` as JointName, b: `knee${side}` as JointName, radius: 0.09, bulge: 0.1, offset: [s * 0.015, 0.04, -0.055], side },
    { id: 'quads', label: 'Quadriceps', a: `hip${side}` as JointName, b: `knee${side}` as JointName, radius: 0.082, bulge: 0.42, offset: [0, 0.02, 0.035], side },
    { id: 'hamstrings', label: 'Hamstrings', a: `hip${side}` as JointName, b: `knee${side}` as JointName, radius: 0.07, bulge: 0.42, offset: [0, 0.02, -0.042], side, shade: 0.9 },
    { id: 'adductors', label: 'Adductors', a: `hip${side}` as JointName, b: `knee${side}` as JointName, radius: 0.055, bulge: 0.3, offset: [s * -0.04, 0.08, 0.0], side, shade: 0.86 },
    { id: 'calf', label: 'Gastrocnemius', a: `knee${side}` as JointName, b: `ankle${side}` as JointName, radius: 0.058, bulge: 0.24, offset: [0, 0.02, -0.03], side },
    { id: 'tibialis', label: 'Tibialis anterior', a: `knee${side}` as JointName, b: `ankle${side}` as JointName, radius: 0.036, bulge: 0.3, offset: [s * 0.012, 0, 0.028], side, shade: 0.9 },
  ]
}

export const MUSCLES: MuscleDef[] = [
  // deep trunk mass — unifies the torso so the surface muscles sit on a solid form
  { id: 'trunk', label: 'Thoracoabdominal wall', a: 'pelvis', b: 'chest', radius: 0.115, bulge: 0.6, offset: [0, 0.02, 0.0], side: 'C', shade: 0.72 },
  { id: 'trunkUp', label: 'Thorax', a: 'spineMid', b: 'neck', radius: 0.105, bulge: 0.5, offset: [0, -0.02, 0.0], side: 'C', shade: 0.72 },
  { id: 'neck', label: 'Neck', a: 'neck', b: 'head', radius: 0.08, bulge: 0.4, offset: [0, -0.005, -0.006], side: 'C', shade: 0.82, taper: 0.92, lengthExtra: 1.35 },
  // trapezius ramps rise from each shoulder up into the skull base — welds head to torso
  { id: 'traps', label: 'Trapezius (upper)', a: 'shoulderL', b: 'head', radius: 0.05, bulge: 0.72, offset: [0, 0.0, -0.03], side: 'L', shade: 0.9, taper: 0.35 },
  { id: 'traps', label: 'Trapezius (upper)', a: 'shoulderR', b: 'head', radius: 0.05, bulge: 0.72, offset: [0, 0.0, -0.03], side: 'R', shade: 0.9, taper: 0.35 },
  // torso — front
  { id: 'pecs', label: 'Pectoralis major', a: 'chest', b: 'shoulderL', radius: 0.072, bulge: 0.45, offset: [-0.01, -0.02, 0.055], side: 'L' },
  { id: 'pecs', label: 'Pectoralis major', a: 'chest', b: 'shoulderR', radius: 0.072, bulge: 0.45, offset: [0.01, -0.02, 0.055], side: 'R' },
  { id: 'abs', label: 'Rectus abdominis', a: 'spineLow', b: 'spineMid', radius: 0.05, bulge: 0.5, offset: [0, -0.02, 0.075], side: 'C' },
  { id: 'obliques', label: 'External oblique', a: 'pelvis', b: 'chest', radius: 0.05, bulge: 0.4, offset: [-0.075, -0.02, 0.03], side: 'L', shade: 0.9 },
  { id: 'obliques', label: 'External oblique', a: 'pelvis', b: 'chest', radius: 0.05, bulge: 0.4, offset: [0.075, -0.02, 0.03], side: 'R', shade: 0.9 },
  { id: 'serratus', label: 'Serratus anterior', a: 'spineMid', b: 'shoulderL', radius: 0.036, bulge: 0.5, offset: [-0.085, -0.04, 0.05], side: 'L', shade: 0.92 },
  { id: 'serratus', label: 'Serratus anterior', a: 'spineMid', b: 'shoulderR', radius: 0.036, bulge: 0.5, offset: [0.085, -0.04, 0.05], side: 'R', shade: 0.92 },
  // torso — back
  { id: 'traps', label: 'Trapezius', a: 'neck', b: 'spineMid', radius: 0.09, bulge: 0.35, offset: [0, 0.02, -0.06], side: 'C' },
  { id: 'lats', label: 'Latissimus dorsi', a: 'spineLow', b: 'shoulderL', radius: 0.07, bulge: 0.55, offset: [-0.06, -0.02, -0.06], side: 'L', shade: 0.9 },
  { id: 'lats', label: 'Latissimus dorsi', a: 'spineLow', b: 'shoulderR', radius: 0.07, bulge: 0.55, offset: [0.06, -0.02, -0.06], side: 'R', shade: 0.9 },
  { id: 'teres', label: 'Teres major', a: 'shoulderL', b: 'spineMid', radius: 0.03, bulge: 0.5, offset: [-0.05, 0, -0.055], side: 'L' },
  { id: 'teres', label: 'Teres major', a: 'shoulderR', b: 'spineMid', radius: 0.03, bulge: 0.5, offset: [0.05, 0, -0.055], side: 'R' },
  { id: 'erectors', label: 'Erector spinae', a: 'pelvis', b: 'chest', radius: 0.035, bulge: 0.5, offset: [-0.03, 0, -0.065], side: 'L', shade: 0.85 },
  { id: 'erectors', label: 'Erector spinae', a: 'pelvis', b: 'chest', radius: 0.035, bulge: 0.5, offset: [0.03, 0, -0.065], side: 'R', shade: 0.85 },
  { id: 'supraspinatus', label: 'Supraspinatus', a: 'neck', b: 'shoulderL', radius: 0.022, bulge: 0.5, offset: [-0.03, 0.0, -0.03], side: 'L' },
  { id: 'supraspinatus', label: 'Supraspinatus', a: 'neck', b: 'shoulderR', radius: 0.022, bulge: 0.5, offset: [0.03, 0.0, -0.03], side: 'R' },
  // neck
  { id: 'sterno', label: 'Sternocleidomastoid', a: 'head', b: 'chest', radius: 0.02, bulge: 0.5, offset: [-0.03, 0, 0.03], side: 'L' },
  { id: 'sterno', label: 'Sternocleidomastoid', a: 'head', b: 'chest', radius: 0.02, bulge: 0.5, offset: [0.03, 0, 0.03], side: 'R' },
  ...arm('L'), ...arm('R'), ...leg('L'), ...leg('R'),
]

export const BONES: BoneDef[] = [
  { id: 'skull', label: 'Cranium & mandible', kind: 'skull', at: 'head' },
  { id: 'spine', label: 'Vertebral column', kind: 'spine', a: 'pelvis', b: 'neck' },
  { id: 'ribcage', label: 'Thoracic cage', kind: 'ribcage', at: 'chest' },
  { id: 'pelvis', label: 'Pelvis', kind: 'pelvis', at: 'pelvis' },
  { id: 'scapula', label: 'Scapula', kind: 'scapula', at: 'shoulderL', side: 'L' },
  { id: 'scapula', label: 'Scapula', kind: 'scapula', at: 'shoulderR', side: 'R' },
  { id: 'clavicle', label: 'Clavicle', kind: 'shaft', a: 'chest', b: 'shoulderL', rA: 0.014, rB: 0.014, side: 'L' },
  { id: 'clavicle', label: 'Clavicle', kind: 'shaft', a: 'chest', b: 'shoulderR', rA: 0.014, rB: 0.014, side: 'R' },
  { id: 'humerus', label: 'Humerus', kind: 'shaft', a: 'shoulderL', b: 'elbowL', rA: 0.022, rB: 0.02, side: 'L' },
  { id: 'humerus', label: 'Humerus', kind: 'shaft', a: 'shoulderR', b: 'elbowR', rA: 0.022, rB: 0.02, side: 'R' },
  { id: 'radioulna', label: 'Radius & ulna', kind: 'shaft', a: 'elbowL', b: 'wristL', rA: 0.018, rB: 0.013, side: 'L' },
  { id: 'radioulna', label: 'Radius & ulna', kind: 'shaft', a: 'elbowR', b: 'wristR', rA: 0.018, rB: 0.013, side: 'R' },
  { id: 'handbones', label: 'Carpals & phalanges', kind: 'hand', at: 'handL', side: 'L' },
  { id: 'handbones', label: 'Carpals & phalanges', kind: 'hand', at: 'handR', side: 'R' },
  { id: 'femur', label: 'Femur', kind: 'shaft', a: 'hipL', b: 'kneeL', rA: 0.028, rB: 0.024, side: 'L' },
  { id: 'femur', label: 'Femur', kind: 'shaft', a: 'hipR', b: 'kneeR', rA: 0.028, rB: 0.024, side: 'R' },
  { id: 'tibfib', label: 'Tibia & fibula', kind: 'shaft', a: 'kneeL', b: 'ankleL', rA: 0.024, rB: 0.017, side: 'L' },
  { id: 'tibfib', label: 'Tibia & fibula', kind: 'shaft', a: 'kneeR', b: 'ankleR', rA: 0.024, rB: 0.017, side: 'R' },
  { id: 'footbones', label: 'Tarsals & metatarsals', kind: 'foot', at: 'footL', side: 'L' },
  { id: 'footbones', label: 'Tarsals & metatarsals', kind: 'foot', at: 'footR', side: 'R' },
]

/** Tendon segments highlighted at insertions for the exercise mode. */
export interface TendonDef {
  id: string
  label: string
  a: JointName
  b: JointName
  from: number // 0..1 fraction along a→b to start
  to: number
  tube: number
  side?: 'L' | 'R' | 'C'
}

export const TENDONS: TendonDef[] = [
  { id: 'distalBiceps', label: 'Distal biceps tendon', a: 'shoulderL', b: 'elbowL', from: 0.82, to: 1.04, tube: 0.012, side: 'L' },
  { id: 'distalBiceps', label: 'Distal biceps tendon', a: 'shoulderR', b: 'elbowR', from: 0.82, to: 1.04, tube: 0.012, side: 'R' },
  { id: 'quadTendon', label: 'Patellar tendon', a: 'hipL', b: 'kneeL', from: 0.9, to: 1.08, tube: 0.016, side: 'L' },
  { id: 'quadTendon', label: 'Patellar tendon', a: 'hipR', b: 'kneeR', from: 0.9, to: 1.08, tube: 0.016, side: 'R' },
  { id: 'achilles', label: 'Achilles tendon', a: 'kneeL', b: 'ankleL', from: 0.7, to: 1.05, tube: 0.013, side: 'L' },
  { id: 'achilles', label: 'Achilles tendon', a: 'kneeR', b: 'ankleR', from: 0.7, to: 1.05, tube: 0.013, side: 'R' },
  { id: 'hamstringTendon', label: 'Hamstring tendon', a: 'hipL', b: 'kneeL', from: 0.85, to: 1.05, tube: 0.012, side: 'L' },
  { id: 'hamstringTendon', label: 'Hamstring tendon', a: 'hipR', b: 'kneeR', from: 0.85, to: 1.05, tube: 0.012, side: 'R' },
  { id: 'pecTendon', label: 'Pec major tendon', a: 'chest', b: 'shoulderL', from: 0.75, to: 1.0, tube: 0.011, side: 'L' },
  { id: 'pecTendon', label: 'Pec major tendon', a: 'chest', b: 'shoulderR', from: 0.75, to: 1.0, tube: 0.011, side: 'R' },
  { id: 'achillesTri', label: 'Triceps tendon', a: 'shoulderL', b: 'elbowL', from: 0.85, to: 1.05, tube: 0.01, side: 'L' },
  { id: 'achillesTri', label: 'Triceps tendon', a: 'shoulderR', b: 'elbowR', from: 0.85, to: 1.05, tube: 0.01, side: 'R' },
]
