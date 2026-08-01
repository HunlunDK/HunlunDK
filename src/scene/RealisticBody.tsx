import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useStore, FAT_REGIONS, FatRegion } from '../state/store'
import { baselineDistribution, inflationFor, definitionGate } from '../data/fatModel'

useGLTF.setDecoderPath('/draco/')
const URL = '/models/body_realistic.glb'

const TARGET_H = 1.85
const FOOT_Y = -1.0

/** Per-region displacement amount (world units) at full inflation, plus a band
 * describing where on the body the region lives. Bands read in normalised body
 * space: t = 0 feet … 1 head; front = +z; side = |x|. */
interface Band {
  amount: number
  weight: (t: number, x: number, z: number, ax: number) => number
}

const sstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}
// bump in [a,b] peaking mid
const band = (a: number, b: number, v: number) => {
  if (v < a || v > b) return 0
  const m = (a + b) / 2
  return 1 - Math.abs(v - m) / ((b - a) / 2)
}

const BANDS: Record<FatRegion, Band> = {
  abdomen: { amount: 0.09, weight: (t, x, z, ax) => band(0.4, 0.58, t) * sstep(-0.02, 0.05, z) * (1 - sstep(0.1, 0.18, ax)) },
  chest: { amount: 0.05, weight: (t, x, z, ax) => band(0.58, 0.7, t) * sstep(-0.02, 0.06, z) * (1 - sstep(0.14, 0.2, ax)) },
  flanks: { amount: 0.07, weight: (t, x, z, ax) => band(0.42, 0.58, t) * sstep(0.08, 0.15, ax) * (1 - sstep(0.2, 0.28, ax)) },
  lowerBack: { amount: 0.05, weight: (t, x, z, ax) => band(0.42, 0.55, t) * sstep(0.02, -0.05, z) * (1 - sstep(0.12, 0.2, ax)) },
  upperBack: { amount: 0.05, weight: (t, x, z, ax) => band(0.55, 0.68, t) * sstep(0.02, -0.06, z) * (1 - sstep(0.14, 0.2, ax)) },
  glutes: { amount: 0.08, weight: (t, x, z, ax) => band(0.42, 0.54, t) * sstep(0.0, -0.06, z) * (1 - sstep(0.14, 0.2, ax)) },
  hips: { amount: 0.06, weight: (t, x, z, ax) => band(0.4, 0.5, t) * sstep(0.09, 0.16, ax) * (1 - sstep(0.22, 0.3, ax)) },
  frontThigh: { amount: 0.05, weight: (t, x, z, ax) => band(0.22, 0.4, t) * sstep(-0.02, 0.05, z) },
  hamstring: { amount: 0.045, weight: (t, x, z, ax) => band(0.22, 0.4, t) * sstep(0.02, -0.05, z) },
  calf: { amount: 0.025, weight: (t) => band(0.06, 0.2, t) },
  upperArm: { amount: 0.035, weight: (t, x, z, ax) => band(0.5, 0.72, t) * sstep(0.2, 0.28, ax) },
  face: { amount: 0.03, weight: (t) => band(0.88, 1.0, t) },
}

export function RealisticBody() {
  const skinVisible = useStore((s) => s.layers.skin.visible)
  const sex = useStore((s) => s.sex)
  const bodyFat = useStore((s) => s.bodyFat)
  const regionFat = useStore((s) => s.regionFat)
  const gltf = useGLTF(URL)

  // Bake the whole hierarchy (incl. fit transform) into flat world-space meshes.
  const { group, morphTargets } = useMemo(() => {
    const src = gltf.scene.clone(true)
    src.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(src)
    const size = new THREE.Vector3(); const center = new THREE.Vector3()
    box.getSize(size); box.getCenter(center)
    const s = TARGET_H / (size.y || 1)
    const fit = new THREE.Matrix4()
      .makeTranslation(-center.x * s, -box.min.y * s + FOOT_Y, -center.z * s)
      .multiply(new THREE.Matrix4().makeScale(s, s, s))

    const g = new THREE.Group()
    const targets: { geo: THREE.BufferGeometry; base: Float32Array; normal: Float32Array; weights: Record<FatRegion, Float32Array>; visceral: Float32Array }[] = []

    src.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const nm = ((m.name || '') + ' ' + ((m.material as THREE.Material)?.name || '')).toLowerCase()
      const finalM = fit.clone().multiply(m.matrixWorld)
      const geo = m.geometry.clone()
      geo.applyMatrix4(finalM)
      geo.computeVertexNormals()
      const mat = (m.material as THREE.MeshStandardMaterial).clone()
      mat.envMapIntensity = 0.75
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = true; mesh.receiveShadow = true
      g.add(mesh)

      const isBody = nm.includes('body')
      if (isBody) {
        const pos = geo.attributes.position as THREE.BufferAttribute
        const nrm = geo.attributes.normal as THREE.BufferAttribute
        const base = new Float32Array(pos.array as Float32Array)
        const normal = new Float32Array(nrm.array as Float32Array)
        const bb = new THREE.Box3().setFromBufferAttribute(pos)
        const h = bb.max.y - bb.min.y
        const weights = {} as Record<FatRegion, Float32Array>
        for (const r of FAT_REGIONS) weights[r] = new Float32Array(pos.count)
        const visceral = new Float32Array(pos.count)
        for (let i = 0; i < pos.count; i++) {
          const x = base[i * 3], y = base[i * 3 + 1], z = base[i * 3 + 2]
          const t = (y - bb.min.y) / h
          const ax = Math.abs(x)
          for (const r of FAT_REGIONS) weights[r][i] = BANDS[r].weight(t, x, z, ax)
          visceral[i] = BANDS.abdomen.weight(t, x, z, ax) * sstep(0.0, 0.05, z)
        }
        targets.push({ geo, base, normal, weights, visceral })
      }
    })

    return { group: g, morphTargets: targets }
  }, [gltf])

  // Apply regional fat displacement whenever composition changes.
  useEffect(() => {
    // The captured mesh already looks ~15% BF; make that the neutral state and
    // displace by the DELTA in inflation so higher puffs out and lower slims in.
    const REF_BF = 0.15
    const refDist = baselineDistribution(sex, 80, REF_BF)
    const refInfl = {} as Record<FatRegion, number>
    for (const r of FAT_REGIONS) refInfl[r] = inflationFor(sex, r, refDist[r])

    const dist = baselineDistribution(sex, 80, bodyFat / 100)
    const totalFat = (bodyFat / 100) * 80
    const infl = {} as Record<FatRegion, number>
    for (const r of FAT_REGIONS) infl[r] = inflationFor(sex, r, (regionFat[r] ?? dist[r] / totalFat) * totalFat)
    const visceralFwd = sex === 'male' ? 0.07 : 0.035
    const gain = 1.6 // exaggerate for a clearly visible transformation

    for (const tg of morphTargets) {
      const pos = tg.geo.attributes.position as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      for (let i = 0; i < pos.count; i++) {
        let d = 0
        for (const r of FAT_REGIONS) d += tg.weights[r][i] * (infl[r] - refInfl[r]) * BANDS[r].amount * gain
        const nx = tg.normal[i * 3], ny = tg.normal[i * 3 + 1], nz = tg.normal[i * 3 + 2]
        const vis = tg.visceral[i] * Math.max(0, infl.abdomen - refInfl.abdomen) * visceralFwd * gain
        arr[i * 3] = tg.base[i * 3] + nx * d
        arr[i * 3 + 1] = tg.base[i * 3 + 1] + ny * d
        arr[i * 3 + 2] = tg.base[i * 3 + 2] + nz * d + vis
      }
      pos.needsUpdate = true
      tg.geo.computeVertexNormals()
    }
  }, [morphTargets, sex, bodyFat, regionFat])

  if (!skinVisible) return null
  return <primitive object={group} />
}

useGLTF.preload(URL)
