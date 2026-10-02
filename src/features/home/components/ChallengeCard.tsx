import { ButtonLink, Card, Pill } from '../../../components/ui'

export function ChallengeCard({
  badge,
  title,
  description,
  to,
  cta,
  delay,
}: {
  badge: string
  title: string
  description: string
  to: string
  cta: string
  delay: number
}) {
  return (
    <Card padding="md" className="challenge" style={{ animationDelay: `${delay}s` }}>
      <Pill>{badge}</Pill>
      <h3>{title}</h3>
      <p className="muted">{description}</p>
      <ButtonLink to={to} variant="subtle" className="challenge__cta" trailing="→">
        {cta}
      </ButtonLink>
    </Card>
  )
}
