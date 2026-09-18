/** A label/value pair — the metadata voice used across product and category pages. */
export default function Meta({ label, value, className = '' }) {
  return (
    <div className={className}>
      <div className="type-label text-clay">{label}</div>
      <div className="mt-2 type-meta">{value}</div>
    </div>
  )
}
