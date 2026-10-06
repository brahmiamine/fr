import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getJson, listEntryKeys, putEntry, putJson } from '../../services/storage/audioDb'
import { AudioClip } from '../../components/AudioClip/AudioClip'
import { InfoButton } from '../../components/ui'
import { useProsodyRecorder } from './hooks/useProsodyRecorder'
import { RecorderControls } from './components/RecorderControls'
import { CHECK_PROMPTS, measureRecording, nextCheckKind } from './check'
import type { CheckItem, CheckItemKind, ProsodyCheckKind, ProsodyCheckRecord } from './check'

type Step = 'intro' | 'imitation' | 'reading' | 'story' | 'argument' | 'done'

const STORY_SECONDS = 90
const ARGUMENT_SECONDS = 60

function formatSeconds(value: number): string {
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}

export default function ProsodyCheckPage() {
  const recorder = useProsodyRecorder()
  const [kind, setKind] = useState<ProsodyCheckKind | null | 'loading'>('loading')
  const [step, setStep] = useState<Step>('intro')
  const [phraseIndex, setPhraseIndex] = useState(0)
  const [listened, setListened] = useState(false)
  const [items, setItems] = useState<CheckItem[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    void listEntryKeys()
      .then(async (keys) => {
        const records: ProsodyCheckRecord[] = []
        for (const key of keys.filter((item) => item.startsWith('check-'))) {
          const record = await getJson<ProsodyCheckRecord>(key)
          if (record) records.push(record)
        }
        return records
      })
      .then((records) => {
        if (cancelled) return
        setKind(nextCheckKind(records.map((record) => record.kind)))
      })
      .catch(() => {
        if (!cancelled) setKind('S0')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const phrase = CHECK_PROMPTS.phrases[phraseIndex]

  const keepRecording = (itemKind: CheckItemKind, prompt: string, then: () => void) => {
    const rec = recorder.current
    const itemId = `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const audioId = `audio-${itemId}`
    const item: CheckItem = { id: itemId, kind: itemKind, prompt, audioId, measures: null }
    setItems((prev) => [...prev, item])
    if (rec) {
      void putEntry(audioId, rec.blob)
      const url = URL.createObjectURL(rec.blob)
      void measureRecording(url)
        .then((measures) => {
          URL.revokeObjectURL(url)
          setItems((prev) => prev.map((it) => (it.id === itemId ? { ...it, measures } : it)))
        })
        .catch(() => URL.revokeObjectURL(url))
    }
    recorder.reset()
    setListened(false)
    then()
  }

  const finish = () => {
    const record: ProsodyCheckRecord = {
      id: `check-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: kind as ProsodyCheckKind,
      date: new Date().toISOString(),
      items,
    }
    void putJson(`check-${record.id}`, record).then(() => setSaved(true))
  }

  const kindLabel = kind === 'S0' ? 'de départ (S0)' : kind === 'S4' ? 'des 4 semaines (S4)' : 'des 8 semaines (S8)'

  if (kind === 'loading') {
    return <div className="training"><section className="card exercise">Préparation…</section></div>
  }

  if (kind === null) {
    return (
      <div className="training">
        <header className="session-header">
          <div className="session-header__top">
            <div className="session-header__stage">
              <span className="session-header__label">Bilan prosodique</span>
            </div>
            <InfoButton id="prosodyCheck" />
          </div>
        </header>
        <section className="card exercise exercise--center">
          <h1>Tous les bilans sont faits.</h1>
          <p className="muted">S0, S4 et S8 sont enregistrés. Compare-les à l'aveugle.</p>
          <Link className="button button--block" to="/prosody/blind">
            Noter mes enregistrements à l'aveugle
          </Link>
        </section>
      </div>
    )
  }

  if (step === 'intro') {
    return (
      <div className="training">
        <header className="session-header">
          <div className="session-header__top">
            <div className="session-header__stage">
              <span className="session-header__label">Bilan prosodique · {kind}</span>
              <span className="session-header__title">Sonner plus naturel · Bilan {kindLabel}</span>
            </div>
            <div className="session-header__actions">
              <InfoButton id="prosodyCheck" />
              <Link to="/prosody" className="session-header__exit">Quitter</Link>
            </div>
          </div>
        </header>
        <section className="card exercise exercise--center">
          <p className="pill">≈ 15 min</p>
          <h1>Bilan prosodique {kind}</h1>
          <p className="muted">
            Quatre tâches, toujours les mêmes : imiter 5 phrases jamais travaillées,
            lire un texte, raconter 90 s, argumenter 60 s. Tes enregistrements sont
            conservés sur cet appareil pour être notés plus tard à l'aveugle.
          </p>
          <button type="button" className="button button--block" onClick={() => setStep('imitation')}>
            Commencer
          </button>
        </section>
      </div>
    )
  }

  if (step === 'imitation') {
    return (
      <div className="training">
        <header className="session-header">
          <div className="session-header__top">
            <div className="session-header__stage">
              <span className="session-header__label">Bilan {kind} · Imitation {phraseIndex + 1}/{CHECK_PROMPTS.phrases.length}</span>
            </div>
            <div className="session-header__actions">
              <InfoButton id="prosodyCheck" />
              <Link to="/prosody" className="session-header__exit">Quitter</Link>
            </div>
          </div>
        </header>
        <section className="card exercise exercise--center" aria-labelledby="imitation-title">
          <p className="pill">Imitation différée</p>
          <h2 id="imitation-title">Écoute une fois, puis répète.</h2>
          <AudioClip
            speechText={phrase}
            speechLocale="fr-FR"
            label="Écouter la phrase"
            onComplete={() => setListened(true)}
          />
          <p className="muted">Une seule écoute. Puis redis-la avec sa mélodie.</p>
          <RecorderControls recorder={recorder} recordLabel="Enregistrer mon imitation" disabled={!listened} />
          <button
            type="button"
            className="button button--block"
            disabled={!recorder.current}
            onClick={() =>
              keepRecording('imitation', phrase, () =>
                phraseIndex + 1 < CHECK_PROMPTS.phrases.length
                  ? setPhraseIndex(phraseIndex + 1)
                  : setStep('reading'),
              )
            }
          >
            Garder et continuer
          </button>
        </section>
      </div>
    )
  }

  if (step === 'reading') {
    return (
      <div className="training">
        <header className="session-header">
          <div className="session-header__top">
            <div className="session-header__stage">
              <span className="session-header__label">Bilan {kind} · Lecture</span>
            </div>
            <div className="session-header__actions">
              <InfoButton id="prosodyCheck" />
              <Link to="/prosody" className="session-header__exit">Quitter</Link>
            </div>
          </div>
        </header>
        <section className="card exercise" aria-labelledby="reading-title">
          <p className="pill">Lecture</p>
          <h2 id="reading-title">Lis ce texte à voix haute.</h2>
          <p className="exercise__reading" lang="fr">{CHECK_PROMPTS.readingText}</p>
          <RecorderControls recorder={recorder} recordLabel="Enregistrer ma lecture" />
          <button
            type="button"
            className="button button--block"
            disabled={!recorder.current}
            onClick={() => keepRecording('reading', CHECK_PROMPTS.readingText.slice(0, 40), () => setStep('story'))}
          >
            Garder et continuer
          </button>
        </section>
      </div>
    )
  }

  const spontaneous = step === 'story' || step === 'argument'
  const prompt = step === 'story' ? CHECK_PROMPTS.storyPrompt : CHECK_PROMPTS.argumentPrompt
  const targetSeconds = step === 'story' ? STORY_SECONDS : ARGUMENT_SECONDS
  const label = step === 'story' ? 'Récit' : 'Argumentation'

  if (spontaneous) {
    return (
      <div className="training">
        <header className="session-header">
          <div className="session-header__top">
            <div className="session-header__stage">
              <span className="session-header__label">Bilan {kind} · {label}</span>
            </div>
            <div className="session-header__actions">
              <InfoButton id="prosodyCheck" />
              <Link to="/prosody" className="session-header__exit">Quitter</Link>
            </div>
          </div>
        </header>
        <section className="card exercise exercise--center" aria-labelledby="spontaneous-title">
          <p className="pill">{label} · {formatSeconds(targetSeconds)}</p>
          <h2 id="spontaneous-title">{prompt}</h2>
          <p className="muted">
            Parle {targetSeconds} secondes environ, sans préparation. Ton
            enregistrement est en cours : {recorder.recordingSeconds}s.
          </p>
          <RecorderControls recorder={recorder} recordLabel={`Enregistrer mon ${label.toLowerCase()}`} />
          <button
            type="button"
            className="button button--block"
            disabled={!recorder.current}
            onClick={() =>
              keepRecording(step === 'story' ? 'story' : 'argument', prompt, () =>
                step === 'story' ? setStep('argument') : setStep('done'),
              )
            }
          >
            Garder et continuer
          </button>
        </section>
      </div>
    )
  }

  const measuredCount = items.filter((item) => item.measures !== null).length
  return (
    <div className="training">
      <header className="session-header">
        <div className="session-header__top">
          <div className="session-header__stage">
            <span className="session-header__label">Bilan {kind} · Terminé</span>
          </div>
          <InfoButton id="prosodyCheck" />
        </div>
      </header>
      <section className="card exercise exercise--center">
        <h1>Bilan {kind} terminé</h1>
        <p className="muted">
          {items.length} enregistrements conservés sur cet appareil
          {measuredCount > 0 ? ` (${measuredCount} mesurés)` : ''}. Tu pourras les
          noter à l'aveugle et les comparer à tes prochains bilans.
        </p>
        <div className="stack">
          {!saved ? (
            <button type="button" className="button button--block" onClick={finish}>
              Enregistrer ce bilan
            </button>
          ) : null}
          <Link className="button button--block" to="/prosody/blind">
            Noter mes enregistrements à l'aveugle
          </Link>
          <Link className="button button--ghost button--block" to="/prosody">
            Retour à la prosodie
          </Link>
        </div>
      </section>
    </div>
  )
}
