import type { Chunk, RetellingStory, Topic } from '../../../types/content'
import type { AudioRecorder } from '../../../hooks/useAudioRecorder'
import type { RoundRecordings } from '../useFluencyRecordings'
import type { FluencyFeedback, FluencyReminder } from '../types'
import { FluencyMiniFeedback } from './fluency/FluencyMiniFeedback'
import { FluencyPrep } from './fluency/FluencyPrep'
import { FluencyReady } from './fluency/FluencyReady'
import { FluencyRun } from './fluency/FluencyRun'
import { FluencySummary } from './fluency/FluencySummary'
import { RoundPills } from './fluency/RoundPills'

export interface Fluency432ExerciseProps {
  topic: Topic
  /** The transfer subject of `topic` was written by the AI. */
  aiTransfer?: boolean
  roundIndex: number
  stage: 'prep' | 'ready' | 'running' | 'feedback' | 'summary'
  feedback: FluencyFeedback
  keywords: string[]
  chunksOfDay: Chunk[]
  focusWords: string[]
  fluencyReminders: FluencyReminder[]
  recorder?: AudioRecorder
  /** Record every round and replay them in the summary at the end. */
  recordAll: boolean
  /** Round recordings, by round index (in memory only). */
  recordings: RoundRecordings
  /** Retelling variant: the topic is a short story heard before round 1. */
  retellingStory?: RetellingStory | null
  /** Recent prosody point to keep while speaking. */
  prosodyFocusGoal?: string | null
  /** Length of each round (4/3/2/2 or the weekly 3/3/3/2). */
  roundSeconds?: readonly number[]
  /** The week's constant-time version. */
  constantTime?: boolean
  onKeywordsChange: (keywords: string[]) => void
  onRecordAllChange: (recordAll: boolean) => void
  onStartRound: () => void
  onBeginRound?: () => void
  onRoundComplete: () => void
  onSummaryDone: () => void
  onSubmitFeedback: (values: FluencyFeedback) => void
}

export function Fluency432Exercise({
  topic,
  aiTransfer = false,
  roundIndex,
  stage,
  feedback,
  keywords,
  chunksOfDay,
  focusWords,
  fluencyReminders,
  recorder,
  recordAll,
  recordings,
  retellingStory = null,
  prosodyFocusGoal = null,
  roundSeconds,
  constantTime = false,
  onKeywordsChange,
  onRecordAllChange,
  onStartRound,
  onBeginRound,
  onRoundComplete,
  onSummaryDone,
  onSubmitFeedback,
}: Fluency432ExerciseProps) {
  const summary = stage === 'summary'

  return (
    <section className="exercise screen-enter">
      <RoundPills
        roundIndex={roundIndex}
        done={stage === 'feedback' || summary}
        roundSeconds={roundSeconds}
      />

      {stage === 'prep' ? (
        <FluencyPrep
          topic={topic}
          roundIndex={roundIndex}
          keywords={keywords}
          focusWords={focusWords}
          fluencyReminders={fluencyReminders}
          recorder={recorder}
          recordAll={recordAll}
          retellingStory={retellingStory}
          prosodyFocusGoal={prosodyFocusGoal}
          constantTime={constantTime}
          onKeywordsChange={onKeywordsChange}
          onRecordAllChange={onRecordAllChange}
          onStartRound={onStartRound}
        />
      ) : null}

      {stage === 'ready' ? (
        <FluencyReady
          topic={topic}
          roundIndex={roundIndex}
          feedback={feedback}
          aiTransfer={aiTransfer}
          roundSeconds={roundSeconds}
          prosodyFocusGoal={prosodyFocusGoal}
          onBegin={() => onBeginRound?.()}
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
          recording={recorder?.status === 'recording'}
          retellingStory={retellingStory}
          prosodyFocusGoal={prosodyFocusGoal}
          roundSeconds={roundSeconds}
          onRoundComplete={onRoundComplete}
        />
      ) : null}

      {stage === 'feedback' ? (
        <FluencyMiniFeedback
          feedback={feedback}
          recorder={recorder}
          onSubmitFeedback={onSubmitFeedback}
        />
      ) : null}

      {summary ? <FluencySummary recordings={recordings} roundSeconds={roundSeconds} onContinue={onSummaryDone} /> : null}
    </section>
  )
}
