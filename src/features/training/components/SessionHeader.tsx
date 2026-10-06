import { Link } from 'react-router-dom'
import { IconTile, InfoButton, SegmentedProgress } from '../../../components/ui'
import type { StageKind } from '../types'
import { STAGE_META, STAGE_ORDER } from '../types'

export interface SessionHeaderProps {
  stage: StageKind | null
  phase: 'active' | 'complete'
  stageIndex: number
  /** Progress inside the current stage, between 0 and 1. */
  stageProgress?: number
  /** Stages of this session (some days skip the reprise, the questions…). */
  stages?: StageKind[]
}

export function SessionHeader({
  stage,
  phase,
  stageIndex,
  stageProgress = 0,
  stages = STAGE_ORDER,
}: SessionHeaderProps) {
  const current = stage ? stages.indexOf(stage) : -1
  const passed = current >= 0 ? current : stages.filter((item) => STAGE_ORDER.indexOf(item) < stageIndex).length
  const position = Math.min(passed + 1, stages.length)
  const title = stage ? STAGE_META[stage].title : ''
  const label =
    phase === 'complete' ? 'Séance terminée' : `Étape ${position}/${stages.length}`
  const segments = stages.map((_, index) =>
    phase === 'complete' || index < passed ? 1 : index === passed ? stageProgress : 0,
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
        <div className="session-header__actions">
          {stage ? <InfoButton id={stage} /> : null}
          <Link to="/" className="session-header__exit">
            Quitter
          </Link>
        </div>
      </div>
      <SegmentedProgress
        segments={segments}
        role="progressbar"
        aria-valuenow={position}
        aria-valuemin={0}
        aria-valuemax={stages.length}
      />
    </header>
  )
}
