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
 * ustun; uning `srcSet` i — backend variantlari (T-014, `variantSrcSet`).
 *
 * Variant topilmasa (eski rasm, serverda `pnpm images:variants` hali
 * ishlatilmagan) — bir marta asl `src` ga qaytadi: `srcset` tufayli rasm
 * butunlay yo'qolib qolmasin.
 */
export default function SmartImage({
  id,
  src,
  srcSet,
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
  // Variantlari yiqilgan manba. ALOHIDA saqlanadi: `loaded` asl rasm
  // yuklangach `ready` ga o'tadi — belgi o'sha yerda tursa, `srcset`
  // qaytib kelib yana yiqilar va cheksiz so'rov sikli bo'lardi.
  const [variantsFailed, setVariantsFailed] = useState(null)
  // Manba almashganda holat nolga qaytsin — aks holda yangi rasm
  // oldingisining "ready" bayrog'i bilan darhol ko'rinib qolardi.
  const key = src || id
  // Manba UMUMAN yo'q (backend `primaryImageUrl: null` berdi) — `img()`
  // ning mahalliy zaxirasiga tushib ketmaslik kerak: u namuna
  // katalogining rasmi, mahsulotning rasmi emas (ASSETS.md).
  const status = !key ? 'error' : loaded?.key === key ? loaded.status : 'loading'
  const useVariants = Boolean(src && srcSet) && variantsFailed !== key

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
          srcSet={src ? (useVariants ? srcSet : undefined) : imgSrcSet(id)}
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
          onError={() =>
            useVariants ? setVariantsFailed(key) : setLoaded({ key, status: 'error' })
          }
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
