import { Icon } from '../ui'
import { STAGE_META, STAGE_ORDER } from '../../features/training/types'

const TOTAL_MINUTES = STAGE_ORDER.reduce((total, stage) => total + STAGE_META[stage].minutes, 0)

/** Vertical timeline of the five session stages, shown beside the session. */
export function StageRail({ stageIndex }: { stageIndex: number }) {
  return (
    <div className="stage-rail">
      <p className="eyebrow">Séance du jour · {TOTAL_MINUTES} min</p>
      <ol className="stage-rail__list">
        {STAGE_ORDER.map((stage, index) => {
          const state = index < stageIndex ? 'done' : index === stageIndex ? 'current' : 'next'
          return (
            <li key={stage} className={`stage-rail__item is-${state}`}>
              <span className="stage-rail__track">
                <span className={`stage-rail__dot stage-rail__dot--${stage}`}>
                  <Icon name={state === 'done' ? 'check' : stage} size={16} strokeWidth={2} />
                </span>
                <span className="stage-rail__line" />
              </span>
              <span className="stage-rail__text">
                <span className="stage-rail__title">{STAGE_META[stage].title}</span>
                <span className="stage-rail__meta">
                  {STAGE_META[stage].minutes} min ·{' '}
                  {state === 'done' ? 'fait' : state === 'current' ? 'en cours' : 'à venir'}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
