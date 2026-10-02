import { useMemo, useReducer } from 'react'
import { Link } from 'react-router-dom'
import { assetUrl } from '../../services/assets'
import { prosodyRepository } from '../../services/content/prosodyRepository'
import type { ProsodyExercise } from './types'
import { STAGE_LABELS, STAGE_ORDER } from './types'
import { createProsodySession, prosodyReducer } from './prosodyReducer'
import { useProsodyRecorder } from './hooks/useProsodyRecorder'
import { ListeningExercise } from './components/ListeningExercise'
import { ImitationExercise } from './components/ImitationExercise'
import { ComparisonExercise } from './components/ComparisonExercise'
import { RetellingExercise } from './components/RetellingExercise'
import './prosody.css'

export interface ProsodyPageProps {
  /** Injectable for tests; otherwise an exercise is picked at random. */
  exercise?: ProsodyExercise
}

export default function ProsodyPage({ exercise: exerciseProp }: ProsodyPageProps) {
  const recorder = useProsodyRecorder()

  const exercise = useMemo<ProsodyExercise>(() => {
    if (exerciseProp) return exerciseProp
    return prosodyRepository[
      Math.floor(Math.random() * prosodyRepository.length)
    ]
  }, [exerciseProp])

  const [session, dispatch] = useReducer(
    prosodyReducer,
    exercise,
    createProsodySession,
  )

  const audioSrc = assetUrl(exercise.audio)
  const position = STAGE_ORDER.indexOf(session.stage) + 1

  if (session.completed) {
    return (
      <div className="training">
        <ProsodyHeader position={4} title="Terminé" />
        <section className="card exercise exercise--center">
          <h1>Séance prosodie terminée</h1>
          <p className="muted">
            Tu as écouté, imité, comparé et reformulé. Reviens régulièrement pour
            ancrer le rythme du français.
          </p>
          <div className="stack">
            <Link className="button button--block" to="/">
              Retour à l'accueil
            </Link>
            <button
              type="button"
              className="button button--ghost button--block"
              onClick={() => window.location.reload()}
            >
              Faire un autre extrait
            </button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="training">
      <ProsodyHeader
        position={position}
        title={STAGE_LABELS[session.stage]}
      />

      {session.stage === 'listening' ? (
        <ListeningExercise
          exercise={exercise}
          step={session.listening.step}
          audioSrc={audioSrc}
          onNext={() => dispatch({ type: 'LISTEN_NEXT' })}
        />
      ) : null}

      {session.stage === 'imitation' ? (
        <ImitationExercise
          exercise={exercise}
          step={session.imitation.step}
          audioSrc={audioSrc}
          recorder={recorder}
          onListened={() => dispatch({ type: 'IMITATION_LISTENED' })}
          onRecorded={() => dispatch({ type: 'IMITATION_RECORDED' })}
          onShadowDone={() => dispatch({ type: 'SHADOW_DONE' })}
        />
      ) : null}

      {session.stage === 'comparison' ? (
        <ComparisonExercise
          exercise={exercise}
          step={session.comparison.step}
          focus={session.comparison.focus}
          audioSrc={audioSrc}
          recorder={recorder}
          onAbaDone={() => dispatch({ type: 'COMPARISON_DONE' })}
          onChooseFocus={(focus) => dispatch({ type: 'CHOOSE_FOCUS', focus })}
          onRetryDone={() => dispatch({ type: 'RETRY_DONE' })}
          onCompareDone={() => dispatch({ type: 'COMPARE_DONE' })}
        />
      ) : null}

      {session.stage === 'retelling' ? (
        <RetellingExercise
          exercise={exercise}
          step={session.retelling.step}
          recorder={recorder}
          onStart={() => dispatch({ type: 'RETELL_START' })}
          onRecorded={() => dispatch({ type: 'RETELL_RECORDED' })}
          onDone={() => dispatch({ type: 'RETELL_DONE' })}
        />
      ) : null}
    </div>
  )
}

function ProsodyHeader({ position, title }: { position: number; title: string }) {
  return (
    <header className="session-header">
      <div className="session-header__top">
        <div className="session-header__stage">
          <span className="session-header__icon" aria-hidden="true">
            🎵
          </span>
          <div className="session-header__titles">
            <span className="session-header__label">
              {position}/{STAGE_ORDER.length}
            </span>
            <span className="session-header__title">Sonner plus naturel · {title}</span>
          </div>
        </div>
        <Link to="/" className="session-header__exit">
          Quitter
        </Link>
      </div>
      <div
        className="session-header__progress"
        role="progressbar"
        aria-valuenow={position}
        aria-valuemin={0}
        aria-valuemax={STAGE_ORDER.length}
      >
        <span
          className="session-header__progress-fill"
          style={{ width: `${(position / STAGE_ORDER.length) * 100}%` }}
        />
      </div>
    </header>
  )
}
