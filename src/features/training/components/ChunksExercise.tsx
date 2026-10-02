import { useState } from 'react'
import type { Chunk } from '../../../types/content'
import { SpeakButton } from '../../../components/Speech/SpeakButton'
import { Timer } from '../../../components/Timer/Timer'
import type { RecallResult } from '../types'

export interface ChunksExerciseProps {
  chunk: Chunk
  index: number
  total: number
  step: 'retrieve' | 'revealed' | 'day'
  chunksOfDay: Chunk[]
  /** First encounter: the chunk is discovered, not retrieved. */
  isNew?: boolean
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
  isNew = false,
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
            <li key={item.id}>
              <span>« {item.expression} »</span>
              <SpeakButton
                text={item.expression}
                label="Écouter"
                ariaLabel={`Écouter ${item.expression}`}
                compact
              />
            </li>
          ))}
        </ul>
        <p className="muted">
          Ces expressions seront rappelées pendant le 4 → 3 → 2 et les
          questions surprises. À la fin, tu confirmeras celles que tu as
          réellement placées.
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
          {isNew ? ' · Nouveau' : ''}
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
            {isNew ? (
              <>
                <p className="muted">
                  Nouveau chunk : tu ne l'as encore jamais travaillé. Propose
                  une expression possible, puis découvre celle du jour.
                </p>
                <p className="exercise__speak">Dis ta proposition à voix haute.</p>
              </>
            ) : (
              <>
                <p className="muted">Essaie de retrouver l'expression travaillée.</p>
                <p className="exercise__speak">Dis-la à voix haute, puis vérifie.</p>
              </>
            )}
            <button type="button" className="button button--block" onClick={onReveal}>
              {isNew ? "Découvrir l'expression" : "Voir l'expression"}
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
      <SpeakButton
        text={chunk.expression}
        label="Écouter"
        ariaLabel="Écouter l'expression"
      />
      <p className="pill">Registre : {chunk.register ?? 'courant'}</p>
      {chunk.usageTip ? <p className="muted">{chunk.usageTip}</p> : null}
      <p className="muted">
        Fais maintenant 2 ou 3 phrases différentes avec cette expression, à
        voix haute.
      </p>

      {isNew ? (
        <div className="stack exercise__ratings">
          <button
            type="button"
            className="button"
            onClick={() => onRate('easy')}
          >
            Je la connaissais déjà
          </button>
          <button
            type="button"
            className="button button--subtle"
            onClick={() => onRate('discovered')}
          >
            Nouvelle pour moi : je la retrouverai demain
          </button>
        </div>
      ) : (
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
      )}
    </section>
  )
}
