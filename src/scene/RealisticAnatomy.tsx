import { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import { useStore } from '../state/store'
import { exerciseById } from '../data/exercises'

useGLTF.setDecoderPath('/draco/')
const SKELETON = '/models/skeleton.glb'
const MUSCLES = '/models/anatomy_full.glb' // complete bilateral musculature (incl. abs/neck/erectors)

const TARGET_H = 1.9
const FOOT_Y = -1.02

/** Lightweight tissue materials for the real scanned anatomy (no transmission). */
function baseMuscleMat() {
  const m = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#9c2e29'), roughness: 0.42, metalness: 0,
    clearcoat: 0.55, clearcoatRoughness: 0.26, sheen: 0.5,
    sheenColor: new THREE.Color('#e06a55'), sheenRoughness: 0.55, envMapIntensity: 0.95,
    emissive: new THREE.Color('#3a0b08'), emissiveIntensity: 0.28,
  })
  return m
}
function sharedTendonMat() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e7ddc7'), roughness: 0.34, metalness: 0,
    clearcoat: 0.5, clearcoatRoughness: 0.3, sheen: 0.4, envMapIntensity: 0.7, side: THREE.DoubleSide,
  })
}
function sharedBoneMat() {
  return new THREE.MeshPhysicalMaterial({
    color: new THREE.Color('#e6ddc9'), roughness: 0.62, metalness: 0,
    clearcoat: 0.12, clearcoatRoughness: 0.6, sheen: 0.25,
    sheenColor: new THREE.Color('#fff4e0'), envMapIntensity: 0.65, side: THREE.DoubleSide,
  })
}

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
  abs: ['rectus abdominis'],
  obliques: ['external oblique', 'internal oblique'],
  erectors: ['erector', 'iliocostalis', 'longissimus', 'spinalis'],
  sterno: ['sternocleidomastoid'],
}
function idForName(name: string): string | null {
  const n = name.toLowerCase()
  for (const [id, subs] of Object.entries(MUSCLE_MATCH)) if (subs.some((s) => n.includes(s))) return id
  return null
}

/** Reduce a geometry to just position+normal (non-indexed) so a batch of them
 * can be merged uniformly regardless of their original attribute sets. */
function toPosNorm(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = (geo.index ? geo.toNonIndexed() : geo.clone())
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', g.getAttribute('position'))
  if (g.getAttribute('normal')) out.setAttribute('normal', g.getAttribute('normal'))
  else { out.computeVertexNormals() }
  return out
}

interface Part {
  mesh: THREE.Mesh
  layer: 'muscle' | 'skeleton'
  id: string | null
  label: string
  baseColor: THREE.Color
  side: 'r' | 'l'
  /** true for muscle tissue whose colour reacts to highlight/activation */
  dyn: boolean
}

export function RealisticAnatomy() {
  const skel = useGLTF(SKELETON)
  const musc = useGLTF(MUSCLES)
  const groupRef = useRef<THREE.Group>(null)
  const setHighlighted = useStore((s) => s.setHighlighted)
  const setPinned = useStore((s) => s.setPinned)
  const setHighlightedLabel = useStore((s) => s.setHighlightedLabel)

  const { group, parts } = useMemo(() => {
    const root = new THREE.Group()
    const parts: Part[] = []
    const bone = sharedBoneMat()
    const tendon = sharedTendonMat()

    // Bake a source model into world-space meshes fitted to the shared target
    // frame. preRot rotates the source into Y-up; mirror adds a left copy.
    const bake = (
      scene: THREE.Object3D,
      layer: 'muscle' | 'skeleton',
      preRot: THREE.Matrix4 | null,
      mirror: boolean,
    ) => {
      const src = scene.clone(true)
      const wrap = new THREE.Group()
      if (preRot) wrap.applyMatrix4(preRot)
      wrap.add(src)
      wrap.updateWorldMatrix(true, true)
      const box = new THREE.Box3().setFromObject(wrap)
      const size = new THREE.Vector3(); const center = new THREE.Vector3()
      box.getSize(size); box.getCenter(center)
      const s = TARGET_H / (size.y || 1)
      // For mirrored (right-half) models the anatomical midline is the source
      // X=0 plane, so keep X at 0 — recentering on the half-body would offset it.
      const tx = mirror ? 0 : -center.x * s
      const fit = new THREE.Matrix4()
        .makeTranslation(tx, -box.min.y * s + FOOT_Y, -center.z * s)
        .multiply(new THREE.Matrix4().makeScale(s, s, s))

      const container = new THREE.Group()
      const mirrorMat = new THREE.Matrix4().makeScale(-1, 1, 1)
      const meshes: THREE.Mesh[] = []
      wrap.traverse((o) => { if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh) })

      if (layer === 'skeleton') {
        // Bones share one material and aren't individually highlighted → merge
        // all (incl. the mirrored left) into ONE mesh = one draw call.
        const geos: THREE.BufferGeometry[] = []
        for (const m of meshes) {
          const g1 = toPosNorm(m.geometry).clone(); g1.applyMatrix4(fit.clone().multiply(m.matrixWorld)); geos.push(g1)
          if (mirror) { const g2 = toPosNorm(m.geometry).clone(); g2.applyMatrix4(fit.clone().multiply(mirrorMat).multiply(m.matrixWorld)); geos.push(g2) }
        }
        const merged = mergeGeometries(geos, false)
        merged.computeVertexNormals()
        const mesh = new THREE.Mesh(merged, bone)
        mesh.castShadow = true; mesh.receiveShadow = true
        mesh.userData = { id: null, label: 'Skeleton', layer }
        container.add(mesh)
        parts.push({ mesh, layer, id: null, label: 'Skeleton', baseColor: bone.color.clone(), side: 'r', dyn: false })
        root.add(container)
        return
      }

      // Group muscle meshes by (muscle-id | bulk, side, tissue) and merge each
      // group into one mesh. Named muscles stay individually highlightable;
      // hundreds of tiny deep muscles collapse into a few merged meshes.
      interface G { geos: THREE.BufferGeometry[]; id: string | null; side: 'r' | 'l'; tissue: 'muscle' | 'tendon'; label: string }
      const groups = new Map<string, G>()
      for (const m of meshes) {
        const name = m.name || (m.parent?.name ?? '')
        const id = idForName(name)
        const ln = name.toLowerCase()
        const side: 'r' | 'l' = ln.includes('left') ? 'l' : 'r'
        const matName = ((m.material as THREE.Material)?.name || '').toLowerCase()
        const tissue: 'muscle' | 'tendon' = matName === 'tendon' || /tendon|retinaculum|aponeuros/.test(ln) ? 'tendon' : 'muscle'
        const key = `${id ?? 'bulk'}_${side}_${tissue}`
        const g = groups.get(key) ?? { geos: [], id, side, tissue, label: id ? name : tissue === 'tendon' ? 'Tendon' : 'Deep muscle' }
        const baked = toPosNorm(m.geometry); baked.applyMatrix4(fit.clone().multiply(m.matrixWorld))
        g.geos.push(baked)
        groups.set(key, g)
      }
      for (const g of groups.values()) {
        if (!g.geos.length) continue
        const merged = mergeGeometries(g.geos, false); merged.computeVertexNormals()
        const mat = g.tissue === 'tendon' ? tendon : g.id ? baseMuscleMat() : baseMuscleMat()
        const mesh = new THREE.Mesh(merged, mat)
        mesh.castShadow = true; mesh.receiveShadow = true
        mesh.userData = { id: g.id, label: g.label, layer }
        container.add(mesh)
        parts.push({ mesh, layer, id: g.id, label: g.label, baseColor: mat.color.clone(), side: g.side, dyn: g.tissue === 'muscle' })
      }
      root.add(container)
    }

    // skeleton: already Y-up, right-half → mirror to full
    bake(skel.scene, 'skeleton', null, true)
    // muscles: Z-up (head at +Z) → rotate -90° about X into Y-up; bilateral already
    const rot = new THREE.Matrix4().makeRotationX(-Math.PI / 2)
    bake(musc.scene, 'muscle', rot, false)
    return { group: root, parts }
  }, [skel, musc])

  const selectedExercise = useStore((s) => s.selectedExercise)
  const setExerciseFocus = useStore((s) => s.setExerciseFocus)
  useEffect(() => {
    const ex = exerciseById(selectedExercise)
    if (!ex) { setExerciseFocus(null); return }
    const ids = new Set(ex.movers.map((m) => m.id))
    if (groupRef.current) groupRef.current.updateWorldMatrix(true, true)
    const box = new THREE.Box3(); let found = false
    for (const p of parts) {
      if (p.layer !== 'muscle' || p.side !== 'r' || !p.id || !ids.has(p.id)) continue
      box.expandByObject(p.mesh); found = true
    }
    if (!found) { setExerciseFocus(null); return }
    const c = new THREE.Vector3(); const s = new THREE.Vector3()
    box.getCenter(c); box.getSize(s)
    setExerciseFocus({ x: c.x, y: c.y, z: c.z, r: Math.max(s.x, s.y, s.z) * 0.5 + 0.12 })
  }, [selectedExercise, parts, setExerciseFocus])

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
      if (ex && p.layer === 'muscle' && involvedIds && p.id && !involvedIds.has(p.id)) targetOp *= 0.1
      if (ex && p.layer === 'muscle' && !p.id) targetOp *= 0.25
      mat.opacity = THREE.MathUtils.lerp(mat.opacity ?? 1, targetOp, 0.2)
      mat.transparent = mat.opacity < 0.98
      mat.depthWrite = mat.opacity > 0.5
      p.mesh.visible = mat.opacity > 0.02

      const hot = p.id != null && (st.highlighted === p.id || st.pinned === p.id)
      const active = activeIds && p.id ? activeIds.has(p.id) : false
      const heat = active ? contraction : 0
      if (p.dyn) {
        const col = p.baseColor.clone()
        if (heat > 0) col.lerp(new THREE.Color('#ff5a3c'), heat * 0.6)
        if (hot) col.lerp(new THREE.Color('#17e0c4'), 0.4)
        mat.color.copy(col)
        mat.emissive.copy(new THREE.Color('#ff4a2c')).multiplyScalar(heat * 0.35 + (hot ? 0.18 : 0.0)).add(new THREE.Color('#3a0b08'))
      }
    }
  })

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    setHighlighted((e.object.userData?.id as string) ?? null)
    setHighlightedLabel((e.object.userData?.label as string) ?? null)
  }
  const onOut = () => { setHighlighted(null); setHighlightedLabel(null) }
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation()
    const id = (e.object.userData?.id as string) ?? (e.object.userData?.label as string) ?? null
    const cur = useStore.getState().pinned
    setPinned(cur === id ? null : id)
    setHighlightedLabel((e.object.userData?.label as string) ?? null)
  }

  return <group ref={groupRef} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}><primitive object={group} /></group>
}

useGLTF.preload(SKELETON)
useGLTF.preload(MUSCLES)
