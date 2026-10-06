import { useState } from 'react'
import { Link } from 'react-router-dom'
import { finalMovement, pitchOfRecording } from '../../services/audio/pitch'
import { useProsodyRecorder } from './hooks/useProsodyRecorder'
import { RecorderControls } from './components/RecorderControls'
import { InfoButton } from '../../components/ui'
import { intonationPairs } from './pairs'
import type { PairMovement } from './pairs'

const MOVEMENT_LABEL: Record<PairMovement, string> = {
  rise: 'la voix monte (↑)',
  fall: 'la voix descend (↓)',
  level: 'la voix reste plate (→)',
}

type CheckResult = 'match' | 'mismatch' | 'unknown'

export default function IntonationPairsPage() {
  const recorder = useProsodyRecorder()
  const [pairIndex, setPairIndex] = useState(0)
  const [attitudeIndex, setAttitudeIndex] = useState(0)
  const [result, setResult] = useState<CheckResult | null>(null)
  const [checking, setChecking] = useState(false)

  const pair = intonationPairs[pairIndex]
  const attitude = pair?.attitudes[attitudeIndex]

  if (!pair || !attitude) {
    return (
      <div className="training">
        <header className="session-header">
          <div className="session-header__top">
            <div className="session-header__stage">
              <span className="session-header__label">Paires d'intonation</span>
            </div>
            <InfoButton id="pairs" />
          </div>
        </header>
        <section className="card exercise exercise--center">
          <h1>Paires d'intonation terminées</h1>
          <p className="muted">
            Tu as vérifié tes contours sur {intonationPairs.length} phrase
            {intonationPairs.length > 1 ? 's' : ''}. Refais-les deux fois par
            semaine pour gagner en ampleur.
          </p>
          <div className="stack">
            <button
              type="button"
              className="button button--block"
              onClick={() => {
                setPairIndex(0)
                setAttitudeIndex(0)
                setResult(null)
              }}
            >
              Recommencer
            </button>
            <Link className="button button--ghost button--block" to="/prosody">
              Retour à la prosodie
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const check = async () => {
    if (!recorder.current?.url || checking) return
    setChecking(true)
    const curve = await pitchOfRecording(recorder.current.url)
    const movement = curve ? finalMovement(curve.semitones) : null
    setResult(movement === null ? 'unknown' : movement === attitude.movement ? 'match' : 'mismatch')
    setChecking(false)
  }

  const next = () => {
    if (attitudeIndex + 1 < pair.attitudes.length) {
      setAttitudeIndex(attitudeIndex + 1)
    } else {
      setPairIndex(pairIndex + 1)
      setAttitudeIndex(0)
    }
    setResult(null)
    recorder.reset()
  }

  return (
    <div className="training">
      <header className="session-header">
        <div className="session-header__top">
          <div className="session-header__stage">
            <span className="session-header__label">
              Paires d'intonation · {pairIndex + 1}/{intonationPairs.length}
            </span>
            <span className="session-header__title">Sonner plus naturel · {pair.base}</span>
          </div>
          <div className="session-header__actions">
            <InfoButton id="pairs" />
            <Link to="/prosody" className="session-header__exit">Quitter</Link>
          </div>
        </div>
      </header>

      <section className="card exercise exercise--center" aria-labelledby="pairs-title">
        <p className="pill">{attitude.label}</p>
        <h2 id="pairs-title">Dis :</h2>
        <p className="exercise__expression" lang="fr">{attitude.text}</p>
        <p className="muted">
          Attendu : {MOVEMENT_LABEL[attitude.movement]}. Enregistre-toi puis
          vérifie ta courbe.
        </p>
        <RecorderControls recorder={recorder} recordLabel="Enregistrer" />
        <button
          type="button"
          className="button button--ghost button--block"
          disabled={!recorder.current || checking}
          onClick={() => void check()}
        >
          {checking ? 'Mesure…' : 'Vérifier ma courbe'}
        </button>
        {result ? (
          <p className="pill" role="status">
            {result === 'match'
              ? '✓ Le mouvement correspond.'
              : result === 'mismatch'
                ? '✗ Le mouvement ne correspond pas : réessaie.'
                : 'Courbe non mesurable : réessaie plus fort.'}
          </p>
        ) : null}
        <button type="button" className="button button--block" onClick={next}>
          Continuer
        </button>
      </section>
    </div>
  )
}
