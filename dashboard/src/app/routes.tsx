import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppLayout } from './layout/AppLayout';
import { RootLayout } from './layout/RootLayout';
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
  prices: lazy(() => import('@/pages/prices/PricesPage')),
  stock: lazy(() => import('@/pages/stock/StockPage')),
  branches: lazy(() => import('@/pages/branches/BranchesPage')),
  partners: lazy(() => import('@/pages/partners/PartnersPage')),
  staff: lazy(() => import('@/pages/staff/StaffPage')),
  delivery: lazy(() => import('@/pages/delivery/DeliveryPage')),
  settings: lazy(() => import('@/pages/settings/SettingsPage')),
};

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
        element: <AppLayout />,
        children: [
          ...NAV_SECTIONS.map((section): RouteObject => {
            const Page = pages[section.id];
            return section.path === '/'
              ? { index: true, element: <Page />, handle: { title: section.title } }
              : {
                  path: section.path.slice(1),
                  element: <Page />,
                  handle: { title: section.title },
                };
          }),
          { path: '*', element: <NotFoundPage />, handle: { title: 'Sahifa topilmadi' } },
        ],
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
