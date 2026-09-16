import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import '@/three/materials/MarbleMaterial'

const damp = THREE.MathUtils.damp

/**
 * An art installation, not a product shot — see DESIGN.md §10.
 *
 * Slabs, an arch, a pedestal and a sphere, composed asymmetrically. All
 * geometry is authored from primitives so there is no model to download.
 */
export default function HeroSculpture({ view }) {
  const group = useRef(null)
  const inner = useRef(null)
  const sphere = useRef(null)
  const fins = useRef([])
  const materials = useRef([])

  useFrame((state, delta) => {
    const v = view.current
    const t = state.clock.elapsedTime
    const dt = Math.min(delta, 0.1)

    materials.current.forEach((m) => {
      if (m) m.time = t
    })

    if (group.current) {
      // Drag rotation with inertia, plus a slow idle drift.
      group.current.rotation.y = damp(group.current.rotation.y, v.spin + t * 0.045, 3.2, dt)
      // Pointer parallax — subtle, never the main event.
      group.current.rotation.x = damp(group.current.rotation.x, v.py * 0.1, 3, dt)
      group.current.position.x = damp(group.current.position.x, v.px * 0.28, 3, dt)
    }

    if (inner.current) {
      // The composition lifts slightly as the hero scrolls away.
      inner.current.position.y = damp(inner.current.position.y, v.hero * 1.1, 3, dt)
    }

    if (sphere.current) {
      sphere.current.position.y = 1.55 + Math.sin(t * 0.55) * 0.14
      sphere.current.rotation.y = t * 0.12
    }

    fins.current.forEach((fin, i) => {
      if (!fin) return
      fin.rotation.z = Math.sin(t * 0.32 + i * 1.4) * 0.06 + (i === 0 ? 0.22 : -0.16)
      fin.position.y = (i === 0 ? 0.9 : -0.3) + Math.sin(t * 0.4 + i) * 0.08
    })
  })

  const marble = (i, props) => (
    <marbleMaterial
      ref={(m) => {
        materials.current[i] = m
      }}
      {...props}
    />
  )

  return (
    <group ref={group}>
      <group ref={inner}>
        {/* pedestal */}
        <mesh position={[0, -1.95, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[1.05, 1.18, 0.42, 64]} />
          {marble(0, { scale: 0.5, base: '#d9d3c7', vein: '#6f685c', roughness: 0.55 })}
        </mesh>

        {/* the standing slab — the centre of the composition */}
        <mesh position={[0, 0.35, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.5, 4.2, 0.16]} />
          {marble(1, {
            scale: 0.3,
            warp: 3.1,
            veinSharpness: 3.8,
            base: '#f1eee7',
            vein: '#7d7568',
            roughness: 0.16,
            clearcoat: 0.65,
            clearcoatRoughness: 0.22,
          })}
        </mesh>

        {/* arch, set back and off-axis */}
        <mesh position={[-0.15, -0.35, -1.7]} rotation={[0, 0.22, 0]} castShadow>
          <torusGeometry args={[1.85, 0.2, 20, 72, Math.PI]} />
          {marble(2, { scale: 0.42, base: '#c9c2b5', vein: '#5f584e', roughness: 0.42 })}
        </mesh>

        {/* polished sphere */}
        <mesh ref={sphere} position={[-2.15, 1.55, 0.9]} castShadow>
          <sphereGeometry args={[0.62, 64, 64]} />
          <meshPhysicalMaterial
            color="#232321"
            roughness={0.08}
            metalness={0.12}
            clearcoat={1}
            clearcoatRoughness={0.05}
          />
        </mesh>

        {/* floating fins */}
        {[0, 1].map((i) => (
          <mesh
            key={i}
            ref={(el) => {
              fins.current[i] = el
            }}
            position={[i === 0 ? 2.35 : 2.0, i === 0 ? 0.9 : -0.3, i === 0 ? 0.5 : -0.8]}
            rotation={[0, i === 0 ? -0.5 : -0.28, 0.2]}
            castShadow
          >
            <boxGeometry args={[1.5, 2.3, 0.07]} />
            {marble(3 + i, {
              scale: 0.38,
              base: i === 0 ? '#e6e1d6' : '#cdc6b9',
              vein: '#736b5e',
              roughness: 0.3,
            })}
          </mesh>
        ))}

        {/* low plinth */}
        <mesh position={[1.5, -2.28, -0.6]} rotation={[0, 0.35, 0]} receiveShadow>
          <boxGeometry args={[2.2, 0.28, 1.4]} />
          {marble(5, { scale: 0.55, base: '#d3ccc0', vein: '#6b6458', roughness: 0.6 })}
        </mesh>
      </group>
    </group>
  )
}
