import { Link } from 'react-router-dom'
import type { StageKind } from '../types'
import { STAGE_META, STAGE_ORDER } from '../types'

export interface SessionHeaderProps {
  stage: StageKind | null
  phase: 'active' | 'complete'
  stageIndex: number
}

export function SessionHeader({ stage, phase, stageIndex }: SessionHeaderProps) {
  const position = Math.min(stageIndex + 1, STAGE_ORDER.length)
  const title = stage ? STAGE_META[stage].title : ''
  const label =
    phase === 'complete'
      ? 'Terminé'
      : `${position}/${STAGE_ORDER.length} · ${title}`

  return (
    <header className="session-header">
      <div className="session-header__top">
        <span className="pill" aria-label="Progression de la session">
          {label}
        </span>
        <Link to="/" className="session-header__exit">
          Quitter
        </Link>
      </div>
    </header>
  )
}
