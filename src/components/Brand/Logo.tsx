export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 52 52"
      role="img"
      aria-label="Parle+"
      className="logo-mark"
    >
      <defs>
        <linearGradient id="parle-plus-logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b5bd6" />
          <stop offset="0.55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ff6b9d" />
        </linearGradient>
        <linearGradient id="parle-plus-badge-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ff6b9d" />
        </linearGradient>
      </defs>

      <path
        d="M7 7h30a8 8 0 0 1 8 8v21a8 8 0 0 1-8 8H17L7 49l2.8-7.4A8 8 0 0 1 3 34V15a8 8 0 0 1 4-8Z"
        fill="url(#parle-plus-logo-grad)"
      />

      <g fill="#ffffff">
        <rect className="logo-bar" x="12" y="20" width="5" height="14" rx="2.5" />
        <rect
          className="logo-bar logo-bar--d1"
          x="21"
          y="15"
          width="5"
          height="24"
          rx="2.5"
        />
        <rect
          className="logo-bar logo-bar--d2"
          x="30"
          y="18"
          width="5"
          height="18"
          rx="2.5"
        />
      </g>

      <circle cx="41" cy="11" r="9" fill="#ffffff" />
      <circle cx="41" cy="11" r="7" fill="url(#parle-plus-badge-grad)" />
      <path
        d="M41 7.5v7M37.5 11h7"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
      />
    </svg>
  )
}
