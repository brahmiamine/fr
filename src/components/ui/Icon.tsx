const PATHS = {
  chunks: 'M4 5h16v11H8l-4 4V5zM9 9h6M9 12h4',
  fluency: 'M5 13a7 7 0 1 0 14 0a7 7 0 1 0-14 0M12 10v3l2 1.5M10 2h4',
  reprise: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6M12 8v4l2.5 1.5',
  questions: 'M9.5 8.5a3.5 3.5 0 1 1 4.2 4.3c-1 .7-1.7 1.6-1.7 2.7M12 17h.01',
  gaps: 'M4 14a4 4 0 1 0 8 0a4 4 0 1 0-8 0M11.2 11.2L19 3.4M16.4 6l2.6 2.6M13.8 8.6l2.6 2.6',
  feedback: 'M12 3l2.7 5.5 6 .9-4.35 4.2 1.03 6L12 16.9 6.62 19.6l1.03-6L3.3 9.4l6-.9z',
  streak:
    'M12 3c1 3-2 4.5-2 7a2 2 0 0 0 4 0c0-1-.5-1.7-1-2.4.8 2.2-.2 4.4-2.2 5.4A5.5 5.5 0 0 1 12 21a6 6 0 0 1-6-6c0-4 3.5-6.5 6-12z',
  week: 'M6.5 5h11a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-11a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3zM3.5 10h17M8 3v4M16 3v4M8 14h3M8 17h6',
  time: 'M3.5 12a8.5 8.5 0 1 0 17 0a8.5 8.5 0 1 0-17 0M12 7.5V12l3 2',
  words: 'M12 3l2.2 4.4L19 8.2l-3.5 3.4.8 4.9L12 14.2 7.7 16.5l.8-4.9L5 8.2l4.8-.8z',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9zM12 12l8-4.5M12 12v9M12 12L4 7.5',
  home: 'M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  music: 'M4 10v4M8 6v12M12 3v18M16 7v10M20 10v4',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  play: 'M7 4.5v15l13-7.5z',
  upload: 'M12 16V4M7 9l5-5 5 5M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3',
  file: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 15l2 2 4-4',
  settings:
    'M4 7h9M17 7h3M4 17h3M11 17h9M15 4v6M9 14v6',
  mic: 'M9 5a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0zM5 11a7 7 0 0 0 14 0M12 18v3M9 21h6',
  stop: 'M7 7h10v10H7z',
  send: 'M21 3L10 14M21 3l-7 18-4-7-7-4z',
  redo: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  sparkle:
    'M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9zM19 15l.9 2.1 2.1.9-2.1.9L19 21l-.9-2.1-2.1-.9 2.1-.9z',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  volume: 'M4 9v6h4l5 4V5L8 9zM16.5 8.5a5 5 0 0 1 0 7',
  chat: 'M4 5h16v11H8l-4 4V5zM9 9h6M9 12h4',
} as const

export type IconName = keyof typeof PATHS

/** Icons drawn as filled shapes rather than strokes. */
const FILLED: ReadonlySet<IconName> = new Set<IconName>(['play', 'stop', 'sparkle'])

export interface IconProps {
  name: IconName
  size?: number
  strokeWidth?: number
  filled?: boolean
  className?: string
}

export function Icon({
  name,
  size = 20,
  strokeWidth = 1.9,
  filled = FILLED.has(name),
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  )
}
