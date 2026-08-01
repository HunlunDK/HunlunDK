import * as THREE from 'three'

/**
 * A compact humanoid landmark rig. Positions are in a T-ish anatomical pose,
 * metres, origin at the pelvis centre, +Y up, +Z forward (toward viewer).
 * Everything (bones, muscles, tendons, skin shell) is built relative to these
 * landmarks so a single pose change moves the whole figure coherently.
 */

export interface Joint {
  pos: THREE.Vector3
}

export type JointName =
  | 'pelvis' | 'spineLow' | 'spineMid' | 'chest' | 'neck' | 'head'
  | 'shoulderL' | 'elbowL' | 'wristL' | 'handL'
  | 'shoulderR' | 'elbowR' | 'wristR' | 'handR'
  | 'hipL' | 'kneeL' | 'ankleL' | 'footL'
  | 'hipR' | 'kneeR' | 'ankleR' | 'footR'

export type Pose = Record<JointName, THREE.Vector3>

const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** Neutral standing A-pose: arms hang close to the body, forearms supinated. */
export function neutralPose(): Pose {
  return {
    pelvis: v(0, 0, 0),
    spineLow: v(0, 0.15, 0.01),
    spineMid: v(0, 0.32, 0.015),
    chest: v(0, 0.50, 0.01),
    neck: v(0, 0.575, -0.005),
    head: v(0, 0.665, 0.012),

    // arms hang in a gentle A-pose, close to the torso
    shoulderL: v(-0.17, 0.55, 0.0),
    elbowL: v(-0.23, 0.28, 0.02),
    wristL: v(-0.26, 0.03, 0.06),
    handL: v(-0.275, -0.05, 0.075),

    shoulderR: v(0.17, 0.55, 0.0),
    elbowR: v(0.23, 0.28, 0.02),
    wristR: v(0.26, 0.03, 0.06),
    handR: v(0.275, -0.05, 0.075),

    hipL: v(-0.10, -0.03, 0),
    kneeL: v(-0.11, -0.48, 0.02),
    ankleL: v(-0.11, -0.90, -0.02),
    footL: v(-0.11, -0.95, 0.05),

    hipR: v(0.10, -0.03, 0),
    kneeR: v(0.11, -0.48, 0.02),
    ankleR: v(0.11, -0.90, -0.02),
    footR: v(0.11, -0.95, 0.05),
  }
}

function lerpV(a: THREE.Vector3, b: THREE.Vector3, t: number) {
  return a.clone().lerp(b, t)
}

/** Rotate `point` about `pivot` around `axis` by `angle` radians. */
function rotateAbout(point: THREE.Vector3, pivot: THREE.Vector3, axis: THREE.Vector3, angle: number) {
  const p = point.clone().sub(pivot)
  p.applyAxisAngle(axis.clone().normalize(), angle)
  return p.add(pivot)
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)

/**
 * Map a normalized 0..1 timeline to a rep curve: fast ease-out concentric,
 * short squeeze hold, slower controlled eccentric. Returns contraction 0..1.
 */
export function repCurve(t: number): number {
  const x = t % 1
  // concentric 0..0.35, hold 0.35..0.5, eccentric 0.5..1
  if (x < 0.35) return 1 - Math.pow(1 - x / 0.35, 3) // easeOutCubic up
  if (x < 0.5) return 1
  return 1 - easeInOut((x - 0.5) / 0.5) // controlled down
}

export type RigJoint = import('../../data/exercises').Exercise['rig']['joint']

/**
 * Produce a posed skeleton for a given exercise rig channel and contraction
 * amount c (0 = start/extended, 1 = peak contraction).
 */
export function poseForExercise(joint: RigJoint | null, c: number): Pose {
  const p = neutralPose()
  if (!joint) return p
  const zAxis = v(0, 0, 1)
  const xAxis = v(1, 0, 0)

  switch (joint) {
    case 'elbowFlex': {
      // Right forearm flexes about the elbow; supinated curl to shoulder.
      // Only the right arm animates so the demonstration reads cleanly.
      const angle = c * (Math.PI * 0.78) // ~140deg
      p.wristR = rotateAbout(p.wristR, p.elbowR, xAxis, -angle)
      p.handR = rotateAbout(p.handR, p.elbowR, xAxis, -angle)
      break
    }
    case 'shoulderAbduct': {
      const angle = c * (Math.PI * 0.5)
      ;(['elbowR', 'wristR', 'handR'] as JointName[]).forEach((j) => {
        p[j] = rotateAbout(p[j], p.shoulderR, zAxis, -angle)
      })
      ;(['elbowL', 'wristL', 'handL'] as JointName[]).forEach((j) => {
        p[j] = rotateAbout(p[j], p.shoulderL, zAxis, angle)
      })
      break
    }
    case 'shoulderPress': {
      // arms sweep from shoulder height to overhead
      const angle = c * (Math.PI * 0.62)
      ;(['elbowR', 'wristR', 'handR'] as JointName[]).forEach((j) => {
        p[j] = rotateAbout(p[j], p.shoulderR, zAxis, -angle)
      })
      ;(['elbowL', 'wristL', 'handL'] as JointName[]).forEach((j) => {
        p[j] = rotateAbout(p[j], p.shoulderL, zAxis, angle)
      })
      break
    }
    case 'horizPress': {
      // bench press: arms extend forward from chest (approximate lying view upright)
      const ext = c
      p.elbowR = lerpV(v(0.34, 0.5, 0.28), v(0.28, 0.56, 0.5), ext)
      p.wristR = lerpV(v(0.3, 0.55, 0.42), v(0.16, 0.58, 0.72), ext)
      p.handR = lerpV(v(0.28, 0.56, 0.5), v(0.12, 0.58, 0.82), ext)
      p.elbowL = lerpV(v(-0.34, 0.5, 0.28), v(-0.28, 0.56, 0.5), ext)
      p.wristL = lerpV(v(-0.3, 0.55, 0.42), v(-0.16, 0.58, 0.72), ext)
      p.handL = lerpV(v(-0.28, 0.56, 0.5), v(-0.12, 0.58, 0.82), ext)
      break
    }
    case 'kneeHipExtend': {
      // squat: descend (c=0 top standing, c=1 bottom). We invert so peak = bottom.
      const d = c
      const hipDrop = -0.34 * d
      const kneeFwd = 0.12 * d
      ;(['hipL', 'hipR', 'pelvis', 'spineLow', 'spineMid', 'chest', 'neck', 'head'] as JointName[]).forEach((j) => {
        p[j] = p[j].clone().add(v(0, hipDrop, -0.04 * d))
      })
      p.kneeL = p.kneeL.clone().add(v(0, hipDrop * 0.5, kneeFwd))
      p.kneeR = p.kneeR.clone().add(v(0, hipDrop * 0.5, kneeFwd))
      // keep ankles planted; shoulders/arms follow torso
      ;(['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'wristL', 'wristR', 'handL', 'handR'] as JointName[]).forEach((j) => {
        p[j] = p[j].clone().add(v(0, hipDrop, -0.04 * d))
      })
      break
    }
    case 'hipHinge': {
      // deadlift / RDL: hinge at the hips, torso rotates forward.
      const angle = c * (Math.PI * 0.42)
      ;(['spineLow', 'spineMid', 'chest', 'neck', 'head', 'shoulderL', 'shoulderR',
        'elbowL', 'elbowR', 'wristL', 'wristR', 'handL', 'handR'] as JointName[]).forEach((j) => {
        p[j] = rotateAbout(p[j], p.pelvis, xAxis, angle)
      })
      const kneeBend = 0.06 * c
      p.kneeL = p.kneeL.clone().add(v(0, 0, kneeBend))
      p.kneeR = p.kneeR.clone().add(v(0, 0, kneeBend))
      break
    }
  }
  return { ...p }
}

export const segments: [JointName, JointName][] = [
  ['pelvis', 'spineLow'], ['spineLow', 'spineMid'], ['spineMid', 'chest'],
  ['chest', 'neck'], ['neck', 'head'],
  ['chest', 'shoulderL'], ['shoulderL', 'elbowL'], ['elbowL', 'wristL'], ['wristL', 'handL'],
  ['chest', 'shoulderR'], ['shoulderR', 'elbowR'], ['elbowR', 'wristR'], ['wristR', 'handR'],
  ['pelvis', 'hipL'], ['hipL', 'kneeL'], ['kneeL', 'ankleL'], ['ankleL', 'footL'],
  ['pelvis', 'hipR'], ['hipR', 'kneeR'], ['kneeR', 'ankleR'], ['ankleR', 'footR'],
]

export { clamp01, lerpV }
