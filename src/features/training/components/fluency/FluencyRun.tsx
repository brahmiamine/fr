import { Timer } from '../../../../components/Timer/Timer'
import { Callout, Card, InfoLine } from '../../../../components/ui'
import type { AudioRecorder } from '../../../../hooks/useAudioRecorder'
import type { Chunk, RetellingStory, Topic } from '../../../../types/content'
import { FLUENCY_ROUND_SECONDS } from '../../types'
import type { FluencyFeedback, FluencyReminder } from '../../types'

const RUNNING_HINTS = [
  'Continue. Un mot manque ? Explique-le autrement.',
  'Reformule, ne récite pas.',
  'Continue à parler.',
  'Nouveau sujet : réutilise ce que tu viens de travailler.',
]

const STORY_HINTS = [
  "Raconte l'histoire avec tes mots. Un mot manque ? Explique-le autrement.",
  'Raconte-la de nouveau, autrement : ne récite pas.',
  "L'essentiel, plus vite, sans t'arrêter.",
  'Nouveau sujet : réutilise ce que tu viens de travailler.',
]

export interface FluencyRunProps {
  topic: Topic
  roundIndex: number
  feedback: FluencyFeedback
  keywords: string[]
  chunksOfDay: Chunk[]
  focusWords: string[]
  fluencyReminders: FluencyReminder[]
  recorder?: AudioRecorder
  retellingStory: RetellingStory | null
  prosodyFocusGoal: string | null
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
  recorder,
  retellingStory,
  prosodyFocusGoal,
  onRoundComplete,
}: FluencyRunProps) {
  const isTransfer = roundIndex === FLUENCY_ROUND_SECONDS.length - 1
  const seconds = FLUENCY_ROUND_SECONDS[roundIndex] ?? 60
  const prompt = isTransfer ? topic.transferPrompt : topic.title
  const recording = roundIndex === 0 && recorder?.status === 'recording'

  const retryTargets =
    roundIndex === 1 || roundIndex === 2
      ? [
          { label: 'Correction', text: feedback.importantError },
          { label: 'Formulation', text: feedback.difficultPhrase },
          { label: 'Chunk à placer', text: feedback.missedChunk ?? '' },
        ].filter((target) => target.text.trim())
      : []

  const finishRound = () => {
    if (roundIndex === 0) recorder?.stop()
    onRoundComplete()
  }

  return (
    <Card center className="fluency-run" aria-live="polite">
      {recording ? (
        <span className="rec-badge">
          <span className="rec-badge__dot" aria-hidden="true" />
          Enregistrement du tour 1
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
        {retryTargets.length > 0 ? (
          <Callout tone="dashed" className="fluency-run__missed">
            <p className="muted">À réutiliser dans ce tour :</p>
            <ul className="fluency-run__targets">
              {retryTargets.map((target) => (
                <li key={target.label}>
                  <span className="muted">{target.label} :</span> <strong>{target.text}</strong>
                </li>
              ))}
            </ul>
          </Callout>
        ) : null}

        {prosodyFocusGoal ? <InfoLine label="Prosodie :">{prosodyFocusGoal}</InfoLine> : null}

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
