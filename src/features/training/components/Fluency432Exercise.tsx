import type { Chunk, RetellingStory, Topic } from '../../../types/content'
import type { AudioRecorder } from '../../../hooks/useAudioRecorder'
import type { FluencyFeedback, FluencyReminder } from '../types'
import { FluencyMiniFeedback } from './fluency/FluencyMiniFeedback'
import { FluencyPrep } from './fluency/FluencyPrep'
import { FluencyRun } from './fluency/FluencyRun'
import { RoundPills } from './fluency/RoundPills'

export interface Fluency432ExerciseProps {
  topic: Topic
  roundIndex: number
  stage: 'prep' | 'running' | 'feedback'
  feedback: FluencyFeedback
  keywords: string[]
  chunksOfDay: Chunk[]
  focusWords: string[]
  fluencyReminders: FluencyReminder[]
  recorder?: AudioRecorder
  /** Retelling variant: the topic is a short story heard before round 1. */
  retellingStory?: RetellingStory | null
  /** Recent prosody point to keep while speaking. */
  prosodyFocusGoal?: string | null
  onKeywordsChange: (keywords: string[]) => void
  onStartRound: () => void
  onRoundComplete: () => void
  onSubmitFeedback: (values: FluencyFeedback) => void
}

export function Fluency432Exercise({
  topic,
  roundIndex,
  stage,
  feedback,
  keywords,
  chunksOfDay,
  focusWords,
  fluencyReminders,
  recorder,
  retellingStory = null,
  prosodyFocusGoal = null,
  onKeywordsChange,
  onStartRound,
  onRoundComplete,
  onSubmitFeedback,
}: Fluency432ExerciseProps) {
  return (
    <section className="exercise screen-enter">
      <RoundPills roundIndex={roundIndex} done={stage === 'feedback'} />

      {stage === 'prep' ? (
        <FluencyPrep
          topic={topic}
          roundIndex={roundIndex}
          keywords={keywords}
          focusWords={focusWords}
          fluencyReminders={fluencyReminders}
          recorder={recorder}
          retellingStory={retellingStory}
          prosodyFocusGoal={prosodyFocusGoal}
          onKeywordsChange={onKeywordsChange}
          onStartRound={onStartRound}
        />
      ) : null}

      {stage === 'feedback' ? (
        <FluencyMiniFeedback
          feedback={feedback}
          recorder={recorder}
          onSubmitFeedback={onSubmitFeedback}
        />
      ) : null}

      {stage === 'running' ? (
        <FluencyRun
          topic={topic}
          roundIndex={roundIndex}
          feedback={feedback}
          keywords={keywords}
          chunksOfDay={chunksOfDay}
          focusWords={focusWords}
          fluencyReminders={fluencyReminders}
          recorder={recorder}
          retellingStory={retellingStory}
          prosodyFocusGoal={prosodyFocusGoal}
          onRoundComplete={onRoundComplete}
        />
      ) : null}
    </section>
  )
}
