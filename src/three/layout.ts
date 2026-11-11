import * as THREE from 'three'

/** keyboard-space facts computed from the model, shared by the scene, rig and labels */
export const layout = {
  /** seat matrix of the hero key's switch (plate surface, tilted) */
  hero: new THREE.Matrix4(),
  heroPos: new THREE.Vector3(),
  /** plate tilt (rad), front lower */
  tilt: 0,
}
