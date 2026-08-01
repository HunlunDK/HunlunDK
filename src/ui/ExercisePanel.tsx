import { useStore } from '../state/store'
import { EXERCISES, exerciseById } from '../data/exercises'
import { REP_ZONES } from '../data/education'

function phaseOf(p: number): { key: 'concentric' | 'peak' | 'eccentric'; label: string } {
  const x = p % 1
  if (x < 0.35) return { key: 'concentric', label: 'Concentric' }
  if (x < 0.5) return { key: 'peak', label: 'Peak contraction' }
  return { key: 'eccentric', label: 'Eccentric' }
}

export function ExercisePanel() {
  const selected = useStore((s) => s.selectedExercise)
  const selectExercise = useStore((s) => s.selectExercise)
  const phase = useStore((s) => s.exercisePhase)
  const playing = useStore((s) => s.playing)
  const setPlaying = useStore((s) => s.setPlaying)
  const setExercisePhase = useStore((s) => s.setExercisePhase)
  const setHighlighted = useStore((s) => s.setHighlighted)
  const ex = exerciseById(selected)

  if (!ex) {
    return (
      <div className="panel bottom glass">
        <div className="uppercase-label">Exercise library</div>
        <h2 style={{ marginBottom: 12 }}>Choose a movement</h2>
        <div className="ex-list">
          {EXERCISES.map((e) => (
            <button key={e.id} className="ex-card" onClick={() => selectExercise(e.id)}>
              <div className="n">{e.name}</div>
              <div className="r">{e.repRange}</div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const ph = phaseOf(phase)
  const caption =
    ph.key === 'concentric' ? ex.concentric : ph.key === 'eccentric' ? ex.eccentric : 'Peak squeeze — maximal shortening and tension at the top of the rep.'

  return (
    <>
      {/* Left: anatomy detail */}
      <div className="panel left glass">
        <button className="chip" style={{ marginBottom: 10 }} onClick={() => selectExercise(null)}>← Library</button>
        <h2>{ex.name}</h2>
        <p className="muted" style={{ marginTop: 4 }}>{ex.short}</p>

        <h3>Muscles worked</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ex.movers.map((m, i) => (
            <span
              key={i}
              className={`chip ${m.role}`}
              onMouseEnter={() => setHighlighted(m.id)}
              onMouseLeave={() => setHighlighted(null)}
            >
              {m.label}
            </span>
          ))}
        </div>

        <h3>Tendons & attachments</h3>
        {ex.tendons.map((t, i) => (
          <p key={i} style={{ marginBottom: 6 }}>
            <b style={{ color: 'var(--text-hi)' }}>{t.name}</b> <span className="muted">→ {t.attaches}</span>
          </p>
        ))}

        <div className="divider" />
        <p><b style={{ color: 'var(--accent)' }}>Coaching insight.</b> <span className="muted">{ex.insight}</span></p>
        <p style={{ marginTop: 8 }}><b style={{ color: '#ffc24b' }}>Common mistake.</b> <span className="muted">{ex.mistake}</span></p>
      </div>

      {/* Bottom: timeline + synced caption */}
      <div className="panel bottom glass">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <div className="uppercase-label">{ph.label} · {ex.joint.split(' at ')[0]}</div>
          <div className="mono" style={{ fontSize: 12, color: 'var(--text-lo)' }}>{ex.repRange}</div>
        </div>
        <div className="timeline">
          <button className="play-btn" onClick={() => setPlaying(!playing)}>{playing ? '❚❚' : '►'}</button>
          <div
            className="track"
            onClick={(e) => {
              const r = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setExercisePhase(Math.min(0.999, Math.max(0, (e.clientX - r.left) / r.width)))
              setPlaying(false)
            }}
          >
            <div className="fill" style={{ width: `${(phase % 1) * 100}%` }} />
            {[0.35, 0.5].map((m) => <div key={m} className="phase-mark" style={{ left: `${m * 100}%` }} />)}
          </div>
        </div>
        <div className="phase-caption">
          <b>{ph.label}.</b> {caption}
        </div>
      </div>

      {/* Right: rep-range science for this goal */}
      <div className="panel right glass">
        <div className="uppercase-label">Programming</div>
        <h2 style={{ fontSize: 17 }}>Rep ranges</h2>
        {REP_ZONES.map((z) => (
          <div key={z.id} className="zone" style={{ borderColor: z.color, opacity: z.id === ex.goal ? 1 : 0.55 }}>
            <div className="zh">
              <span className="title">{z.title}</span>
              <span className="reps">{z.reps}</span>
            </div>
            <div className="meta">{z.intensity} · rest {z.rest}</div>
            <div className="body">{z.driver}</div>
          </div>
        ))}
        <p className="hint">Highlighted zone matches this movement’s typical goal. Progressive overload &amp; hypertrophy detail lives in the Explore glossary.</p>
      </div>
    </>
  )
}
