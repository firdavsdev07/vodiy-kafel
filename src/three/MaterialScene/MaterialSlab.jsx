import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import '@/three/materials/MarbleMaterial'

const damp = THREE.MathUtils.damp

/**
 * Act two. A single large slab, far below the hero in world space, so the
 * camera travels to it rather than the object being swapped in.
 */
export default function MaterialSlab({ view, y = -42 }) {
  const group = useRef(null)
  const slab = useRef(null)
  const key = useRef(null)
  const material = useRef(null)

  useFrame((state, delta) => {
    const v = view.current
    const t = state.clock.elapsedTime
    const dt = Math.min(delta, 0.1)
    const p = v.material

    if (material.current) material.current.time = t * 2.4

    if (slab.current) {
      // Rotates through the section, so the surface is read from two angles.
      slab.current.rotation.y = damp(slab.current.rotation.y, -0.5 + p * 1.15, 2.6, dt)
      slab.current.rotation.x = damp(slab.current.rotation.x, 0.06 - p * 0.16, 2.6, dt)
      slab.current.position.z = damp(slab.current.position.z, -1.2 + p * 2.4, 2.4, dt)
    }

    if (key.current) {
      // The key light sweeps across the material as the section advances.
      key.current.position.x = Math.cos(p * Math.PI * 1.35 - 0.6) * 9
      key.current.position.z = Math.sin(p * Math.PI * 1.35 - 0.6) * 9 + 2
      key.current.position.y = 5 + Math.sin(t * 0.4) * 0.6
    }
  })

  return (
    <group ref={group} position={[0, y, 0]}>
      <mesh ref={slab} rotation={[0.06, -0.5, 0]}>
        <boxGeometry args={[6.4, 3.6, 0.22]} />
        <marbleMaterial
          ref={material}
          scale={0.26}
          warp={3.4}
          veinSharpness={4.2}
          base="#2b2a27"
          vein="#cbbfa6"
          shadow="#141312"
          roughness={0.12}
          metalness={0.05}
          clearcoat={1}
          clearcoatRoughness={0.12}
        />
      </mesh>

      {/* edge detail — reads the 20 mm profile */}
      <mesh position={[0, -1.94, 0]} rotation={[0, -0.5, 0]}>
        <boxGeometry args={[6.4, 0.16, 0.6]} />
        <meshStandardMaterial color="#1a1918" roughness={0.7} />
      </mesh>

      <directionalLight ref={key} intensity={2.4} color="#fff6e6" position={[6, 5, 4]} />
      <pointLight position={[-5, -2, 3]} intensity={12} color="#8fa0b5" distance={18} />
    </group>
  )
}
