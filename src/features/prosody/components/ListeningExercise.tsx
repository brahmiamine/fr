import { useState } from 'react'
import type { Intonation, LearnerMarking } from '../marking'
import {
  compareMarking,
  exerciseWords,
  spansFromBoundaries,
} from '../marking'
import type { ProsodyExercise } from '../types'
import { speechRateFor } from '../types'
import {
  REQUIRED_MEANING_LISTENS,
  REQUIRED_PROSODY_LISTENS,
} from '../types'
import { AudioClip } from './AudioClip'

export interface ListeningExerciseProps {
  exercise: ProsodyExercise
  step: 'meaning' | 'prosody' | 'mark' | 'reveal'
  audioSrc: string
  meaningPlays: number
  prosodyPlays: number
  marking?: LearnerMarking | null
  onAudioComplete: () => void
  onNext: () => void
  onMarked?: (marking: LearnerMarking) => void
  onUseOwnExtract?: () => void
}

const NEXT_INTONATION: Record<Intonation, Intonation> = {
  level: 'rise',
  rise: 'fall',
  fall: 'level',
}

function intonationSymbol(value: Intonation): string {
  if (value === 'rise') return '↑'
  if (value === 'fall') return '↓'
  return '→'
}

function ModelSourceNote({
  exercise,
  onUseOwnExtract,
}: {
  exercise: ProsodyExercise
  onUseOwnExtract?: () => void
}) {
  if (exercise.custom) {
    return <p className="pill">Ton extrait · vraie voix</p>
  }
  if (exercise.modelKind !== 'tts') return null
  return (
    <div className="exercise__rescue">
      <p className="muted">
        Modèle : voix de synthèse du navigateur. Elle donne le découpage, mais
        pas l'énergie d'une vraie personne. Pour copier un vrai locuteur,
        utilise ton propre extrait de 10–30 s.
      </p>
      {onUseOwnExtract ? (
        <button
          type="button"
          className="button button--ghost button--block"
          onClick={onUseOwnExtract}
        >
          Utiliser mon propre extrait (vraie voix)
        </button>
      ) : null}
    </div>
  )
}

function MarkingBoard({
  exercise,
  audioSrc,
  onMarked,
}: {
  exercise: ProsodyExercise
  audioSrc: string
  onMarked: (marking: LearnerMarking) => void
}) {
  const words = exerciseWords(exercise)
  const [boundaries, setBoundaries] = useState<number[]>([])
  const [intonations, setIntonations] = useState<Intonation[]>([])
  const spans = spansFromBoundaries(words.length, boundaries)

  const toggleBoundary = (index: number) => {
    setBoundaries((current) =>
      current.includes(index)
        ? current.filter((item) => item !== index)
        : [...current, index].sort((a, b) => a - b),
    )
    setIntonations([])
  }

  const cycleIntonation = (spanIndex: number) => {
    setIntonations((current) => {
      const next = spans.map((_, index) => current[index] ?? 'level')
      next[spanIndex] = NEXT_INTONATION[next[spanIndex]]
      return next
    })
  }

  return (
    <section className="card exercise" aria-labelledby="mark-title">
      <p className="pill">Marquage</p>
      <h2 id="mark-title">Marque toi-même le découpage.</h2>
      <p className="muted">
        Touche l'espace entre deux mots pour placer une frontière{' '}
        <strong>/</strong>, là où tu entends un groupe se terminer. Ensuite,
        touche chaque groupe pour indiquer si la voix monte ↑, descend ↓ ou
        reste plate →. Tu peux réécouter autant que nécessaire.
      </p>
      <AudioClip
        src={audioSrc || undefined}
        speechText={exercise.modelKind === 'tts' ? exercise.transcript : undefined}
        speechLocale={exercise.voiceLocale}
        speechRate={speechRateFor(exercise)}
        label="Réécouter"
      />
      <p className="marking" lang="fr">
        {words.map((word, index) => (
          <span key={`${word}-${index}`} className="marking__item">
            <span className="marking__word">{word}</span>
            {index < words.length - 1 ? (
              <button
                type="button"
                className={`marking__gap ${boundaries.includes(index) ? 'is-active' : ''}`}
                aria-pressed={boundaries.includes(index)}
                aria-label={`Frontière après « ${word} »`}
                onClick={() => toggleBoundary(index)}
              >
                {boundaries.includes(index) ? '/' : '·'}
              </button>
            ) : null}
          </span>
        ))}
      </p>
      <div className="stack">
        <h3>Mes groupes</h3>
        {spans.map(([start, end], spanIndex) => {
          const value = intonations[spanIndex] ?? 'level'
          const text = words.slice(start, end + 1).join(' ')
          return (
            <button
              key={`${start}-${end}`}
              type="button"
              className="button button--subtle marking__group"
              aria-label={`Intonation de « ${text} » : ${intonationSymbol(value)}`}
              onClick={() => cycleIntonation(spanIndex)}
            >
              {text} <strong>{intonationSymbol(value)}</strong>
            </button>
          )
        })}
      </div>
      <button
        type="button"
        className="button button--block"
        onClick={() =>
          onMarked({
            boundaries,
            intonations: spans.map((_, index) => intonations[index] ?? 'level'),
          })
        }
      >
        Comparer avec le modèle
      </button>
    </section>
  )
}

function MarkingFeedback({
  exercise,
  marking,
}: {
  exercise: ProsodyExercise
  marking: LearnerMarking
}) {
  const words = exerciseWords(exercise)
  const spans = spansFromBoundaries(words.length, marking.boundaries)
  const mine = spans
    .map(
      ([start, end], index) =>
        `${words.slice(start, end + 1).join(' ')} ${intonationSymbol(marking.intonations[index] ?? 'level')}`,
    )
    .join(' / ')

  if (exercise.custom) {
    return (
      <div className="exercise__rescue">
        <h3>Ton découpage</h3>
        <p lang="fr">{mine}</p>
        <p className="muted">
          Ton extrait n'a pas de découpage de référence : réécoute en suivant
          ton marquage et corrige-le si la voix ne fait pas ce que tu as noté.
        </p>
      </div>
    )
  }

  const result = compareMarking(exercise, marking)
  return (
    <div className="exercise__rescue">
      <h3>Ton marquage</h3>
      <p lang="fr">{mine}</p>
      <p className="muted">
        Frontières trouvées : {result.found}/{result.total}
        {result.extra > 0 ? ` · ${result.extra} en trop` : ''}
        {result.intonationCompared > 0
          ? ` · intonation juste sur ${result.intonationMatches}/${result.intonationCompared} groupe(s) identiques`
          : ''}
        . Le découpage exact peut varier selon le locuteur : l'objectif est de
        copier celui que tu entends.
      </p>
    </div>
  )
}

function intonationMark(group: ProsodyExercise['groups'][number]): string {
  if (group.intonation === 'rise') return ' ↑'
  if (group.intonation === 'fall') return ' ↓'
  return ''
}

export function ListeningExercise({
  exercise,
  step,
  audioSrc,
  meaningPlays,
  prosodyPlays,
  marking = null,
  onAudioComplete,
  onNext,
  onMarked,
  onUseOwnExtract,
}: ListeningExerciseProps) {
  if (step === 'meaning') {
    const done = meaningPlays >= REQUIRED_MEANING_LISTENS
    return (
      <section className="card exercise exercise--center" aria-live="polite">
        <p className="pill">Écoute 1 / 2</p>
        <h1 className="exercise__intent">Écoute simplement.</h1>
        <p className="muted">Ne lis rien pour l'instant. Comprends seulement le sens.</p>
        <ModelSourceNote exercise={exercise} onUseOwnExtract={onUseOwnExtract} />
        <AudioClip
          src={audioSrc || undefined}
          speechText={exercise.modelKind === 'tts' ? exercise.transcript : undefined}
          speechLocale={exercise.voiceLocale}
          speechRate={speechRateFor(exercise)}
          label="Écouter l'extrait complet"
          variant="block"
          onComplete={onAudioComplete}
        />
        <p className="muted">Écoute complète : {Math.min(meaningPlays, 1)}/1</p>
        <button
          type="button"
          className="button button--block"
          onClick={onNext}
          disabled={!done}
        >
          J'ai écouté
        </button>
      </section>
    )
  }

  if (step === 'prosody') {
    const done = prosodyPlays >= REQUIRED_PROSODY_LISTENS
    return (
      <section className="card exercise" aria-labelledby="prosody-listen-title">
        <p className="pill">Écoute 2 / 2</p>
        <h2 id="prosody-listen-title">Cette fois, écoute :</h2>
        <ul className="exercise__rescue">
          <li>où la personne fait une pause</li>
          <li>où elle continue sans pause</li>
          <li>ce qu'elle prononce ensemble</li>
          <li>où sa voix monte ou descend</li>
          <li>quelles fins de groupes sont légèrement plus longues</li>
        </ul>
        <AudioClip
          src={audioSrc || undefined}
          speechText={exercise.modelKind === 'tts' ? exercise.transcript : undefined}
          speechLocale={exercise.voiceLocale}
          speechRate={speechRateFor(exercise)}
          label="Écouter à nouveau"
          variant="block"
          onComplete={onAudioComplete}
        />
        <p className="muted">Écoute prosodique : {Math.min(prosodyPlays, 1)}/1</p>
        <button
          type="button"
          className="button button--block"
          onClick={onNext}
          disabled={!done}
        >
          Marquer le découpage
        </button>
      </section>
    )
  }

  if (step === 'mark') {
    return (
      <MarkingBoard
        exercise={exercise}
        audioSrc={audioSrc}
        onMarked={(value) => (onMarked ? onMarked(value) : onNext())}
      />
    )
  }

  return (
    <section className="card exercise exercise--center" aria-labelledby="reveal-title">
      <p className="pill">Découpage</p>
      <h2 id="reveal-title">
        {exercise.custom ? 'Ton découpage' : 'Les groupes rythmiques du modèle'}
      </h2>
      {marking ? <MarkingFeedback exercise={exercise} marking={marking} /> : null}
      {exercise.custom ? null : (
      <>
      <p className="prosody-groups" lang="fr">
        {exercise.groups.map((group, index) => (
          <span key={`${group.start}-${group.text}`}>
            <span className="prosody-groups__word">{group.text}</span>
            {group.finalLengthening ? (
              <span className="prosody-groups__mark">—</span>
            ) : null}
            <span className="prosody-groups__mark">{intonationMark(group)}</span>
            {group.liaisonAfter ? <span className="prosody-groups__mark"> ‿liaison</span> : null}
            {group.enchainementAfter ? <span className="prosody-groups__mark"> ‿enchaînement</span> : null}
            {index < exercise.groups.length - 1 ? (
              <span className="prosody-groups__sep"> / </span>
            ) : null}
          </span>
        ))}
      </p>
      <p className="muted">
        <span className="prosody-groups__mark">/</span> frontière ·{' '}
        <span className="prosody-groups__mark">↑</span> monte ·{' '}
        <span className="prosody-groups__mark">↓</span> descend ·{' '}
        <span className="prosody-groups__mark">—</span> syllabe allongée ·{' '}
        <span className="prosody-groups__mark">‿</span> liaison / enchaînement
      </p>
      </>
      )}
      <AudioClip
        src={audioSrc || undefined}
        speechText={exercise.modelKind === 'tts' ? exercise.transcript : undefined}
        speechLocale={exercise.voiceLocale}
        speechRate={speechRateFor(exercise)}
        label="Réécouter avec le découpage visible"
        variant="block"
      />
      <button type="button" className="button button--block" onClick={onNext}>
        Continuer vers l'imitation
      </button>
    </section>
  )
}
