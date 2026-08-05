import { useStore } from '../state/store'

/**
 * Left-docked testing menu. Currently hosts the Bicep Lab; new experimental
 * scenes can be added as extra rows here without touching the main nav.
 */
export function LabRail() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const active = mode === 'lab'

  return (
    <div className="lab-rail glass">
      <h4>Testing</h4>
      <button
        className={`lab-item ${active ? 'on' : ''}`}
        onClick={() => setMode(active ? 'explore' : 'lab')}
        title="Interactive bicep-curl rig — keyboard controlled"
      >
        <span className="ico">💪</span>
        <span className="txt">
          <span className="n">Bicep Lab</span>
          <span className="s">Elbow articulation</span>
        </span>
      </button>
    </div>
  )
}
