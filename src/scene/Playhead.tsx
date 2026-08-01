import { useFrame } from '@react-three/fiber'
import { useStore } from '../state/store'

/** Advances the exercise timeline while playing (one rep ≈ 3.2s). */
export function Playhead() {
  useFrame((_, delta) => {
    const st = useStore.getState()
    if (st.mode === 'exercise' && st.playing && st.selectedExercise) {
      const next = (st.exercisePhase + delta / 3.2) % 1
      st.setExercisePhase(next)
    }
  })
  return null
}
