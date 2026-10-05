import { useCallback, useEffect, useRef, useState } from 'react'
import { AudioClip } from '../../components/AudioClip/AudioClip'
import { Button, Card, Eyebrow, Icon, Pill, ProgressBar, WaveBars } from '../../components/ui'
import { useAudioRecorder } from '../../hooks/useAudioRecorder'
import { runAiTask } from '../../services/ai/client'
import { contentRepository } from '../../services/content/contentRepository'
import { AiAnalysisPanel } from './AiAnalysisPanel'
import './ai.css'

/** Picks a different theme for each question. */
const RANDOM_THEME = 'aleatoire'

const THEMES: { id: string; label: string }[] = [
  { id: RANDOM_THEME, label: 'Aléatoire' },
  { id: 'societe', label: 'Société' },
  { id: 'quotidien', label: 'Quotidien' },
  { id: 'technologie', label: 'Technologie' },
  { id: 'education', label: 'Éducation' },
  { id: 'travail', label: 'Travail' },
  { id: 'culture', label: 'Culture' },
  { id: 'voyage', label: 'Voyage' },
  { id: 'sante', label: 'Santé' },
  { id: 'environnement', label: 'Environnement' },
  { id: 'relations', label: 'Relations' },
  { id: 'argent', label: 'Argent' },
  { id: 'sport', label: 'Sport' },
  { id: 'logement', label: 'Logement' },
  { id: 'mobilite', label: 'Mobilité' },
  { id: 'habitudes', label: 'Habitudes' },
  { id: 'projets', label: 'Projets' },
]

const COUNTS = [5, 10]
const SECONDS = [30, 60, 90]
const READING = [5, 10, 15]
const COUNTDOWN_SECONDS = 3

type Phase = 'setup' | 'countdown' | 'reading' | 'speaking' | 'summary'

/** The whole series in one AI request; an empty list when the AI cannot answer. */
async function fetchSeries(themeId: string, count: number, avoid: string[]): Promise<string[]> {
  // No theme: the AI varies the subject from one question to the next.
  const theme =
    themeId === RANDOM_THEME ? '' : (THEMES.find((item) => item.id === themeId)?.label ?? themeId)
  try {
    const { data } = await runAiTask<{ questions?: string[]; text?: string }>('question', {
      theme,
      count,
      avoid: avoid.slice(-8),
    })
    return data.questions ?? (data.text ? [data.text] : [])
  } catch {
    return []
  }
}

/** A question from the built-in bank, in the theme when possible. */
function bankQuestion(themeId: string, avoid: string[]): string {
  const pool = contentRepository.questions.filter(
    (question) =>
      (themeId === RANDOM_THEME || question.category === themeId) && !avoid.includes(question.text),
  )
  const fallback = pool.length > 0 ? pool : contentRepository.questions
  return fallback[Math.floor(Math.random() * fallback.length)].text
}

/**
 * Surprise questions with a timer, like the real exercise: a short countdown, a
 * question in the chosen theme with a few seconds to read it, a speaking timer
 * (recording starts then), then the next question straight away.
 * The whole series is asked for in one AI request when it starts; the built-in bank
 * fills in when the AI gives fewer questions or none.
 */
export function SurpriseCoach() {
  const recorder = useAudioRecorder({ keepStream: true })
  const [themeId, setThemeId] = useState(RANDOM_THEME)
  const [total, setTotal] = useState(5)
  const [seconds, setSeconds] = useState(60)
  const [reading, setReading] = useState(5)
  const [record, setRecord] = useState(true)

  const [phase, setPhase] = useState<Phase>('setup')
  const [index, setIndex] = useState(0)
  const [questions, setQuestions] = useState<string[]>([])
  const [ready, setReady] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [recordings, setRecordings] = useState<Record<number, string>>({})

  const askedRef = useRef<string[]>([])
  const seriesRef = useRef<Promise<string[]>>(Promise.resolve([]))
  const pendingRef = useRef<number[]>([])
  const recording = record && recorder.supported

  const loadQuestion = useCallback(async () => {
    setReady(false)
    const series = await seriesRef.current
    const asked = askedRef.current
    const text =
      series.find((question) => !asked.includes(question)) ?? bankQuestion(themeId, asked)
    askedRef.current = [...asked, text]
    setQuestions([...askedRef.current])
    setReady(true)
  }, [themeId])

  const start = () => {
    // Questions of the previous series are not asked again.
    seriesRef.current = fetchSeries(themeId, total, askedRef.current)
    askedRef.current = []
    pendingRef.current = []
    setQuestions([])
    setRecordings({})
    setIndex(0)
    setRemaining(COUNTDOWN_SECONDS)
    setPhase('countdown')
    void loadQuestion()
  }

  const finishQuestion = useCallback(() => {
    if (recording && recorder.stop()) pendingRef.current.push(index)
    if (index + 1 >= total) {
      setPhase('summary')
      return
    }
    setIndex(index + 1)
    setRemaining(COUNTDOWN_SECONDS)
    setPhase('countdown')
    void loadQuestion()
  }, [index, total, recording, recorder, loadQuestion])

  const startSpeaking = useCallback(() => {
    setPhase('speaking')
    setRemaining(seconds)
    if (recording) void recorder.start()
  }, [seconds, recording, recorder])

  const stopAll = () => {
    if (recording && recorder.stop()) pendingRef.current.push(index)
    setPhase('summary')
  }

  // One tick per second while a countdown, the reading time or a speaking timer runs.
  useEffect(() => {
    if (phase !== 'countdown' && phase !== 'reading' && phase !== 'speaking') return
    const timer = setInterval(() => setRemaining((value) => Math.max(0, value - 1)), 1000)
    return () => clearInterval(timer)
  }, [phase, index])

  useEffect(() => {
    if (remaining > 0) return
    if (phase === 'countdown' && ready) {
      setPhase('reading')
      setRemaining(reading)
    } else if (phase === 'reading') {
      startSpeaking()
    } else if (phase === 'speaking') {
      finishQuestion()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase, ready])

  // Each finished recording belongs to the oldest question still waiting for its audio.
  const { blobUrl, release } = recorder
  useEffect(() => {
    if (!blobUrl) return
    const finished = pendingRef.current.shift()
    if (finished === undefined) return
    setRecordings((previous) => ({ ...previous, [finished]: blobUrl }))
  }, [blobUrl])

  useEffect(() => {
    if (phase === 'summary' || phase === 'setup') release()
  }, [phase, release])

  const themeLabel = THEMES.find((item) => item.id === themeId)?.label ?? themeId

  if (phase === 'setup') {
    return (
      <Card className="coach-setup">
        <div className="stack stack--sm">
          <h2>Questions surprises</h2>
          <p className="muted coach-setup__lead">
            Choisis un thème : les questions s'enchaînent avec un compte à rebours, comme dans
            l'exercice. Tu ne vois la question qu'au dernier moment.
          </p>
        </div>

        <ChipGroup
          id="coach-theme"
          label="Thème"
          value={themeId}
          options={THEMES.map((theme) => ({ value: theme.id, label: theme.label }))}
          onChange={setThemeId}
        />

        <div className="coach-setup__pair">
          <ChipGroup
            id="coach-count"
            label="Nombre de questions"
            value={total}
            options={COUNTS.map((count) => ({ value: count, label: String(count) }))}
            onChange={setTotal}
          />
          <ChipGroup
            id="coach-seconds"
            label="Temps pour répondre"
            value={seconds}
            options={SECONDS.map((value) => ({ value, label: `${value} s` }))}
            onChange={setSeconds}
          />
        </div>

        <ChipGroup
          id="coach-reading"
          label="Temps pour lire la question"
          value={reading}
          options={READING.map((value) => ({ value, label: `${value} s` }))}
          onChange={setReading}
        />

        {recorder.supported ? (
          <label className="coach-check">
            <input
              type="checkbox"
              checked={record}
              onChange={(event) => setRecord(event.target.checked)}
            />
            <span className="coach-check__box" aria-hidden="true">✓</span>
            <span>
              Enregistrer mes réponses (pour les réécouter et les faire analyser à la fin)
            </span>
          </label>
        ) : null}

        <Button variant="animated" block size="lg" trailing="→" onClick={start}>
          Commencer
        </Button>
      </Card>
    )
  }

  if (phase === 'summary') {
    const answered = questions.slice(0, Math.max(index + 1, 1))
    return (
      <Card enter="pop">
        <div className="stack stack--sm">
          <h2>Résumé</h2>
          <p className="muted">Réécoute tes réponses et fais-les analyser une à une.</p>
        </div>
        <ol className="ai-summary">
          {answered.map((question, position) => (
            <li key={position} style={{ animationDelay: `${position * 0.08}s` }}>
              <div className="ai-summary__question">
                <span className="ai-summary__num">{position + 1}</span>
                <p className="ai-coach__question ai-coach__question--small">{question}</p>
              </div>
              {recordings[position] ? (
                <AudioClip src={recordings[position]} label="Écouter ma réponse" />
              ) : null}
              <AiAnalysisPanel
                audioUrl={recordings[position]}
                subtitle={`Sur ta réponse ${position + 1}`}
              />
            </li>
          ))}
        </ol>
        <Button block size="lg" trailing="↻" onClick={() => setPhase('setup')}>
          Nouvelle série
        </Button>
      </Card>
    )
  }

  const length =
    phase === 'countdown' ? COUNTDOWN_SECONDS : phase === 'reading' ? reading : seconds
  const progress = (length - remaining) / length

  return (
    <Card center aria-live="polite" className="coach-live">
      <Pill>Question {index + 1}/{total}</Pill>

      {phase === 'countdown' ? (
        <>
          <h2>Question suivante dans…</h2>
          <p className="coach-bubble" aria-label={`${remaining} secondes`}>
            {ready ? remaining : <span>…</span>}
          </p>
          <span className="coach-preparing">
            <Icon name="sparkle" size={14} />
            L'IA prépare une question · {themeLabel}
          </span>
        </>
      ) : phase === 'reading' ? (
        <>
          <Pill tone="warm">{themeLabel}</Pill>
          <h2 className="ai-coach__question">{questions[index]}</h2>
          <p className="muted">Lis la question. Tu parles dans…</p>
          <p className="coach-bubble" aria-label={`${remaining} secondes pour lire`}>{remaining}</p>
          <ProgressBar value={progress} aria-hidden="true" />
          <Button block variant="subtle" trailing="→" className="button--between" onClick={startSpeaking}>
            Je suis prêt, je parle
          </Button>
        </>
      ) : (
        <>
          <Pill tone="warm">{themeLabel}</Pill>
          <h2 className="ai-coach__question">{questions[index]}</h2>
          <p className="ai-timer" aria-label={`${remaining} secondes restantes`}>{remaining}</p>
          <ProgressBar value={progress} aria-hidden="true" />
          {recording && recorder.status === 'recording' ? (
            <div className="coach-rec">
              <span className="rec-badge">
                <span className="rec-badge__dot" aria-hidden="true" />
                Enregistrement
              </span>
              <WaveBars count={16} height={32} fluid />
            </div>
          ) : null}
          <Button block variant="subtle" trailing="→" className="button--between" onClick={finishQuestion}>
            Question suivante
          </Button>
        </>
      )}

      <button type="button" className="coach-stop" onClick={stopAll}>
        <Icon name="stop" size={14} /> Terminer
      </button>
    </Card>
  )
}

interface ChipOption<T> {
  value: T
  label: string
}

/** A labelled row of single-choice chips. */
function ChipGroup<T extends string | number>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string
  label: string
  value: T
  options: ChipOption<T>[]
  onChange: (value: T) => void
}) {
  return (
    <div className="field">
      <Eyebrow as="span">{label}</Eyebrow>
      <div className="chip-row" role="radiogroup" aria-label={label} id={id}>
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            className={`chip${value === option.value ? ' is-active' : ''}`}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  )
}
