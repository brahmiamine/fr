import type { ProsodyExercise } from '../types'
import {
  REQUIRED_MEANING_LISTENS,
  REQUIRED_PROSODY_LISTENS,
} from '../types'
import { AudioClip } from './AudioClip'

export interface ListeningExerciseProps {
  exercise: ProsodyExercise
  step: 'meaning' | 'prosody' | 'reveal'
  audioSrc: string
  meaningPlays: number
  prosodyPlays: number
  onAudioComplete: () => void
  onNext: () => void
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
  onAudioComplete,
  onNext,
}: ListeningExerciseProps) {
  if (step === 'meaning') {
    const done = meaningPlays >= REQUIRED_MEANING_LISTENS
    return (
      <section className="card exercise exercise--center" aria-live="polite">
        <p className="pill">Écoute 1 / 2</p>
        <h1 className="exercise__intent">Écoute simplement.</h1>
        <p className="muted">Ne lis rien pour l'instant. Comprends seulement le sens.</p>
        <AudioClip
          src={audioSrc}
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
          src={audioSrc}
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
          Voir le découpage
        </button>
      </section>
    )
  }

  return (
    <section className="card exercise exercise--center" aria-labelledby="reveal-title">
      <p className="pill">Découpage</p>
      <h2 id="reveal-title">Les groupes rythmiques</h2>
      <p className="prosody-groups" lang="fr">
        {exercise.groups.map((group, index) => (
          <span key={`${group.start}-${group.text}`}>
            <span className="prosody-groups__word">{group.text}</span>
            {group.finalLengthening ? (
              <span className="prosody-groups__mark">—</span>
            ) : null}
            <span className="prosody-groups__mark">{intonationMark(group)}</span>
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
        <span className="prosody-groups__mark">—</span> syllabe allongée
      </p>
      <AudioClip
        src={audioSrc}
        label="Réécouter avec le découpage visible"
        variant="block"
      />
      <button type="button" className="button button--block" onClick={onNext}>
        Continuer vers l'imitation
      </button>
    </section>
  )
}
