import { useState } from 'react'
import { Button, Callout } from '../../components/ui'
import { aiErrorMessage, runAiTask } from '../../services/ai/client'
import type { WordVerdict } from '../../services/ai/client'
import { useAiEnabled } from './useAiEnabled'
import './ai.css'

const VERDICT_LABEL: Record<WordVerdict['verdict'], string> = {
  exact: 'Exact ✓',
  acceptable: 'Acceptable ✓',
  faux: 'Pas tout à fait',
}

/** Optional second opinion on the word the learner said, shown before they judge themselves. */
export function AiWordCheck({ target, context }: { target: string; context: string }) {
  const enabled = useAiEnabled()
  const [attempt, setAttempt] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<WordVerdict | null>(null)
  const [error, setError] = useState('')

  if (!enabled) return null

  const check = async () => {
    if (!attempt.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const { data } = await runAiTask<WordVerdict>('judge-word', {
        target,
        context,
        attempt,
      })
      setResult(data)
    } catch (caught) {
      setError(aiErrorMessage(caught))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Callout title="Un avis de l'IA (facultatif)" tone="soft" aria-live="polite">
      <div className="field">
        <label htmlFor="ai-word-attempt">Quel mot as-tu dit ?</label>
        <input
          id="ai-word-attempt"
          value={attempt}
          onChange={(event) => setAttempt(event.target.value)}
          autoComplete="off"
        />
      </div>
      <Button
        variant="accent-outline"
        block
        disabled={loading || !attempt.trim()}
        onClick={() => void check()}
      >
        {loading ? 'Vérification…' : "Vérifier avec l'IA"}
      </Button>
      {result ? (
        <p>
          <strong>{VERDICT_LABEL[result.verdict]}</strong>
          {result.comment ? <span className="muted"> — {result.comment}</span> : null}
        </p>
      ) : null}
      {error ? <p role="alert" className="ai-error">{error}</p> : null}
    </Callout>
  )
}
