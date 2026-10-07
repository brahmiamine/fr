import { Timer } from '../../../components/Timer/Timer'
import { Button, Card, Pill } from '../../../components/ui'
import type { Topic } from '../../../types/content'
import { AiAnalysisPanel } from '../../ai/AiAnalysisPanel'
import { QuickWordGap } from '../../wordGaps/QuickWordGap'
import { REPRISE_SECONDS } from '../types'

export interface RepriseExerciseProps {
  topic: Topic
  stage: 'intro' | 'running' | 'review'
  /** The microphone is capturing this reprise. */
  recording?: boolean
  /** The recorded reprise, analysed on demand once spoken. */
  audioUrl?: string | null
  onStart: () => void
  /** The 3 minutes are over. */
  onSpoken: () => void
  onDone: () => void
}

/**
 * "Chaque sujet revient une fois, entre J+2 et J+7, en 3 minutes sans
 * préparation": the subject is shown and the learner starts right away.
 */
export function RepriseExercise({
  topic,
  stage,
  recording = false,
  audioUrl = null,
  onStart,
  onSpoken,
  onDone,
}: RepriseExerciseProps) {
  if (stage === 'intro') {
    return (
      <Card center aria-labelledby="reprise-title">
        <Pill tone="warm">Sujet de ces derniers jours</Pill>
        <h1 id="reprise-title" className="exercise__prompt">
          {topic.title}
        </h1>
        <p className="muted">
          Tu as déjà parlé de ce sujet il y a quelques jours. Reprends-le 3 minutes,
          sans préparation et sans mots-clés : c'est ce retour qui consolide.
        </p>
        <Button variant="animated" size="lg" block trailing="▶" onClick={onStart}>
          Commencer la reprise (3 min)
        </Button>
      </Card>
    )
  }

  if (stage === 'review') {
    return (
      <Card aria-labelledby="reprise-review-title">
        <h2 id="reprise-review-title">Reprise terminée</h2>
        <p className="muted">
          Un mot t'a manqué pendant la reprise ? Note-le maintenant : il reviendra
          dans tes trous de mots.
        </p>
        <QuickWordGap id="reprise-gap" defaultOpen />
        <AiAnalysisPanel audioUrl={audioUrl} situation="round" subtitle="Sur ta reprise" />
        <Button size="lg" block trailing="→" onClick={onDone}>
          Continuer
        </Button>
      </Card>
    )
  }

  return (
    <Card center aria-live="polite">
      {recording ? (
        <span className="rec-badge">
          <span className="rec-badge__dot" aria-hidden="true" />
          Enregistrement de la reprise
        </span>
      ) : null}
      <h2 className="fluency-run__prompt">{topic.title}</h2>
      <Timer
        persistKey="reprise-run"
        durationSeconds={REPRISE_SECONDS}
        autoStart
        hideControls
        wave
        label="Parle"
        onComplete={onSpoken}
      />
      <p className="fluency-run__hint">
        Ne récite pas : redis-le autrement. Un mot manque ? Contourne-le en moins d'une seconde.
      </p>
    </Card>
  )
}
