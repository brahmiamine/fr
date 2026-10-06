import { Timer } from '../../../components/Timer/Timer'
import { Button, Card, Pill } from '../../../components/ui'
import type { Topic } from '../../../types/content'
import { REPRISE_SECONDS } from '../types'

export interface RepriseExerciseProps {
  topic: Topic
  stage: 'intro' | 'running'
  /** The microphone is capturing this reprise. */
  recording?: boolean
  onStart: () => void
  onDone: () => void
}

/**
 * "Chaque sujet revient une fois, entre J+2 et J+7, en 3 minutes sans
 * préparation": the subject is shown and the learner starts right away.
 */
export function RepriseExercise({ topic, stage, recording = false, onStart, onDone }: RepriseExerciseProps) {
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
        onComplete={onDone}
      />
      <p className="fluency-run__hint">
        Ne récite pas : redis-le autrement. Un mot manque ? Contourne-le en moins d'une seconde.
      </p>
    </Card>
  )
}
