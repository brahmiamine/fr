import { useEffect, useMemo, useReducer, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../../app/AppStateProvider'
import { assetUrl } from '../../services/assets'
import {
  pickReadyProsodyExercise,
  prosodyRepository,
  validateProsodyExercise,
} from '../../services/content/prosodyRepository'
import {
  recordProsodySession,
  toLocalDateString,
} from '../../services/progress/progress'
import type { ProsodySessionRecord } from '../../types/progress'
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
  exercise?: ProsodyExercise
}

function sessionDurationMinutes(startedAt: string): number {
  return Math.max(1, Math.ceil((Date.now() - new Date(startedAt).getTime()) / 60000))
}

export default function ProsodyPage({ exercise: exerciseProp }: ProsodyPageProps) {
  const { state } = useAppState()
  const exercise = useMemo(
    () =>
      exerciseProp ??
      pickReadyProsodyExercise(state.recentProsodyIds),
    [exerciseProp, state.recentProsodyIds],
  )

  if (!exercise) {
    const problems = prosodyRepository.map((item) => ({
      id: item.id,
      errors: validateProsodyExercise(item),
    }))
    return (
      <div className="training">
        <ProsodyHeader position={0} title="Audio à préparer" />
        <section className="card exercise">
          <h1>Les extraits modèles ne sont pas encore prêts</h1>
          <p className="muted">
            Sonner plus naturel exige une vraie voix française naturelle. Les
            fichiers de démonstration silencieux sont volontairement refusés.
          </p>
          <div className="exercise__rescue">
            <h3>Pour activer un extrait</h3>
            <ul>
              <li>remplace le WAV placeholder par un vrai enregistrement autorisé ;</li>
              <li>vise 10–30 s pour l'extrait complet ;</li>
              <li>définis un segment d'imitation de 5–15 s ;</li>
              <li>ajuste les timestamps des groupes ;</li>
              <li>passe <code>ready</code> à <code>true</code> dans prosody.json.</li>
            </ul>
          </div>
          <details>
            <summary>Diagnostic du contenu</summary>
            <ul>
              {problems.map((item) => (
                <li key={item.id}>
                  {item.id} : {item.errors.join(', ') || 'prêt'}
                </li>
              ))}
            </ul>
          </details>
          <Link className="button button--block" to="/">
            Retour à l'accueil
          </Link>
        </section>
      </div>
    )
  }

  return <ProsodySession exercise={exercise} />
}

function ProsodySession({ exercise }: { exercise: ProsodyExercise }) {
  const { updateWith } = useAppState()
  const recorder = useProsodyRecorder()
  const [session, dispatch] = useReducer(
    prosodyReducer,
    exercise,
    createProsodySession,
  )
  const finalizedRef = useRef(false)

  const audioSrc = assetUrl(exercise.audio)
  const position = STAGE_ORDER.indexOf(session.stage) + 1

  useEffect(() => {
    if (!session.completed || finalizedRef.current) return
    finalizedRef.current = true
    const now = new Date()
    const record: ProsodySessionRecord = {
      id: session.id,
      exerciseId: exercise.id,
      date: toLocalDateString(now),
      completedAt: now.toISOString(),
      durationMinutes: sessionDurationMinutes(session.startedAt),
      focus: session.comparison.focus,
      retellingSeconds: session.retelling.durationSeconds,
    }
    updateWith((prev) => recordProsodySession(prev, record))
  }, [session, exercise.id, updateWith])

  if (session.completed) {
    return (
      <div className="training">
        <ProsodyHeader position={STAGE_ORDER.length} title="Terminé" />
        <section className="card exercise exercise--center">
          <h1>Séance prosodie terminée</h1>
          <p className="exercise__expression">
            {sessionDurationMinutes(session.startedAt)} min
          </p>
          <p className="muted">
            Tu as écouté, imité, comparé, corrigé un seul point puis reformulé
            sans modèle.
          </p>
          <div className="stack">
            <Link className="button button--block" to="/progress">
              Voir ma progression
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
      <ProsodyHeader position={position} title={STAGE_LABELS[session.stage]} />

      {session.stage === 'listening' ? (
        <ListeningExercise
          exercise={exercise}
          step={session.listening.step}
          audioSrc={audioSrc}
          meaningPlays={session.listening.meaningPlays}
          prosodyPlays={session.listening.prosodyPlays}
          onAudioComplete={() => dispatch({ type: 'LISTEN_PLAYED' })}
          onNext={() => dispatch({ type: 'LISTEN_NEXT' })}
        />
      ) : null}

      {session.stage === 'imitation' ? (
        <ImitationExercise
          exercise={exercise}
          step={session.imitation.step}
          modelPlays={session.imitation.modelPlays}
          shadowPlays={session.imitation.shadowPlays}
          audioSrc={audioSrc}
          recorder={recorder}
          onModelPlayed={() => dispatch({ type: 'IMITATION_MODEL_PLAYED' })}
          onListened={() => dispatch({ type: 'IMITATION_LISTENED' })}
          onRecorded={() => dispatch({ type: 'IMITATION_RECORDED' })}
          onShadowPlayed={() => dispatch({ type: 'SHADOW_PLAYED' })}
          onShadowDone={() => dispatch({ type: 'SHADOW_DONE' })}
        />
      ) : null}

      {session.stage === 'comparison' ? (
        <ComparisonExercise
          exercise={exercise}
          step={session.comparison.step}
          focus={session.comparison.focus}
          abaCompleted={session.comparison.abaCompleted}
          audioSrc={audioSrc}
          recorder={recorder}
          onAbaComplete={() => dispatch({ type: 'ABA_COMPLETE' })}
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
          durationSeconds={session.retelling.durationSeconds}
          onStart={() => dispatch({ type: 'RETELL_START' })}
          onRecorded={(durationSeconds) =>
            dispatch({ type: 'RETELL_RECORDED', durationSeconds })
          }
          onDone={() => dispatch({ type: 'RETELL_DONE' })}
        />
      ) : null}
    </div>
  )
}

function ProsodyHeader({ position, title }: { position: number; title: string }) {
  const safePosition = Math.max(0, position)
  return (
    <header className="session-header">
      <div className="session-header__top">
        <div className="session-header__stage">
          <span className="session-header__icon" aria-hidden="true">🎵</span>
          <div className="session-header__titles">
            <span className="session-header__label">
              {safePosition}/{STAGE_ORDER.length}
            </span>
            <span className="session-header__title">Sonner plus naturel · {title}</span>
          </div>
        </div>
        <Link to="/" className="session-header__exit">Quitter</Link>
      </div>
      <div
        className="session-header__progress"
        role="progressbar"
        aria-valuenow={safePosition}
        aria-valuemin={0}
        aria-valuemax={STAGE_ORDER.length}
      >
        <span
          className="session-header__progress-fill"
          style={{ width: `${(safePosition / STAGE_ORDER.length) * 100}%` }}
        />
      </div>
    </header>
  )
}
