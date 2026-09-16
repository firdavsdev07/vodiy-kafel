import { ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { ProductForm } from '@/features/products/ProductForm';

/** Yangi mahsulot (D-012). Saqlangach kartaga o'tadi — media va narx u yerdan. */
export default function ProductCreatePage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <Link to="/products" className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={15} aria-hidden />
        Mahsulotlar
      </Link>
      <div className="rounded-lg border border-line bg-surface p-6">
        <ProductForm onCreated={(product) => navigate(`/products/${product.id}`, { replace: true })} />
      </div>
    </div>
  );
}
