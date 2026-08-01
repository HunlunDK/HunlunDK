import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { useStore, LayerKey, Sex } from '../state/store'
import { neutralPose, poseForExercise, repCurve, Pose, JointName } from './anatomy/rig'
import { MUSCLES, BONES, TENDONS, MuscleDef } from './anatomy/structures'
import {
  fusiform, boneShaft, ellipsoid, ribArc, vertebra, tendonTube, scapula, pelvisGeometry,
  handGeometry, footGeometry,
} from './anatomy/geometry'
import { makeBone, makeMuscle, makeTendon, makeFat, makeSkin } from '../materials/tissues'
import { exerciseById } from '../data/exercises'
import { baselineDistribution, inflationFor } from '../data/fatModel'
import { FAT_REGIONS, FatRegion } from '../state/store'

const UP = new THREE.Vector3(0, 1, 0)
const tmpDir = new THREE.Vector3()
const tmpQuat = new THREE.Quaternion()

/** Orient & stretch a unit-Y object to span a→b, offset laterally. */
function placeBetween(
  obj: THREE.Object3D,
  a: THREE.Vector3,
  b: THREE.Vector3,
  offset: [number, number, number],
  radial: number,
  lengthExtra = 1,
) {
  tmpDir.subVectors(b, a)
  const len = tmpDir.length() || 0.001
  obj.position.copy(a).addScaledVector(tmpDir, 0.5)
  obj.position.x += offset[0]
  obj.position.y += offset[1]
  obj.position.z += offset[2]
  tmpQuat.setFromUnitVectors(UP, tmpDir.normalize())
  obj.quaternion.copy(tmpQuat)
  obj.scale.set(radial, len * lengthExtra, radial)
}

interface StructMesh {
  mesh: THREE.Mesh
  def: MuscleDef
  baseColor: THREE.Color
  activeColor: THREE.Color
}

/** Which flesh capsule maps to which fat region for the skin shell. */
interface FleshDef {
  region: FatRegion
  a: JointName
  b: JointName
  base: number
  add: number
  offset: [number, number, number]
}

interface FleshExtra extends FleshDef { taper?: number; len?: number; wide?: number }
const FLESH: FleshExtra[] = [
  // ONE continuous torso trunk (pelvis→neck) so no stacked-disc rings, plus a
  // chest bulge and belly bulge layered on with heavy overlap.
  { region: 'abdomen', a: 'pelvis', b: 'chest', base: 0.14, add: 0.11, offset: [0, 0.03, 0.0], taper: 0.88, len: 1.4, wide: 1.12 },
  { region: 'chest', a: 'spineMid', b: 'neck', base: 0.125, add: 0.05, offset: [0, -0.01, 0.02], taper: 0.72, len: 1.15, wide: 1.18 },
  { region: 'abdomen', a: 'spineLow', b: 'spineMid', base: 0.12, add: 0.13, offset: [0, 0.0, 0.03], taper: 0.8, len: 1.15, wide: 1.05 },
  { region: 'flanks', a: 'pelvis', b: 'spineMid', base: 0.118, add: 0.08, offset: [0, 0.02, -0.005], taper: 0.85, len: 1.3, wide: 1.14 },
  { region: 'glutes', a: 'pelvis', b: 'hipL', base: 0.11, add: 0.09, offset: [-0.05, -0.06, -0.05], len: 1.3 },
  { region: 'glutes', a: 'pelvis', b: 'hipR', base: 0.11, add: 0.09, offset: [0.05, -0.06, -0.05], len: 1.3 },
  { region: 'hips', a: 'pelvis', b: 'hipL', base: 0.1, add: 0.08, offset: [-0.06, -0.02, 0.02], len: 1.2 },
  { region: 'hips', a: 'pelvis', b: 'hipR', base: 0.1, add: 0.08, offset: [0.06, -0.02, 0.02], len: 1.2 },
  { region: 'frontThigh', a: 'hipL', b: 'kneeL', base: 0.1, add: 0.07, offset: [0, 0.02, 0.01], taper: 0.6, len: 1.12 },
  { region: 'frontThigh', a: 'hipR', b: 'kneeR', base: 0.1, add: 0.07, offset: [0, 0.02, 0.01], taper: 0.6, len: 1.12 },
  { region: 'hamstring', a: 'hipL', b: 'kneeL', base: 0.095, add: 0.06, offset: [0, 0.02, -0.02], taper: 0.6, len: 1.1 },
  { region: 'hamstring', a: 'hipR', b: 'kneeR', base: 0.095, add: 0.06, offset: [0, 0.02, -0.02], taper: 0.6, len: 1.1 },
  { region: 'calf', a: 'kneeL', b: 'ankleL', base: 0.066, add: 0.03, offset: [0, 0.03, -0.01], taper: 0.5, len: 1.1 },
  { region: 'calf', a: 'kneeR', b: 'ankleR', base: 0.066, add: 0.03, offset: [0, 0.03, -0.01], taper: 0.5, len: 1.1 },
  { region: 'upperArm', a: 'shoulderL', b: 'elbowL', base: 0.066, add: 0.05, offset: [0, 0, 0], taper: 0.6, len: 1.15 },
  { region: 'upperArm', a: 'shoulderR', b: 'elbowR', base: 0.066, add: 0.05, offset: [0, 0, 0], taper: 0.6, len: 1.15 },
  { region: 'upperArm', a: 'elbowL', b: 'wristL', base: 0.05, add: 0.03, offset: [0, 0, 0], taper: 0.55, len: 1.15 },
  { region: 'upperArm', a: 'elbowR', b: 'wristR', base: 0.05, add: 0.03, offset: [0, 0, 0], taper: 0.55, len: 1.15 },
  { region: 'face', a: 'neck', b: 'head', base: 0.078, add: 0.035, offset: [0, 0.0, 0], taper: 0.8, len: 1.15 },
]

export function Figure() {
  const groupRef = useRef<THREE.Group>(null)
  const boneMat = useMemo(() => makeBone(), [])
  const tendonMat = useMemo(() => makeTendon(), [])
  const setHighlighted = useStore((s) => s.setHighlighted)
  const setPinned = useStore((s) => s.setPinned)

  // Build muscles (each its own mesh + material for independent activation)
  const muscles = useMemo<StructMesh[]>(() => {
    return MUSCLES.map((def, idx) => {
      const t = def.taper ?? 0.35
      const geo = fusiform(1, def.bulge, t, t)
      // deterministic per-muscle hue/sat jitter so it isn't one uniform candy-red
      const base = new THREE.Color(def.color ?? '#8f2d2d')
      const hsl = { h: 0, s: 0, l: 0 }
      base.getHSL(hsl)
      const j = ((idx * 2654435761) % 1000) / 1000 - 0.5
      base.setHSL(hsl.h + j * 0.016, hsl.s + j * 0.09, hsl.l * (def.shade ?? 1))
      const mat = makeMuscle(base.getStyle())
      const mesh = new THREE.Mesh(geo, mat)
      mesh.castShadow = true
      mesh.userData = { id: def.id, label: def.label, layer: 'muscle' }
      return { mesh, def, baseColor: base.clone(), activeColor: new THREE.Color('#ff5a3c') }
    })
  }, [])

  // Build bones
  const bones = useMemo(() => {
    return BONES.map((def) => {
      let geo: THREE.BufferGeometry
      switch (def.kind) {
        case 'skull': geo = ellipsoid(0.087, 0.107, 0.096); break
        case 'ellipsoid': geo = ellipsoid(...(def.scale ?? [0.03, 0.03, 0.03])); break
        case 'scapula': geo = scapula(); break
        case 'hand': geo = handGeometry(); break
        case 'foot': geo = footGeometry(); break
        case 'pelvis': geo = pelvisGeometry(); break
        case 'ribcage': geo = new THREE.BufferGeometry(); break
        case 'spine': geo = vertebra(); break
        default: geo = boneShaft(def.rA ?? 0.02, def.rB ?? 0.02, 1.6)
      }
      const mesh = new THREE.Mesh(geo, boneMat)
      mesh.castShadow = true
      mesh.userData = { id: def.id, label: def.label, layer: 'skeleton' }
      return { mesh, def }
    })
  }, [boneMat])

  // Ribcage: a set of rib meshes + sternum, grouped
  const ribcage = useMemo(() => {
    const group = new THREE.Group()
    for (let i = 0; i < 8; i++) {
      const t = i / 7
      const geo = ribArc(0.12 - t * 0.015, 0.09 - t * 0.01, 2.7 - t * 0.1, 0.011, 0.03 + t * 0.02)
      const rib = new THREE.Mesh(geo, boneMat)
      rib.position.y = 0.34 - i * 0.032
      rib.castShadow = true
      group.add(rib)
    }
    const sternum = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.02), boneMat)
    sternum.position.set(0, 0.28, 0.085)
    group.add(sternum)
    group.userData = { id: 'ribcage', label: 'Thoracic cage', layer: 'skeleton' }
    return group
  }, [boneMat])

  // Spine column of vertebrae
  const spine = useMemo(() => {
    const group = new THREE.Group()
    for (let i = 0; i < 20; i++) {
      const vgeo = vertebra(0.028 - i * 0.0004, 0.028)
      const vb = new THREE.Mesh(vgeo, boneMat)
      vb.castShadow = true
      group.add(vb)
    }
    group.userData = { id: 'spine', label: 'Vertebral column', layer: 'skeleton' }
    return group
  }, [boneMat])

  // Tendons
  const tendons = useMemo(() => {
    return TENDONS.map((def) => {
      const mesh = new THREE.Mesh(new THREE.BufferGeometry(), tendonMat)
      mesh.userData = { id: def.id, label: def.label, layer: 'tendon' }
      return { mesh, def }
    })
  }, [tendonMat])

  // Skin / fat shell
  const skinMat = useMemo(() => makeSkin(), [])
  const fleshMeshes = useMemo(() => {
    return FLESH.map((f) => {
      const t = f.taper ?? 0.55
      const mesh = new THREE.Mesh(fusiform(1, 0.5, t, t, 26, 20), skinMat)
      mesh.userData = { id: 'skin', label: 'Skin & adipose', layer: 'skin' }
      mesh.renderOrder = 2
      return { mesh, f }
    })
  }, [skinMat])

  // per-frame update
  useFrame((_, delta) => {
    const st = useStore.getState()
    const ex = exerciseById(st.selectedExercise)
    let pose: Pose
    let contraction = 0
    if (st.mode === 'exercise' && ex) {
      contraction = repCurve(st.exercisePhase)
      pose = poseForExercise(ex.rig.joint, contraction)
    } else {
      pose = neutralPose()
    }
    const P = (j: JointName) => pose[j]

    // Layer opacities
    const setLayer = (layer: LayerKey, mat: THREE.Material) => {
      const l = st.layers[layer]
      const target = l.visible ? l.opacity : 0
      const m = mat as THREE.MeshPhysicalMaterial
      m.opacity = THREE.MathUtils.lerp(m.opacity ?? 1, target, 0.18)
      m.transparent = m.opacity < 0.985
      m.depthWrite = m.opacity > 0.6
      m.visible = m.opacity > 0.01
    }

    // Muscles
    const activeIds = st.mode === 'exercise' && ex ? new Set(ex.rig.contracts) : new Set<string>()
    const involvedIds = st.mode === 'exercise' && ex ? new Set(ex.movers.map((mv) => mv.id)) : null
    const muscleLayer = st.layers.muscle
    for (const s of muscles) {
      const bulge = activeIds.has(s.def.id) ? 1 + contraction * 0.35 : 1
      const shortening = activeIds.has(s.def.id) ? 1 - contraction * 0.12 : 1
      const lenX = (s.def.lengthExtra ?? 1) * shortening
      placeBetween(s.mesh, P(s.def.a), P(s.def.b), s.def.offset, s.def.radius * bulge, lenX)
      const mat = s.mesh.material as THREE.MeshPhysicalMaterial
      // opacity target: full when visible, strongly faded if not involved in the exercise
      const notInvolved = involvedIds != null && !involvedIds.has(s.def.id)
      const target = !muscleLayer.visible ? 0 : notInvolved ? 0 : muscleLayer.opacity
      mat.opacity = THREE.MathUtils.lerp(mat.opacity ?? 1, target, 0.22)
      mat.transparent = mat.opacity < 0.985
      mat.depthWrite = mat.opacity > 0.6
      mat.visible = mat.opacity > 0.01
      // activation heat + highlight
      const act = activeIds.has(s.def.id) ? contraction : 0
      const col = s.baseColor.clone().lerp(s.activeColor, act * 0.6)
      const hot = st.highlighted === s.def.id || st.pinned === s.def.id
      if (hot) col.lerp(new THREE.Color('#17e0c4'), 0.35)
      mat.color.copy(col)
      mat.emissive.copy(s.activeColor).multiplyScalar(act * 0.3 + (hot ? 0.15 : 0))
    }

    // Bones
    for (const b of bones) {
      const m = b.mesh
      if (b.def.kind === 'shaft' && b.def.a && b.def.b) {
        placeBetween(m, P(b.def.a), P(b.def.b), [0, 0, 0], 1)
      } else if (b.def.at) {
        m.position.copy(P(b.def.at))
        if (b.def.kind === 'hand') {
          // orient the palm so fingers continue the forearm line
          const wrist = P(b.def.side === 'L' ? 'wristL' : 'wristR')
          const dir = m.position.clone().sub(wrist).normalize()
          m.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir)
          m.position.copy(wrist).addScaledVector(dir, 0.05)
        } else if (b.def.kind === 'foot') {
          const ankle = P(b.def.side === 'L' ? 'ankleL' : 'ankleR')
          m.position.copy(ankle).add(new THREE.Vector3(0, -0.04, 0.03))
          m.rotation.set(0, 0, 0)
        }
        if (b.def.kind === 'scapula') {
          // tuck the blades flat against the upper back, behind the ribcage
          m.position.z -= 0.11
          m.position.y -= 0.04
          m.position.x += (b.def.side === 'L' ? -0.015 : 0.015)
          m.rotation.set(-0.2, b.def.side === 'L' ? 0.35 : -0.35, b.def.side === 'L' ? -0.15 : 0.15)
          m.scale.setScalar(0.62)
        }
      }
      const mat = m.material as THREE.MeshPhysicalMaterial
      // clone-free: bones share material, so drive opacity on the shared mat once below
      const hot = st.highlighted === b.def.id || st.pinned === b.def.id
      m.userData.hot = hot
    }
    setLayer('skeleton', boneMat)
    // position ribcage & spine
    ribcage.position.copy(P('chest')).sub(new THREE.Vector3(0, 0.28, 0))
    ;(ribcage.children as THREE.Mesh[]).forEach((c) => ((c.material as THREE.Material).visible = boneMat.visible))
    const spineChildren = spine.children as THREE.Mesh[]
    const spineTop = P('neck'), spineBot = P('pelvis')
    spineChildren.forEach((c, i) => {
      const t = i / (spineChildren.length - 1)
      c.position.copy(spineBot.clone().lerp(spineTop, t))
      c.position.z -= 0.05
    })

    // Tendons — rebuild tube geometry along the (possibly moved) segment
    for (const t of tendons) {
      const a = P(t.def.a), b = P(t.def.b)
      const from = a.clone().lerp(b, t.def.from)
      const to = a.clone().lerp(b, Math.min(1, t.def.to))
      const old = t.mesh.geometry
      t.mesh.geometry = tendonTube(from, to, t.def.tube)
      old.dispose()
      const mat = t.mesh.material as THREE.MeshPhysicalMaterial
      setLayer('tendon', mat)
      const hot = st.highlighted === t.def.id || st.pinned === t.def.id
      const tense = activeIds.size > 0 ? contraction : 0
      mat.emissive.copy(new THREE.Color('#17e0c4')).multiplyScalar(hot ? 0.3 : 0)
      mat.color.copy(new THREE.Color('#ece4d4')).lerp(new THREE.Color('#fff4e0'), tense * 0.4)
    }

    // Skin / fat shell — inflate per region from the fat model
    const dist = baselineDistribution(st.sex, 80, st.bodyFat / 100)
    // apply user regional bias stored as normalized weights → scale masses
    const totalFat = (st.bodyFat / 100) * 80
    const regionMass: Record<string, number> = {}
    for (const r of FAT_REGIONS) regionMass[r] = st.regionFat[r] * totalFat
    for (const fm of fleshMeshes) {
      const infl = inflationFor(st.sex, fm.f.region, regionMass[fm.f.region] ?? dist[fm.f.region])
      const radial = fm.f.base + fm.f.add * infl
      placeBetween(fm.mesh, P(fm.f.a), P(fm.f.b), fm.f.offset, radial, fm.f.len ?? 1.15)
      // elliptical cross-section: torso reads wider than deep
      fm.mesh.scale.x *= fm.f.wide ?? 1
      setLayer('skin', fm.mesh.material as THREE.Material)
    }
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const id = (e.object.userData?.id as string) ?? null
    if (id && id !== 'skin') setHighlighted(id)
  }
  const onOut = () => setHighlighted(null)
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const id = (e.object.userData?.id as string) ?? null
    if (id && id !== 'skin') {
      const cur = useStore.getState().pinned
      setPinned(cur === id ? null : id)
    }
  }

  return (
    <group ref={groupRef} position={[0, 0.05, 0]} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
      {bones.map((b, i) => <primitive key={`b${i}`} object={b.mesh} />)}
      <primitive object={ribcage} />
      <primitive object={spine} />
      {muscles.map((m, i) => <primitive key={`m${i}`} object={m.mesh} />)}
      {tendons.map((t, i) => <primitive key={`t${i}`} object={t.mesh} />)}
      {fleshMeshes.map((f, i) => <primitive key={`f${i}`} object={f.mesh} />)}
    </group>
  )
}
