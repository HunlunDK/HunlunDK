import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js'
import { useStore, FAT_REGIONS, FatRegion } from '../state/store'
import { neutralPose, JointName } from './anatomy/rig'
import { makeSkin } from '../materials/tissues'
import { baselineDistribution, inflationFor } from '../data/fatModel'

/**
 * A single continuous skin surface built with marching-cubes metaballs seeded
 * along the rig. Fat inflation per region grows the local ball radii, so the
 * body swells on the correct depots as one smooth mesh (no capsule seams).
 * Regenerated only when body-composition state changes — not per frame.
 */

// bounding box the field maps into (metres): center + half extents
const BOX_CENTER = new THREE.Vector3(0, -0.1, 0.01)
const BOX_HALF = new THREE.Vector3(0.62, 1.02, 0.62)

interface Seed {
  region: FatRegion
  a: JointName
  b: JointName
  count: number
  base: number
  add: number
  offset: [number, number, number]
}

// tuned so the union reads as a torso + limbs; base radii in metres
const SEEDS: Seed[] = [
  { region: 'abdomen', a: 'pelvis', b: 'spineMid', count: 4, base: 0.15, add: 0.11, offset: [0, 0.02, 0.01] },
  { region: 'chest', a: 'spineMid', b: 'neck', count: 3, base: 0.16, add: 0.05, offset: [0, -0.01, 0.02] },
  { region: 'flanks', a: 'pelvis', b: 'spineMid', count: 3, base: 0.145, add: 0.08, offset: [0, 0.02, -0.01] },
  { region: 'face', a: 'neck', b: 'head', count: 2, base: 0.072, add: 0.025, offset: [0, -0.02, 0] },
  { region: 'face', a: 'head', b: 'head', count: 1, base: 0.115, add: 0.03, offset: [0, 0.02, 0.005] },
  { region: 'calf', a: 'ankleL', b: 'footL', count: 2, base: 0.06, add: 0.02, offset: [0, 0, 0.02] },
  { region: 'calf', a: 'ankleR', b: 'footR', count: 2, base: 0.06, add: 0.02, offset: [0, 0, 0.02] },
  { region: 'upperArm', a: 'wristL', b: 'handL', count: 2, base: 0.055, add: 0.02, offset: [0, 0, 0] },
  { region: 'upperArm', a: 'wristR', b: 'handR', count: 2, base: 0.055, add: 0.02, offset: [0, 0, 0] },
  { region: 'glutes', a: 'pelvis', b: 'hipL', count: 2, base: 0.13, add: 0.08, offset: [-0.03, -0.04, -0.03] },
  { region: 'glutes', a: 'pelvis', b: 'hipR', count: 2, base: 0.13, add: 0.08, offset: [0.03, -0.04, -0.03] },
  { region: 'frontThigh', a: 'hipL', b: 'kneeL', count: 4, base: 0.135, add: 0.06, offset: [0, 0, 0.005] },
  { region: 'frontThigh', a: 'hipR', b: 'kneeR', count: 4, base: 0.135, add: 0.06, offset: [0, 0, 0.005] },
  { region: 'calf', a: 'kneeL', b: 'ankleL', count: 3, base: 0.088, add: 0.03, offset: [0, 0.02, -0.01] },
  { region: 'calf', a: 'kneeR', b: 'ankleR', count: 3, base: 0.088, add: 0.03, offset: [0, 0.02, -0.01] },
  { region: 'upperArm', a: 'shoulderL', b: 'elbowL', count: 3, base: 0.09, add: 0.04, offset: [0, 0, 0] },
  { region: 'upperArm', a: 'shoulderR', b: 'elbowR', count: 3, base: 0.09, add: 0.04, offset: [0, 0, 0] },
  { region: 'upperArm', a: 'elbowL', b: 'wristL', count: 3, base: 0.07, add: 0.03, offset: [0, 0, 0] },
  { region: 'upperArm', a: 'elbowR', b: 'wristR', count: 3, base: 0.07, add: 0.03, offset: [0, 0, 0] },
]

export function MetaballBody() {
  const sex = useStore((s) => s.sex)
  const bodyFat = useStore((s) => s.bodyFat)
  const regionFat = useStore((s) => s.regionFat)
  const skinVisible = useStore((s) => s.layers.skin.visible)
  const skinOpacity = useStore((s) => s.layers.skin.opacity)

  const material = useMemo(() => makeSkin(), [])
  const mc = useMemo(() => {
    const field = new MarchingCubes(64, material, true, false, 120000)
    field.isolation = 60
    field.position.copy(BOX_CENTER)
    field.scale.copy(BOX_HALF)
    field.castShadow = true
    return field
  }, [material])

  useEffect(() => {
    material.transparent = skinOpacity < 0.99
    material.opacity = skinOpacity
  }, [material, skinOpacity])

  // Rebuild the field whenever composition changes.
  useEffect(() => {
    const pose = neutralPose()
    const dist = baselineDistribution(sex, 80, bodyFat / 100)
    const totalFat = (bodyFat / 100) * 80
    const regionMass = {} as Record<FatRegion, number>
    for (const r of FAT_REGIONS) regionMass[r] = (regionFat[r] ?? dist[r] / totalFat) * totalFat

    mc.reset()
    const toField = (p: THREE.Vector3, off: [number, number, number]) =>
      new THREE.Vector3(
        (p.x + off[0] - BOX_CENTER.x) / (2 * BOX_HALF.x) + 0.5,
        (p.y + off[1] - BOX_CENTER.y) / (2 * BOX_HALF.y) + 0.5,
        (p.z + off[2] - BOX_CENTER.z) / (2 * BOX_HALF.z) + 0.5,
      )

    const subtract = 10
    for (const seed of SEEDS) {
      const infl = inflationFor(sex, seed.region, regionMass[seed.region] ?? 1)
      const rMeters = seed.base + seed.add * infl
      // normalized radius (use x half-extent as reference) → metaball strength
      const rNorm = rMeters / (2 * BOX_HALF.x)
      const strength = rNorm * rNorm * subtract * 1.35
      const a = pose[seed.a]
      const b = pose[seed.b]
      for (let i = 0; i < seed.count; i++) {
        const t = seed.count === 1 ? 0.5 : i / (seed.count - 1)
        const p = a.clone().lerp(b, t)
        const f = toField(p, seed.offset)
        if (f.x > 0 && f.x < 1 && f.y > 0 && f.y < 1 && f.z > 0 && f.z < 1) {
          mc.addBall(f.x, f.y, f.z, strength, subtract)
        }
      }
    }
    mc.update()
  }, [mc, sex, bodyFat, regionFat])

  const ref = useRef<THREE.Group>(null)
  if (!skinVisible) return null
  return (
    <group ref={ref}>
      <primitive object={mc} />
    </group>
  )
}
