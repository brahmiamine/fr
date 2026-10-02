export function AnimatedBackground() {
  return (
    <div className="bg-decor" aria-hidden="true">
      <span className="bg-decor__blob bg-decor__blob--1" />
      <span className="bg-decor__blob bg-decor__blob--2" />
      <span className="bg-decor__blob bg-decor__blob--3" />
    </div>
  )
}

export function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 260 200"
      className="hero-illustration"
      role="img"
      aria-label="Une personne qui parle français"
    >
      <defs>
        <linearGradient id="hero-avatar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b5bd6" />
          <stop offset="1" stopColor="#ff6b9d" />
        </linearGradient>
        <linearGradient id="hero-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#5b5bd6" />
        </linearGradient>
      </defs>

      {/* sound arcs */}
      <g className="hero-wave" fill="none" stroke="url(#hero-ring)" strokeWidth="6" strokeLinecap="round">
        <path d="M96 84c14-10 14-34 0-44" />
        <path className="hero-wave--d1" d="M112 72c24-16 24-54 0-70" />
        <path className="hero-wave--d2" d="M128 60c34-24 34-72 0-96" />
      </g>

      {/* avatar */}
      <g className="hero-avatar">
        <circle cx="70" cy="100" r="46" fill="url(#hero-avatar)" />
        <circle cx="70" cy="88" r="17" fill="#ffffff" opacity="0.96" />
        <path
          d="M34 138c8-16 20-22 36-22s28 6 36 22"
          fill="#ffffff"
          opacity="0.96"
        />
      </g>

      {/* sparkles */}
      <g className="hero-spark" fill="#8b5cf6">
        <path d="M196 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" />
        <path
          className="hero-spark--d1"
          d="M216 96l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"
          fill="#ff6b9d"
        />
        <path
          className="hero-spark--d2"
          d="M44 34l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z"
          fill="#0bbf9a"
        />
      </g>

      {/* floating chips */}
      <g className="hero-chip" fontFamily="system-ui" fontSize="12" fontWeight="600">
        <rect x="168" y="150" width="86" height="26" rx="13" fill="#ffffff" opacity="0.9" />
        <text x="211" y="167" textAnchor="middle" fill="#5b5bd6">
          « Du coup… »
        </text>
        <rect
          className="hero-chip--d1"
          x="20"
          y="150"
          width="96"
          height="26"
          rx="13"
          fill="#ffffff"
          opacity="0.9"
        />
        <text className="hero-chip--d1" x="68" y="167" textAnchor="middle" fill="#ff6b9d">
          « Ça dépend… »
        </text>
      </g>
    </svg>
  )
}

const CONFETTI_COLORS = ['#5b5bd6', '#8b5cf6', '#ff6b9d', '#0bbf9a', '#ffd166']

export function Confetti({ count = 36 }: { count?: number }) {
  const pieces = Array.from({ length: count }, (_, i) => ({
    left: (i * 37) % 100,
    delay: ((i * 53) % 100) / 100,
    duration: 2.4 + ((i * 29) % 10) / 10,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    size: 6 + (i % 3) * 3,
    rotate: (i * 71) % 360,
    round: i % 3 === 0,
  }))

  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map((piece, i) => (
        <span
          key={i}
          className={`confetti__piece ${piece.round ? 'confetti__piece--round' : ''}`}
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size * (piece.round ? 1 : 0.6),
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}
