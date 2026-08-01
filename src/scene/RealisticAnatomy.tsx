import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { useStore } from '../state/store'
import { exerciseById } from '../data/exercises'

/**
 * Lightweight tissue materials for the REAL scanned anatomy — no transmission
 * (an extra render pass per material) and no procedural fiber shader, because
 * realism now comes from the real geometry. Keeps 160+ meshes at 60fps.
 */
function baseMuscleMat() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#9a2f2b'), roughness: 0.5, metalness: 0,
    clearcoat: 0.28, clearcoatRoughness: 0.4, sheen: 0.3,
    sheenColor: new THREE.Color('#c25545'), sheenRoughness: 0.6, envMapIntensity: 0.8,
  })
}
function sharedTendonMat() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e7ddc7'), roughness: 0.34, metalness: 0,
    clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.4, envMapIntensity: 0.7,
  })
}
function sharedFatMat() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e3bf63'), roughness: 0.55, metalness: 0, clearcoat: 0.2, envMapIntensity: 0.6,
  })
}
function sharedBoneMat() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e6ddc9'), roughness: 0.62, metalness: 0,
    clearcoat: 0.12, clearcoatRoughness: 0.6, sheen: 0.25,
    sheenColor: new THREE.Color('#fff4e0'), envMapIntensity: 0.65,
  })
}

useGLTF.setDecoderPath('/draco/')
const SKELETON = '/models/skeleton.glb'
const MUSCLES = '/models/muscles.glb'

const TARGET_H = 1.9
const FOOT_Y = -1.02

/** Map our exercise muscle ids to substrings of the real BodyParts3D mesh names. */
const MUSCLE_MATCH: Record<string, string[]> = {
  biceps: ['biceps brachii'],
  brachialis: ['brachialis'],
  brachioradialis: ['brachioradialis'],
  triceps: ['triceps brachii'],
  deltoid: ['deltoid'],
  pecs: ['pectoralis major'],
  lats: ['latissimus'],
  teres: ['teres major'],
  traps: ['trapezius'],
  serratus: ['serratus'],
  quads: ['rectus femoris', 'vastus'],
  hamstrings: ['biceps femoris', 'semitendinosus', 'semimembranosus'],
  glutes: ['gluteus maximus'],
  adductors: ['adductor'],
  calf: ['gastrocnemius', 'soleus'],
  supraspinatus: ['supraspinatus'],
}

function idForName(name: string): string | null {
  const n = name.toLowerCase()
  for (const [id, subs] of Object.entries(MUSCLE_MATCH)) {
    if (subs.some((s) => n.includes(s))) return id
  }
  return null
}

type Tissue = 'muscle' | 'tendon' | 'fat'
function tissueFor(name: string, matName: string): Tissue {
  // Rely on the anatomical MESH NAME — the model reuses a "sheathmat" material
  // for muscle bellies, so material name is unreliable for tendon detection.
  const n = (name || '').toLowerCase()
  const mn = (matName || '').toLowerCase()
  if (/fat/.test(mn) || /\bfat\b/.test(n)) return 'fat'
  if (/tendon|aponeuros|retinaculum|\bhood|plantar|calcaneal/.test(n)) return 'tendon'
  return 'muscle'
}

interface Part {
  mesh: THREE.Mesh
  layer: 'muscle' | 'skeleton'
  id: string | null
  label: string
  baseColor: THREE.Color
}

/** Real medical anatomy (BodyParts3D skeleton + muscles), mirrored to a full
 * body, sharing one fit transform, with premium tissue materials. */
export function RealisticAnatomy() {
  const skel = useGLTF(SKELETON)
  const musc = useGLTF(MUSCLES)
  const groupRef = useRef<THREE.Group>(null)
  const setHighlighted = useStore((s) => s.setHighlighted)
  const setPinned = useStore((s) => s.setPinned)

  const { group, parts } = useMemo(() => {
    const root = new THREE.Group()
    const parts: Part[] = []

    // Shared fit computed over both source scenes together.
    const combined = new THREE.Group()
    const sk = skel.scene.clone(true)
    const ms = musc.scene.clone(true)
    combined.add(sk, ms)
    combined.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(combined)
    const size = new THREE.Vector3(); const center = new THREE.Vector3()
    box.getSize(size); box.getCenter(center)
    const s = TARGET_H / (size.y || 1)
    const fit = new THREE.Group()
    fit.scale.setScalar(s)
    fit.position.set(-center.x * s, -box.min.y * s + FOOT_Y, -center.z * s)
    root.add(fit)

    const bone = sharedBoneMat(); bone.side = THREE.DoubleSide
    const tendon = sharedTendonMat(); tendon.side = THREE.DoubleSide
    const fat = sharedFatMat(); fat.side = THREE.DoubleSide

    const addScene = (scene: THREE.Object3D, layer: 'muscle' | 'skeleton') => {
      const container = new THREE.Group()
      const mirror = new THREE.Group()
      mirror.scale.set(-1, 1, 1)
      scene.updateWorldMatrix(true, true)
      const meshes: THREE.Mesh[] = []
      scene.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh) })
      for (const m of meshes) {
        const geo = m.geometry
        const name = m.name || (m.parent?.name ?? '')
        const id = idForName(name)
        // Muscles get an individual material instance (needed for per-muscle
        // highlight/activation). Bones/tendons/fat share one — no highlight cost.
        let mat: THREE.MeshPhysicalMaterial
        if (layer === 'skeleton') mat = bone
        else {
          const t = tissueFor(name, (m.material as THREE.Material)?.name || '')
          mat = t === 'muscle' ? baseMuscleMat() : t === 'fat' ? fat : tendon
          if (t === 'muscle') mat.side = THREE.DoubleSide
        }
        const baseColor = mat.color.clone()
        const wm = m.matrixWorld.clone()
        const right = new THREE.Mesh(geo, mat)
        right.applyMatrix4(wm)
        right.castShadow = true; right.receiveShadow = true
        right.userData = { id, label: name, layer }
        container.add(right)
        const left = new THREE.Mesh(geo, mat)
        left.applyMatrix4(wm)
        left.userData = { id, label: name, layer }
        mirror.add(left)
        // only track muscle parts individually (for highlight); bones tracked once via shared mat
        parts.push({ mesh: right, layer, id, label: name, baseColor })
        parts.push({ mesh: left, layer, id, label: name, baseColor })
      }
      container.add(mirror)
      return container
    }

    fit.add(addScene(sk, 'skeleton'))
    fit.add(addScene(ms, 'muscle'))
    return { group: root, parts }
  }, [skel, musc])

  useFrame(() => {
    const st = useStore.getState()
    const ex = st.mode === 'exercise' ? exerciseById(st.selectedExercise) : null
    const activeIds = ex ? new Set(ex.rig.contracts) : null
    const involvedIds = ex ? new Set(ex.movers.map((m) => m.id)) : null
    const contraction = ex ? Math.abs(Math.sin(st.exercisePhase * Math.PI)) : 0

    for (const p of parts) {
      const layer = st.layers[p.layer]
      const mat = p.mesh.material as THREE.MeshPhysicalMaterial
      let targetOp = layer.visible ? layer.opacity : 0
      // exercise: fade muscles not involved
      if (ex && p.layer === 'muscle' && involvedIds && p.id && !involvedIds.has(p.id)) targetOp *= 0.12
      if (ex && p.layer === 'muscle' && !p.id) targetOp *= 0.35
      mat.opacity = THREE.MathUtils.lerp(mat.opacity ?? 1, targetOp, 0.2)
      mat.transparent = mat.opacity < 0.98
      mat.depthWrite = mat.opacity > 0.5
      p.mesh.visible = mat.opacity > 0.02

      const hot = p.id != null && (st.highlighted === p.id || st.pinned === p.id)
      const active = activeIds && p.id ? activeIds.has(p.id) : false
      const heat = active ? contraction : 0
      if (p.layer === 'muscle') {
        const col = p.baseColor.clone()
        if (heat > 0) col.lerp(new THREE.Color('#ff5a3c'), heat * 0.6)
        if (hot) col.lerp(new THREE.Color('#17e0c4'), 0.4)
        mat.color.copy(col)
        mat.emissive.copy(new THREE.Color('#ff4a2c')).multiplyScalar(heat * 0.3 + (hot ? 0.15 : 0))
      } else if (hot) {
        mat.emissive.copy(new THREE.Color('#17e0c4')).multiplyScalar(0.2)
      } else {
        mat.emissive.setScalar(0)
      }
    }
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    const id = e.object.userData?.id as string | undefined
    if (id) setHighlighted(id)
  }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const id = e.object.userData?.id as string | undefined
    if (id) { const cur = useStore.getState().pinned; setPinned(cur === id ? null : id) }
  }

  return <group ref={groupRef} onPointerOver={onOver} onPointerOut={() => setHighlighted(null)} onClick={onClick}><primitive object={group} /></group>
}

useGLTF.preload(SKELETON)
useGLTF.preload(MUSCLES)
