import { useState } from 'react'
import { SpeakButton } from '../../../../components/Speech/SpeakButton'
import { Button, Callout, Card, DotList, Pill, TextField } from '../../../../components/ui'
import type { AudioRecorder } from '../../../../hooks/useAudioRecorder'
import type { RetellingStory, Topic } from '../../../../types/content'
import type { FluencyReminder } from '../../types'
import { FLUENCY_PREP_SECONDS, MAX_KEYWORDS } from '../../types'
import { Timer } from '../../../../components/Timer/Timer'
import { RecordSwitch } from './RecordSwitch'
import { RetellingStoryBox } from './RetellingStoryBox'

export interface FluencyPrepProps {
  topic: Topic
  roundIndex: number
  keywords: string[]
  focusWords: string[]
  fluencyReminders: FluencyReminder[]
  recorder?: AudioRecorder
  recordAll: boolean
  retellingStory: RetellingStory | null
  prosodyFocusGoal: string | null
  constantTime?: boolean
  onKeywordsChange: (keywords: string[]) => void
  onRecordAllChange: (recordAll: boolean) => void
  onStartRound: () => void
}

function splitKeywords(value: string): string[] {
  return value
    .split(/[,\n]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, MAX_KEYWORDS)
}

export function FluencyPrep({
  topic,
  roundIndex,
  keywords,
  focusWords,
  fluencyReminders,
  recorder,
  recordAll,
  retellingStory,
  prosodyFocusGoal,
  constantTime = false,
  onKeywordsChange,
  onRecordAllChange,
  onStartRound,
}: FluencyPrepProps) {
  const [showPrompts, setShowPrompts] = useState(false)

  return (
    <Card aria-labelledby="fluency-title">
      <div className="row">
        <Pill>Tour 1 / 4{retellingStory ? ' · Variante retelling' : ''}</Pill>
        {topic.category ? <Pill>{topic.category}</Pill> : null}
        {constantTime ? <Pill tone="warm">Version 3/3/3 de la semaine</Pill> : null}
      </div>
      {constantTime ? (
        <p className="muted">
          Une fois par semaine, le temps reste constant (3 / 3 / 3 min) : moins de
          pression, plus de place pour la précision.
        </p>
      ) : null}
      <h1 id="fluency-title" className="exercise__prompt">
        {topic.title}
      </h1>

      {retellingStory ? (
        <RetellingStoryBox story={retellingStory} />
      ) : (
        <SpeakButton text={topic.title} label="Écouter le sujet" ariaLabel="Écouter le sujet" />
      )}

      <Button
        variant="dashed"
        block
        aria-expanded={showPrompts}
        aria-controls="fluency-prompts"
        onClick={() => setShowPrompts((open) => !open)}
      >
        {showPrompts ? 'Masquer les pistes' : "Besoin d'une piste ?"}
      </Button>
      {showPrompts ? (
        <Callout title="Quelques pistes" id="fluency-prompts">
          <DotList items={topic.prompts} />
        </Callout>
      ) : null}

      {fluencyReminders.length > 0 ? (
        <Callout title="Correction à réutiliser aujourd'hui" tone="soft">
          <ul className="speech-list">
            {fluencyReminders.map((reminder) => (
              <li key={reminder.id}>
                <span className="text-strong">{reminder.text}</span>
                <SpeakButton
                  text={reminder.text}
                  label="Écouter"
                  ariaLabel={`Écouter la correction ${reminder.text}`}
                  compact
                />
              </li>
            ))}
          </ul>
        </Callout>
      ) : null}

      {focusWords.length > 0 || prosodyFocusGoal ? (
        <div className="reminder-grid">
          {focusWords.length > 0 ? (
            <Callout title="Mots à réutiliser :" tone="soft">
              <span className="text-strong">{focusWords.join(' · ')}</span>
            </Callout>
          ) : null}
          {prosodyFocusGoal ? (
            <Callout title="Prosodie travaillée récemment :" tone="soft">
              <span className="text-strong">{prosodyFocusGoal}</span>
            </Callout>
          ) : null}
        </div>
      ) : null}

      <div className="row">
        <Timer
          persistKey="fluency-prep"
          durationSeconds={FLUENCY_PREP_SECONDS}
          autoStart
          hideControls
          compact
          secondsOnly
          variant="inline"
          label="Préparation (indicative)"
        />
      </div>
      <TextField
        id="keywords"
        label={
          retellingStory
            ? 'Note 2–3 expressions entendues (facultatif)'
            : '3 à 5 mots-clés maximum, jamais de phrases (facultatif)'
        }
        value={keywords.join(', ')}
        onChange={(value) => onKeywordsChange(splitKeywords(value))}
        placeholder="liberté, collègues, transport"
      />

      {roundIndex === 0 && recorder?.supported ? (
        <RecordSwitch
          checked={recordAll}
          onChange={onRecordAllChange}
          label="Enregistrer les 4 tours et mes réponses aux questions"
        />
      ) : null}

      <Button variant="animated" size="lg" block trailing="▶" onClick={onStartRound}>
        Commencer le tour 1
      </Button>
    </Card>
  )
}
