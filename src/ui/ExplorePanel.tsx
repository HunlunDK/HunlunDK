import { useStore, prettyAnatomyName } from '../state/store'
import { GLOSSARY } from '../data/education'

function tissueKind(label: string): string {
  const n = label.toLowerCase()
  if (/tendon|aponeuros|retinaculum/.test(n)) return 'Tendon'
  if (/bone|vertebra|sternum|rib|sacrum|coccyx|mandible|skull|clavicle|scapula|femur|tibia|fibula|humerus|radius|ulna|pelvis|patella|carpal|tarsal|phalan|cranium|occipital|parietal|frontal|sphenoid|ethmoid|atlas|axis/.test(n)) return 'Bone'
  return 'Muscle'
}

export function ExplorePanel() {
  const highlightedLabel = useStore((s) => s.highlightedLabel)
  const pinned = useStore((s) => s.pinned)
  const struct = highlightedLabel
    ? { label: prettyAnatomyName(highlightedLabel), kind: tissueKind(highlightedLabel) }
    : null

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
