import { Link } from 'react-router-dom'
import { StageIcon } from '../../../components/icons/StageIcon'
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
  const label = phase === 'complete' ? 'Séance terminée' : `${position}/${STAGE_ORDER.length}`

  return (
    <header className="session-header">
      <div className="session-header__top">
        <div className="session-header__stage">
          {stage ? (
            <span className="session-header__icon">
              <StageIcon stage={stage} size={18} />
            </span>
          ) : null}
          <div className="session-header__titles">
            <span className="session-header__label">{label}</span>
            <span className="session-header__title">{title}</span>
          </div>
        </div>
        <Link to="/" className="session-header__exit">
          Quitter
        </Link>
      </div>
      <div
        className="session-header__progress"
        role="progressbar"
        aria-valuenow={position}
        aria-valuemin={0}
        aria-valuemax={STAGE_ORDER.length}
      >
        <span
          className="session-header__progress-fill"
          style={{ width: `${(position / STAGE_ORDER.length) * 100}%` }}
        />
      </div>
    </header>
  )
}
