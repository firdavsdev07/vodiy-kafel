import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Center, Environment, Lightformer, OrbitControls, useGLTF, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { playTone } from '@/lib/sound'

function CeramicStudy() {
  const { scene } = useGLTF('/models/ceramic-vase.glb')
  const object = useMemo(() => {
    const copy = scene.clone(true)
    const size = new THREE.Box3().setFromObject(copy).getSize(new THREE.Vector3())
    copy.scale.setScalar(3.5 / size.y)
    copy.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true } })
    return copy
  }, [scene])
  const group = useRef(null)
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = Math.sin(clock.elapsedTime * .18) * .12
  })
  return <group ref={group}>
    <Center position={[0, .15, 0]}><primitive object={object} /></Center>
    <mesh position={[0, -1.72, 0]} receiveShadow><cylinderGeometry args={[1.4, 1.4, .3, 80]} /><meshStandardMaterial color="#b9ac96" roughness={.8} /></mesh>
    <ContactShadows position={[0, -1.88, 0]} opacity={.35} scale={10} blur={2.5} far={5} resolution={256} />
  </group>
}

export default function Stage() {
  const mobile = useIsMobile()
  const ref = useRef(null)
  const [active, setActive] = useState(true)
  useEffect(() => {
    let visible = true
    const update = () => setActive(visible && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; update() })
    observer.observe(ref.current)
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [])
  return <div ref={ref} className="ceramic-stage" aria-label="Aylantiriladigan keramika modeli">
    <Canvas frameloop={active ? 'always' : 'never'} dpr={[1, mobile ? 1.25 : 1.5]} camera={{ position: [0, 1, 7.8], fov: 38 }}
      gl={{ alpha: true, antialias: true }} fallback={<div className="stage-fallback">Keramika / Material study</div>}>
      <ambientLight intensity={.8} />
      <directionalLight position={[3, 5, 4]} intensity={3} color="#fff4dd" />
      <Suspense fallback={null}>
        <Environment resolution={128}>
          <Lightformer intensity={3} position={[3, 4, 3]} scale={[4, 8, 1]} />
          <Lightformer intensity={2} position={[-4, 2, 1]} scale={[3, 6, 1]} />
        </Environment>
        <CeramicStudy />
      </Suspense>
      <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={.7} maxPolarAngle={1.8} autoRotate={active} autoRotateSpeed={.35} onStart={() => playTone('hover')} />
    </Canvas>
  </div>
}
