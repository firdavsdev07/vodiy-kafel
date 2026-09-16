import { Construction } from 'lucide-react';

/** Hali qurilmagan bo'lim — skelet bosqichi (D-003). Har task o'z sahifasi bilan almashtiradi. */
export function PagePlaceholder({ task }: { task: string }) {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-surface p-8 text-center">
      <Construction size={20} className="text-muted" aria-hidden />
      <p className="font-medium">Bo‘lim tayyorlanmoqda</p>
      <p className="text-sm text-muted">Task: {task}</p>
    </div>
  );
}
