import { Environment, Lightformer, ContactShadows, AccumulativeShadows, RandomizedLight } from '@react-three/drei'
import { EffectComposer, Bloom, SSAO, ToneMapping, Vignette, DepthOfField } from '@react-three/postprocessing'
import { BlendFunction, ToneMappingMode } from 'postprocessing'
import { ReactNode } from 'react'

/**
 * Cinematic studio stage: neutral HDRI reflections, a warm/cool 3-point
 * key/fill/rim, soft contact shadows and a filmic post chain.
 */
export function Stage({ children, dof = false }: { children: ReactNode; dof?: boolean }) {
  return (
    <>
      <color attach="background" args={['#07090d']} />
      <fog attach="fog" args={['#07090d', 9, 22]} />

      {/* Key / fill / rim */}
      <directionalLight
        position={[4, 8, 6]}
        intensity={2.4}
        color="#fff4e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
      />
      <directionalLight position={[-6, 3, 2]} intensity={0.8} color="#9fc6ff" />
      <directionalLight position={[0, 4, -8]} intensity={1.6} color="#bfe9ff" />
      <ambientLight intensity={0.18} />

      {/* Procedural studio IBL — no external HDRI fetch. Drives the wet
          specular/fresnel response that makes tissue read as living. */}
      <Environment resolution={256} environmentIntensity={0.6}>
        <group rotation={[0, 0, 0]}>
          <Lightformer form="rect" intensity={3} color="#fff3e2" position={[3, 3, 3]} scale={[4, 6, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={1.2} color="#bcd8ff" position={[-4, 2, 1]} scale={[5, 6, 1]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={2} color="#cdeaff" position={[0, 3, -5]} scale={[6, 6, 1]} target={[0, 0, 0]} />
          <Lightformer form="ring" intensity={1.4} color="#ffffff" position={[2, -1, 2]} scale={2} target={[0, 0, 0]} />
          <mesh scale={20}>
            <sphereGeometry args={[1, 32, 32]} />
            <meshBasicMaterial color="#0a0d12" side={2} />
          </mesh>
        </group>
      </Environment>

      {children}

      <ContactShadows
        position={[0, -1.06, 0]}
        opacity={0.7}
        scale={5}
        blur={2.4}
        far={2.2}
        resolution={1024}
        color="#000000"
      />

      <EffectComposer multisampling={4} enableNormalPass>
        <SSAO
          blendFunction={BlendFunction.MULTIPLY}
          samples={24}
          radius={0.09}
          intensity={22}
          luminanceInfluence={0.6}
          worldDistanceThreshold={1}
          worldDistanceFalloff={1}
          worldProximityThreshold={1}
          worldProximityFalloff={1}
        />
        {dof ? (
          <DepthOfField focusDistance={0.012} focalLength={0.04} bokehScale={3.4} height={480} />
        ) : (
          <></>
        )}
        <Bloom
          intensity={0.26}
          luminanceThreshold={0.92}
          luminanceSmoothing={0.14}
          mipmapBlur
          radius={0.5}
        />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette eskil={false} offset={0.28} darkness={0.72} />
      </EffectComposer>
    </>
  )
}

export function StudioFloorShadows() {
  return (
    <AccumulativeShadows temporal frames={60} scale={14} position={[0, -3.0, 0]} opacity={0.7}>
      <RandomizedLight amount={6} radius={5} intensity={1.2} position={[4, 8, 6]} bias={0.001} />
    </AccumulativeShadows>
  )
}
