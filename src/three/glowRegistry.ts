import type * as THREE from 'three'

/** Objects that feed the selective bloom (underglow band, Esc legend overlay, switch LED). */
export const glowObjects = new Set<THREE.Object3D>()
