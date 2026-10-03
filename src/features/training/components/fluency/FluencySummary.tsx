import { AudioClip } from '../../../../components/AudioClip/AudioClip'
import { Button, Card, Pill } from '../../../../components/ui'
import { AiAnalysisPanel } from '../../../ai/AiAnalysisPanel'
import type { RoundRecordings } from '../../useFluencyRecordings'
import { ROUND_LABELS } from './RoundPills'

export interface FluencySummaryProps {
  /** Recordings of the rounds, by round index. */
  recordings: RoundRecordings
  onContinue: () => void
}

/**
 * End of the 4 → 3 → 2: replay the four rounds captured by the microphone.
 * Shown only when the learner kept recording switched on for the exercise.
 */
export function FluencySummary({ recordings, onContinue }: FluencySummaryProps) {
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
      <ol className="fluency-summary">
        {ROUND_LABELS.map((label, index) => (
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
      <Button variant="animated" size="lg" block trailing="→" onClick={onContinue}>
        Continuer
      </Button>
    </Card>
  )
}
