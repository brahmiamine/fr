import './decor.css'

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
      <g className="hero-chip" fontFamily="Plus Jakarta Sans, system-ui" fontSize="12" fontWeight="700">
        <rect x="164" y="150" width="90" height="26" rx="13" fill="#ffffff" />
        <text x="209" y="167" textAnchor="middle" fill="#5b5bd6">
          « Du coup… »
        </text>
        <rect
          className="hero-chip--d1"
          x="16"
          y="150"
          width="100"
          height="26"
          rx="13"
          fill="#ffffff"
        />
        <text className="hero-chip--d1" x="66" y="167" textAnchor="middle" fill="#ff6b9d">
          « Ça dépend… »
        </text>
      </g>
    </svg>
  )
}
