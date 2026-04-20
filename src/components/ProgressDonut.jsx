export default function ProgressDonut({ mastered, shaky, due, upcoming }) {
  const total = mastered + shaky + due + upcoming
  if (total === 0) return null

  // Donut segments via SVG stroke-dasharray trick
  const r  = 60
  const cx = 80
  const cy = 80
  const circumference = 2 * Math.PI * r

  const segments = [
    { value: mastered, color: '#ff85ad', label: 'Mastered' },
    { value: due,      color: '#facc15', label: 'Due today' },
    { value: shaky,    color: '#f87171', label: 'Shaky' },
    { value: upcoming, color: '#3a3a3a', label: 'Upcoming' },
  ]

  let offset = 0
  const paths = segments.map((seg) => {
    const pct  = seg.value / total
    const dash = pct * circumference
    const path = (
      <circle
        key={seg.label}
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={seg.color}
        strokeWidth="18"
        strokeDasharray={`${dash} ${circumference - dash}`}
        strokeDashoffset={-offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    )
    offset += dash
    return path
  })

  return (
    <div className="flex items-center gap-8">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1a1a1a" strokeWidth="18"/>
        {paths}
        <text x={cx} y={cy - 8}  textAnchor="middle" fill="#f5f5f5" fontSize="22" fontFamily="DM Serif Display">{total}</text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#666"    fontSize="11" fontFamily="DM Sans">cards</text>
      </svg>
      <div className="space-y-2">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ background: s.color }} />
            <span className="text-sm font-body text-dark-400">{s.label}</span>
            <span className="text-sm font-body text-white ml-auto">{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}