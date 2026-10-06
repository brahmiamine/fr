import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getEntry, getJson, listEntryKeys, putJson } from '../../services/storage/audioDb'
import { AudioClip } from '../../components/AudioClip/AudioClip'
import { InfoButton } from '../../components/ui'
import {
  DEFAULT_RATER,
  parseStoredRating,
  ratingKey,
  ratingsToCsv,
  summarizeRatings,
} from './check'
import type { BlindRating, CheckItem, ProsodyCheckRecord, StoredRating } from './check'

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
  const [records, setRecords] = useState<ProsodyCheckRecord[]>([])
  // Every rating saved on this device, by rater: the learner, or a native who
  // listens on the same phone under their own name.
  const [stored, setStored] = useState<StoredRating[]>([])
  const [rater, setRater] = useState(DEFAULT_RATER)
  const [done, setDone] = useState(false)
  const urlsRef = useRef<string[]>([])

  useEffect(() => {
    let cancelled = false
    void listEntryKeys().then(async (keys) => {
      const recordKeys = keys.filter((key) => key.startsWith('check-'))
      const loaded: RatedItem[] = []
      const loadedRecords: ProsodyCheckRecord[] = []
      for (const key of recordKeys) {
        const record = await getJson<ProsodyCheckRecord>(key)
        if (!record) continue
        loadedRecords.push(record)
        for (const item of record.items) {
          const blob = await getEntry(item.audioId)
          if (!(blob instanceof Blob)) continue
          const url = URL.createObjectURL(blob)
          urlsRef.current.push(url)
          loaded.push({ ...item, checkKind: record.kind, url })
        }
      }
      const ratings: StoredRating[] = []
      for (const key of keys.filter((item) => item.startsWith('rating-'))) {
        const value = await getJson<Partial<StoredRating>>(key)
        const parsed = value ? parseStoredRating(key, value) : null
        if (parsed) ratings.push(parsed)
      }
      if (!cancelled) {
        setItems(shuffle(loaded))
        setRecords(loadedRecords)
        setStored(ratings)
      }
    })
    return () => {
      cancelled = true
      for (const url of urlsRef.current) URL.revokeObjectURL(url)
      urlsRef.current = []
    }
  }, [])

  const raterName = rater.trim() || DEFAULT_RATER
  // This rater's own ratings, by recording.
  const ratings = useMemo(() => {
    const own: Record<string, BlindRating> = {}
    for (const rating of stored) if (rating.rater === raterName) own[rating.itemId] = rating
    return own
  }, [stored, raterName])
  const summary = useMemo(() => summarizeRatings(records, stored), [records, stored])

  const current = items[index]

  const exportCsv = () => {
    const blob = new Blob([ratingsToCsv(records, stored)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'notes-prosodie.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

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
    const unrated = items.length - rated
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
            {raterName} : {rated} enregistrement{rated > 1 ? 's' : ''} noté{rated > 1 ? 's' : ''}
            {unrated > 0 ? `, ${unrated} pas encore noté${unrated > 1 ? 's' : ''}` : ''}.
          </p>
          {summary.length > 0 ? (
            <>
              <h2>Moyennes par bilan (parole spontanée)</h2>
              <table className="progress__table">
                <thead>
                  <tr>
                    <th scope="col">Qui note</th>
                    <th scope="col">Bilan</th>
                    <th scope="col">Compréh.</th>
                    <th scope="col">Accent</th>
                    <th scope="col">Naturel</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.map((row) => (
                    <tr key={`${row.rater}-${row.kind}`}>
                      <th scope="row">{row.rater}</th>
                      <td>{row.kind}</td>
                      <td>{row.comprehensibility}</td>
                      <td>{row.accent}</td>
                      <td>{row.naturalness}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="muted">
                Seule la notation de la parole spontanée à l'aveugle montre le naturel. Les bilans
                ne sont nommés qu'ici, une fois la notation finie.
              </p>
            </>
          ) : null}
          <div className="stack">
            <button type="button" className="button button--block" onClick={() => { setDone(false); setIndex(0) }}>
              Un autre évaluateur note à son tour
            </button>
            {stored.length > 0 ? (
              <button type="button" className="button button--subtle button--block" onClick={exportCsv}>
                Exporter les notes (CSV)
              </button>
            ) : null}
            <Link className="button button--ghost button--block" to="/prosody">
              Retour à la prosodie
            </Link>
          </div>
        </section>
      </div>
    )
  }

  const saved = ratings[current.id]
  const rating: BlindRating = saved ?? { comprehensibility: 5, accent: 5, naturalness: 5 }

  const setScale = (key: keyof BlindRating, value: number) => {
    const next: StoredRating = { ...rating, [key]: value, rater: raterName, itemId: current.id }
    setStored((previous) => [
      ...previous.filter((item) => !(item.rater === raterName && item.itemId === current.id)),
      next,
    ])
    void putJson(ratingKey(raterName, current.id), next)
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
        <div className="field">
          <label htmlFor="rater-name">Qui note ?</label>
          <input
            id="rater-name"
            value={rater}
            onChange={(event) => setRater(event.target.value)}
            autoComplete="off"
          />
          <p className="muted">
            Toi, ou un natif qui écoute sur cet appareil : il met son prénom et note à son tour.
          </p>
        </div>
        <h2 id="blind-title">Écoute, puis note de 1 à 9.</h2>
        {!saved ? <p className="pill pill--warm">Pas encore noté : bouge un curseur pour noter.</p> : null}
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
