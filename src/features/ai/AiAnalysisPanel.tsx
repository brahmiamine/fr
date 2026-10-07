import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useOptionalAppState } from '../../app/AppStateProvider'
import { AiFrame, AiMark, AiTag, Button, Icon } from '../../components/ui'
import { aiErrorMessage, analyzeRecording } from '../../services/ai/client'
import type { BlockageType, FluencyAnalysis, SpeechSituation } from '../../services/ai/client'
import type { FluencyMetrics } from '../../services/ai/fluencyMetrics'
import { upsertPersonalChunk } from '../../services/progress/progress'
import { LIMIT_MESSAGE, useWordGapCapture } from '../wordGaps/useWordGapCapture'
import { useAiEnabled } from './useAiEnabled'
import './ai.css'

export interface AiAnalysisPanelProps {
  audioUrl: string | null | undefined
  /** What was recorded, so the coach knows what to expect. */
  situation?: SpeechSituation
  /** When given, a correction gets a button that copies it into the form. */
  onUseCorrection?: (better: string) => void
  /**
   * When given, a chunk gets a button that copies it into the form; otherwise
   * the button keeps it straight away as a personal chunk.
   */
  onUseExpression?: (suggestion: { expression: string; intent: string }) => void
  /** Says what was recorded, e.g. « Sur ta réponse 2 ». */
  subtitle?: string
}

const BLOCKAGE_LABELS: Record<BlockageType, string> = {
  missing_word: 'Mot manquant',
  sentence_restart: 'Phrase recommencée',
  idea_block: "Panne d'idée",
  grammar_planning: 'Phrase trop complexe à construire',
  excessive_filler: '« euh » en rafale',
  uncertain: 'Blocage',
}

type Status = 'idle' | 'loading' | 'done' | 'error'

const LOADING_STEPS = [
  'Transcription de ta voix, hésitations comprises',
  'Mesure des pauses et des redémarrages',
  'Repérage des blocages',
]

function UseButton({
  used,
  onClick,
  label = 'Utiliser',
}: {
  used: boolean
  onClick: () => void
  label?: string
}) {
  return (
    <button
      type="button"
      className={`ai-use${used ? ' is-used' : ''}`}
      aria-pressed={used}
      disabled={used}
      onClick={onClick}
    >
      {used ? 'Ajouté ✓' : label}
    </button>
  )
}

/** The measures sent with the transcript, in plain words. */
function MetricsLine({ metrics }: { metrics: FluencyMetrics }) {
  const parts = [
    metrics.wordsPerMinute !== undefined ? `${metrics.wordsPerMinute} mots/min` : null,
    `${metrics.fillers} « euh » nu${metrics.fillers > 1 ? 's' : ''}`,
    `${metrics.markers} marqueur${metrics.markers > 1 ? 's' : ''} (en fait, disons…)`,
    `${metrics.restarts} redémarrage${metrics.restarts > 1 ? 's' : ''}`,
    metrics.longPauses !== undefined
      ? `${metrics.longPauses} silence${metrics.longPauses > 1 ? 's' : ''} > 1 s` +
        (metrics.midClausePauses !== undefined ? ` (≈ ${metrics.midClausePauses} en milieu de phrase)` : '')
      : null,
  ].filter(Boolean)
  return <p className="muted ai-metrics">{parts.join(' · ')}</p>
}

/** Steps shown while waiting: they advance on a timer, the last one waits for the answer. */
function LoadingSteps() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    const timers = [setTimeout(() => setStep(1), 900), setTimeout(() => setStep(2), 1800)]
    return () => timers.forEach(clearTimeout)
  }, [])
  return (
    <div className="ai-loading" aria-live="polite">
      <p className="sr-only">Analyse en cours…</p>
      {LOADING_STEPS.map((label, index) => {
        const state = step > index ? 'done' : step === index ? 'current' : 'next'
        return (
          <div key={label} className={`ai-step is-${state}`}>
            <span className="ai-step__dot">{state === 'done' ? '✓' : ''}</span>
            {label}
          </div>
        )
      })}
      <div className="ai-shimmer">
        <span style={{ width: '92%' }} />
        <span style={{ width: '74%', animationDelay: '0.15s' }} />
        <span style={{ width: '58%', animationDelay: '0.3s' }} />
      </div>
    </div>
  )
}

function Suggestion({
  tone,
  children,
  action,
}: {
  tone: 'plain' | 'soft'
  children: ReactNode
  action: ReactNode
}) {
  return (
    <div className={`ai-suggestion ai-suggestion--${tone}`}>
      <div className="ai-suggestion__text">{children}</div>
      {action}
    </div>
  )
}

/** Transcribes the learner's recording and suggests corrections to review. */
export function AiAnalysisPanel({
  audioUrl,
  situation = 'round',
  onUseCorrection,
  onUseExpression,
  subtitle = 'Sur ton enregistrement',
}: AiAnalysisPanelProps) {
  const enabled = useAiEnabled()
  const app = useOptionalAppState()
  const wordCapture = useWordGapCapture()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState<FluencyAnalysis | null>(null)
  const [metrics, setMetrics] = useState<FluencyMetrics | null>(null)
  const [wordMessage, setWordMessage] = useState('')
  const [used, setUsed] = useState<Set<string>>(new Set())
  const [showTranscript, setShowTranscript] = useState(false)

  // A new recording starts a new analysis.
  useEffect(() => {
    setStatus('idle')
    setTranscript('')
    setAnalysis(null)
    setMetrics(null)
    setWordMessage('')
    setUsed(new Set())
    setShowTranscript(false)
  }, [audioUrl])

  if (!enabled || !audioUrl) return null

  const markUsed = (key: string) => setUsed((prev) => new Set(prev).add(key))

  const analyze = async () => {
    setStatus('loading')
    setError('')
    try {
      const result = await analyzeRecording(audioUrl, situation)
      setTranscript(result.transcript)
      setMetrics(result.metrics)
      setAnalysis(result.analysis)
      setStatus('done')
    } catch (caught) {
      setError(aiErrorMessage(caught))
      setStatus('error')
    }
  }

  return (
    <AiFrame className="ai-panel" aria-live="polite">
      <div className="ai-panel__head">
        <AiMark size={38} />
        <div className="ai-panel__titles">
          <h3 className="ai-panel__title">Analyse par l'IA</h3>
          <span className="ai-panel__subtitle">{subtitle}</span>
        </div>
        <AiTag />
      </div>

      {status === 'idle' || status === 'error' ? (
        <div className="ai-panel__body">
          <p className="muted">
            L'IA transcrit ton enregistrement en gardant les hésitations, mesure tes pauses
            et repère où tu bloques : moins de blocages, pas moins de fautes. Tu choisis ce que
            tu gardes. L'audio est envoyé à un service d'IA pour cette analyse ; il n'est
            pas conservé par l'application.
          </p>
          {status === 'error' ? (
            <p role="alert" className="ai-error">{error}</p>
          ) : null}
          <Button variant="accent-outline" block onClick={() => void analyze()}>
            <Icon name="sparkle" size={18} />
            {status === 'error' ? 'Réessayer' : "Analyser avec l'IA"}
          </Button>
        </div>
      ) : null}

      {status === 'loading' ? <LoadingSteps /> : null}

      {status === 'done' ? (
        <div className="ai-panel__body ai-result">
          {!analysis ? (
            <p className="muted">
              Je n'ai pas entendu assez de parole pour analyser. Réessaie avec un
              enregistrement plus long.
            </p>
          ) : (
            <>
              {analysis.summary ? <p className="ai-summary-text">{analysis.summary}</p> : null}
              {metrics ? <MetricsLine metrics={metrics} /> : null}

              {analysis.blockages.length > 0 ? (
                <section className="ai-group">
                  <h4 className="eyebrow">Où tu bloques</h4>
                  {analysis.blockages.map((item, index) => (
                    <Suggestion key={`b${index}`} tone="plain" action={null}>
                      <span className="ai-blockage__type">{BLOCKAGE_LABELS[item.type]}</span>
                      {item.evidence ? <span className="muted ai-said">« {item.evidence} »</span> : null}
                      <strong>{item.strategy}</strong>
                    </Suggestion>
                  ))}
                </section>
              ) : null}

              {analysis.missingWords.length > 0 ? (
                <section className="ai-group">
                  <h4 className="eyebrow">Mots qui ont peut-être manqué</h4>
                  {analysis.missingWords.map((item, index) => (
                    <Suggestion
                      key={`w${index}`}
                      tone="soft"
                      action={
                        wordCapture.available ? (
                          <UseButton
                            label="Ajouter à mes trous de mots"
                            used={used.has(`w${index}`)}
                            onClick={() => {
                              const result = wordCapture.capture(item.word, item.idea)
                              if (result === 'limit') setWordMessage(LIMIT_MESSAGE)
                              if (result === 'added' || result === 'again') markUsed(`w${index}`)
                            }}
                          />
                        ) : null
                      }
                    >
                      <strong>{item.word}</strong>
                      <span className="muted ai-said">{item.idea}</span>
                    </Suggestion>
                  ))}
                  {wordMessage ? <p className="muted" role="status">{wordMessage}</p> : null}
                </section>
              ) : null}

              {analysis.strategies.length > 0 ? (
                <section className="ai-group">
                  <h4 className="eyebrow">Pour continuer à parler</h4>
                  {analysis.strategies.map((item, index) => {
                    const keep = onUseExpression
                      ? () => onUseExpression({ expression: item.chunk, intent: item.use })
                      : app
                        ? () => app.updateWith((prev) => upsertPersonalChunk(prev, item.chunk, item.use, new Date()))
                        : null
                    return (
                      <Suggestion
                        key={`e${index}`}
                        tone="soft"
                        action={
                          keep ? (
                            <UseButton
                              label={onUseExpression ? 'Utiliser' : 'Garder'}
                              used={used.has(`e${index}`)}
                              onClick={() => {
                                keep()
                                markUsed(`e${index}`)
                              }}
                            />
                          ) : null
                        }
                      >
                        <strong>« {item.chunk} »</strong>
                        <span className="muted ai-said">{item.use}</span>
                      </Suggestion>
                    )
                  })}
                </section>
              ) : null}

              {analysis.corrections.length > 0 ? (
                <section className="ai-group">
                  <h4 className="eyebrow">À corriger (gêne ou revient souvent)</h4>
                  {analysis.corrections.map((item, index) => (
                    <Suggestion
                      key={`c${index}`}
                      tone="plain"
                      action={
                        onUseCorrection ? (
                          <UseButton
                            used={used.has(`c${index}`)}
                            onClick={() => {
                              onUseCorrection(item.better)
                              markUsed(`c${index}`)
                            }}
                          />
                        ) : null
                      }
                    >
                      {item.said ? (
                        <span className="muted ai-said">
                          Tu as dit : <s>« {item.said} »</s>
                        </span>
                      ) : null}
                      <strong>« {item.better} »</strong>
                    </Suggestion>
                  ))}
                </section>
              ) : null}

              {analysis.microExercise ? (
                <div className="ai-word">
                  <div className="ai-suggestion__text">
                    <h4 className="eyebrow ai-word__label">Mini-exercice (30 s)</h4>
                    <span>{analysis.microExercise}</span>
                  </div>
                </div>
              ) : null}
            </>
          )}

          {transcript ? (
            <div className="ai-transcript">
              <button
                type="button"
                className="ai-transcript__toggle"
                aria-expanded={showTranscript}
                onClick={() => setShowTranscript((open) => !open)}
              >
                <span className={`ai-transcript__chevron${showTranscript ? ' is-open' : ''}`}>▸</span>
                {showTranscript ? 'Masquer la transcription' : 'Voir la transcription'}
              </button>
              {showTranscript ? <p className="ai-transcript__text">{transcript}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </AiFrame>
  )
}
