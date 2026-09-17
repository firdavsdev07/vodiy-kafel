import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { RequireCustomer } from '@/features/auth/RequireCustomer';
import { RequireRole } from '@/features/auth/RequireRole';
import RouteErrorPage from '@/pages/error/RouteErrorPage';
// Kichik va xato sahifasi ham ishlatadi — alohida chunk shart emas
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { AuthShell } from '@/pages/login/AuthShell';
import { AppLayout } from './layout/AppLayout';
import { CabinetLayout } from './layout/CabinetLayout';
import { RootLayout } from './layout/RootLayout';
import { PERMISSIONS, rolesForAny } from '@/shared/lib/permissions';
import { useCan } from '@/features/auth/hooks';
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
const SupplyOrderDetailPage = lazy(() => import('@/pages/supply-orders/SupplyOrderDetailPage'));
const BranchSupplyOrderDetailPage = lazy(() => import('@/pages/supply-orders/BranchSupplyOrderDetailPage'));
const SupplyOrderCreatePage = lazy(() => import('@/pages/supply-orders/SupplyOrderCreatePage'));
const OrderCreatePage = lazy(() => import('@/pages/orders/OrderCreatePage'));
const OrderDetailPage = lazy(() => import('@/pages/orders/OrderDetailPage'));
const LoginPage = lazy(() => import('@/pages/login/LoginPage'));
// ── Optom mijoz kabineti (EPIC 10) ──
const CustomerLoginPage = lazy(() => import('@/pages/login/CustomerLoginPage'));
const CustomerPasswordPage = lazy(() => import('@/pages/login/CustomerPasswordPage'));
const CabinetCatalogPage = lazy(() => import('@/pages/kabinet/CatalogPage'));
const CabinetProductPage = lazy(() => import('@/pages/kabinet/ProductPage'));
const CabinetCartPage = lazy(() => import('@/pages/kabinet/CartPage'));
const CabinetOrdersPage = lazy(() => import('@/pages/kabinet/OrdersPage'));
const CabinetOrderDetailPage = lazy(() => import('@/pages/kabinet/OrderDetailPage'));
const CabinetAccountPage = lazy(() => import('@/pages/kabinet/AccountPage'));
const CabinetNotificationsPage = lazy(() => import('@/pages/kabinet/NotificationsPage'));
const CabinetContractsPage = lazy(() => import('@/pages/kabinet/ContractsPage'));

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    // Oxirgi to'siq: layout'ning o'zi yiqilsa ham oq ekran bo'lmaydi (D-042)
    errorElement: <RouteErrorPage />,
    children: [
      {
        path: 'login',
        element: (
          <Suspense fallback={null}>
            <AuthShell>
              <LoginPage />
            </AuthShell>
          </Suspense>
        ),
        handle: { title: 'Kirish' },
      },
      {
        // ⚠ `/kabinet` ostida, lekin `RequireCustomer` DAN TASHQARIDA —
        //   aks holda kirish sahifasining o'zi kirishni talab qilardi.
        path: 'kabinet/kirish',
        element: (
          <Suspense fallback={null}>
            <AuthShell>
              <CustomerLoginPage />
            </AuthShell>
          </Suspense>
        ),
        handle: { title: 'Optom kabinet — kirish' },
      },
      {
        // ⚠ `RequireCustomer` DAN TASHQARIDA emas, lekin kabinet ichida ham
        //   emas: mijoz `mustChangePassword` holatida faqat SHU sahifada
        //   tura oladi, qolgan hamma joyda backend 403 beradi (D-050).
        path: 'kabinet/parol',
        element: (
          <Suspense fallback={null}>
            <AuthShell>
              <CustomerPasswordPage />
            </AuthShell>
          </Suspense>
        ),
        handle: { title: 'Yangi parol' },
      },
      {
        // Kabinet daraxti (D-051) — xodim marshrutlaridan BUTUNLAY alohida:
        // boshqa layout, boshqa menyu, boshqa qo'riqchi.
        path: 'kabinet',
        element: (
          <RequireCustomer>
            <CabinetLayout />
          </RequireCustomer>
        ),
        handle: { title: 'Kabinet' },
        children: [
          { index: true, element: <CabinetCatalogPage />, handle: { title: 'Katalog' } },
          {
            path: 'mahsulot/:slug',
            element: <CabinetProductPage />,
            handle: { title: 'Mahsulot' },
          },
          { path: 'savat', element: <CabinetCartPage />, handle: { title: 'Savat' } },
          {
            path: 'buyurtmalar',
            element: <CabinetOrdersPage />,
            handle: { title: 'Buyurtmalarim' },
          },
          {
            path: 'buyurtmalar/:id',
            element: <CabinetOrderDetailPage />,
            handle: { title: 'Buyurtma' },
          },
          { path: 'hisob', element: <CabinetAccountPage />, handle: { title: 'Hisobim' } },
          {
            path: 'bildirishnomalar',
            element: <CabinetNotificationsPage />,
            handle: { title: 'Bildirishnomalar' },
          },
          {
            path: 'shartnomalar',
            element: <CabinetContractsPage />,
            handle: { title: 'Shartnomalar' },
          },
          { path: '*', element: <NotFoundPage />, handle: { title: 'Sahifa topilmadi' } },
        ].map(withErrorElement),
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
          // Qo'lda buyurtma — telefon / Telegram (D-028)
          {
            path: 'orders/new',
            element: (
              <RequireRole roles={PERMISSIONS['orders.manage']}>
                <OrderCreatePage />
              </RequireRole>
            ),
            handle: { title: 'Yangi buyurtma' },
          },
          // Buyurtma kartasi (D-025) — ro'yxatdan va mijoz kartasidan kiriladi
          {
            path: 'orders/:id',
            element: (
              <RequireRole roles={PERMISSIONS['orders.manage']}>
                <OrderDetailPage />
              </RequireRole>
            ),
            handle: { title: 'Buyurtma' },
          },
          // Ta'minot buyurtmasi: markaz — karta + holat (D-031); do'kon filiali —
          // yangi buyurtma va o'z buyurtmasi kartasi (D-032). Rollar kesishmaydi.
          {
            path: 'supply-orders/new',
            element: (
              <RequireRole roles={PERMISSIONS['supplyOrders.create']}>
                <SupplyOrderCreatePage />
              </RequireRole>
            ),
            handle: { title: 'Markazdan buyurtma' },
          },
          {
            path: 'supply-orders/:id',
            element: (
              <RequireRole roles={rolesForAny('supplyOrders.review', 'supplyOrders.create')}>
                <SupplyOrderDetailRoute />
              </RequireRole>
            ),
            handle: { title: 'Ta’minot buyurtmasi' },
          },
          { path: '*', element: <NotFoundPage />, handle: { title: 'Sahifa topilmadi' } },
          // Sahifa yiqilsa — xato shu sahifa o'rnida, yon menyu va yuqori panel saqlanadi (D-042)
        ].map(withErrorElement),
      },
    ],
  },
];

function withErrorElement(route: RouteObject): RouteObject {
  return { ...route, errorElement: <RouteErrorPage /> } as RouteObject;
}

/** Bir URL, ikki tomon: markaz xodimi — boshqaruv kartasi, do'kon filiali — o'qish kartasi. */
function SupplyOrderDetailRoute() {
  return useCan('supplyOrders.review') ? <SupplyOrderDetailPage /> : <BranchSupplyOrderDetailPage />;
}

export const router = createBrowserRouter(routes);
