import * as THREE from 'three'

/** keyboard-space facts computed from the model, shared by the scene, rig and labels */
export const layout = {
  /** seat matrix of the hero key's switch (plate surface, tilted) */
  hero: new THREE.Matrix4(),
  heroPos: new THREE.Vector3(),
  /** plate tilt (rad), front lower */
  tilt: 0,
  /** switch seat (plate surface) per keycap name, keyboard space */
  seats: {} as Record<string, THREE.Vector3>,
  /** the keyboard group (idle sway); keyboard space → world via its matrixWorld */
  group: null as THREE.Object3D | null,
  /** keyboard root (glTF scene clone) for node lookups */
  root: null as THREE.Object3D | null,
}
