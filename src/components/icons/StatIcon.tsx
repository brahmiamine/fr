export type StatIconName = 'streak' | 'week' | 'time' | 'words' | 'chunks'

const PATHS: Record<StatIconName, JSX.Element> = {
  streak: (
    <path d="M12 3c1 3-2 4.5-2 7a2 2 0 0 0 4 0c0-1-.5-1.7-1-2.4.8 2.2-.2 4.4-2.2 5.4A5.5 5.5 0 0 1 12 21a6 6 0 0 1-6-6c0-4 3.5-6.5 6-12z" />
  ),
  week: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
      <path d="M8 14h3M8 17h6" />
    </>
  ),
  time: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  words: (
    <>
      <path d="M12 3l2.2 4.4L19 8.2l-3.5 3.4.8 4.9L12 14.2 7.7 16.5l.8-4.9L5 8.2l4.8-.8z" />
    </>
  ),
  chunks: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="M12 12l8-4.5M12 12v9M12 12L4 7.5" />
    </>
  ),
}

export function StatIcon({ name, size = 18 }: { name: StatIconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name]}
    </svg>
  )
}
