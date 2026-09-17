import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link, Outlet, useParams } from 'react-router';
import { useCan } from '@/features/auth/hooks';
import { useDeleteProduct, useProduct, useUpdateProduct } from '@/features/products/api';
import type { Product } from '@/features/products/product-form';
import { errorMessage } from '@/shared/lib/error-message';
import { surfaceLabel } from '@/shared/lib/labels';
import {
  Badge,
  Button,
  ConfirmDialog,
  ErrorState,
  PageLoading,
  StatusBadge,
  Tabs,
  toast,
  type TabItem,
} from '@/shared/ui';

/**
 * Mahsulot kartasi (D-012): sarlavha, holat, tab'lar. Tab'lar — ichki
 * marshrutlar; Narxlar va Zaxira boshqa bo'limga olib chiqadi (D-016, D-018).
 */
export default function ProductLayout() {
  const { id = '' } = useParams();
  const product = useProduct(id);
  const canWrite = useCan('catalog.write');
  const canSeePrices = useCan('prices.view');
  const remove = useDeleteProduct();
  const restore = useUpdateProduct();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (product.isPending) return <PageLoading />;
  if (product.error || !product.data) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <ErrorState error={product.error} onRetry={() => void product.refetch()} retrying={product.isFetching} />
      </div>
    );
  }

  const p = product.data;
  const tabs: TabItem[] = [
    { to: `/products/${p.id}`, label: 'Asosiy', end: true },
    { to: `/products/${p.id}/media`, label: 'Media' },
    { to: `/products/${p.id}/similar`, label: 'O‘xshash' },
    ...(canSeePrices ? [{ to: `/prices?productId=${p.id}`, label: 'Narxlar', external: true }] : []),
    { to: `/stock?productId=${p.id}`, label: 'Zaxira', external: true },
  ];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <BackLink />
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className={`truncate text-lg font-semibold ${p.isActive ? '' : 'text-muted'}`}>{p.name}</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            {p.factory.name} · <span className="tabular-nums">{p.size.label}</span> · {surfaceLabel[p.surface]}
            {p.isActive ? <Badge tone="success">Faol</Badge> : <Badge tone="neutral">O‘chirilgan</Badge>}
            <StatusBadge kind="stock" value={p.stock.stockStatus} />
          </p>
        </div>
        {canWrite &&
          (p.isActive ? (
            <Button variant="danger" onClick={() => setConfirmDelete(true)}>
              <Trash2 size={15} aria-hidden />
              O‘chirish
            </Button>
          ) : (
            <Button
              pending={restore.isPending}
              onClick={() =>
                restore.mutate(
                  { id: p.id, body: { isActive: true } },
                  { onSuccess: () => toast.success('Mahsulot qayta faollashtirildi'), onError: toast.error },
                )
              }
            >
              <RotateCcw size={15} aria-hidden />
              Qayta faollashtirish
            </Button>
          ))}
      </header>

      <Tabs label="Mahsulot bo‘limlari" items={tabs} />

      <div className="rounded-lg border border-line bg-surface p-6">
        {/* key: boshqa mahsulotga o'tilsa forma eski qiymatlarni saqlab qolmasin */}
        <Outlet key={p.id} context={p satisfies Product} />
      </div>

      {canWrite && (
        <ConfirmDialog
          open={confirmDelete}
          onClose={() => {
            setConfirmDelete(false);
            remove.reset();
          }}
          danger
          title={`“${p.name}” mahsulotini o‘chirish?`}
          description="Mahsulot ochiq katalogdan yashiriladi. Buyurtmalar tarixi saqlanadi, keyin qayta faollashtirish mumkin."
          confirmText="O‘chirish"
          pending={remove.isPending}
          error={remove.error ? errorMessage(remove.error) : undefined}
          onConfirm={() =>
            remove.mutate(p.id, {
              onSuccess: () => {
                toast.success('Mahsulot o‘chirildi');
                setConfirmDelete(false);
              },
            })
          }
        />
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/products" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
      <ArrowLeft size={15} aria-hidden />
      Mahsulotlar
    </Link>
  );
}
