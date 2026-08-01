import { useState } from 'react'

export function Onboarding() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem('kinetica-onboarded') === '1' } catch { return false }
  })
  if (dismissed) return null

  const close = () => {
    try { localStorage.setItem('kinetica-onboarded', '1') } catch {}
    setDismissed(true)
  }

  return (
    <div className="onboard">
      <div className="card glass" style={{ pointerEvents: 'auto' }}>
        <h1>See the body <span className="accent">work</span>.</h1>
        <p>
          A living model of skeleton, tendon and muscle. Peel the layers, watch a lift
          from inside the joint, and model how body fat truly distributes across you.
        </p>
        <div className="steps">
          <div className="step"><span className="ico">🫀</span>Explore &amp; dissect</div>
          <div className="step"><span className="ico">💪</span>Exercise anatomy</div>
          <div className="step"><span className="ico">⚖️</span>Physique model</div>
        </div>
        <button className="cta" onClick={close}>Enter</button>
      </div>
    </div>
  )
}
