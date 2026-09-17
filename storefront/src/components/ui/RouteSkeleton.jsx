/**
 * Lazy sahifa yuklanayotgandagi oraliq holat (S-002).
 *
 * Bo'sh ekran emas: har sahifa bir xil boshlanadi — kichik bo'lim yorlig'i,
 * katta sarlavha, ikki qator matn. Shu skelet aynan o'sha tartibni saytning
 * o'z ohangida (qog'oz foni, `stone` ranglari) takrorlaydi, shuning uchun
 * haqiqiy kontent kelganda sakrash sezilmaydi.
 *
 * `aria-hidden` emas: o'quvchi ekran "Yuklanmoqda" degan xabarni eshitsin.
 */
export default function RouteSkeleton() {
  return (
    <div className="route-skeleton" role="status" aria-live="polite">
      <span className="sr-only">Sahifa yuklanmoqda</span>
      <span className="route-skeleton-bar" style={{ width: '9rem', height: '0.8125rem' }} aria-hidden />
      <span className="route-skeleton-bar" style={{ width: 'min(60%, 30rem)', height: 'clamp(3rem, 6vw, 5.5rem)' }} aria-hidden />
      <span className="route-skeleton-bar" style={{ width: 'min(80%, 42rem)', height: '1.1rem' }} aria-hidden />
      <span className="route-skeleton-bar" style={{ width: 'min(65%, 34rem)', height: '1.1rem' }} aria-hidden />
    </div>
  )
}
