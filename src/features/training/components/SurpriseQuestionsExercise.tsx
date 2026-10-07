import { useState } from 'react'
import type { Chunk, Question } from '../../../types/content'
import { AudioClip } from '../../../components/AudioClip/AudioClip'
import { Timer } from '../../../components/Timer/Timer'
import { Button, Callout, Card, ChoiceButton, ChoiceGrid, DotList, InfoLine, Pill, TextField } from '../../../components/ui'
import {
  ANSWER_STRUCTURE,
  QUESTION_COUNTDOWN_SECONDS,
  QUESTION_NOTE_SECONDS,
  QUESTION_RETRY_SECONDS,
  QUESTION_SPEAKING_SECONDS,
  QUESTION_STARTERS,
  QUESTION_TYPE_LABELS,
} from '../types'
import type { BlockRating, QuestionStage } from '../types'

export interface SurpriseQuestionsExerciseProps {
  question: Question
  index: number
  total: number
  stage: QuestionStage
  prepSeconds: number
  /** 60 s at first, up to 90 s as the learner progresses. */
  speakingSeconds?: number
  /** Advanced level: the second answer defends the opposite position. */
  advanced?: boolean
  chunksOfDay: Chunk[]
  focusWords: string[]
  /** The microphone is capturing this answer. */
  recording?: boolean
  /** The first answer, to hear again before the second one. */
  firstAnswerUrl?: string | null
  /** What the learner noted as missing after the first answer. */
  note?: string
  /** A word missing in the first answer and the idea it carried. */
  missingWord?: { word: string; idea: string }
  /** The question had a big block a few days ago and comes back. */
  isReview?: boolean
  onCountdownDone: () => void
  onPrepDone: () => void
  onSpeakingDone: () => void
  onRate: (rating: BlockRating) => void
  onNoteChange: (note: string) => void
  onMissingWordChange?: (value: { word: string; idea: string }) => void
  onNoteDone: () => void
  onRetryDone: () => void
}

/** Three springboards for this question, always the same ones for it. */
export function startersFor(questionId: string, count = 3): string[] {
  let hash = 0
  for (const char of questionId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  const starters = QUESTION_STARTERS
  return Array.from({ length: Math.min(count, starters.length) }, (_, offset) =>
    starters[(hash + offset * 7) % starters.length],
  )
}

export function SurpriseQuestionsExercise({
  question,
  index,
  total,
  stage,
  prepSeconds,
  speakingSeconds = QUESTION_SPEAKING_SECONDS,
  advanced = false,
  chunksOfDay,
  focusWords,
  recording = false,
  firstAnswerUrl = null,
  note = '',
  missingWord = { word: '', idea: '' },
  isReview = false,
  onCountdownDone,
  onPrepDone,
  onSpeakingDone,
  onRate,
  onNoteChange,
  onMissingWordChange,
  onNoteDone,
  onRetryDone,
}: SurpriseQuestionsExerciseProps) {
  const [showStarters, setShowStarters] = useState(false)
  const timerKey = `question-${index}`
  const counterLabel = `Question ${index + 1}/${total}`
  const springboards = startersFor(question.id)

  if (stage === 'countdown') {
    return (
      <Card center aria-live="polite">
        <Pill tone="muted" pop>{counterLabel}</Pill>
        <h2>Question suivante dans…</h2>
        {isReview ? (
          <p className="muted">Tu avais beaucoup bloqué sur celle-ci il y a quelques jours : elle revient.</p>
        ) : null}
        <Timer
          persistKey={`${timerKey}-countdown`}
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
        <Pill tone="muted">{counterLabel}</Pill>
        <h1 className="exercise__prompt">{question.text}</h1>
        {question.type ? (
          <p className="pill pill--warm">
            Type : {QUESTION_TYPE_LABELS[question.type] ?? question.type}
          </p>
        ) : null}
        <p className="exercise__prep-plan">{ANSWER_STRUCTURE}</p>
        <Callout title="Démarre par un tremplin" tone="soft">
          <DotList items={springboards} />
        </Callout>
        <Timer
          persistKey={`${timerKey}-prep`}
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

  if (stage === 'note') {
    return (
      <Card aria-labelledby="question-note-title">
        <div className="card-head">
          <h2 id="question-note-title">Qu'est-ce qui a manqué ?</h2>
          <Timer
            persistKey={`${timerKey}-note`}
            durationSeconds={QUESTION_NOTE_SECONDS}
            autoStart
            hideControls
            compact
            secondsOnly
            variant="inline"
            label="30 s"
            onComplete={onNoteDone}
          />
        </div>
        <p className="muted">
          Un mot, une idée, une transition ? Note-le en quelques mots : tu vas
          refaire la même question tout de suite.
        </p>
        {firstAnswerUrl ? <AudioClip src={firstAnswerUrl} label="Réécouter ma réponse" /> : null}
        {onMissingWordChange ? (
          <>
            <TextField
              id="question-missing-word"
              label="Un mot qui t'a manqué ? (facultatif)"
              value={missingWord.word}
              onChange={(word) => onMissingWordChange({ ...missingWord, word })}
              placeholder="ex. loyer"
            />
            {missingWord.word.trim() ? (
              <TextField
                id="question-missing-idea"
                label="L'idée, sans le mot"
                value={missingWord.idea}
                onChange={(idea) => onMissingWordChange({ ...missingWord, idea })}
                placeholder="ex. ce que je paie chaque mois pour mon appartement"
                hint="Il rejoindra tes trous de mots à la fin de la séance."
              />
            ) : null}
          </>
        ) : null}
        <TextField
          id="question-note"
          label="Une idée ou une transition qui a manqué (facultatif)"
          value={note}
          onChange={onNoteChange}
          placeholder="ex. un exemple concret, « d'un autre côté »"
        />
        <Button variant="animated" size="lg" block trailing="▶" onClick={onNoteDone}>
          Je refais la question
        </Button>
      </Card>
    )
  }

  const retry = stage === 'retry'
  const seconds = retry ? QUESTION_RETRY_SECONDS : speakingSeconds
  const complete = retry ? onRetryDone : onSpeakingDone

  return (
    <Card aria-labelledby="question-title">
      {recording ? (
        <span className="rec-badge">
          <span className="rec-badge__dot" aria-hidden="true" />
          Enregistrement de ta réponse
        </span>
      ) : null}
      <p className={`pill${retry ? ' pill--warm' : ''}`}>
        {retry ? `${counterLabel} · deuxième réponse` : counterLabel}
      </p>
      <h2 id="question-title" className="exercise__prompt">
        {question.text}
      </h2>
      {retry && advanced ? (
        <p className="text-strong">Niveau avancé : défends maintenant la position inverse.</p>
      ) : null}
      {retry && missingWord.word.trim() ? (
        <InfoLine label="Mot à placer :">{missingWord.word}</InfoLine>
      ) : null}
      {retry && note.trim() ? <InfoLine label="À intégrer :">{note}</InfoLine> : null}

      <Timer
        key={stage}
        persistKey={`${timerKey}-${stage}`}
        durationSeconds={seconds}
        autoStart
        hideControls
        label={retry ? 'Refais-la' : 'Parle'}
        wave
        onComplete={complete}
      />

      {chunksOfDay.length > 0 ? (
        <InfoLine label="Essaie de placer :">
          {chunksOfDay.map((chunk) => chunk.expression).join(' · ')}
        </InfoLine>
      ) : null}

      {focusWords.length > 0 ? (
        <InfoLine label="Mots à réutiliser :">{focusWords.join(' · ')}</InfoLine>
      ) : null}

      <Button
        variant="dashed"
        block
        aria-expanded={showStarters}
        aria-controls="question-starters"
        onClick={() => setShowStarters((open) => !open)}
      >
        {showStarters ? 'Masquer les tremplins' : "Besoin d'un tremplin ?"}
      </Button>
      {showStarters ? (
        <Callout title="Tremplins possibles" id="question-starters">
          <DotList items={QUESTION_STARTERS} />
        </Callout>
      ) : null}
    </Card>
  )
}
