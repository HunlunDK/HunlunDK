import { useStore, FAT_REGIONS, FatRegion } from '../state/store'
import { baselineDistribution, redistribute, categoryFor, normalizedWeights, BF_MIN } from '../data/fatModel'
import { useEffect } from 'react'

const REGION_LABEL: Record<FatRegion, string> = {
  face: 'Face / neck', chest: 'Chest', abdomen: 'Belly', flanks: 'Love-handles',
  lowerBack: 'Lower back', glutes: 'Glutes', hips: 'Hips', frontThigh: 'Front thigh',
  hamstring: 'Hamstring', upperArm: 'Upper arm', calf: 'Calves', upperBack: 'Upper back',
}

const SHOWN: FatRegion[] = ['abdomen', 'flanks', 'chest', 'glutes', 'hips', 'frontThigh', 'upperArm', 'face']

export function PhysiquePanel() {
  const sex = useStore((s) => s.sex)
  const bodyFat = useStore((s) => s.bodyFat)
  const setBodyFat = useStore((s) => s.setBodyFat)
  const regionFat = useStore((s) => s.regionFat)
  const setRegionFat = useStore((s) => s.setRegionFat)

  const cat = categoryFor(sex, bodyFat / 100)
  const minBF = BF_MIN[sex] * 100

  // Re-seed distribution from biology model when BF or sex changes (unless user is biasing)
  useEffect(() => {
    const dist = baselineDistribution(sex, 80, bodyFat / 100)
    setRegionFat(normalizedWeights(dist))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sex, bodyFat])

  const onRegionDrag = (region: FatRegion, deltaPct: number) => {
    const totalFat = (bodyFat / 100) * 80
    const massMap = {} as Record<FatRegion, number>
    for (const r of FAT_REGIONS) massMap[r] = regionFat[r] * totalFat
    const deltaKg = (deltaPct / 100) * totalFat
    const out = redistribute(sex, 80, massMap, region, deltaKg)
    setRegionFat(normalizedWeights(out))
  }

  return (
    <>
      <div className="panel left glass">
        <div className="uppercase-label">Body composition</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 8 }}>
          <div className="category-badge">
            <span className="cn">{cat.label}</span>
            <span className="cr">{cat.range}</span>
          </div>
          <p className="muted" style={{ fontSize: 12, flex: 1 }}>{cat.desc}</p>
        </div>

        <div className="slider-wrap">
          <div className="slider-head">
            <span className="lbl">Body fat</span>
            <span className="val">{bodyFat.toFixed(0)}%</span>
          </div>
          <input
            type="range" min={minBF} max={45} step={0.5}
            value={bodyFat}
            onChange={(e) => setBodyFat(parseFloat(e.target.value))}
          />
        </div>
        <p className="hint">
          Fat is deposited on the true anatomical depots for {sex === 'male' ? 'an android (belly-first)' : 'a gynoid (hip & thigh-first)'} pattern —
          not a uniform balloon. Definition and vascularity emerge below {sex === 'male' ? '18%' : '25%'}.
        </p>
      </div>

      <div className="panel right glass">
        <div className="uppercase-label">Regional distribution</div>
        <h2 style={{ fontSize: 17 }}>Redistribute fat</h2>
        <p className="muted" style={{ fontSize: 12.5 }}>
          Total body fat stays fixed. Add to one region and the model pulls it from the others —
          weighted toward regions that physiologically mobilise together.
        </p>
        <div className="region-grid" style={{ marginTop: 14 }}>
          {SHOWN.map((r) => (
            <div className="region-slider" key={r}>
              <div className="rh">
                <span className="rn">{REGION_LABEL[r]}</span>
                <span className="rv">{(regionFat[r] * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range" min={0} max={100} step={1}
                value={regionFat[r] * 100}
                onChange={(e) => {
                  const target = parseFloat(e.target.value) / 100
                  onRegionDrag(r, (target - regionFat[r]) * 100)
                }}
              />
            </div>
          ))}
        </div>
        <p className="hint">Values are each region’s share of total fat. Drag “Belly” up and the flanks, lower back and chest give way first — calves and face barely move, exactly as real fat loss behaves.</p>
      </div>
    </>
  )
}
