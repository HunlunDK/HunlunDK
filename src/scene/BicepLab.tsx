import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { useStore } from '../state/store'
import { makeBone } from '../materials/tissues'
import { FLEX_MAX } from './lab/arm'

useGLTF.setDecoderPath('/draco/')
const SKELETON = '/models/skeleton.glb'

const FORWARD = new THREE.Vector3(0, 0, 1)

/**
 * Match a mesh to a right-arm segment. GLTFLoader sanitises node names by
 * stripping the ".r"/".l" side dot, so "Humerus.r" arrives as "Humerusr" —
 * the side letter is the trailing char (r = right, l = left).
 */
function segmentOf(name: string): 'humerus' | 'forearm' | null {
  const n = name.toLowerCase()
  if (/foot|metatars|tarsal|toe/.test(n)) return null
  if (!n.endsWith('r')) return null // right side only
  if (/humerus/.test(n)) return 'humerus'
  if (/radius|ulna/.test(n)) return 'forearm'
  if (/metacarpal|phalanx|capitate|hamate|lunate|pisiform|scaphoid|trapezium|trapezoid|triquetrum/.test(n)) return 'forearm'
  return null
}

/** Reduce to position+normal, non-indexed, so a batch merges uniformly. */
function toPosNorm(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const g = geo.index ? geo.toNonIndexed() : geo.clone()
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', g.getAttribute('position'))
  if (g.getAttribute('normal')) out.setAttribute('normal', g.getAttribute('normal'))
  else out.computeVertexNormals()
  return out
}

/** Centroid of the vertices in the top (or bottom) `frac` of a geometry's Y span. */
function endCentroid(geo: THREE.BufferGeometry, top: boolean, frac = 0.08): THREE.Vector3 {
  geo.computeBoundingBox()
  const bb = geo.boundingBox!
  const cut = top ? bb.max.y - (bb.max.y - bb.min.y) * frac : bb.min.y + (bb.max.y - bb.min.y) * frac
  const pos = geo.attributes.position as THREE.BufferAttribute
  const acc = new THREE.Vector3()
  let count = 0
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i)
    if (top ? y >= cut : y <= cut) { acc.x += pos.getX(i); acc.y += y; acc.z += pos.getZ(i); count++ }
  }
  return count ? acc.divideScalar(count) : bb.getCenter(new THREE.Vector3())
}

/** Blue studio backdrop (fog-immune). */
function Backdrop() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        vertexShader: `varying vec3 vDir; void main(){ vDir=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vDir; void main(){
          float g=smoothstep(-0.55,0.55,vDir.y*0.35+vDir.z*0.35+0.15);
          vec3 core=vec3(0.055,0.16,0.34), edge=vec3(0.015,0.028,0.06);
          gl_FragColor=vec4(mix(edge,core,pow(1.0-abs(vDir.y),2.0)*0.8+g*0.35),1.0); }`,
      }),
    [],
  )
  return (
    <mesh scale={9} renderOrder={-1}>
      <sphereGeometry args={[1, 32, 32]} />
      <primitive object={mat} attach="material" />
    </mesh>
  )
}

export function BicepLab() {
  const skel = useGLTF(SKELETON)
  const nudgeLabTarget = useStore((s) => s.nudgeLabTarget)
  const setLabFlex = useStore((s) => s.setLabFlex)

  // Build the isolated right arm from the real skeleton and solve the elbow.
  const rig = useMemo(() => {
    const root = new THREE.Group()
    const boneMat = makeBone()

    // collect world-baked geometry for each segment
    const src = skel.scene.clone(true)
    src.updateWorldMatrix(true, true)
    const humGeos: THREE.BufferGeometry[] = []
    const foreGeos: THREE.BufferGeometry[] = []
    src.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      const seg = segmentOf(m.name) ?? segmentOf(m.parent?.name ?? '')
      if (!seg) return
      const g = toPosNorm(m.geometry).clone()
      g.applyMatrix4(m.matrixWorld)
      ;(seg === 'humerus' ? humGeos : foreGeos).push(g)
    })
    if (!humGeos.length || !foreGeos.length) {
      return { root, forearmGroup: new THREE.Group(), flexAxis: new THREE.Vector3(1, 0, 0), sign: 1, flex: 0 }
    }

    let humGeo = mergeGeometries(humGeos, false)
    let foreGeo = mergeGeometries(foreGeos, false)

    // Normalise: centre the whole arm at the origin and scale to a tidy size.
    const whole = new THREE.Box3().makeEmpty()
    humGeo.computeBoundingBox(); foreGeo.computeBoundingBox()
    whole.union(humGeo.boundingBox!).union(foreGeo.boundingBox!)
    const size = whole.getSize(new THREE.Vector3())
    const center = whole.getCenter(new THREE.Vector3())
    const s = 1.0 / Math.max(size.x, size.y, size.z)
    const norm = new THREE.Matrix4().makeScale(s, s, s).multiply(new THREE.Matrix4().makeTranslation(-center.x, -center.y, -center.z))
    humGeo.applyMatrix4(norm); foreGeo.applyMatrix4(norm)
    humGeo.computeVertexNormals(); foreGeo.computeVertexNormals()

    // Elbow pivot = proximal (top) end of the forearm; wrist = distal (bottom).
    const pivot = endCentroid(foreGeo, true)
    const wrist = endCentroid(foreGeo, false)
    const forearmDir = wrist.clone().sub(pivot).normalize()
    // Hinge axis: medial-lateral, perpendicular to the forearm & the sagittal fwd.
    let flexAxis = new THREE.Vector3().crossVectors(forearmDir, FORWARD)
    if (flexAxis.lengthSq() < 1e-6) flexAxis.set(1, 0, 0)
    flexAxis.normalize()
    // Pick the sign that curls the wrist anteriorly + upward (toward the shoulder).
    const test = new THREE.Quaternion().setFromAxisAngle(flexAxis, 0.3)
    const moved = wrist.clone().sub(pivot).applyQuaternion(test).add(pivot).sub(wrist)
    const sign = moved.z + moved.y >= 0 ? 1 : -1

    // Static humerus.
    const humerus = new THREE.Mesh(humGeo, boneMat)
    humerus.castShadow = true; humerus.receiveShadow = true
    root.add(humerus)

    // Forearm + hand pivot about the elbow: translate geometry so pivot is the
    // group origin, then the group's rotation IS the elbow flexion.
    foreGeo.translate(-pivot.x, -pivot.y, -pivot.z)
    const forearm = new THREE.Mesh(foreGeo, boneMat)
    forearm.castShadow = true; forearm.receiveShadow = true
    const forearmGroup = new THREE.Group()
    forearmGroup.position.copy(pivot)
    forearmGroup.add(forearm)
    root.add(forearmGroup)

    // Anchor the elbow (the fixed pivot) at the world origin so the camera stays
    // centred through the whole curl — the humerus rises, the forearm swings.
    root.position.set(-pivot.x, -pivot.y, -pivot.z)

    return { root, forearmGroup, flexAxis, sign, flex: 0 }
  }, [skel])

  // Arrow keys steer the curl.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      let d = 0
      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') d = 0.045
      else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') d = -0.045
      if (d !== 0) { e.preventDefault(); nudgeLabTarget(d) }
    }
    window.addEventListener('keydown', onKey, { passive: false })
    return () => window.removeEventListener('keydown', onKey)
  }, [nudgeLabTarget])

  useFrame((_, delta) => {
    const st = useStore.getState()
    if (st.mode !== 'lab') return
    const k = 1 - Math.exp(-9 * Math.min(delta, 0.05))
    rig.flex += (st.labTarget - rig.flex) * k
    if (Math.abs(rig.flex - st.labFlex) > 0.0004) setLabFlex(rig.flex)
    const phi = rig.flex * FLEX_MAX * rig.sign
    rig.forearmGroup.setRotationFromAxisAngle(rig.flexAxis, phi)
  })

  return (
    <>
      <Backdrop />
      <directionalLight position={[2.6, 2.2, 3.2]} intensity={1.5} color="#fff1e0" castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 1.5, -1.6]} intensity={1.8} color="#5aa8ff" />
      <directionalLight position={[3.2, 0.2, -2.2]} intensity={1.3} color="#8fd0ff" />
      <primitive object={rig.root} />
    </>
  )
}

useGLTF.preload(SKELETON)
