import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Topic } from '../../../types/content'
import { Timer } from '../../../components/Timer/Timer'
import { FLUENCY_ROUND_SECONDS } from '../types'
import type { SessionReflection } from '../types'

export interface Fluency432ExerciseProps {
  topic: Topic
  roundIndex: number
  stage: 'running' | 'reflection'
  reflection: SessionReflection
  onRoundComplete: () => void
  onReflectionSubmit: (values: SessionReflection) => void
}

const ROUND_LABELS = [
  'Manche 1 · 4 minutes',
  'Manche 2 · 3 minutes',
  'Manche 3 · 2 minutes',
  'Transfert · 1 minute',
]

export function Fluency432Exercise({
  topic,
  roundIndex,
  stage,
  reflection,
  onRoundComplete,
  onReflectionSubmit,
}: Fluency432ExerciseProps) {
  const [missingWord, setMissingWord] = useState(reflection.missingWord)
  const [difficultPhrase, setDifficultPhrase] = useState(
    reflection.difficultPhrase,
  )
  const [importantError, setImportantError] = useState(
    reflection.importantError,
  )

  if (stage === 'reflection') {
    const handleSubmit = (event: FormEvent) => {
      event.preventDefault()
      onReflectionSubmit({ missingWord, difficultPhrase, importantError })
    }

    return (
      <section className="card exercise" aria-labelledby="reflection-title">
        <h2 id="reflection-title">Petite pause réflexion</h2>
        <p className="muted">
          Note rapidement, puis on repart. Ne cherche pas la perfection.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="missing-word">Un mot qui t'a manqué</label>
            <input
              id="missing-word"
              value={missingWord}
              onChange={(event) => setMissingWord(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="difficult-phrase">Une phrase difficile</label>
            <input
              id="difficult-phrase"
              value={difficultPhrase}
              onChange={(event) => setDifficultPhrase(event.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="important-error">Une erreur importante</label>
            <input
              id="important-error"
              value={importantError}
              onChange={(event) => setImportantError(event.target.value)}
              autoComplete="off"
            />
          </div>
          <button type="submit" className="button button--block">
            Continuer vers la manche 2
          </button>
        </form>
      </section>
    )
  }

  const isTransfer = roundIndex === FLUENCY_ROUND_SECONDS.length - 1
  const seconds = FLUENCY_ROUND_SECONDS[roundIndex] ?? 60
  const prompt = isTransfer ? topic.transferPrompt : topic.title

  return (
    <section className="card exercise" aria-labelledby="fluency-title">
      <p className="pill">{ROUND_LABELS[roundIndex] ?? 'Manche'}</p>
      <h2 id="fluency-title" className="exercise__prompt">
        {prompt}
      </h2>

      {!isTransfer ? (
        <ul className="exercise__prompts">
          {topic.prompts.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="muted">
          Nouveau sujet proche : réutilise un maximum de vocabulaire.
        </p>
      )}

      {roundIndex === 0 ? (
        <ul className="exercise__rules">
          <li>Ne t'arrête pas pour te corriger.</li>
          <li>Si un mot manque, paraphrase.</li>
          <li>Pas de silence de plus de 2 secondes.</li>
        </ul>
      ) : null}

      <Timer
        durationSeconds={seconds}
        onComplete={onRoundComplete}
        label="Parle à voix haute"
      />
    </section>
  )
}
