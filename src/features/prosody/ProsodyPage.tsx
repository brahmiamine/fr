import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAppState } from '../../app/AppStateProvider'
import { assetUrl } from '../../services/assets'
import {
  prosodyRepository,
  validateProsodyExercise,
} from '../../services/content/prosodyRepository'
import {
  recentProsodyFocus,
  recordProsodySession,
  toLocalDateString,
} from '../../services/progress/progress'
import {
  advancePlan,
  nextProsodyAssignment,
  pickNewExtract,
} from '../../services/review/prosodyPlan'
import type { ProsodySessionRecord } from '../../types/progress'
import type { ProsodyExercise, ProsodyFocus, ProsodyStage } from './types'
import {
  FOCUS_OPTIONS,
  SLOW_SESSIONS,
  STAGE_LABELS,
  STAGE_ORDER,
  retellingGoalFor,
  withImitationForLevel,
} from './types'
import { buildCustomExercise } from './customExtract'
import { CustomExtractForm } from './components/CustomExtractForm'
import { createProsodySession, prosodyReducer } from './prosodyReducer'
import { useProsodyRecorder } from './hooks/useProsodyRecorder'
import { ColdExercise } from './components/ColdExercise'
import { ListeningExercise } from './components/ListeningExercise'
import { ImitationExercise } from './components/ImitationExercise'
import { ComparisonExercise } from './components/ComparisonExercise'
import { RetellingExercise } from './components/RetellingExercise'
import { IconTile, InfoButton, SegmentedProgress, SkipButton } from '../../components/ui'
import './prosody.css'

export interface ProsodyPageProps {
  exercise?: ProsodyExercise
}

function sessionDurationMinutes(startedAt: string): number {
  return Math.max(1, Math.ceil((Date.now() - new Date(startedAt).getTime()) / 60000))
}

export default function ProsodyPage({ exercise: exerciseProp }: ProsodyPageProps) {
  const { state } = useAppState()
  const [mode, setMode] = useState<'model' | 'import'>('model')
  const [customExercise, setCustomExercise] = useState<ProsodyExercise | null>(null)
  const preferredFocus = useMemo(
    () => recentProsodyFocus(state.prosodySessions),
    // Chosen once per visit so the excerpt does not change mid-session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )
  // The plan decides what to practise today (review > daily > new), unless an
  // exercise is forced by a prop (tests) or a custom extract was imported.
  const assignment = useMemo(
    () => (exerciseProp ? null : nextProsodyAssignment(state)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exerciseProp],
  )
  const exercise = useMemo(
    () => {
      if (exerciseProp) return exerciseProp
      if (!assignment) return null
      const planned = assignment.plan
        ? prosodyRepository.find((item) => item.id === assignment.plan?.exerciseId)
        : undefined
      const picked =
        planned ??
        pickNewExtract(state, Math.random, preferredFocus)
      return picked ? withImitationForLevel(picked, state.prosodySessions.length) : null
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exerciseProp],
  )

  if (mode === 'import') {
    return (
      <div className="training">
        <ProsodyHeader stages={STAGE_ORDER} position={0} title="Mon extrait" />
        <CustomExtractForm
          onCancel={() => setMode('model')}
          onSubmit={(input) => {
            setCustomExercise(buildCustomExercise(input))
            setMode('model')
          }}
        />
      </div>
    )
  }

  if (customExercise) {
    return (
      <ProsodySession
        key={customExercise.id}
        exercise={customExercise}
        preferredFocus={preferredFocus}
        cold={false}
      />
    )
  }

  if (!exercise) {
    const problems = prosodyRepository.map((item) => ({
      id: item.id,
      errors: validateProsodyExercise(item),
    }))
    return (
      <div className="training">
        <ProsodyHeader stages={STAGE_ORDER} position={0} title="Audio à préparer" />
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
          <button
            type="button"
            className="button button--block"
            onClick={() => setMode('import')}
          >
            Utiliser mon propre extrait (vraie voix)
          </button>
          <Link className="button button--ghost button--block" to="/">
            Retour à l'accueil
          </Link>
        </section>
      </div>
    )
  }

  return (
    <ProsodySession
      exercise={exercise}
      preferredFocus={preferredFocus}
      cold={assignment?.cold ?? false}
      onUseOwnExtract={() => setMode('import')}
    />
  )
}

function focusLabel(focus: ProsodyFocus | null): string | null {
  return FOCUS_OPTIONS.find((option) => option.value === focus)?.goal ?? null
}

/** The real list of stages: the "cold" step only exists when reviewing. */
function stagesForSession(cold: boolean): ProsodyStage[] {
  return cold ? STAGE_ORDER : STAGE_ORDER.filter((stage) => stage !== 'cold')
}

function ProsodySession({
  exercise,
  preferredFocus = null,
  cold = false,
  onUseOwnExtract,
}: {
  exercise: ProsodyExercise
  preferredFocus?: ProsodyFocus | null
  cold?: boolean
  onUseOwnExtract?: () => void
}) {
  const { state, updateWith } = useAppState()
  const recorder = useProsodyRecorder()
  const [session, dispatch] = useReducer(prosodyReducer, exercise, (value) =>
    createProsodySession(value, new Date(), retellingGoalFor(state.prosodySessions.length), cold),
  )
  const finalizedRef = useRef(false)

  const audioSrc = exercise.audio
    ? exercise.audio.startsWith('blob:')
      ? exercise.audio
      : assetUrl(exercise.audio)
    : ''
  const recentFocusGoal = focusLabel(preferredFocus)
  const stages = stagesForSession(session.cold)
  const position = stages.indexOf(session.stage) + 1

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
      cold: session.cold,
    }
    updateWith((prev) =>
      advancePlan(recordProsodySession(prev, record), exercise, record.date, now),
    )
  }, [session, exercise, updateWith])

  if (session.completed) {
    return (
      <div className="training">
        <ProsodyHeader stages={stages} position={stages.length} title="Terminé" />
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
      <ProsodyHeader
        stages={stages}
        position={position}
        title={STAGE_LABELS[session.stage]}
        stage={session.stage}
      />

      {recentFocusGoal && session.stage === 'listening' && session.listening.step === 'meaning' ? (
        <p className="pill pill--soft">Ton point de travail récent : {recentFocusGoal}</p>
      ) : null}

      {session.stage === 'cold' ? (
        <ColdExercise
          exercise={exercise}
          recorder={recorder}
          onRecorded={() => dispatch({ type: 'COLD_RECORDED' })}
        />
      ) : null}

      {session.stage === 'listening' ? (
        <ListeningExercise
          exercise={exercise}
          step={session.listening.step}
          audioSrc={audioSrc}
          meaningPlays={session.listening.meaningPlays}
          prosodyPlays={session.listening.prosodyPlays}
          marking={session.listening.marking}
          onAudioComplete={() => dispatch({ type: 'LISTEN_PLAYED' })}
          onNext={() => dispatch({ type: 'LISTEN_NEXT' })}
          onMarked={(marking) => dispatch({ type: 'LISTEN_MARKED', marking })}
          onUseOwnExtract={onUseOwnExtract}
        />
      ) : null}

      {session.stage === 'imitation' ? (
        <ImitationExercise
          exercise={exercise}
          step={session.imitation.step}
          modelPlays={session.imitation.modelPlays}
          audioSrc={audioSrc}
          recorder={recorder}
          slowByDefault={state.prosodySessions.length < SLOW_SESSIONS}
          onModelPlayed={() => dispatch({ type: 'IMITATION_MODEL_PLAYED' })}
          onListened={() => dispatch({ type: 'IMITATION_LISTENED' })}
          onRecorded={() => dispatch({ type: 'IMITATION_RECORDED' })}
          onShadowPlayed={() => dispatch({ type: 'SHADOW_PLAYED' })}
          onShadowDone={() => dispatch({ type: 'SHADOW_DONE' })}
          onMemoryDone={() => dispatch({ type: 'MEMORY_DONE' })}
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
          minSeconds={session.retelling.minSeconds}
          targetSeconds={session.retelling.targetSeconds}
          onStart={() => dispatch({ type: 'RETELL_START' })}
          onRecorded={(durationSeconds) =>
            dispatch({ type: 'RETELL_RECORDED', durationSeconds })
          }
          onDone={() => dispatch({ type: 'RETELL_DONE' })}
        />
      ) : null}

      <SkipButton onClick={() => dispatch({ type: 'SKIP_STAGE' })}>
        {session.stage === 'retelling' ? 'Passer et terminer' : 'Passer cet exercice'}
      </SkipButton>
    </div>
  )
}

function ProsodyHeader({
  stages,
  position,
  title,
  stage,
}: {
  stages: ProsodyStage[]
  position: number
  title: string
  stage?: ProsodyStage
}) {
  const total = stages.length
  const safePosition = Math.max(0, Math.min(position, total))
  return (
    <header className="session-header">
      <div className="session-header__top">
        <div className="session-header__stage">
          <IconTile icon="music" size={40} iconSize={20} />
          <div className="session-header__titles">
            <span className="session-header__label">
              {safePosition}/{total}
            </span>
            <span className="session-header__title">Sonner plus naturel · {title}</span>
          </div>
        </div>
        <div className="session-header__actions">
          {stage ? <InfoButton id={stage} /> : null}
          <Link to="/" className="session-header__exit">Quitter</Link>
        </div>
      </div>
      <SegmentedProgress
        segments={stages.map((_, index) =>
          index < safePosition - 1 || safePosition === total ? 1 : index === safePosition - 1 ? 0.5 : 0,
        )}
        labels={stages.map((item) => STAGE_LABELS[item])}
        activeIndex={safePosition - 1}
        role="progressbar"
        aria-valuenow={safePosition}
        aria-valuemin={0}
        aria-valuemax={total}
      />
    </header>
  )
}
