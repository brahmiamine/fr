import { useState } from 'react'
import { SpeakButton } from '../../../components/Speech/SpeakButton'
import { Timer } from '../../../components/Timer/Timer'
import { Button, Callout, DotList, Pill } from '../../../components/ui'
import type { GapItem } from '../types'
import {
  GAP_PARAPHRASE_SECONDS,
  GAP_RECALL_SECONDS,
  RESCUE_STRUCTURES,
} from '../types'

export interface WordGapsExerciseProps {
  item: GapItem
  index: number
  total: number
  step: 'recall' | 'verify' | 'paraphrase' | 'revealed'
  /** Context already saved to add this generic word to the personal list. */
  capturedContext?: string
  onFound: () => void
  onVerify?: (correct: boolean) => void
  onStartParaphrase: () => void
  onReveal: () => void
  onCapture?: (context: string) => void
  onNext: () => void
}

export function WordGapsExercise({
  item,
  index,
  total,
  step,
  capturedContext = '',
  onFound,
  onVerify,
  onStartParaphrase,
  onReveal,
  onCapture,
  onNext,
}: WordGapsExerciseProps) {
  const isLast = index + 1 >= total
  const [captureOpen, setCaptureOpen] = useState(Boolean(capturedContext))
  const [captureContext, setCaptureContext] = useState(capturedContext)

  if (step === 'recall') {
    return (
      <section className="card card--slide exercise-card exercise--center" aria-live="polite">
        <div className="exercise-topline"><span className="exercise-topline__label">Mot {index + 1}/{total}</span><Pill tone="fresh">{item.isPersonal ? 'Mes trous de mots' : 'Vocabulaire'}</Pill></div>
        <p className="exercise__context">
          Tu voulais exprimer :<br />
          <em>
            « {item.context || 'Contexte non enregistré pour cet ancien mot.'} »
          </em>
        </p>
        <h1 className="exercise__intent">Retrouve le mot, vite.</h1>
        <p className="muted">
          S'il ne vient pas, tu n'attends pas : tu passes à l'explication.
        </p>
        <Timer
          persistKey={`gap-recall-${item.key}`}
          durationSeconds={GAP_RECALL_SECONDS}
          autoStart
          hideControls
          compact
          secondsOnly
          variant="bubble"
          label="Rappel"
          onComplete={onStartParaphrase}
        />

        <div className="stack exercise__ratings">
          <button type="button" className="button" onClick={onFound}>
            J'ai une réponse
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={onStartParaphrase}
          >
            Explique-le sans connaître le mot
          </button>
        </div>
      </section>
    )
  }

  if (step === 'verify') {
    return (
      <section className="card card--slide exercise-card exercise--center">
        <div className="exercise-topline"><span className="exercise-topline__label">Mot {index + 1}/{total}</span><Pill tone="fresh">{item.isPersonal ? 'Mes trous de mots' : 'Vocabulaire'}</Pill></div>
        <h1 className="gap-answer">
          Réponse : <strong>{item.target}</strong>
        </h1>
        <p className="muted">Était-ce exactement le mot que tu as dit ?</p>
        <div className="stack exercise__ratings">
          <button type="button" className="button" onClick={() => onVerify?.(true)}>
            Oui, c'était juste
          </button>
          <button
            type="button"
            className="button button--ghost"
            onClick={() => onVerify?.(false)}
          >
            Non, c'était faux ou approximatif
          </button>
        </div>
      </section>
    )
  }

  if (step === 'paraphrase') {
    return (
      <section className="card card--slide exercise-card" aria-live="polite">
        <div className="exercise-topline"><span className="exercise-topline__label">Mot {index + 1}/{total}</span><Pill tone="fresh">{item.isPersonal ? 'Mes trous de mots' : 'Vocabulaire'}</Pill></div>
        {item.kind === 'retrieve' ? (
          <h1 className="exercise__intent">Explique l'idée sans le mot.</h1>
        ) : (
          <>
            <h1 className="exercise__intent">
              Explique : <strong>{item.target}</strong>
            </h1>
            <p className="muted">Fais deviner ce mot sans le prononcer.</p>
          </>
        )}

        {(item.rescueAngles?.length ?? 0) > 0 ? (
          <Callout title="Angles pour continuer à parler">
            <DotList items={item.rescueAngles ?? []} />
          </Callout>
        ) : null}

        <Callout title="Structures de secours" collapsible>
          <div className="chip-row">
            {RESCUE_STRUCTURES.map((structure) => (
              <span key={structure} className="rescue-chip">{structure}</span>
            ))}
          </div>
        </Callout>

        <Timer
          persistKey={`gap-paraphrase-${item.key}`}
          durationSeconds={GAP_PARAPHRASE_SECONDS}
          autoStart
          label="Explique à voix haute"
        />

        <button type="button" className="button button--block" onClick={onReveal}>
          {item.kind === 'retrieve' ? 'Voir la réponse' : "J'ai expliqué"}
        </button>
      </section>
    )
  }

  return (
    <section className="card card--slide exercise-card exercise--center">
      <div className="exercise-topline"><span className="exercise-topline__label">Mot {index + 1}/{total}</span><Pill tone="fresh">{item.isPersonal ? 'Mes trous de mots' : 'Vocabulaire'}</Pill></div>
      <h1 className="gap-answer">
        Réponse : <strong>{item.target}</strong>
      </h1>
      <SpeakButton
        text={item.target}
        label="Écouter"
        ariaLabel="Écouter le mot"
      />
      <p className="muted">
        Fais maintenant 2 ou 3 phrases avec « {item.target} », à voix haute.
      </p>

      {!item.isPersonal && onCapture ? (
        <div className="exercise__rescue">
          {captureOpen ? (
            <div className="field">
              <label htmlFor="gap-capture">
                Ce mot ne me serait pas venu spontanément. L'idée, en une phrase :
              </label>
              <input
                id="gap-capture"
                value={captureContext}
                onChange={(event) => {
                  setCaptureContext(event.target.value)
                  onCapture(event.target.value)
                }}
                placeholder="Ex. le bouton au mur pour allumer la lumière"
                autoComplete="off"
              />
              <p className="muted">
                Il rejoindra tes trous de mots : demain, tu devras le retrouver à
                partir de cette idée.
              </p>
            </div>
          ) : (
            <Button variant="accent-outline" block onClick={() => setCaptureOpen(true)}>
              Ajouter à mes trous de mots
            </Button>
          )}
        </div>
      ) : null}

      <Button block trailing="→" onClick={onNext}>
        {isLast ? 'Terminer l’exercice' : 'Mot suivant'}
      </Button>
    </section>
  )
}
