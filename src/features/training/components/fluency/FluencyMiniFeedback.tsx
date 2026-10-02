import { AudioClip } from '../../../../components/AudioClip/AudioClip'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { SpeakButton } from '../../../../components/Speech/SpeakButton'
import { Timer } from '../../../../components/Timer/Timer'
import { Button, Callout, Card, TextField } from '../../../../components/ui'
import type { AudioRecorder } from '../../../../hooks/useAudioRecorder'
import { MINI_FEEDBACK_SECONDS } from '../../types'
import type { FluencyFeedback } from '../../types'

export interface FluencyMiniFeedbackProps {
  feedback: FluencyFeedback
  recorder?: AudioRecorder
  onSubmitFeedback: (values: FluencyFeedback) => void
}

export function FluencyMiniFeedback({
  feedback,
  recorder,
  onSubmitFeedback,
}: FluencyMiniFeedbackProps) {
  const [values, setValues] = useState<Required<FluencyFeedback>>({
    missingWord: feedback.missingWord,
    missingWordContext: feedback.missingWordContext,
    difficultPhrase: feedback.difficultPhrase,
    importantError: feedback.importantError,
    missedChunk: feedback.missedChunk ?? '',
    missedChunkIntent: feedback.missedChunkIntent ?? '',
  })

  const set = (field: keyof FluencyFeedback) => (value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (values.missingWord.trim() && !values.missingWordContext.trim()) return
    if (values.missedChunk.trim() && !values.missedChunkIntent.trim()) return
    onSubmitFeedback(values)
  }

  return (
    <Card enter="pop" aria-labelledby="feedback-title">
      <div className="card-head">
        <h2 id="feedback-title">Petit retour (30–60 s)</h2>
        <Timer
          persistKey="fluency-mini-feedback"
          durationSeconds={MINI_FEEDBACK_SECONDS}
          autoStart
          hideControls
          compact
          secondsOnly
          variant="inline"
          label="Reste bref"
        />
      </div>

      {recorder?.blobUrl ? (
        <Callout title="Écoute environ 1 minute">
          <p className="muted">
            Écoute ton tour avant de corriger. Cherche seulement un mot, une
            phrase difficile et une erreur importante.
          </p>
          <AudioClip src={recorder.blobUrl} label="Écouter mon tour" />
        </Callout>
      ) : (
        <p className="muted">
          La prochaine fois, enregistre le premier tour : l'écoute différée rend
          le feedback beaucoup plus fiable.
        </p>
      )}

      <form className="form-stack" onSubmit={handleSubmit}>
        <div className="form-grid">
          <TextField
            id="missing-word"
            label="Quel mot t'a manqué ? (facultatif)"
            value={values.missingWord}
            onChange={set('missingWord')}
            placeholder="ex. prise"
          />
          {values.missingWord.trim() ? (
            <TextField
              id="missing-word-context"
              label="Quelle idée voulais-tu exprimer sans ce mot ?"
              value={values.missingWordContext}
              onChange={set('missingWordContext')}
              placeholder="Ex. l'endroit dans le mur où je branche un appareil"
              required
            />
          ) : null}
          <TextField
            id="difficult-phrase"
            label="Reformulation corrigée d'une phrase difficile (facultatif)"
            value={values.difficultPhrase}
            onChange={set('difficultPhrase')}
            after={
              values.difficultPhrase.trim() ? (
                <SpeakButton
                  text={values.difficultPhrase}
                  label="Écouter"
                  ariaLabel="Écouter la phrase reformulée"
                  compact
                />
              ) : null
            }
          />
          <TextField
            id="important-error"
            label="Formulation corrigée à réutiliser au prochain 4 → 3 → 2"
            value={values.importantError}
            onChange={set('importantError')}
            placeholder="ex. Je me suis rendu compte que…"
            after={
              values.importantError.trim() ? (
                <SpeakButton
                  text={values.importantError}
                  label="Écouter"
                  ariaLabel="Écouter la correction à réutiliser"
                  compact
                />
              ) : null
            }
          />
          <TextField
            id="missed-chunk"
            label="Un chunk que tu aurais pu utiliser ? (facultatif)"
            value={values.missedChunk}
            onChange={set('missedChunk')}
            placeholder="Ex. D'un autre côté…"
          />
          {values.missedChunk.trim() ? (
            <TextField
              id="missed-chunk-intent"
              label="À quoi sert-il ?"
              value={values.missedChunkIntent}
              onChange={set('missedChunkIntent')}
              placeholder="Ex. nuancer une opinion"
              required
            />
          ) : null}
        </div>
        <Button type="submit" size="lg" block trailing="→">
          Continuer vers le tour 2
        </Button>
      </form>
    </Card>
  )
}
