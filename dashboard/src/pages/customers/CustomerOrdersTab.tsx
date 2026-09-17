import { Link } from 'react-router';
import { useCustomerOutlet } from '@/features/customers/use-customer-outlet';
import { DateText, MoneyText, StatusBadge } from '@/shared/ui';

/**
 * "Buyurtmalar" tab (D-022): oxirgi 10 ta (kartadan). ⚠ `GET /admin/orders`
 * da `customerId` filtri yo'q — to'liq ro'yxatga login bo'yicha qidiruv
 * bilan o'tiladi.
 */
export default function CustomerOrdersTab() {
  const c = useCustomerOutlet();
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Oxirgi buyurtmalar</h3>
        <Link to={`/orders?search=${encodeURIComponent(c.login)}`} className="text-sm text-muted hover:text-fg hover:underline">
          Barcha buyurtmalar →
        </Link>
      </div>
      {c.recentOrders.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">Hozircha buyurtma yo‘q</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-xs text-muted">
            <tr className="border-b border-line">
              <th scope="col" className="py-2 text-left font-medium">Raqam</th>
              <th scope="col" className="py-2 text-left font-medium">Sana</th>
              <th scope="col" className="py-2 text-left font-medium">Holat</th>
              <th scope="col" className="py-2 text-left font-medium">To‘lov</th>
              <th scope="col" className="py-2 text-right font-medium">Summa</th>
            </tr>
          </thead>
          <tbody>
            {c.recentOrders.map((o) => (
              <tr key={o.id} className="border-b border-line last:border-0">
                <td className="py-2">
                  <Link to={`/orders/${o.id}`} className="font-mono hover:underline">{o.orderNumber}</Link>
                </td>
                <td className="py-2"><DateText value={o.createdAt} /></td>
                <td className="py-2"><StatusBadge kind="order" value={o.status} /></td>
                <td className="py-2">{o.paymentStatus ? <StatusBadge kind="payment" value={o.paymentStatus} /> : <span className="text-muted">—</span>}</td>
                <td className="py-2 text-right"><MoneyText value={o.grandTotal} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
