import { useStore, LayerKey } from '../state/store'

const SWATCH: Record<LayerKey, string> = {
  skin: '#d9a07a',
  fat: '#e8c76a',
  muscle: '#c14b45',
  tendon: '#ece4d4',
  skeleton: '#efe9dc',
}

const ORDER: LayerKey[] = ['skin', 'muscle', 'tendon', 'skeleton']

export function LayerRail() {
  const layers = useStore((s) => s.layers)
  const toggleLayer = useStore((s) => s.toggleLayer)
  const isolateLayer = useStore((s) => s.isolateLayer)

  return (
    <div className="layer-rail glass">
      <h4>Dissection</h4>
      {ORDER.map((k) => {
        const l = layers[k]
        return (
          <div
            key={k}
            className={`layer-row ${l.visible ? 'on' : 'off'}`}
            onClick={() => toggleLayer(k)}
            onDoubleClick={(e) => { e.stopPropagation(); isolateLayer(k) }}
            title="Click to toggle · double-click to isolate"
          >
            <span className="swatch" style={{ background: SWATCH[k] }} />
            <span className="name">{l.label}</span>
            <span className="toggle" />
          </div>
        )
      })}
    </div>
  )
}
