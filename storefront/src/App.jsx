import { Route, Routes } from 'react-router-dom'

import Layout from '@/components/Layout/Layout'
import About from '@/pages/About/About'
import Catalog from '@/pages/Catalog/Catalog'
import Categories from '@/pages/Categories/Categories'
import CategoryDetail from '@/pages/CategoryDetail/CategoryDetail'
import Contact from '@/pages/Contact/Contact'
import Home from '@/pages/Home/Home'
import NotFound from '@/pages/NotFound/NotFound'
import ProductDetail from '@/pages/ProductDetail/ProductDetail'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="catalog" element={<Catalog />} />
        <Route path="catalog/:slug" element={<ProductDetail />} />
        <Route path="categories" element={<Categories />} />
        <Route path="categories/:slug" element={<CategoryDetail />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
