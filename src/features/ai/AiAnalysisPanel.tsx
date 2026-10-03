import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { AiFrame, AiMark, AiTag, Button, Icon } from '../../components/ui'
import { aiErrorMessage, analyzeRecording } from '../../services/ai/client'
import type { SpeechAnalysis } from '../../services/ai/client'
import { useAiEnabled } from './useAiEnabled'
import './ai.css'

export interface AiAnalysisPanelProps {
  audioUrl: string | null | undefined
  /** When given, each suggestion gets a button that copies it into the form. */
  onUseCorrection?: (better: string) => void
  onUseExpression?: (suggestion: { expression: string; intent: string }) => void
  onUseWord?: (suggestion: { word: string; idea: string }) => void
  /** Says what was recorded, e.g. « Sur ta réponse 2 ». */
  subtitle?: string
}

type Status = 'idle' | 'loading' | 'done' | 'error'

const LOADING_STEPS = [
  'Transcription de ta voix',
  'Repérage des formulations',
  'Suggestions personnalisées',
]

function UseButton({ used, onClick }: { used: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`ai-use${used ? ' is-used' : ''}`}
      aria-pressed={used}
      disabled={used}
      onClick={onClick}
    >
      {used ? 'Ajouté ✓' : 'Utiliser'}
    </button>
  )
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
  onUseCorrection,
  onUseExpression,
  onUseWord,
  subtitle = 'Sur ton enregistrement',
}: AiAnalysisPanelProps) {
  const enabled = useAiEnabled()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState<SpeechAnalysis | null>(null)
  const [used, setUsed] = useState<Set<string>>(new Set())
  const [showTranscript, setShowTranscript] = useState(false)

  // A new recording starts a new analysis.
  useEffect(() => {
    setStatus('idle')
    setTranscript('')
    setAnalysis(null)
    setUsed(new Set())
    setShowTranscript(false)
  }, [audioUrl])

  if (!enabled || !audioUrl) return null

  const markUsed = (key: string) => setUsed((prev) => new Set(prev).add(key))

  const analyze = async () => {
    setStatus('loading')
    setError('')
    try {
      const result = await analyzeRecording(audioUrl)
      setTranscript(result.transcript)
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
            L'IA transcrit ton enregistrement et propose des corrections. Tu choisis ce que
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

              {analysis.corrections.length > 0 ? (
                <section className="ai-group">
                  <h4 className="eyebrow">Formulations à améliorer</h4>
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

              {analysis.expressions.length > 0 ? (
                <section className="ai-group">
                  <h4 className="eyebrow">Expressions que tu aurais pu utiliser</h4>
                  {analysis.expressions.map((item, index) => (
                    <Suggestion
                      key={`e${index}`}
                      tone="soft"
                      action={
                        onUseExpression ? (
                          <UseButton
                            used={used.has(`e${index}`)}
                            onClick={() => {
                              onUseExpression(item)
                              markUsed(`e${index}`)
                            }}
                          />
                        ) : null
                      }
                    >
                      <strong>« {item.expression} »</strong>
                      <span className="muted ai-said">{item.intent}</span>
                    </Suggestion>
                  ))}
                </section>
              ) : null}

              {analysis.blockedWord ? (
                <div className="ai-word">
                  <div className="ai-suggestion__text">
                    <h4 className="eyebrow ai-word__label">Mot qui a peut-être manqué</h4>
                    <span>
                      <strong>{analysis.blockedWord.word}</strong>
                      <span className="muted"> — {analysis.blockedWord.idea}</span>
                    </span>
                  </div>
                  {onUseWord ? (
                    <UseButton
                      used={used.has('w')}
                      onClick={() => {
                        onUseWord(analysis.blockedWord!)
                        markUsed('w')
                      }}
                    />
                  ) : null}
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
