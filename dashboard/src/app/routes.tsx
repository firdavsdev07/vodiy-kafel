import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { RequireRole } from '@/features/auth/RequireRole';
import { AppLayout } from './layout/AppLayout';
import { RootLayout } from './layout/RootLayout';
import { PERMISSIONS } from '@/shared/lib/permissions';
import { NAV_SECTIONS, type SectionId } from './navigation';

/**
 * Har bo'lim sahifasi alohida chunk (route-level lazy loading) — menejer
 * ochmagan bo'lim kodi yuklanmaydi.
 */
const pages: Record<SectionId, LazyExoticComponent<ComponentType>> = {
  home: lazy(() => import('@/pages/home/HomePage')),
  orders: lazy(() => import('@/pages/orders/OrdersPage')),
  supplyOrders: lazy(() => import('@/pages/supply-orders/SupplyOrdersPage')),
  customers: lazy(() => import('@/pages/customers/CustomersPage')),
  products: lazy(() => import('@/pages/products/ProductsPage')),
  factories: lazy(() => import('@/pages/factories/FactoriesPage')),
  sizes: lazy(() => import('@/pages/sizes/SizesPage')),
  gallery: lazy(() => import('@/pages/gallery/GalleryPage')),
  prices: lazy(() => import('@/pages/prices/PricesPage')),
  stock: lazy(() => import('@/pages/stock/StockPage')),
  branches: lazy(() => import('@/pages/branches/BranchesPage')),
  partners: lazy(() => import('@/pages/partners/PartnersPage')),
  staff: lazy(() => import('@/pages/staff/StaffPage')),
  delivery: lazy(() => import('@/pages/delivery/DeliveryPage')),
  settings: lazy(() => import('@/pages/settings/SettingsPage')),
};

const ProductCreatePage = lazy(() => import('@/pages/products/ProductCreatePage'));
const ProductLayout = lazy(() => import('@/pages/products/ProductLayout'));
const ProductMainTab = lazy(() => import('@/pages/products/ProductMainTab'));
const ProductMediaTab = lazy(() => import('@/pages/products/ProductMediaTab'));
const ProductSimilarTab = lazy(() => import('@/pages/products/ProductSimilarTab'));
const CustomerLayout = lazy(() => import('@/pages/customers/CustomerLayout'));
const CustomerProfileTab = lazy(() => import('@/pages/customers/CustomerProfileTab'));
const CustomerAccountTab = lazy(() => import('@/pages/customers/CustomerAccountTab'));
const CustomerPricingTab = lazy(() => import('@/pages/customers/CustomerPricingTab'));
const CustomerOrdersTab = lazy(() => import('@/pages/customers/CustomerOrdersTab'));
const NotFoundPage = lazy(() => import('@/pages/not-found/NotFoundPage'));
const LoginPage = lazy(() => import('@/pages/login/LoginPage'));

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      {
        path: 'login',
        element: (
          <Suspense fallback={null}>
            <LoginPage />
          </Suspense>
        ),
        handle: { title: 'Kirish' },
      },
      {
        element: (
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        ),
        children: [
          ...NAV_SECTIONS.map((section): RouteObject => {
            const Page = pages[section.id];
            // Roli yetmasa — 403; sahifa chunk'i ham yuklanmaydi (D-007).
            const element = (
              <RequireRole roles={section.roles}>
                <Page />
              </RequireRole>
            );
            return section.path === '/'
              ? { index: true, element, handle: { title: section.title } }
              : { path: section.path.slice(1), element, handle: { title: section.title } };
          }),
          // Mahsulot kartasi (D-012) — menyuda yo'q, ro'yxatdan kiriladi
          {
            path: 'products/new',
            element: (
              <RequireRole roles={PERMISSIONS['catalog.write']}>
                <ProductCreatePage />
              </RequireRole>
            ),
            handle: { title: 'Yangi mahsulot' },
          },
          {
            path: 'products/:id',
            element: (
              <RequireRole roles={PERMISSIONS['catalog.view']}>
                <ProductLayout />
              </RequireRole>
            ),
            handle: { title: 'Mahsulot' },
            children: [
              { index: true, element: <ProductMainTab /> },
              { path: 'media', element: <ProductMediaTab /> },
              { path: 'similar', element: <ProductSimilarTab /> },
            ],
          },
          // Mijoz kartasi (D-022)
          {
            path: 'customers/:id',
            element: (
              <RequireRole roles={PERMISSIONS['customers.manage']}>
                <CustomerLayout />
              </RequireRole>
            ),
            handle: { title: 'Optom mijoz' },
            children: [
              { index: true, element: <CustomerProfileTab /> },
              { path: 'account', element: <CustomerAccountTab /> },
              {
                path: 'pricing',
                element: (
                  <RequireRole roles={PERMISSIONS['pricingRules.manage']}>
                    <CustomerPricingTab />
                  </RequireRole>
                ),
              },
              { path: 'orders', element: <CustomerOrdersTab /> },
            ],
          },
          { path: '*', element: <NotFoundPage />, handle: { title: 'Sahifa topilmadi' } },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
