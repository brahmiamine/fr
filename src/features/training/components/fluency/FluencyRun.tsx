import { Timer } from '../../../../components/Timer/Timer'
import { Callout, Card, InfoLine } from '../../../../components/ui'
import type { Chunk, RetellingStory, Topic } from '../../../../types/content'
import { FLUENCY_ROUND_SECONDS, prosodyCueForRound } from '../../types'
import type { FluencyFeedback, FluencyReminder } from '../../types'

const RUNNING_HINTS = [
  'Continue. Un mot manque ? Explique-le autrement.',
  'Reformule, ne récite pas.',
  'Continue à parler.',
  'Nouvelle question : réutilise ce que tu viens de travailler.',
]

const STORY_HINTS = [
  "Raconte l'histoire avec tes mots. Un mot manque ? Explique-le autrement.",
  'Raconte-la de nouveau, autrement : ne récite pas.',
  "L'essentiel, plus vite, sans t'arrêter.",
  'Nouvelle question : réutilise ce que tu viens de travailler.',
]

/** The prompt spoken in a round: the topic, or the transfer prompt for the last one. */
export function roundPrompt(topic: Topic, roundIndex: number, rounds: number = FLUENCY_ROUND_SECONDS.length): string {
  return roundIndex === rounds - 1 ? topic.transferPrompt : topic.title
}

/** Corrections from the mini feedback to place again in rounds 2 and 3. */
export function retryTargetsFor(roundIndex: number, feedback: FluencyFeedback) {
  if (roundIndex !== 1 && roundIndex !== 2) return []
  return [
    { label: 'Correction', text: feedback.importantError },
    { label: 'Formulation', text: feedback.difficultPhrase },
    { label: 'Chunk à placer', text: feedback.missedChunk ?? '' },
  ].filter((target) => target.text.trim())
}

export function RetryTargets({
  targets,
}: {
  targets: { label: string; text: string }[]
}) {
  if (targets.length === 0) return null
  return (
    <Callout tone="dashed" className="fluency-run__missed">
      <p className="muted">À réutiliser dans ce tour :</p>
      <ul className="fluency-run__targets">
        {targets.map((target) => (
          <li key={target.label}>
            <span className="muted">{target.label} :</span> <strong>{target.text}</strong>
          </li>
        ))}
      </ul>
    </Callout>
  )
}

export interface FluencyRunProps {
  topic: Topic
  roundIndex: number
  feedback: FluencyFeedback
  keywords: string[]
  chunksOfDay: Chunk[]
  focusWords: string[]
  fluencyReminders: FluencyReminder[]
  /** The microphone is currently capturing this round. */
  recording: boolean
  retellingStory: RetellingStory | null
  prosodyFocusGoal: string | null
  /** Length of each round of this session. */
  roundSeconds?: readonly number[]
  onRoundComplete: () => void
}

export function FluencyRun({
  topic,
  roundIndex,
  feedback,
  keywords,
  chunksOfDay,
  focusWords,
  fluencyReminders,
  recording,
  retellingStory,
  prosodyFocusGoal,
  roundSeconds = FLUENCY_ROUND_SECONDS,
  onRoundComplete,
}: FluencyRunProps) {
  const isTransfer = roundIndex === roundSeconds.length - 1
  const seconds = roundSeconds[roundIndex] ?? 120
  const prompt = roundPrompt(topic, roundIndex, roundSeconds.length)
  const prosodyCue = prosodyCueForRound(roundIndex, prosodyFocusGoal)
  const retryTargets = retryTargetsFor(roundIndex, feedback)

  const finishRound = () => onRoundComplete()

  return (
    <Card center className="fluency-run" aria-live="polite">
      {recording ? (
        <span className="rec-badge">
          <span className="rec-badge__dot" aria-hidden="true" />
          {`Enregistrement du tour ${roundIndex + 1}`}
        </span>
      ) : null}
      <h2 className="fluency-run__prompt">{prompt}</h2>
      <Timer
        persistKey={`fluency-run-${roundIndex}`}
        durationSeconds={seconds}
        autoStart
        hideControls
        wave
        onComplete={finishRound}
      />
      <p className="fluency-run__hint">
        {(retellingStory && !isTransfer ? STORY_HINTS : RUNNING_HINTS)[roundIndex]}
      </p>

      <div className="fluency-run__reminders">
        <RetryTargets targets={retryTargets} />

        {prosodyCue ? <InfoLine label="Une seule consigne de prosodie :">{prosodyCue}</InfoLine> : null}

        {keywords.length > 0 ? (
          <div className="chip-row chip-row--center">
            {keywords.map((word) => (
              <span key={word} className="pill">
                {word}
              </span>
            ))}
          </div>
        ) : null}

        {chunksOfDay.length > 0 ? (
          <div className="fluency-run__chunks">
            <span className="eyebrow">Chunks du jour :</span>
            <div className="chip-row chip-row--center">
              {chunksOfDay.map((item) => (
                <span key={item.id} className="chip chip--static">
                  {item.expression}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        {focusWords.length > 0 ? (
          <InfoLine label="Mots débloqués à réutiliser :">{focusWords.join(' · ')}</InfoLine>
        ) : null}

        {fluencyReminders.length > 0 ? (
          <InfoLine label="Correction :">
            {fluencyReminders.map((item) => item.text).join(' · ')}
          </InfoLine>
        ) : null}
      </div>
    </Card>
  )
}
