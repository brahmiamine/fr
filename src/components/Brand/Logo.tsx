export function Logo({ size = 34 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Fluidité"
      className="logo-mark"
    >
      <defs>
        <linearGradient id="logo-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5b5bd6" />
          <stop offset="0.55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#ff6b9d" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="46" height="46" rx="14" fill="url(#logo-grad)" />
      <g fill="#ffffff">
        <rect className="logo-bar" x="11" y="17" width="5" height="14" rx="2.5" />
        <rect
          className="logo-bar logo-bar--d1"
          x="19.5"
          y="12"
          width="5"
          height="24"
          rx="2.5"
        />
        <rect
          className="logo-bar logo-bar--d2"
          x="28"
          y="15"
          width="5"
          height="18"
          rx="2.5"
        />
      </g>
    </svg>
  )
}
