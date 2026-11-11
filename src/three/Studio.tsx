import { Environment, Lightformer } from '@react-three/drei'

/** Procedural studio lighting — no HDR download. */
export function Studio() {
  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[2, 5, 3]} intensity={1.1} />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#050506']} />
        <Lightformer form="rect" intensity={3} position={[0, 5, 0]} rotation-x={Math.PI / 2} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={2.2} position={[-5, 1.5, 1]} rotation-y={Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[5, 1.5, -1]} rotation-y={-Math.PI / 2} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[0, 1, 5]} scale={[8, 1.2, 1]} />
        <Lightformer form="ring" color="#ffd9d0" intensity={1.5} position={[3, 3, -4]} scale={2} />
      </Environment>
    </>
  )
}
