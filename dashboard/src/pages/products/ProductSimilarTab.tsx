import { useCan } from '@/features/auth/hooks';
import { SimilarEditor } from '@/features/products/SimilarEditor';
import { useSimilarProducts } from '@/features/products/similar-api';
import { useProductOutlet } from '@/features/products/use-product-outlet';
import { ErrorState, PageLoading } from '@/shared/ui';

/** "O'xshash" tab (D-014). */
export default function ProductSimilarTab() {
  const product = useProductOutlet();
  const canWrite = useCan('catalog.write');
  const similar = useSimilarProducts(product.id);

  if (similar.isPending) return <PageLoading />;
  if (similar.error) {
    return <ErrorState error={similar.error} onRetry={() => void similar.refetch()} retrying={similar.isFetching} compact />;
  }
  return <SimilarEditor productId={product.id} saved={similar.data} canWrite={canWrite} />;
}
