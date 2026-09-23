import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'

import Layout from '@/components/Layout/Layout'
import Home from '@/pages/Home/Home'

/**
 * Bosh sahifa (`Home`) — DARHOL, chunki odam deyarli har doim shu yerga
 * tushadi; uni lazy qilish birinchi ekranga ortiqcha so'rov qo'shadi.
 *
 * Qolgan sahifalar — `lazy`: katalogga kirmagan odam `ProductDetail` ni ham,
 * `Contact` ni ham yuklab olmaydi (S-002). Suspense chegarasi `Layout` ichida,
 * `<Outlet />` atrofida — shuning uchun sahifa almashganda Nav, Footer va
 * kursor joyida qoladi, ekran oqarib ketmaydi.
 */
const Catalog = lazy(() => import('@/pages/Catalog/Catalog'))
const ProductDetail = lazy(() => import('@/pages/ProductDetail/ProductDetail'))
const Categories = lazy(() => import('@/pages/Categories/Categories'))
const CategoryDetail = lazy(() => import('@/pages/CategoryDetail/CategoryDetail'))
const Gallery = lazy(() => import('@/pages/Gallery/Gallery'))
const About = lazy(() => import('@/pages/About/About'))
const Contact = lazy(() => import('@/pages/Contact/Contact'))
const NotFound = lazy(() => import('@/pages/NotFound/NotFound'))

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="catalog/:slug" element={<ProductDetail />} />
        <Route path="categories" element={<Categories />} />
        <Route path="categories/:slug" element={<CategoryDetail />} />
        <Route path="gallery" element={<Gallery />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
