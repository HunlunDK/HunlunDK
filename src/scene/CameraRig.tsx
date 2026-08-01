import { useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import CameraControls from 'camera-controls'
import * as THREE from 'three'
import { useStore } from '../state/store'
import { exerciseById } from '../data/exercises'

CameraControls.install({ THREE })

/** Camera + target framing per exercise joint region (world space). */
const FOCUS: Record<string, { cam: [number, number, number]; tgt: [number, number, number] }> = {
  // lateral / profile framings so the joint's flexion arc reads clearly
  elbow: { cam: [1.55, 0.34, 0.62], tgt: [0.24, 0.30, 0.04] },
  shoulder: { cam: [1.45, 0.72, 0.85], tgt: [0.2, 0.56, 0.03] },
  hip: { cam: [1.55, 0.28, 0.9], tgt: [0.02, 0.08, 0.02] },
  knee: { cam: [1.4, -0.2, 0.95], tgt: [0.12, -0.42, 0.04] },
  spine: { cam: [1.7, 0.5, 1.1], tgt: [0.0, 0.32, 0.0] },
}

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const gl = useThree((s) => s.gl)
  const controls = useRef<CameraControls>()
  const mode = useStore((s) => s.mode)
  const selectedExercise = useStore((s) => s.selectedExercise)
  const pinned = useStore((s) => s.pinned)

  useEffect(() => {
    const c = new CameraControls(camera, gl.domElement)
    c.minDistance = 0.4
    c.maxDistance = 8
    c.dollyToCursor = true
    c.smoothTime = 0.4
    c.draggingSmoothTime = 0.14
    c.minPolarAngle = 0.15
    c.maxPolarAngle = Math.PI - 0.15
    c.setLookAt(0.8, 0.9, 4.2, 0, 0.2, 0, false)
    controls.current = c
    return () => c.dispose()
  }, [camera, gl])

  useEffect(() => {
    const c = controls.current
    if (!c) return
    if (mode === 'exercise' && selectedExercise) {
      const ex = exerciseById(selectedExercise)
      const f = FOCUS[ex?.focus ?? 'elbow']
      c.setLookAt(f.cam[0], f.cam[1] + 0.05, f.cam[2], f.tgt[0], f.tgt[1] + 0.05, f.tgt[2], true)
    } else if (mode === 'physique') {
      c.setLookAt(0.9, 0.4, 4.6, 0, 0.0, 0, true)
    } else {
      c.setLookAt(0.8, 0.9, 4.2, 0, 0.2, 0, true)
    }
  }, [mode, selectedExercise])

  useEffect(() => {
    const c = controls.current
    if (!c || !pinned) return
    // gently frame pinned structure region (kept subtle — full lookup omitted)
  }, [pinned])

  useFrame((_, delta) => {
    controls.current?.update(delta)
  })

  return null
}
