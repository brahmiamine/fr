import { useState } from 'react'
import type { Chunk, Question } from '../../../types/content'
import { Timer } from '../../../components/Timer/Timer'
import { Button, Callout, Card, ChoiceButton, ChoiceGrid, DotList, InfoLine, Pill } from '../../../components/ui'
import {
  QUESTION_COUNTDOWN_SECONDS,
  QUESTION_SPEAKING_SECONDS,
  QUESTION_STARTERS,
  QUESTION_TYPE_LABELS,
} from '../types'
import type { BlockRating } from '../types'

export interface SurpriseQuestionsExerciseProps {
  question: Question
  index: number
  total: number
  stage: 'countdown' | 'prep' | 'speaking' | 'rate'
  prepSeconds: number
  /** 60 s at first, up to 90 s as the learner progresses. */
  speakingSeconds?: number
  chunksOfDay: Chunk[]
  focusWords: string[]
  pivotQuestion?: Question | null
  revenge?: boolean
  onCountdownDone: () => void
  onPrepDone: () => void
  onSpeakingDone: () => void
  onRate: (rating: BlockRating) => void
  onDone: () => void
}

const PIVOT_SECONDS = 30

export function SurpriseQuestionsExercise({
  question,
  index,
  total,
  stage,
  prepSeconds,
  speakingSeconds: answerSeconds = QUESTION_SPEAKING_SECONDS,
  chunksOfDay,
  focusWords,
  pivotQuestion = null,
  revenge = false,
  onCountdownDone,
  onPrepDone,
  onSpeakingDone,
  onRate,
  onDone,
}: SurpriseQuestionsExerciseProps) {
  const [showStarters, setShowStarters] = useState(false)
  const [pivotActive, setPivotActive] = useState(false)

  const counterLabel = revenge ? 'Revanche' : `Question ${index + 1}/${total}`

  if (stage === 'countdown') {
    return (
      <Card center aria-live="polite">
        <Pill tone={revenge ? 'contrast' : 'muted'} pop>{counterLabel}</Pill>
        <h2>{revenge ? 'Revanche :' : 'Question suivante dans…'}</h2>
        {revenge ? (
          <p className="muted">
            Tu as eu du mal sur celle-ci. Refais-la une deuxième fois.
          </p>
        ) : null}
        <Timer
          durationSeconds={QUESTION_COUNTDOWN_SECONDS}
          autoStart
          hideControls
          compact
          secondsOnly
          variant="bubble"
          onComplete={onCountdownDone}
        />
      </Card>
    )
  }

  if (stage === 'prep') {
    return (
      <Card center aria-live="polite">
        <Pill tone={revenge ? 'contrast' : 'muted'}>{counterLabel}</Pill>
        <h1 className="exercise__prompt">{question.text}</h1>
        {question.type ? (
          <p className="pill pill--warm">
            Type : {QUESTION_TYPE_LABELS[question.type] ?? question.type}
          </p>
        ) : null}
        <p className="exercise__prep-plan">Idée → raison → exemple</p>
        <Timer
          durationSeconds={prepSeconds}
          autoStart
          hideControls
          compact
          secondsOnly
          label="Préparation"
          variant="bubble"
          onComplete={onPrepDone}
        />
      </Card>
    )
  }

  if (stage === 'rate') {
    return (
      <Card center>
        <h2>As-tu bloqué ?</h2>
        <ChoiceGrid min={150}>
          <ChoiceButton tone="success" onClick={() => onRate('none')}>
            Non
          </ChoiceButton>
          <ChoiceButton tone="warning" delay={0.06} onClick={() => onRate('some')}>
            Un peu
          </ChoiceButton>
          <ChoiceButton tone="danger" delay={0.12} onClick={() => onRate('much')}>
            Beaucoup
          </ChoiceButton>
        </ChoiceGrid>
      </Card>
    )
  }

  const hasAdvancedPivot = Boolean(pivotQuestion && !revenge)
  const activeQuestion = pivotActive && pivotQuestion ? pivotQuestion : question
  // With an advanced pivot: 60 s, then the abrupt 30 s pivot.
  const speakingSeconds = pivotActive
    ? PIVOT_SECONDS
    : hasAdvancedPivot
      ? QUESTION_SPEAKING_SECONDS
      : answerSeconds

  const completeSpeakingPhase = () => {
    if (hasAdvancedPivot && !pivotActive) {
      setPivotActive(true)
      return
    }
    if (revenge) onDone()
    else onSpeakingDone()
  }

  return (
    <Card aria-labelledby="question-title">
      <p className={`pill${pivotActive ? ' pill--warm' : ''}`}>
        {pivotActive ? 'Pivot — change de sujet maintenant' : counterLabel}
      </p>
      <h2 id="question-title" className="exercise__prompt">
        {activeQuestion.text}
      </h2>

      <Timer
        key={pivotActive ? 'pivot' : 'main'}
        durationSeconds={speakingSeconds}
        autoStart
        hideControls
        label={pivotActive ? 'Continue immédiatement' : 'Parle'}
        wave
        onComplete={completeSpeakingPhase}
      />

      {chunksOfDay.length > 0 ? (
        <InfoLine label="Essaie de placer :">
          {chunksOfDay.map((chunk) => chunk.expression).join(' · ')}
        </InfoLine>
      ) : null}

      {focusWords.length > 0 ? (
        <InfoLine label="Mots à réutiliser :">{focusWords.join(' · ')}</InfoLine>
      ) : null}

      {!showStarters ? (
        <Button variant="dashed" block onClick={() => setShowStarters(true)}>
          Besoin d'une amorce ?
        </Button>
      ) : (
        <Callout title="Amorces possibles">
          <DotList items={QUESTION_STARTERS} />
        </Callout>
      )}
    </Card>
  )
}
