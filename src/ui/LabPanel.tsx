import { useEffect, useRef } from 'react'
import { useStore } from '../state/store'
import { FLEX_MAX } from '../scene/lab/arm'

const MAX_DEG = Math.round((FLEX_MAX * 180) / Math.PI)

/** Bottom control panel for the Bicep Lab: keyboard hint + hold buttons + scrub. */
export function LabPanel() {
  const labFlex = useStore((s) => s.labFlex)
  const labTarget = useStore((s) => s.labTarget)
  const nudge = useStore((s) => s.nudgeLabTarget)
  const setTarget = useStore((s) => s.setLabTarget)

  const holdRef = useRef<number | null>(null)
  const startHold = (dir: number) => {
    nudge(dir * 0.09)
    stopHold()
    holdRef.current = window.setInterval(() => nudge(dir * 0.05), 55)
  }
  const stopHold = () => {
    if (holdRef.current != null) { window.clearInterval(holdRef.current); holdRef.current = null }
  }
  useEffect(() => stopHold, [])

  const flexDeg = Math.round(labFlex * MAX_DEG)
  const elbowDeg = 180 - flexDeg // included angle between humerus and forearm

  return (
    <div className="panel bottom glass lab-panel">
      <div className="lab-head">
        <div>
          <h2>Bicep Lab</h2>
          <p className="muted">Drive the elbow flexion. The real humerus stays fixed while the radius, ulna and hand hinge about the true elbow pivot — rigid bones, correct shape, no stretching.</p>
        </div>
        <div className="lab-readout">
          <div className="stat"><span className="v mono">{flexDeg}°</span><span className="l">Flexion</span></div>
          <div className="stat"><span className="v mono">{elbowDeg}°</span><span className="l">Elbow angle</span></div>
        </div>
      </div>

      <div className="lab-controls">
        <button
          className="hold-btn"
          onPointerDown={() => startHold(-1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          aria-label="Extend"
        >▼ Extend</button>

        <div className="lab-track">
          <input
            type="range" min={0} max={1} step={0.001} value={labTarget}
            onChange={(e) => setTarget(parseFloat(e.target.value))}
          />
        </div>

        <button
          className="hold-btn accent"
          onPointerDown={() => startHold(1)}
          onPointerUp={stopHold}
          onPointerLeave={stopHold}
          aria-label="Curl"
        >Curl ▲</button>
      </div>

      <p className="hint">
        <b>↑ / →</b> curl &nbsp;·&nbsp; <b>↓ / ←</b> extend &nbsp;·&nbsp; hold to move continuously. Drag in the viewport to orbit.
      </p>
    </div>
  )
}
