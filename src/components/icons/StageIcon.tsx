import type { StageKind } from '../../features/training/types'

const PATHS: Record<StageKind, JSX.Element> = {
  chunks: (
    <>
      <path d="M4 5h16v11H8l-4 4V5z" />
      <path d="M9 9h6M9 12h4" />
    </>
  ),
  fluency: (
    <>
      <circle cx="12" cy="13" r="7" />
      <path d="M12 10v3l2 1.5M10 2h4" />
    </>
  ),
  questions: (
    <>
      <path d="M9.5 8.5a3.5 3.5 0 1 1 4.2 4.3c-1 .7-1.7 1.6-1.7 2.7" />
      <circle cx="12" cy="17" r="0.9" />
    </>
  ),
  gaps: (
    <>
      <circle cx="8" cy="14" r="4" />
      <path d="M11.2 11.2L19 3.4M16.4 6l2.6 2.6M13.8 8.6l2.6 2.6" />
    </>
  ),
  feedback: (
    <path d="M12 3l2.7 5.5 6 .9-4.35 4.2 1.03 6L12 16.9 6.62 19.6l1.03-6L3.3 9.4l6-.9z" />
  ),
}

export function StageIcon({ stage, size = 20 }: { stage: StageKind; size?: number }) {
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
      {PATHS[stage]}
    </svg>
  )
}
