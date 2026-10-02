import { useState } from 'react'
import type { Chunk } from '../../../types/content'
import { Timer } from '../../../components/Timer/Timer'
import type { RecallResult } from '../types'

export interface ChunksExerciseProps {
  chunk: Chunk
  index: number
  total: number
  step: 'retrieve' | 'revealed' | 'day'
  chunksOfDay: Chunk[]
  onReveal: () => void
  onRate: (result: RecallResult) => void
  onContinue: () => void
}

export function ChunksExercise({
  chunk,
  index,
  total,
  step,
  chunksOfDay,
  onReveal,
  onRate,
  onContinue,
}: ChunksExerciseProps) {
  const [ready, setReady] = useState(false)

  if (step === 'day') {
    return (
      <section className="card exercise exercise--center">
        <h2>Essaie d'utiliser aujourd'hui :</h2>
        <ul className="chunks-of-day">
          {chunksOfDay.map((item) => (
            <li key={item.id}>« {item.expression} »</li>
          ))}
        </ul>
        <p className="muted">
          Ces expressions seront rappelées pendant le 4 → 3 → 2 et les
          questions surprises.
        </p>
        <button type="button" className="button button--block" onClick={onContinue}>
          Continuer
        </button>
      </section>
    )
  }

  if (step === 'retrieve') {
    return (
      <section className="card exercise exercise--center" aria-live="polite">
        <p className="pill">
          Chunk {index + 1}/{total}
        </p>
        <h1 className="exercise__intent">{chunk.intent}</h1>
        {!ready ? (
          <>
            <p className="muted">Prépare-toi…</p>
            <Timer
              durationSeconds={3}
              autoStart
              compact
              secondsOnly
              onComplete={() => setReady(true)}
            />
          </>
        ) : (
          <>
            <p className="muted">Essaie de retrouver une expression naturelle.</p>
            <p className="exercise__speak">Dis-la à voix haute, puis vérifie.</p>
            <button type="button" className="button button--block" onClick={onReveal}>
              Voir l'expression
            </button>
          </>
        )}
      </section>
    )
  }

  return (
    <section className="card exercise exercise--center">
      <p className="pill">
        Chunk {index + 1}/{total}
      </p>
      <h1 className="exercise__intent">{chunk.intent}</h1>
      <p className="exercise__expression">« {chunk.expression} »</p>
      <p className="pill">Registre : {chunk.register}</p>
      <p className="muted">{chunk.usageTip}</p>
      <p className="muted">
        Fais maintenant 2 phrases différentes avec cette expression, à voix
        haute.
      </p>

      <div className="stack exercise__ratings">
        <button
          type="button"
          className="button"
          onClick={() => onRate('easy')}
        >
          Trouvé facilement
        </button>
        <button
          type="button"
          className="button button--subtle"
          onClick={() => onRate('difficult')}
        >
          Trouvé avec difficulté
        </button>
        <button
          type="button"
          className="button button--ghost"
          onClick={() => onRate('failed')}
        >
          Je ne l'ai pas retrouvé
        </button>
      </div>
    </section>
  )
}
