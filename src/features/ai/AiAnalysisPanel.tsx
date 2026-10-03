import { useEffect, useState } from 'react'
import { Button, Callout } from '../../components/ui'
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
}

type Status = 'idle' | 'loading' | 'done' | 'error'

function UseButton({ used, onClick }: { used: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`chip${used ? ' is-active' : ''}`}
      aria-pressed={used}
      disabled={used}
      onClick={onClick}
    >
      {used ? 'Ajouté ✓' : 'Utiliser'}
    </button>
  )
}

/** Transcribes the learner's recording and suggests corrections to review. */
export function AiAnalysisPanel({
  audioUrl,
  onUseCorrection,
  onUseExpression,
  onUseWord,
}: AiAnalysisPanelProps) {
  const enabled = useAiEnabled()
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [transcript, setTranscript] = useState('')
  const [analysis, setAnalysis] = useState<SpeechAnalysis | null>(null)
  const [used, setUsed] = useState<Set<string>>(new Set())

  // A new recording starts a new analysis.
  useEffect(() => {
    setStatus('idle')
    setTranscript('')
    setAnalysis(null)
    setUsed(new Set())
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
    <Callout
      title={status === 'done' ? undefined : "Analyse par l'IA"}
      tone="soft"
      aria-live="polite"
    >
      {status === 'idle' || status === 'error' ? (
        <>
          <p className="muted">
            L'IA transcrit ton enregistrement et propose des corrections. Tu choisis ce que
            tu gardes. L'audio est envoyé à un service d'IA pour cette analyse ; il n'est
            pas conservé par l'application.
          </p>
          {status === 'error' ? (
            <p role="alert" className="ai-error">{error}</p>
          ) : null}
          <Button variant="accent-outline" block onClick={() => void analyze()}>
            {status === 'error' ? 'Réessayer' : "Analyser avec l'IA"}
          </Button>
        </>
      ) : null}

      {status === 'loading' ? <p className="muted">Analyse en cours…</p> : null}

      {status === 'done' ? (
        <div className="ai-result">
          {transcript ? (
            <details className="ai-transcript">
              <summary>Voir la transcription</summary>
              <p>{transcript}</p>
            </details>
          ) : null}
          {analysis ? <h3 className="callout__title">Analyse par l'IA</h3> : null}
          {!analysis ? (
            <p className="muted">
              Je n'ai pas entendu assez de parole pour analyser. Réessaie avec un
              enregistrement plus long.
            </p>
          ) : (
            <>
              {analysis.summary ? <p>{analysis.summary}</p> : null}

              {analysis.corrections.length > 0 ? (
                <div>
                  <h4>Formulations à améliorer</h4>
                  <ul className="ai-list">
                    {analysis.corrections.map((item, index) => (
                      <li key={`c${index}`}>
                        {item.said ? <p className="muted">Tu as dit : « {item.said} »</p> : null}
                        <p><strong>« {item.better} »</strong></p>
                        {onUseCorrection ? (
                          <UseButton
                            used={used.has(`c${index}`)}
                            onClick={() => {
                              onUseCorrection(item.better)
                              markUsed(`c${index}`)
                            }}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {analysis.expressions.length > 0 ? (
                <div>
                  <h4>Expressions que tu aurais pu utiliser</h4>
                  <ul className="ai-list">
                    {analysis.expressions.map((item, index) => (
                      <li key={`e${index}`}>
                        <p><strong>« {item.expression} »</strong></p>
                        <p className="muted">{item.intent}</p>
                        {onUseExpression ? (
                          <UseButton
                            used={used.has(`e${index}`)}
                            onClick={() => {
                              onUseExpression(item)
                              markUsed(`e${index}`)
                            }}
                          />
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {analysis.blockedWord ? (
                <div>
                  <h4>Mot qui a peut-être manqué</h4>
                  <p>
                    <strong>{analysis.blockedWord.word}</strong>
                    <span className="muted"> — {analysis.blockedWord.idea}</span>
                  </p>
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

        </div>
      ) : null}
    </Callout>
  )
}
