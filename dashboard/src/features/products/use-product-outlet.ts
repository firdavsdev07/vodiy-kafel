import { useOutletContext } from 'react-router';
import type { Product } from './product-form';

/** Mahsulot kartasining ichki tab'lari uchun — joriy mahsulot (ProductLayout beradi). */
export function useProductOutlet(): Product {
  return useOutletContext<Product>();
}
