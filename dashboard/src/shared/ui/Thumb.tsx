import { useState } from 'react';
import { resolveAssetUrl } from '@/shared/lib/asset-url';

/**
 * Kichik rasm (logo, mahsulot) — backend fayl yo'li `resolveAssetUrl` orqali.
 * Rasm yo'q yoki yuklanmadi (404, o'chirilgan fayl) → buzilgan rasm belgisi
 * emas, nomning bosh harflari.
 */
export function Thumb({
  src,
  name,
  size = 'md',
  alt = '',
}: {
  src: string | null | undefined;
  name: string;
  size?: 'md' | 'lg';
  alt?: string;
}) {
  const url = resolveAssetUrl(src);
  const [failed, setFailed] = useState<string | null>(null);
  const box = size === 'lg' ? 'size-20' : 'size-9';

  return (
    <div
      className={`flex ${box} shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-surface-muted`}
    >
      {url && failed !== url ? (
        <img src={url} alt={alt} loading="lazy" onError={() => setFailed(url)} className="size-full object-contain" />
      ) : (
        <span aria-hidden className="text-xs font-semibold text-muted">
          {initials(name)}
        </span>
      )}
    </div>
  );
}

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const text = words.length > 1 ? `${words[0]?.[0] ?? ''}${words[1]?.[0] ?? ''}` : name.trim().slice(0, 2);
  return text.toUpperCase() || '—';
}
