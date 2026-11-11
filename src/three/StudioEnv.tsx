import { Environment, Lightformer } from '@react-three/drei'

/**
 * Neutral studio environment built from white Lightformers.
 * Replaces drei's preset="studio": its HDR (studio_small_03) has a cool cast that turned
 * warm-white caps bluish (#e9ebec instead of #e9e5dc) and pushed reds towards magenta.
 * Also avoids a network HDR download.
 */
export function StudioEnv({ intensity = 0.55 }: { intensity?: number }) {
  return (
    <Environment resolution={256} environmentIntensity={intensity} frames={1}>
      <color attach="background" args={['#050505']} />
      {/* key: large softbox overhead */}
      <Lightformer form="rect" color="#ffffff" intensity={4} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[10, 10, 1]} />
      {/* front fill */}
      <Lightformer form="rect" color="#ffffff" intensity={2} position={[0, 2, 5]} scale={[10, 3, 1]} />
      {/* side strips for edge highlights on the case */}
      <Lightformer form="rect" color="#ffffff" intensity={1.6} position={[-5, 2, 0]} rotation-y={Math.PI / 2} scale={[10, 2, 1]} />
      <Lightformer form="rect" color="#ffffff" intensity={1.2} position={[5, 1.5, -1]} rotation-y={-Math.PI / 2} scale={[10, 1.5, 1]} />
    </Environment>
  )
}
