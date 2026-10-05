import { Timer } from '../../../../components/Timer/Timer'
import { Button, Card } from '../../../../components/ui'
import type { Topic } from '../../../../types/content'
import { FLUENCY_READ_SECONDS, FLUENCY_ROUND_SECONDS } from '../../types'
import type { FluencyFeedback } from '../../types'
import { RetryTargets, retryTargetsFor, roundPrompt } from './FluencyRun'

export interface FluencyReadyProps {
  topic: Topic
  roundIndex: number
  feedback: FluencyFeedback
  onBegin: () => void
}

/**
 * Reading time before rounds 2–4: the prompt is shown and nothing is timed or
 * recorded yet. The round starts on its own when the countdown ends, or earlier
 * with the button.
 */
export function FluencyReady({ topic, roundIndex, feedback, onBegin }: FluencyReadyProps) {
  const minutes = Math.round((FLUENCY_ROUND_SECONDS[roundIndex] ?? 60) / 60)

  return (
    <Card center className="fluency-run" aria-live="polite">
      <span className="eyebrow">
        Tour {roundIndex + 1} / {FLUENCY_ROUND_SECONDS.length} · {minutes} min
      </span>
      <h2 className="fluency-run__prompt">{roundPrompt(topic, roundIndex)}</h2>
      <RetryTargets targets={retryTargetsFor(roundIndex, feedback)} />
      <p className="muted">Prends le temps de lire. Le tour démarre (chrono + enregistrement) dans&nbsp;:</p>
      <Timer
        persistKey={`fluency-ready-${roundIndex}`}
        durationSeconds={FLUENCY_READ_SECONDS}
        autoStart
        hideControls
        compact
        secondsOnly
        variant="bubble"
        onComplete={onBegin}
      />
      <Button variant="animated" size="lg" block trailing="▶" onClick={onBegin}>
        Je suis prêt, commencer
      </Button>
    </Card>
  )
}
