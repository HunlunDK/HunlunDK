import { useStore, Mode } from '../state/store'

const MODES: { id: Mode; label: string }[] = [
  { id: 'explore', label: 'Explore' },
  { id: 'exercise', label: 'Exercise' },
  { id: 'physique', label: 'Physique' },
]

export function TopBar() {
  const mode = useStore((s) => s.mode)
  const setMode = useStore((s) => s.setMode)
  const sex = useStore((s) => s.sex)
  const setSex = useStore((s) => s.setSex)

  return (
    <div className="topbar">
      <div className="brand">
        <span className="logo">KINETICA<span className="dot">.</span></span>
        <span className="tag">Living Anatomy</span>
      </div>
      <div className="segmented glass">
        {MODES.map((m) => (
          <button key={m.id} className={mode === m.id ? 'active' : ''} onClick={() => setMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>
      <div className="sexswitch glass">
        <button className={sex === 'male' ? 'active' : ''} onClick={() => setSex('male')}>Male</button>
        <button className={sex === 'female' ? 'active' : ''} onClick={() => setSex('female')}>Female</button>
      </div>
    </div>
  )
}
