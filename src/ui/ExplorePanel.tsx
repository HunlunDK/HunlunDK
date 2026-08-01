import { useStore } from '../state/store'
import { MUSCLES } from '../scene/anatomy/structures'
import { BONES } from '../scene/anatomy/structures'
import { GLOSSARY } from '../data/education'

function findStructure(id: string | null) {
  if (!id) return null
  const m = MUSCLES.find((x) => x.id === id)
  if (m) return { label: m.label, kind: 'Muscle' }
  const b = BONES.find((x) => x.id === id)
  if (b) return { label: b.label, kind: 'Bone' }
  const t: Record<string, string> = {
    distalBiceps: 'Distal biceps tendon', quadTendon: 'Patellar tendon', achilles: 'Achilles tendon',
    hamstringTendon: 'Hamstring tendon', pecTendon: 'Pec major tendon', achillesTri: 'Triceps tendon',
    ribcage: 'Thoracic cage', spine: 'Vertebral column',
  }
  if (t[id]) return { label: t[id], kind: id.includes('endon') || id.includes('achilles') ? 'Tendon' : 'Structure' }
  return null
}

export function ExplorePanel() {
  const highlighted = useStore((s) => s.highlighted)
  const pinned = useStore((s) => s.pinned)
  const active = pinned ?? highlighted
  const struct = findStructure(active)

  return (
    <div className="panel left glass">
      <div className="uppercase-label">Structure</div>
      {struct ? (
        <>
          <h2>{struct.label}</h2>
          <span className="chip synergist" style={{ marginTop: 6 }}>{struct.kind}</span>
          <div className="divider" />
          <p className="muted">
            {pinned
              ? 'Pinned. Toggle layers on the right to peel skin, muscle and tendon down to bone, or click another structure.'
              : 'Hover holds this label; click to pin it. Peel the layers on the right to reveal what sits beneath.'}
          </p>
        </>
      ) : (
        <>
          <h2>Explore the body</h2>
          <p className="info-empty" style={{ marginTop: 8 }}>
            Orbit to rotate, scroll to zoom. Hover any structure to identify it, click to pin.
            Use the dissection rail to fade from skin through muscle and tendon down to the skeleton.
          </p>
        </>
      )}

      <div className="divider" />
      <h3>Glossary</h3>
      {GLOSSARY.slice(0, 6).map((g) => (
        <p key={g.term} style={{ marginBottom: 8 }}>
          <b style={{ color: 'var(--text-hi)' }}>{g.term}.</b> <span className="muted">{g.def}</span>
        </p>
      ))}
    </div>
  )
}
