import { Link } from 'react-router-dom'
import { IconTile, SegmentedProgress } from '../../../components/ui'
import type { StageKind } from '../types'
import { STAGE_META, STAGE_ORDER } from '../types'

export interface SessionHeaderProps {
  stage: StageKind | null
  phase: 'active' | 'complete'
  stageIndex: number
  /** Progress inside the current stage, between 0 and 1. */
  stageProgress?: number
}

export function SessionHeader({
  stage,
  phase,
  stageIndex,
  stageProgress = 0,
}: SessionHeaderProps) {
  const position = Math.min(stageIndex + 1, STAGE_ORDER.length)
  const title = stage ? STAGE_META[stage].title : ''
  const label =
    phase === 'complete' ? 'Séance terminée' : `Étape ${position}/${STAGE_ORDER.length}`
  const segments = STAGE_ORDER.map((_, index) =>
    phase === 'complete' || index < stageIndex ? 1 : index === stageIndex ? stageProgress : 0,
  )

  return (
    <header className="session-header">
      <div className="session-header__top">
        <div className="session-header__stage">
          {stage ? <IconTile key={stage} icon={stage} tone={stage} size={40} iconSize={20} /> : null}
          <div className="session-header__titles">
            <span className="session-header__label">{label}</span>
            <span className="session-header__title">{title}</span>
          </div>
        </div>
        <Link to="/" className="session-header__exit">
          Quitter
        </Link>
      </div>
      <SegmentedProgress
        segments={segments}
        role="progressbar"
        aria-valuenow={position}
        aria-valuemin={0}
        aria-valuemax={STAGE_ORDER.length}
      />
    </header>
  )
}
