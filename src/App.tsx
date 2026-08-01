import { Canvas } from '@react-three/fiber'
import { Suspense, useState } from 'react'
import { AdaptiveDpr, AdaptiveEvents, PerformanceMonitor } from '@react-three/drei'
import { Stage } from './scene/Stage'
import { RealisticAnatomy } from './scene/RealisticAnatomy'
import { RealisticBody } from './scene/RealisticBody'
import { CameraRig } from './scene/CameraRig'
import { Playhead } from './scene/Playhead'
import { useStore } from './state/store'
import { TopBar } from './ui/TopBar'
import { LayerRail } from './ui/LayerRail'
import { ExplorePanel } from './ui/ExplorePanel'
import { ExercisePanel } from './ui/ExercisePanel'
import { PhysiquePanel } from './ui/PhysiquePanel'
import { Onboarding } from './ui/Onboarding'
import { Loader } from './ui/Loader'

export default function App() {
  const mode = useStore((s) => s.mode)
  const [dpr, setDpr] = useState(1.5)
  const [ready, setReady] = useState(false)

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <Canvas
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
        dpr={dpr}
        shadows
        camera={{ fov: 34, near: 0.1, far: 60, position: [0.8, 0.9, 4.2] }}
        onCreated={() => setReady(true)}
      >
        <PerformanceMonitor
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(Math.min(2, window.devicePixelRatio))}
        />
        <AdaptiveDpr pixelated={false} />
        <AdaptiveEvents />
        <Suspense fallback={null}>
          <Stage dof={false}>
            {mode === 'physique' ? <RealisticBody /> : <RealisticAnatomy />}
          </Stage>
        </Suspense>
        <CameraRig />
        <Playhead />
      </Canvas>

      {!ready && <Loader />}

      <div className="ui-overlay">
        <TopBar />
        {mode === 'explore' && <LayerRail />}
        {mode === 'explore' && <ExplorePanel />}
        {mode === 'exercise' && <ExercisePanel />}
        {mode === 'physique' && <PhysiquePanel />}
      </div>

      <Onboarding />
    </div>
  )
}
