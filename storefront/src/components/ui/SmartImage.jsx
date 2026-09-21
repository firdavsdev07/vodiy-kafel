import { useState } from 'react'

import { refreshScrollTriggers } from '@/animations/gsap'
import { img, imgSrcSet } from '@/data/images'

/**
 * Local optimized material image with a stone loading/error fallback.
 *
 * Inside a `useReveal` section it participates in the clip-wipe reveal:
 * the frame opens (.r-clip) while the picture settles (.r-zoom).
 *
 * Ikki manba (S-023): `id` — mahalliy namuna rasmi (`src/data/images.js`),
 * `src` — backend bergan tayyor manzil (`assetUrl`). `src` berilsa u
 * ustun: `srcSet` yo'q, chunki backend hozircha bitta o'lchamni beradi
 * (turli o'lchamlar — S-032).
 */
export default function SmartImage({
  id,
  src,
  alt = '',
  className = '',
  imgClassName = '',
  sizes = '100vw',
  ratio,
  priority = false,
  reveal = true,
  width = 1600,
}) {
  const [loaded, setLoaded] = useState(null)
  // Manba almashganda holat nolga qaytsin — aks holda yangi rasm
  // oldingisining "ready" bayrog'i bilan darhol ko'rinib qolardi.
  const key = src || id
  // Manba UMUMAN yo'q (backend `primaryImageUrl: null` berdi) — `img()`
  // ning mahalliy zaxirasiga tushib ketmaslik kerak: u namuna
  // katalogining rasmi, mahsulotning rasmi emas (ASSETS.md).
  const status = !key ? 'error' : loaded?.key === key ? loaded.status : 'loading'

  const frame = [
    'relative overflow-hidden bg-stone',
    reveal ? 'r-clip' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={frame} style={ratio ? { aspectRatio: ratio } : undefined}>
      {status !== 'ready' && (
        <div
          aria-hidden="true"
          className="absolute inset-0 scale-110 bg-stone bg-cover bg-center"
        />
      )}

      {status === 'error' ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-stone"
          style={{
            backgroundImage:
              'repeating-linear-gradient(115deg, rgba(11,11,10,.05) 0 1px, transparent 1px 14px)',
          }}
        />
      ) : (
        <img
          src={src || img(id, width)}
          srcSet={src ? undefined : imgSrcSet(id)}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => {
            setLoaded({ key, status: 'ready' })
            /* `ratio` berilgan bo'lsa quti balandligi oldindan band
               qilingan — rasm kelishi hech narsani surmaydi. Aks holda
               sahifa balandligi o'zgaradi va ScrollTrigger nuqtalari
               noto'g'ri joyda qoladi, shuning uchun qayta o'lchanadi
               (S-018). Chaqiruvlar bitta kadrga yig'iladi. */
            if (!ratio) refreshScrollTriggers()
          }}
          onError={() => setLoaded({ key, status: 'error' })}
          className={[
            'absolute inset-0 h-full w-full object-cover',
            reveal ? 'r-zoom' : '',
            'transition-opacity duration-700',
            status === 'ready' ? 'opacity-100' : 'opacity-0',
            imgClassName,
          ]
            .filter(Boolean)
            .join(' ')}
        />
      )}
    </div>
  )
}
