import { Link } from 'react-router-dom'
import type { ExerciseKind } from '../types'
import { EXERCISE_META, EXERCISE_ORDER } from '../types'

export interface SessionHeaderProps {
  exercise: ExerciseKind | null
  phase: 'exercise' | 'review' | 'complete'
  stepLabel?: string
}

function progressLabel(
  exercise: ExerciseKind | null,
  phase: SessionHeaderProps['phase'],
): string {
  if (phase === 'review') return `${EXERCISE_ORDER.length}/${EXERCISE_ORDER.length} · Bilan`
  if (phase === 'complete') return 'Terminé'
  const index = exercise ? EXERCISE_ORDER.indexOf(exercise) : 0
  const position = Math.min(index + 1, EXERCISE_ORDER.length)
  const title = exercise ? EXERCISE_META[exercise].title : ''
  return `${position}/${EXERCISE_ORDER.length} · ${title}`
}

export function SessionHeader({ exercise, phase }: SessionHeaderProps) {
  return (
    <header className="session-header">
      <div className="session-header__top">
        <span className="pill" aria-label="Progression de la session">
          {progressLabel(exercise, phase)}
        </span>
        <Link to="/" className="session-header__exit">
          Quitter
        </Link>
      </div>
      {phase === 'exercise' && exercise ? (
        <h1 className="session-header__title">{EXERCISE_META[exercise].title}</h1>
      ) : null}
    </header>
  )
}
