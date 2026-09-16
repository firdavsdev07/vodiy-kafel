/** Sahifa yuklanish skeleti — lazy chunk va profil kutilayotganda. */
export function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Yuklanmoqda…</span>
      <div className="h-8 w-56 animate-pulse rounded-md bg-surface-muted" />
      <div className="h-64 animate-pulse rounded-lg bg-surface-muted" />
    </div>
  );
}
