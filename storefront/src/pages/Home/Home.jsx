import CategoriesSection from '@/sections/home/CategoriesSection'
import CollectionsSection from '@/sections/home/CollectionsSection'
import CompanySection from '@/sections/home/CompanySection'
import HeroSection from '@/sections/home/HeroSection'
import IntroSection from '@/sections/home/IntroSection'
import MaterialSection from '@/sections/home/MaterialSection'
import ShowroomSection from '@/sections/home/ShowroomSection'
import Seo from '@/components/ui/Seo'

export default function Home() {
  return (
    <>
      <Seo />

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
