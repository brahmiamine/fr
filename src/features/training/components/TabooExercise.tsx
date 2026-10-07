import { Timer } from '../../../components/Timer/Timer'
import { QuickWordGap } from '../../wordGaps/QuickWordGap'
import { Button, Callout, Card, ChoiceButton, ChoiceGrid, DotList, Pill } from '../../../components/ui'
import type { TabooTopic } from '../../../types/content'
import { RESCUE_CORE, TABOO_SECONDS } from '../types'
import type { BlockRating } from '../types'

export interface TabooExerciseProps {
  taboo: TabooTopic
  stage: 'intro' | 'running' | 'rate' | 'done'
  recording?: boolean
  onStart: () => void
  onSpoken: () => void
  onRate: (rating: BlockRating) => void
}

/**
 * "Monologue tabou": 90 seconds on a subject without its 3 to 5 obvious words,
 * never stopping more than a second on a word.
 */
export function TabooExercise({ taboo, stage, recording = false, onStart, onSpoken, onRate }: TabooExerciseProps) {
  const forbidden = (
    <div className="chip-row chip-row--center" aria-label="Mots interdits">
      {taboo.forbidden.map((word) => (
        <span key={word} className="chip chip--static taboo__word">
          <s>{word}</s>
        </span>
      ))}
    </div>
  )

  if (stage === 'intro') {
    return (
      <Card center aria-labelledby="taboo-title">
        <Pill tone="warm">Monologue tabou</Pill>
        <h1 id="taboo-title" className="exercise__prompt">{taboo.subject}</h1>
        <p className="muted">
          Parle {TABOO_SECONDS} secondes de ce sujet sans jamais dire :
        </p>
        {forbidden}
        <p className="text-strong">
          Règle d'une seconde : tu ne t'arrêtes jamais plus d'une seconde sur un mot. Tu contournes.
        </p>
        <Button variant="animated" size="lg" block trailing="▶" onClick={onStart}>
          Commencer ({TABOO_SECONDS} s)
        </Button>
      </Card>
    )
  }

  if (stage === 'rate') {
    return (
      <Card center>
        <h2>T'es-tu arrêté plus d'une seconde sur un mot ?</h2>
        <QuickWordGap
          id="taboo-gap"
          label="Le mot sur lequel je me suis arrêté"
        />
        <ChoiceGrid min={150}>
          <ChoiceButton tone="success" onClick={() => onRate('none')}>
            Jamais
          </ChoiceButton>
          <ChoiceButton tone="warning" delay={0.06} onClick={() => onRate('some')}>
            Une ou deux fois
          </ChoiceButton>
          <ChoiceButton tone="danger" delay={0.12} onClick={() => onRate('much')}>
            Souvent
          </ChoiceButton>
        </ChoiceGrid>
      </Card>
    )
  }

  return (
    <Card aria-live="polite">
      {recording ? (
        <span className="rec-badge">
          <span className="rec-badge__dot" aria-hidden="true" />
          Enregistrement du monologue
        </span>
      ) : null}
      <h2 className="exercise__prompt">{taboo.subject}</h2>
      {forbidden}
      <Timer
        persistKey="taboo-run"
        durationSeconds={TABOO_SECONDS}
        autoStart
        hideControls
        wave
        label="Parle sans les mots interdits"
        onComplete={onSpoken}
      />
      <Callout title="Tes formules de contournement" tone="soft">
        <DotList items={RESCUE_CORE} />
      </Callout>
    </Card>
  )
}
