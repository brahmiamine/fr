import { Timer } from '../../../components/Timer/Timer'
import { Button, Card, Pill } from '../../../components/ui'
import type { Question } from '../../../types/content'
import { AiAnalysisPanel } from '../../ai/AiAnalysisPanel'
import { QuickWordGap } from '../../wordGaps/QuickWordGap'
import { ZAPPING_SECONDS, ZAPPING_TRANSITIONS } from '../types'

export interface ZappingExerciseProps {
  questions: Question[]
  stage: 'intro' | 'running' | 'review' | 'done'
  index: number
  recording?: boolean
  /** The recorded zapping, analysed on demand once over. */
  audioUrl?: string | null
  onStart: () => void
  onNext: () => void
  onDone?: () => void
}

/**
 * "Enchaîne 4 questions de 45 secondes sans aucun lien, avec une transition
 * orale entre chacune": the questions follow one another without a pause.
 */
export function ZappingExercise({
  questions,
  stage,
  index,
  recording = false,
  audioUrl = null,
  onStart,
  onNext,
  onDone,
}: ZappingExerciseProps) {
  if (stage === 'intro') {
    return (
      <Card center aria-labelledby="zapping-title">
        <Pill tone="warm">Zapping</Pill>
        <h1 id="zapping-title">{questions.length} questions sans lien</h1>
        <p className="muted">
          {ZAPPING_SECONDS} secondes chacune, sans pause. Entre deux questions,
          enchaîne avec une transition à voix haute :
        </p>
        <p className="text-strong">{ZAPPING_TRANSITIONS.slice(0, 3).map((item) => `« ${item} »`).join(' · ')}</p>
        <Button variant="animated" size="lg" block trailing="▶" onClick={onStart}>
          Commencer le zapping
        </Button>
      </Card>
    )
  }

  if (stage === 'review') {
    return (
      <Card aria-labelledby="zapping-review-title">
        <h2 id="zapping-review-title">Zapping terminé</h2>
        <p className="muted">Un mot t'a manqué en changeant de sujet ? Note-le maintenant.</p>
        <QuickWordGap id="zapping-gap" defaultOpen />
        <AiAnalysisPanel audioUrl={audioUrl} situation="question" subtitle="Sur ton zapping" />
        <Button size="lg" block trailing="→" onClick={onDone}>
          Continuer
        </Button>
      </Card>
    )
  }

  const question = questions[index]
  if (!question) return null
  const transition = index > 0 ? ZAPPING_TRANSITIONS[(index - 1) % ZAPPING_TRANSITIONS.length] : null

  return (
    <Card aria-live="polite">
      {recording ? (
        <span className="rec-badge">
          <span className="rec-badge__dot" aria-hidden="true" />
          Enregistrement du zapping
        </span>
      ) : null}
      <p className="pill pill--warm">
        Zapping {index + 1}/{questions.length}
      </p>
      {transition ? (
        <p className="muted">
          Enchaîne avec : <span className="text-strong">« {transition} »</span>
        </p>
      ) : null}
      <h2 className="exercise__prompt">{question.text}</h2>
      <Timer
        key={index}
        persistKey={`zapping-${index}`}
        durationSeconds={ZAPPING_SECONDS}
        autoStart
        hideControls
        wave
        label="Parle"
        onComplete={onNext}
      />
    </Card>
  )
}
