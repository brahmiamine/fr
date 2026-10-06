import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEntry, getJson, listEntryKeys, putJson } from '../../services/storage/audioDb'
import { AudioClip } from '../../components/AudioClip/AudioClip'
import { InfoButton } from '../../components/ui'
import type { BlindRating, CheckItem, ProsodyCheckRecord } from './check'

interface RatedItem extends CheckItem {
  checkKind: string
  url: string
}

const SCALES: Array<{ key: keyof BlindRating; label: string }> = [
  { key: 'comprehensibility', label: 'Compréhensibilité' },
  { key: 'accent', label: 'Accent' },
  { key: 'naturalness', label: 'Naturel' },
]

function shuffle<T>(list: T[]): T[] {
  const next = [...list]
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j] as T, next[i] as T]
  }
  return next
}

export default function ProsodyBlindPage() {
  const [items, setItems] = useState<RatedItem[]>([])
  const [index, setIndex] = useState(0)
  const [ratings, setRatings] = useState<Record<string, BlindRating>>({})
  const [done, setDone] = useState(false)

  useEffect(() => {
    let cancelled = false
    void listEntryKeys().then(async (keys) => {
      const recordKeys = keys.filter((key) => key.startsWith('check-'))
      const loaded: RatedItem[] = []
      const savedRatings: Record<string, BlindRating> = {}
      for (const key of recordKeys) {
        const record = await getJson<ProsodyCheckRecord>(key)
        if (!record) continue
        for (const item of record.items) {
          const blob = await getEntry(item.audioId)
          if (!(blob instanceof Blob)) continue
          const rating = await getJson<BlindRating>(`rating-${item.id}`)
          if (rating) savedRatings[item.id] = rating
          loaded.push({
            ...item,
            checkKind: record.kind,
            url: URL.createObjectURL(blob),
          })
        }
      }
      if (!cancelled) {
        setItems(shuffle(loaded))
        setRatings(savedRatings)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const current = items[index]

  if (items.length === 0) {
    return (
      <div className="training">
        <header className="session-header">
          <div className="session-header__top">
            <div className="session-header__stage">
              <span className="session-header__label">Notation à l'aveugle</span>
            </div>
            <InfoButton id="prosodyCheck" />
          </div>
        </header>
        <section className="card exercise exercise--center">
          <h1>Aucun enregistrement à noter.</h1>
          <p className="muted">
            Termine d'abord un bilan prosodique (S0, S4 ou S8) pour pouvoir le
            noter à l'aveugle.
          </p>
          <Link className="button button--block" to="/prosody/check">
            Faire un bilan
          </Link>
        </section>
      </div>
    )
  }

  if (done) {
    const rated = Object.keys(ratings).length
    return (
      <div className="training">
        <header className="session-header">
          <div className="session-header__top">
            <div className="session-header__stage">
              <span className="session-header__label">Notation à l'aveugle</span>
            </div>
            <InfoButton id="prosodyCheck" />
          </div>
        </header>
        <section className="card exercise exercise--center">
          <h1>Notation terminée</h1>
          <p className="muted">
            {rated} enregistrement{rated > 1 ? 's' : ''} noté{rated > 1 ? 's' : ''}. Partage
            ces notes avec des natifs pour comparer tes bilans S0, S4 et S8.
          </p>
          <Link className="button button--block" to="/prosody">
            Retour à la prosodie
          </Link>
        </section>
      </div>
    )
  }

  const rating = ratings[current.id] ?? { comprehensibility: 5, accent: 5, naturalness: 5 }

  const setScale = (key: keyof BlindRating, value: number) => {
    const next = { ...rating, [key]: value }
    setRatings((prev) => ({ ...prev, [current.id]: next }))
    void putJson(`rating-${current.id}`, next)
  }

  return (
    <div className="training">
      <header className="session-header">
        <div className="session-header__top">
          <div className="session-header__stage">
            <span className="session-header__label">
              Notation à l'aveugle · {index + 1}/{items.length}
            </span>
            <span className="session-header__title">Sonner plus naturel · extrait mélangé</span>
          </div>
          <div className="session-header__actions">
            <InfoButton id="prosodyCheck" />
            <Link to="/prosody" className="session-header__exit">Quitter</Link>
          </div>
        </div>
      </header>
      <section className="card exercise" aria-labelledby="blind-title">
        <p className="pill">Sans savoir si c'est S0, S4 ou S8</p>
        <h2 id="blind-title">Écoute, puis note de 1 à 9.</h2>
        <AudioClip src={current.url} label="Écouter l'extrait" />
        <p className="muted" lang="fr">
          {current.kind === 'reading'
            ? 'Lecture'
            : current.kind === 'story'
              ? 'Récit'
              : current.kind === 'argument'
                ? 'Argumentation'
                : 'Imitation'}
        </p>
        <div className="stack">
          {SCALES.map((scale) => (
            <label key={scale.key} className="rating-scale">
              <span>{scale.label}</span>
              <input
                type="range"
                min={1}
                max={9}
                value={rating[scale.key]}
                onChange={(event) => setScale(scale.key, Number(event.target.value))}
              />
              <span className="pill">{rating[scale.key]}/9</span>
            </label>
          ))}
        </div>
        <div className="stack">
          <button
            type="button"
            className="button button--block"
            onClick={() => (index + 1 < items.length ? setIndex(index + 1) : setDone(true))}
          >
            {index + 1 < items.length ? 'Extrait suivant' : 'Terminer'}
          </button>
        </div>
      </section>
    </div>
  )
}
