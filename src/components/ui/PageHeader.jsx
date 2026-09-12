import { useReveal } from '@/hooks/useReveal'

/** The opening of every inner page: index label, display title, lede. */
export default function PageHeader({ index, eyebrow, title, lede, meta, children }) {
  const ref = useReveal({ start: 'top 92%', stagger: 0.08 })

  return (
    <header
      ref={ref}
      data-reveal=""
      className="relative z-10 edge pb-[clamp(3rem,7vw,6rem)] pt-[clamp(7rem,16vw,13rem)]"
    >
      <div className="flex items-baseline justify-between">
        <span className="type-label text-clay">
          {index ? `${index} — ` : ''}
          {eyebrow}
        </span>
        {meta && <span className="type-label text-right text-clay">{meta}</span>}
      </div>

      <h1 className="mt-[clamp(2rem,6vw,4.5rem)] type-display">
        {(Array.isArray(title) ? title : [title]).map((line, i) => (
          <span key={i} className="line-mask">
            <span className="r-line">{line}</span>
          </span>
        ))}
      </h1>

      {lede && (
        <p className="r-fade mt-[clamp(2rem,5vw,4rem)] max-w-[46ch] text-clay md:ml-auto md:mr-0">
          {lede}
        </p>
      )}

      {children}
    </header>
  )
}
