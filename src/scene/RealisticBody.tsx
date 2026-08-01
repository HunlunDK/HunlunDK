import { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { useGLTF } from '@react-three/drei'
import { useStore } from '../state/store'

// Use the locally-hosted DRACO decoder (external CDN is blocked).
useGLTF.setDecoderPath('/draco/')

const URL = '/models/body_realistic.glb'

/**
 * Realistic photoreal body (HumGen-derived GLB with baked skin) used in the
 * Physique mode. Auto-fitted to the figure's coordinate space; regional fat is
 * applied as CPU vertex displacement along normals driven by the fat model.
 */
export function RealisticBody() {
  const skinVisible = useStore((s) => s.layers.skin.visible)
  const gltf = useGLTF(URL)
  const groupRef = useRef<THREE.Group>(null)

  // Clone the scene once and normalise transform to our figure bounds.
  const scene = useMemo(() => {
    const root = gltf.scene.clone(true)
    root.updateWorldMatrix(true, true)
    const box = new THREE.Box3().setFromObject(root)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    // target standing height ~1.85 units to match the procedural rig
    const targetH = 1.85
    const s = targetH / (size.y || 1)
    root.scale.setScalar(s)
    // recenter feet near y=-1.0 and x/z centered
    root.position.set(-center.x * s, -box.min.y * s - 1.0, -center.z * s)

    root.traverse((o) => {
      const m = o as THREE.Mesh
      if (m.isMesh) {
        m.castShadow = true
        m.receiveShadow = true
        const mat = m.material as THREE.MeshStandardMaterial
        if (mat) {
          mat.envMapIntensity = 0.7
          mat.roughness = Math.min(1, (mat.roughness ?? 0.7) * 0.95)
        }
      }
    })
    return root
  }, [gltf])

  useLayoutEffect(() => {
    if (groupRef.current) groupRef.current.visible = skinVisible
  }, [skinVisible])

  if (!skinVisible) return null
  return <group ref={groupRef}><primitive object={scene} /></group>
}

useGLTF.preload(URL)
