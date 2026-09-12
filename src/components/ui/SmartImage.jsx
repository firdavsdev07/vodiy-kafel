import { useState } from 'react'

import { img, imgSrcSet } from '@/data/images'

/**
 * Local optimized material image with a stone loading/error fallback.
 *
 * Inside a `useReveal` section it participates in the clip-wipe reveal:
 * the frame opens (.r-clip) while the picture settles (.r-zoom).
 */
export default function SmartImage({
  id,
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
  const status = loaded?.id === id ? loaded.status : 'loading'

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
          src={img(id, width)}
          srcSet={imgSrcSet(id)}
          sizes={sizes}
          alt={alt}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding="async"
          onLoad={() => setLoaded({ id, status: 'ready' })}
          onError={() => setLoaded({ id, status: 'error' })}
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
