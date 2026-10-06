import { useNavigate } from 'react-router-dom'
import { Button, ButtonLink, Card, IconTile } from '../../../components/ui'
import { STAGE_META, STAGE_ORDER } from '../../training/types'

export function TodaySessionCard({
  minutes,
  ctaLabel,
  onRestart,
}: {
  minutes: number
  ctaLabel: string
  /** Set when a session is in progress: discards it and starts a fresh one. */
  onRestart?: () => void
}) {
  const navigate = useNavigate()

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
      {!onRestart ? (
        <div className="today__modes">
          <ButtonLink to="/training?mode=short" variant="subtle" block>
            Version courte · ≈ 20 min
          </ButtonLink>
          <ButtonLink to="/training?mode=conversation" variant="subtle" block>
            Jour de conversation · chunks + 4 → 3 → 2
          </ButtonLink>
        </div>
      ) : null}
      {onRestart ? (
        <Button
          variant="subtle"
          block
          onClick={() => {
            if (
              window.confirm(
                'Abandonner la séance en cours et en commencer une nouvelle ?',
              )
            ) {
              onRestart()
              navigate('/training')
            }
          }}
        >
          Commencer une nouvelle séance
        </Button>
      ) : null}
    </Card>
  )
}
