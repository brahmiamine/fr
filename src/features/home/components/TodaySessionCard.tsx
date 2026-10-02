import { ButtonLink, Card, IconTile } from '../../../components/ui'
import { STAGE_META, STAGE_ORDER } from '../../training/types'

export function TodaySessionCard({
  minutes,
  ctaLabel,
}: {
  minutes: number
  ctaLabel: string
}) {
  return (
    <Card className="today" aria-labelledby="today-title">
      <div className="today__head">
        <h2 id="today-title">Séance du jour</h2>
        <span className="today__meta">
          {STAGE_ORDER.length} étapes · ≈ {minutes} min
        </span>
      </div>
      <ol className="today__stages">
        {STAGE_ORDER.map((stage, index) => (
          <li
            key={stage}
            className="today__stage"
            style={{ animationDelay: `${0.12 + index * 0.06}s` }}
          >
            <IconTile icon={stage} tone={stage} size={36} iconSize={18} />
            <span className="today__stage-title">{STAGE_META[stage].title}</span>
            <span className="today__stage-min">{STAGE_META[stage].minutes} min</span>
          </li>
        ))}
      </ol>
      <ButtonLink to="/training" variant="animated" size="lg" block trailing="→">
        {ctaLabel}
      </ButtonLink>
    </Card>
  )
}
