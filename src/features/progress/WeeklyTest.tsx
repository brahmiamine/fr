import { AudioClip } from '../../components/AudioClip/AudioClip'
import { InfoButton, SkipButton } from '../../components/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { useAppState } from '../../app/AppStateProvider'
import { Timer } from '../../components/Timer/Timer'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import type { SpeechActivity } from '../../services/audio/speechActivity'
import { useAiEnabled } from '../ai/useAiEnabled'
import {
  aiErrorMessage,
  countFillers,
  countMarkers,
  countWords,
  transcribeAudio,
  typeTokenRatio,
} from '../../services/ai/client'
import { contentRepository } from '../../services/content/contentRepository'
import { topicById } from '../../services/review/selectPlan'
import { selectUniqueItems } from '../../services/content/selectContent'
import {
  getWeekKey,
  recordWeeklyTest,
  toLocalDateString,
} from '../../services/progress/progress'
import type { ParaphraseWord, Question, Topic } from '../../types/content'
import type { AppState, WeeklyTaskMeasure, WeeklyTestRecord } from '../../types/progress'

export const KNOWN_SECONDS = 180
export const UNKNOWN_QUESTIONS = 3
export const UNKNOWN_SECONDS = 90
export const PARAPHRASE_WORDS = 10
export const PARAPHRASE_SECONDS = 20
export const L1_SECONDS = 90

type Stage =
  | { kind: 'intro' }
  | { kind: 'known' }
  | { kind: 'unknown'; index: number }
  | { kind: 'paraphrase'; index: number }
  | { kind: 'l1' }
  | { kind: 'between'; next: Stage; label: string }
  | { kind: 'form' }

type ClipKey = 'known' | 'unknown-0' | 'unknown-1' | 'unknown-2' | 'l1'

interface Clip {
  url: string
  activity: SpeechActivity | null
}

interface TestContent {
  known: Topic
  knownIsFromWeek: boolean
  questions: Question[]
  words: ParaphraseWord[]
}

/** A subject worked during the week (the last one), else a recent one, else any. */
function knownTopic(state: AppState): { topic: Topic; fromWeek: boolean } {
  const weekKey = getWeekKey()
  const sorted = [...state.sessions].sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  for (const session of sorted) {
    const topic = topicById(session.topicId)
    if (topic) return { topic, fromWeek: session.date >= weekKey }
  }
  const pool = contentRepository.topics
  return { topic: pool[Math.floor(Math.random() * pool.length)], fromWeek: false }
}

function pickContent(state: AppState): TestContent {
  const { topic, fromWeek } = knownTopic(state)
  // "Jamais vues": no question already asked in any session (not only the 15
  // most recent) nor in a previous test.
  const asked = [
    ...state.recentQuestionIds,
    ...state.sessions.flatMap((session) => session.questionIds),
    ...state.weeklyTests.flatMap((test) => test.questionIds ?? []),
  ]
  return {
    known: topic,
    knownIsFromWeek: fromWeek,
    questions: selectUniqueItems(contentRepository.questions, UNKNOWN_QUESTIONS, asked),
    words: selectUniqueItems(contentRepository.paraphraseWords, PARAPHRASE_WORDS, state.recentWordIds),
  }
}

function measureOf(activity: SpeechActivity | null | undefined): WeeklyTaskMeasure | undefined {
  if (!activity) return undefined
  return {
    startDelaySeconds: activity.startDelaySeconds,
    longPauses: activity.longPauses,
    meanPauseSeconds: activity.meanPauseSeconds ?? 0,
    longestSpeechSeconds: activity.longestSpeechSeconds,
  }
}

/** The unknown task as one measure: mean start delay, total pauses, longest stretch. */
export function combineUnknown(activities: readonly (SpeechActivity | null)[]): WeeklyTaskMeasure | undefined {
  const measured = activities.filter((activity): activity is SpeechActivity => Boolean(activity))
  if (measured.length === 0) return undefined
  const mean = (values: number[]) =>
    Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
  const pauses = measured.reduce((sum, activity) => sum + (activity.shortPauses ?? 0), 0)
  const pausedSeconds = measured.reduce(
    (sum, activity) => sum + (activity.meanPauseSeconds ?? 0) * (activity.shortPauses ?? 0),
    0,
  )
  return {
    startDelaySeconds: mean(measured.map((activity) => activity.startDelaySeconds)),
    longPauses: measured.reduce((sum, activity) => sum + activity.longPauses, 0),
    meanPauseSeconds: pauses > 0 ? Math.round((pausedSeconds / pauses) * 100) / 100 : 0,
    longestSpeechSeconds: Math.max(...measured.map((activity) => activity.longestSpeechSeconds)),
  }
}

function emptyMeasurement() {
  return {
    startDelaySeconds: '',
    midSentencePauses: '',
    betweenIdeaPauses: '',
    majorFillers: '',
    markers: '',
    abandonedSentences: '',
    longestFluentSegmentSeconds: '',
    wordsKnown: '',
    wordsUnknown: '',
    score: '',
  }
}

function toNumber(value: string): number {
  return value.trim() === '' ? 0 : Math.max(0, Number(value))
}

function perMinute(words: string, seconds: number): number | undefined {
  if (words.trim() === '') return undefined
  return Math.round(toNumber(words) / (seconds / 60))
}

export default function WeeklyTest() {
  const { state, updateWith } = useAppState()
  const weekKey = getWeekKey()
  const existing = state.weeklyTests.find((test) => test.weekKey === weekKey)
  const needsBaseline = !state.weeklyTests.some((test) => test.l1Baseline)

  const [content, setContent] = useState<TestContent | null>(null)
  const [stage, setStage] = useState<Stage>({ kind: 'intro' })
  const [clips, setClips] = useState<Partial<Record<ClipKey, Clip>>>({})
  const [guessed, setGuessed] = useState<boolean[]>([])
  const [measurement, setMeasurement] = useState(emptyMeasurement())
  const [ttr, setTtr] = useState<number | null>(null)
  const recorder = useAudioRecorder({ measureLevels: true })
  const pendingRef = useRef<ClipKey | null>(null)
  const aiEnabled = useAiEnabled()
  const [aiState, setAiState] = useState<{
    status: 'idle' | 'loading' | 'done' | 'error'
    message: string
    transcript: string
  }>({ status: 'idle', message: '', transcript: '' })

  // Each finished recording is kept with what the microphone measured on it.
  const { blobUrl, activity } = recorder
  useEffect(() => {
    if (!blobUrl || !pendingRef.current) return
    const key = pendingRef.current
    pendingRef.current = null
    setClips((previous) => ({ ...previous, [key]: { url: blobUrl, activity: activity ?? null } }))
  }, [blobUrl, activity])

  const unknownMeasure = useMemo(
    () =>
      combineUnknown(
        Array.from({ length: UNKNOWN_QUESTIONS }, (_, index) => clips[`unknown-${index}` as ClipKey]?.activity ?? null),
      ),
    [clips],
  )

  // Pre-fill what the microphone measured; the learner can still correct it.
  useEffect(() => {
    if (stage.kind !== 'form' || !unknownMeasure) return
    setMeasurement((prev) => ({
      ...prev,
      startDelaySeconds: prev.startDelaySeconds || String(unknownMeasure.startDelaySeconds),
      longestFluentSegmentSeconds:
        prev.longestFluentSegmentSeconds || String(Math.round(unknownMeasure.longestSpeechSeconds)),
    }))
  }, [stage.kind, unknownMeasure])

  if (existing) {
    return (
      <section className="card weekly-test" aria-labelledby="weekly-done">
        <h2 id="weekly-done">Test de la semaine ✓</h2>
        <p className="muted">Déjà réalisé cette semaine. Reviens lundi.</p>
        <ul className="weekly-test__summary">
          <li>Démarrage (questions inconnues) : {existing.startDelaySeconds}s</li>
          <li>Pauses au milieu d'une phrase : {existing.midSentencePauses ?? existing.longPauses}</li>
          <li>Pauses entre deux idées : {existing.betweenIdeaPauses ?? 0}</li>
          <li>« euh » nus : {existing.majorFillers} · marqueurs français : {existing.markers ?? '—'}</li>
          <li>Phrases abandonnées : {existing.abandonedSentences}</li>
          <li>
            Mots contournés : {existing.successfulParaphrases}
            {existing.paraphraseAttempts ? `/${existing.paraphraseAttempts}` : ''}
          </li>
          <li>Plus long segment fluide : {existing.longestFluentSegmentSeconds}s</li>
          {existing.known?.wordsPerMinute !== undefined || existing.unknown?.wordsPerMinute !== undefined ? (
            <li>
              Débit : connu {existing.known?.wordsPerMinute ?? '—'} · inconnu{' '}
              {existing.unknown?.wordsPerMinute ?? '—'} mots/min
            </li>
          ) : null}
          {existing.unknown ? <li>Durée moyenne des pauses : {existing.unknown.meanPauseSeconds} s</li> : null}
          <li>Score ressenti : {existing.score}/5</li>
        </ul>
      </section>
    )
  }

  const startRecording = async (key: ClipKey) => {
    pendingRef.current = key
    if (recorder.supported) await recorder.start()
  }

  const finishRecording = (next: Stage, label: string) => {
    recorder.stop()
    setStage({ kind: 'between', next, label })
  }

  const begin = async (next: Stage) => {
    if (next.kind === 'known') await startRecording('known')
    if (next.kind === 'unknown') await startRecording(`unknown-${next.index}` as ClipKey)
    if (next.kind === 'l1') await startRecording('l1')
    setStage(next)
  }

  const afterParaphrase = (index: number): Stage =>
    index + 1 < (content?.words.length ?? 0)
      ? { kind: 'paraphrase', index: index + 1 }
      : needsBaseline
        ? { kind: 'between', next: { kind: 'l1' }, label: 'Référence dans ta langue maternelle (une seule fois)' }
        : { kind: 'form' }

  const guess = (index: number, success: boolean) => {
    setGuessed((previous) => {
      const next = [...previous]
      next[index] = success
      return next
    })
    setStage(afterParaphrase(index))
  }

  const countWithAi = async () => {
    setAiState({ status: 'loading', message: '', transcript: '' })
    try {
      const known = clips.known ? (await transcribeAudio(clips.known.url)).text : ''
      const unknownTexts: string[] = []
      for (let index = 0; index < UNKNOWN_QUESTIONS; index += 1) {
        const clip = clips[`unknown-${index}` as ClipKey]
        if (clip) unknownTexts.push((await transcribeAudio(clip.url)).text)
      }
      const unknown = unknownTexts.join(' ')
      setMeasurement((prev) => ({
        ...prev,
        wordsKnown: known ? String(countWords(known)) : prev.wordsKnown,
        wordsUnknown: unknown ? String(countWords(unknown)) : prev.wordsUnknown,
        majorFillers: String(countFillers(`${known} ${unknown}`)),
        markers: String(countMarkers(`${known} ${unknown}`)),
      }))
      setTtr(typeTokenRatio(unknown))
      setAiState({ status: 'done', message: '', transcript: `${known}\n\n${unknown}`.trim() })
    } catch (caught) {
      setAiState({ status: 'error', message: aiErrorMessage(caught), transcript: '' })
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!content) return
    const now = new Date()
    const midSentencePauses = toNumber(measurement.midSentencePauses)
    const betweenIdeaPauses = toNumber(measurement.betweenIdeaPauses)
    const knownMeasure = measureOf(clips.known?.activity)
    const unknownSeconds = UNKNOWN_QUESTIONS * UNKNOWN_SECONDS
    const l1 = clips.l1?.activity
    const record: WeeklyTestRecord = {
      id: `wt-${weekKey}`,
      weekKey,
      date: toLocalDateString(now),
      topicId: content.known.id,
      questionIds: content.questions.map((question) => question.id),
      durationMinutes: 20,
      startDelaySeconds: toNumber(measurement.startDelaySeconds),
      longPauses: midSentencePauses + betweenIdeaPauses,
      midSentencePauses,
      betweenIdeaPauses,
      majorFillers: toNumber(measurement.majorFillers),
      markers: toNumber(measurement.markers),
      successfulParaphrases: guessed.filter(Boolean).length,
      paraphraseAttempts: content.words.length,
      // Shown words that could not be made guessed: they come back to paraphrase.
      failedParaphraseIds: content.words
        .filter((_, index) => guessed[index] === false)
        .map((word) => word.id),
      abandonedSentences: toNumber(measurement.abandonedSentences),
      longestFluentSegmentSeconds: toNumber(measurement.longestFluentSegmentSeconds),
      // The known task lasts 3 minutes: words ÷ 3 stays the speaking rate.
      wordsSpoken: toNumber(measurement.wordsKnown),
      score: Math.min(5, Math.max(1, toNumber(measurement.score) || 3)),
      ...(knownMeasure
        ? { known: { ...knownMeasure, wordsPerMinute: perMinute(measurement.wordsKnown, KNOWN_SECONDS) } }
        : measurement.wordsKnown
          ? { known: { startDelaySeconds: 0, longPauses: 0, meanPauseSeconds: 0, longestSpeechSeconds: 0, wordsPerMinute: perMinute(measurement.wordsKnown, KNOWN_SECONDS) } }
          : {}),
      ...(unknownMeasure
        ? {
            unknown: { ...unknownMeasure, wordsPerMinute: perMinute(measurement.wordsUnknown, unknownSeconds) },
            measured: {
              startDelaySeconds: unknownMeasure.startDelaySeconds,
              longPauses: unknownMeasure.longPauses,
              longestSpeechSeconds: unknownMeasure.longestSpeechSeconds,
              speechRatio: 0,
              meanPauseSeconds: unknownMeasure.meanPauseSeconds,
            },
          }
        : {}),
      ...(ttr !== null ? { typeTokenRatio: ttr } : {}),
      ...(l1 ? { l1Baseline: measureOf(l1) } : {}),
    }
    updateWith((prev) => recordWeeklyTest(prev, record))
    setStage({ kind: 'intro' })
  }

  const knownWpm = perMinute(measurement.wordsKnown, KNOWN_SECONDS)
  const unknownWpm = perMinute(measurement.wordsUnknown, UNKNOWN_QUESTIONS * UNKNOWN_SECONDS)

  return (
    <section className="card weekly-test" aria-labelledby="weekly-title">
      <div className="title-row">
        <h2 id="weekly-title">Test de fluidité hebdomadaire</h2>
        <InfoButton id="weeklyTest" />
      </div>

      {stage.kind === 'intro' || !content ? (
        <>
          <p className="muted">
            Même jour, même heure, mêmes conditions chaque semaine (≈ 20 min) :
          </p>
          <ol className="muted">
            <li>Tâche connue : 3 minutes sur un sujet travaillé cette semaine.</li>
            <li>Tâche inconnue : 3 questions jamais vues, 90 secondes chacune, démarrage immédiat.</li>
            <li>Contournement : 10 mots à faire deviner sans les dire, 20 secondes chacun.</li>
            {needsBaseline ? (
              <li>La première fois : une question dans ta langue maternelle, ton plafond réaliste.</li>
            ) : null}
          </ol>
          <p className="muted">
            {recorder.supported
              ? "Ta voix est enregistrée (uniquement en mémoire) pour mesurer le temps avant le premier mot, les pauses et ta plus longue séquence continue."
              : 'Sans micro disponible, note tes mesures juste après avoir parlé.'}
          </p>
          <button
            type="button"
            className="button button--block"
            onClick={() => {
              setContent(pickContent(state))
              setClips({})
              setGuessed([])
              setMeasurement(emptyMeasurement())
              setTtr(null)
              void begin({ kind: 'known' })
            }}
          >
            Lancer le test
          </button>
        </>
      ) : null}

      {stage.kind === 'known' && content ? (
        <>
          <p className="pill">1/3 · Tâche connue</p>
          <h3 className="weekly-test__topic">{content.known.title}</h3>
          {!content.knownIsFromWeek ? (
            <p className="muted">Aucun sujet travaillé cette semaine : prends celui-ci comme sujet connu.</p>
          ) : null}
          <Timer
            durationSeconds={KNOWN_SECONDS}
            autoStart
            hideControls
            label="Parle librement"
            onComplete={() =>
              finishRecording({ kind: 'unknown', index: 0 }, 'Tâche inconnue : 3 questions, démarrage immédiat')
            }
          />
          <SkipButton
            onClick={() =>
              finishRecording({ kind: 'unknown', index: 0 }, 'Tâche inconnue : 3 questions, démarrage immédiat')
            }
          >
            Passer à la tâche inconnue
          </SkipButton>
        </>
      ) : null}

      {stage.kind === 'unknown' && content ? (
        <>
          <p className="pill">
            2/3 · Question inconnue {stage.index + 1}/{content.questions.length}
          </p>
          <h3 className="weekly-test__topic">{content.questions[stage.index]?.text}</h3>
          <Timer
            key={stage.index}
            durationSeconds={UNKNOWN_SECONDS}
            autoStart
            hideControls
            label="Réponds tout de suite"
            onComplete={() => {
              const nextIndex = stage.index + 1
              finishRecording(
                nextIndex < content.questions.length
                  ? { kind: 'unknown', index: nextIndex }
                  : { kind: 'paraphrase', index: 0 },
                nextIndex < content.questions.length
                  ? `Question inconnue ${nextIndex + 1}/${content.questions.length}`
                  : 'Contournement : 10 mots, 20 secondes chacun',
              )
            }}
          />
        </>
      ) : null}

      {stage.kind === 'paraphrase' && content ? (
        <>
          <p className="pill">
            3/3 · Contournement {stage.index + 1}/{content.words.length}
          </p>
          <p className="muted">Fais deviner ce mot sans le dire (à quelqu'un, ou à toi-même) :</p>
          <h3 className="weekly-test__topic">{content.words[stage.index]?.word}</h3>
          <Timer
            key={stage.index}
            durationSeconds={PARAPHRASE_SECONDS}
            autoStart
            hideControls
            compact
            secondsOnly
            onComplete={() => guess(stage.index, false)}
          />
          <div className="button-row">
            <button type="button" className="button" onClick={() => guess(stage.index, true)}>
              Deviné
            </button>
            <button type="button" className="button button--ghost" onClick={() => guess(stage.index, false)}>
              Pas deviné
            </button>
          </div>
        </>
      ) : null}

      {stage.kind === 'l1' && content ? (
        <>
          <p className="pill">Référence L1 (une seule fois)</p>
          <p className="muted">Réponds dans ta langue maternelle :</p>
          <h3 className="weekly-test__topic">{content.questions[0]?.text}</h3>
          <Timer
            durationSeconds={L1_SECONDS}
            autoStart
            hideControls
            label="Réponds"
            onComplete={() => finishRecording({ kind: 'form' }, 'Mesures')}
          />
        </>
      ) : null}

      {stage.kind === 'between' ? (
        <div className="stack">
          <p className="muted">Partie terminée. Ensuite : {stage.label}.</p>
          <button type="button" className="button button--block" onClick={() => void begin(stage.next)}>
            Continuer
          </button>
          {stage.next.kind === 'l1' ? (
            <SkipButton onClick={() => setStage({ kind: 'form' })}>Passer la référence L1</SkipButton>
          ) : null}
        </div>
      ) : null}

      {stage.kind === 'form' && content ? (
        <form onSubmit={handleSubmit}>
          <h3>Mesures</h3>
          <div className="exercise__rescue">
            <p className="muted">
              Réécoute tes questions inconnues pour classer tes pauses : au milieu
              d'une phrase (difficulté de formulation) ou entre deux idées.
            </p>
            {clips.known ? <AudioClip src={clips.known.url} label="Tâche connue" /> : null}
            {content.questions.map((question, index) =>
              clips[`unknown-${index}` as ClipKey] ? (
                <AudioClip
                  key={question.id}
                  src={clips[`unknown-${index}` as ClipKey]?.url}
                  label={`Question inconnue ${index + 1}`}
                />
              ) : null,
            )}
          </div>

          {unknownMeasure || clips.known?.activity ? (
            <div className="exercise__rescue" aria-live="polite">
              <h3>Mesuré automatiquement</h3>
              <ul>
                {unknownMeasure ? (
                  <>
                    <li>Temps avant de parler (moyenne des questions) : {unknownMeasure.startDelaySeconds} s</li>
                    <li>Pauses de plus d'1 s (questions) : {unknownMeasure.longPauses}</li>
                    <li>Durée moyenne des pauses ≥ 250 ms : {unknownMeasure.meanPauseSeconds} s</li>
                    <li>Plus longue séquence continue : {unknownMeasure.longestSpeechSeconds} s</li>
                  </>
                ) : null}
                {clips.known?.activity ? (
                  <li>Tâche connue : {clips.known.activity.longPauses} pauses de plus d'1 s</li>
                ) : null}
              </ul>
            </div>
          ) : null}

          <p className="pill">
            Mots contournés : {guessed.filter(Boolean).length}/{content.words.length}
          </p>

          {aiEnabled && (clips.known || clips['unknown-0']) ? (
            <div className="exercise__rescue" aria-live="polite">
              <h3>Compter avec l'IA</h3>
              <p className="muted">
                L'IA transcrit tes enregistrements pour compter les mots, les « euh »
                nus, les marqueurs français et la diversité du vocabulaire. Les pauses
                restent à classer toi-même. La transcription est réglée pour garder les
                « euh », mais vérifie à l'oreille. L'audio est envoyé à un service d'IA.
              </p>
              <button
                type="button"
                className="button button--block"
                disabled={aiState.status === 'loading'}
                onClick={() => void countWithAi()}
              >
                {aiState.status === 'loading' ? 'Transcription…' : 'Compter avec l’IA'}
              </button>
              {aiState.status === 'done' ? (
                <details className="ai-transcript">
                  <summary>Voir la transcription</summary>
                  <p>{aiState.transcript}</p>
                </details>
              ) : null}
              {ttr !== null ? <p className="muted">Diversité (200 premiers mots) : {ttr}</p> : null}
              {aiState.status === 'error' ? (
                <p role="alert" className="ai-error">{aiState.message}</p>
              ) : null}
            </div>
          ) : null}

          {(
            [
              ['startDelaySeconds', 'Temps avant de démarrer, questions inconnues (s)'],
              ['midSentencePauses', "Pauses > 1 s au milieu d'une phrase"],
              ['betweenIdeaPauses', 'Pauses > 1 s entre deux idées'],
              ['abandonedSentences', 'Phrases abandonnées'],
              ['majorFillers', '« euh » / « hum » nus'],
              ['markers', 'Marqueurs français (« disons », « en fait », « bon »…)'],
              ['longestFluentSegmentSeconds', 'Durée max sans blocage (s)'],
              ['wordsKnown', 'Mots prononcés, tâche connue (3 min)'],
              ['wordsUnknown', 'Mots prononcés, questions inconnues (4 min 30)'],
            ] as const
          ).map(([field, label]) => (
            <div className="field" key={field}>
              <label htmlFor={`wt-${field}`}>{label}</label>
              <input
                id={`wt-${field}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={measurement[field]}
                onChange={(event) =>
                  setMeasurement((prev) => ({
                    ...prev,
                    [field]: event.target.value,
                  }))
                }
              />
            </div>
          ))}

          {knownWpm !== undefined && unknownWpm !== undefined ? (
            <p className="muted">
              Débit : connu {knownWpm} · inconnu {unknownWpm} mots/min. L'écart entre
              les deux est ton indicateur de transfert : il doit se réduire.
            </p>
          ) : null}

          <div className="field">
            <label htmlFor="wt-score">Score ressenti (1 à 5)</label>
            <select
              id="wt-score"
              value={measurement.score}
              onChange={(event) =>
                setMeasurement((prev) => ({ ...prev, score: event.target.value }))
              }
            >
              <option value="">Choisir…</option>
              {[1, 2, 3, 4, 5].map((score) => (
                <option key={score} value={score}>{score}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="button button--block">
            Enregistrer le test
          </button>
          <SkipButton onClick={() => setStage({ kind: 'intro' })}>Passer, sans enregistrer</SkipButton>
        </form>
      ) : null}
    </section>
  )
}
