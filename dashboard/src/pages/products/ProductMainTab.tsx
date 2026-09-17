import { useCan } from '@/features/auth/hooks';
import { ProductForm } from '@/features/products/ProductForm';
import { useProductOutlet } from '@/features/products/use-product-outlet';

/** "Asosiy" tab (D-012). */
export default function ProductMainTab() {
  const product = useProductOutlet();
  const canWrite = useCan('catalog.write');
  return <ProductForm product={product} readOnly={!canWrite} />;
}
