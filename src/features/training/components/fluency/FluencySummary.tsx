import { AudioClip } from '../../../../components/AudioClip/AudioClip'
import { Button, Card, Pill } from '../../../../components/ui'
import { AiAnalysisPanel } from '../../../ai/AiAnalysisPanel'
import { RoundsComparisonPanel } from '../../../ai/RoundsComparisonPanel'
import { QuickWordGap } from '../../../wordGaps/QuickWordGap'
import type { RoundRecordings } from '../../useFluencyRecordings'
import { FLUENCY_ROUND_SECONDS, roundLabels } from '../../types'

export interface FluencySummaryProps {
  /** Recordings of the rounds, by round index. */
  recordings: RoundRecordings
  roundSeconds?: readonly number[]
  /** Subject of the rounds and of the transfer, for the comparison. */
  topic?: string
  transferTopic?: string
  onContinue: () => void
}

/**
 * End of the 4 → 3 → 2: replay the four rounds captured by the microphone.
 * Shown only when the learner kept recording switched on for the exercise.
 */
export function FluencySummary({
  recordings,
  roundSeconds = FLUENCY_ROUND_SECONDS,
  topic = '',
  transferTopic,
  onContinue,
}: FluencySummaryProps) {
  const labels = roundLabels(roundSeconds)
  const compared = labels.flatMap((label, index) =>
    recordings[index]
      ? [{ label, audioUrl: recordings[index], transfer: index === labels.length - 1 }]
      : [],
  )
  return (
    <Card enter="pop" aria-labelledby="fluency-summary-title">
      <div className="row">
        <Pill>Résumé</Pill>
      </div>
      <h2 id="fluency-summary-title">Réécoute</h2>
      <p className="muted">
        Compare tes tours : chacun doit être plus clair et plus fluide que le
        précédent, sans perdre le contenu.
      </p>
      <p className="muted">
        <span className="text-strong">Écoute prosodique :</span> dans ton tour 3,
        réécoute seulement 1 ou 2 groupes. Coupes-tu au bon endroit ? La dernière
        syllabe s'allonge-t-elle ? Ta voix monte-t-elle avant de continuer ?
      </p>
      <ol className="fluency-summary">
        {labels.map((label, index) => (
          <li key={label}>
            {recordings[index] ? (
              <AudioClip
                src={recordings[index]}
                label={`Écouter le ${label.toLowerCase()}`}
                caption={label}
              />
            ) : (
              <span className="muted">{label} · pas d'enregistrement</span>
            )}
            <AiAnalysisPanel
              audioUrl={recordings[index]}
              situation="round"
              subtitle={`Sur ton ${label.toLowerCase().replace(' — ', ' · ')}`}
            />
            {recordings[index] ? (
              <a
                className="fluency-summary__download"
                href={recordings[index]}
                download={`${label.replace(/[^\w]+/g, '-').toLowerCase()}.webm`}
              >
                Télécharger
              </a>
            ) : null}
          </li>
        ))}
      </ol>
      <RoundsComparisonPanel topic={topic} transferTopic={transferTopic} rounds={compared} />
      <QuickWordGap id="fluency-summary-gap" />
      <Button variant="animated" size="lg" block trailing="→" onClick={onContinue}>
        Continuer
      </Button>
    </Card>
  )
}
