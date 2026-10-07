import { useState } from 'react'
import { useOptionalAppState } from '../../app/AppStateProvider'
import { AiFrame, AiMark, AiTag, Button, Icon } from '../../components/ui'
import { aiErrorMessage, compareRoundRecordings } from '../../services/ai/client'
import type { RoundsComparison, Trend } from '../../services/ai/client'
import { upsertFluencyNote } from '../../services/progress/progress'
import { useAiEnabled } from './useAiEnabled'
import './ai.css'

export interface RoundsComparisonPanelProps {
  topic: string
  transferTopic?: string
  rounds: { label: string; audioUrl: string; transfer?: boolean }[]
}

const TREND_LABELS: Record<Trend, string> = {
  better: 'en progrès',
  same: 'stable',
  worse: 'en recul',
  unknown: '—',
}

const DIMENSIONS: { key: 'hesitations' | 'restarts' | 'continuity' | 'contentKept'; label: string }[] = [
  { key: 'hesitations', label: 'Hésitations' },
  { key: 'restarts', label: 'Redémarrages' },
  { key: 'continuity', label: 'Continuité des idées' },
  { key: 'contentKept', label: 'Contenu gardé' },
]

/**
 * Compares the rounds of the 4 → 3 → 2 instead of judging each one alone:
 * does the speech get automated, or only shorter? The one priority it gives
 * is kept for the next time this subject comes back (the reprise).
 */
export function RoundsComparisonPanel({ topic, transferTopic, rounds }: RoundsComparisonPanelProps) {
  const enabled = useAiEnabled()
  const app = useOptionalAppState()
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [result, setResult] = useState<RoundsComparison | null>(null)
  const [kept, setKept] = useState(false)

  const sameSubject = rounds.filter((round) => !round.transfer)
  if (!enabled || sameSubject.length < 2) return null

  const compare = async () => {
    setStatus('loading')
    setError('')
    try {
      setResult(await compareRoundRecordings({ topic, transferTopic, rounds }))
      setStatus('done')
    } catch (caught) {
      setError(aiErrorMessage(caught))
      setStatus('error')
    }
  }

  const keepPriority = () => {
    if (!app || !result?.priority) return
    app.updateWith((prev) => upsertFluencyNote(prev, 'fluencyPriority', result.priority, new Date()))
    setKept(true)
  }

  return (
    <AiFrame className="ai-panel" aria-live="polite">
      <div className="ai-panel__head">
        <AiMark size={38} />
        <div className="ai-panel__titles">
          <h3 className="ai-panel__title">Évolution de tes tours</h3>
          <span className="ai-panel__subtitle">{rounds.length} tours comparés</span>
        </div>
        <AiTag />
      </div>

      {status === 'idle' || status === 'error' ? (
        <div className="ai-panel__body">
          <p className="muted">
            L'IA compare tes tours : bloques-tu moins, ou parles-tu seulement plus court ?
            Récites-tu les mêmes phrases ou reformules-tu ?
          </p>
          {status === 'error' ? <p role="alert" className="ai-error">{error}</p> : null}
          <Button variant="accent-outline" block onClick={() => void compare()}>
            <Icon name="sparkle" size={18} />
            {status === 'error' ? 'Réessayer' : 'Comparer mes tours'}
          </Button>
        </div>
      ) : null}

      {status === 'loading' ? (
        <div className="ai-panel__body">
          <p className="muted" aria-live="polite">Transcription et comparaison des tours…</p>
        </div>
      ) : null}

      {status === 'done' && result ? (
        <div className="ai-panel__body ai-result">
          {result.summary ? <p className="ai-summary-text">{result.summary}</p> : null}
          <ul className="ai-trends">
            {DIMENSIONS.map((dimension) => (
              <li key={dimension.key} className={`ai-trend is-${result[dimension.key]}`}>
                <span>{dimension.label}</span>
                <strong>{TREND_LABELS[result[dimension.key]]}</strong>
              </li>
            ))}
          </ul>
          {result.recited ? (
            <p className="ai-error">
              Tu sembles réciter les mêmes phrases : la fluidité monte sans que la langue
              progresse. Reformule à chaque tour.
            </p>
          ) : null}
          {result.observations.length > 0 ? (
            <ul className="ai-observations">
              {result.observations.map((observation) => (
                <li key={observation}>{observation}</li>
              ))}
            </ul>
          ) : null}
          {result.transfer ? <p className="muted">Transfert : {result.transfer}</p> : null}
          {result.priority ? (
            <div className="ai-word">
              <div className="ai-suggestion__text">
                <h4 className="eyebrow ai-word__label">Ta priorité pour la prochaine fois</h4>
                <strong>{result.priority}</strong>
              </div>
              {app ? (
                <button
                  type="button"
                  className={`ai-use${kept ? ' is-used' : ''}`}
                  aria-pressed={kept}
                  disabled={kept}
                  onClick={keepPriority}
                >
                  {kept ? 'Gardée ✓' : 'Garder'}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </AiFrame>
  )
}
