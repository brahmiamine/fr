import type { ProsodyExercise } from '../types'
import { AudioClip } from './AudioClip'

export interface ListeningExerciseProps {
  exercise: ProsodyExercise
  step: 'meaning' | 'prosody' | 'reveal'
  audioSrc: string
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
  onNext,
}: ListeningExerciseProps) {
  if (step === 'meaning') {
    return (
      <section className="card exercise exercise--center" aria-live="polite">
        <p className="pill">Écoute 1 / 2</p>
        <h1 className="exercise__intent">Écoute simplement.</h1>
        <p className="muted">Ne lis rien pour l'instant.</p>
        <AudioClip src={audioSrc} label="Écouter" variant="block" />
        <button type="button" className="button button--block" onClick={onNext}>
          J'ai écouté
        </button>
      </section>
    )
  }

  if (step === 'prosody') {
    return (
      <section className="card exercise" aria-labelledby="prosody-listen-title">
        <p className="pill">Écoute 2 / 2</p>
        <h2 id="prosody-listen-title">Cette fois, écoute :</h2>
        <ul className="exercise__rescue">
          <li>où la personne fait une pause</li>
          <li>ce qu'elle prononce ensemble</li>
          <li>où sa voix monte</li>
          <li>où sa voix descend</li>
          <li>les fins de groupes</li>
        </ul>
        <AudioClip src={audioSrc} label="Écouter à nouveau" variant="block" />
        <button type="button" className="button button--block" onClick={onNext}>
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
          <span key={index}>
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
      <button type="button" className="button button--block" onClick={onNext}>
        Continuer vers l'imitation
      </button>
    </section>
  )
}
