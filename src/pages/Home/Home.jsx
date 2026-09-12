import { Suspense, lazy } from 'react'
import SceneBoundary, { SceneFallback } from '@/components/ui/SceneBoundary'

import { useReducedMotion } from '@/hooks/useMediaQuery'
import CategoriesSection from '@/sections/home/CategoriesSection'
import CollectionsSection from '@/sections/home/CollectionsSection'
import CompanySection from '@/sections/home/CompanySection'
import HeroSection from '@/sections/home/HeroSection'
import IntroSection from '@/sections/home/IntroSection'
import MaterialSection from '@/sections/home/MaterialSection'
import ShowroomSection from '@/sections/home/ShowroomSection'

/* three.js is kept out of the initial bundle. */
const Stage = lazy(() => import('@/three/Stage'))

export default function Home() {
  const reduced = useReducedMotion()

  return (
    <>
      {!reduced ? (
        <SceneBoundary><Suspense fallback={<SceneFallback />}>
          <Stage />
        </Suspense></SceneBoundary>
      ) : <SceneFallback />}

      <HeroSection />
      <IntroSection />
      <CategoriesSection />
      <MaterialSection />
      <CollectionsSection />
      <CompanySection />
      <ShowroomSection />
    </>
  )
}
