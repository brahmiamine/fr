import { Timer } from '../../../../components/Timer/Timer'
import { Button, Card } from '../../../../components/ui'
import type { Topic } from '../../../../types/content'
import { FLUENCY_READ_SECONDS, FLUENCY_ROUND_SECONDS, prosodyCueForRound } from '../../types'
import type { FluencyFeedback } from '../../types'
import { RetryTargets, retryTargetsFor, roundPrompt } from './FluencyRun'

export interface FluencyReadyProps {
  topic: Topic
  roundIndex: number
  feedback: FluencyFeedback
  /** The transfer subject was written by the AI. */
  aiTransfer?: boolean
  roundSeconds?: readonly number[]
  prosodyFocusGoal?: string | null
  onBegin: () => void
}

/**
 * Reading time before rounds 2–4: the prompt is shown and nothing is timed or
 * recorded yet. The round starts on its own when the countdown ends, or earlier
 * with the button.
 */
export function FluencyReady({
  topic,
  roundIndex,
  feedback,
  aiTransfer = false,
  roundSeconds = FLUENCY_ROUND_SECONDS,
  prosodyFocusGoal = null,
  onBegin,
}: FluencyReadyProps) {
  const isTransfer = roundIndex === roundSeconds.length - 1
  const minutes = Math.round((roundSeconds[roundIndex] ?? 120) / 60)
  const prosodyCue = prosodyCueForRound(roundIndex, prosodyFocusGoal)

  return (
    <Card center className="fluency-run" aria-live="polite">
      <span className="eyebrow">
        {isTransfer ? 'Transfert' : `Tour ${roundIndex + 1}`} / {roundSeconds.length} · {minutes} min
      </span>
      <h2 className="fluency-run__prompt">{roundPrompt(topic, roundIndex, roundSeconds.length)}</h2>
      {isTransfer && aiTransfer ? (
        <p className="muted">
          Sujet proposé par l'IA : même façon de raisonner, autre thème.
        </p>
      ) : null}
      {isTransfer ? (
        <p className="muted">Une question différente, un raisonnement proche : réutilise ce que tu viens de travailler.</p>
      ) : null}
      <RetryTargets targets={retryTargetsFor(roundIndex, feedback)} />
      {prosodyCue ? (
        <p className="muted">
          <span className="text-strong">Consigne de prosodie :</span> {prosodyCue}
        </p>
      ) : null}
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
