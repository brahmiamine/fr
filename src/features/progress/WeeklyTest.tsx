import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useAppState } from '../../app/AppStateProvider'
import { Timer } from '../../components/Timer/Timer'
import { contentRepository } from '../../services/content/contentRepository'
import {
  getWeekKey,
  recordWeeklyTest,
  toLocalDateString,
} from '../../services/progress/progress'
import type { Topic } from '../../types/content'
import type { WeeklyTestRecord } from '../../types/progress'

const TEST_SECONDS = 180

function pickTopic(recent: readonly string[]): Topic {
  const fresh = contentRepository.topics.filter((topic) => !recent.includes(topic.id))
  const pool = fresh.length > 0 ? fresh : [...contentRepository.topics]
  return pool[Math.floor(Math.random() * pool.length)]
}

function emptyMeasurement() {
  return {
    startDelaySeconds: '',
    midSentencePauses: '',
    betweenIdeaPauses: '',
    majorFillers: '',
    successfulParaphrases: '',
    abandonedSentences: '',
    longestFluentSegmentSeconds: '',
    wordsSpoken: '',
    score: '',
  }
}

function toNumber(value: string): number {
  return value.trim() === '' ? 0 : Math.max(0, Number(value))
}

function wordsPerMinute(test: WeeklyTestRecord): number {
  return Math.round((test.wordsSpoken ?? 0) / 3)
}

export default function WeeklyTest() {
  const { state, updateWith } = useAppState()
  const weekKey = getWeekKey()
  const existing = state.weeklyTests.find((test) => test.weekKey === weekKey)

  const [topic, setTopic] = useState<Topic | null>(null)
  const [stage, setStage] = useState<'intro' | 'running' | 'form'>('intro')
  const [measurement, setMeasurement] = useState(emptyMeasurement())

  const recentTopicIds = useMemo(
    () => [...state.recentTopicIds, ...state.weeklyTests.map((test) => test.topicId)],
    [state.recentTopicIds, state.weeklyTests],
  )

  if (existing) {
    return (
      <section className="card weekly-test" aria-labelledby="weekly-done">
        <h2 id="weekly-done">Test de la semaine ✓</h2>
        <p className="muted">Déjà réalisé cette semaine. Reviens lundi.</p>
        <ul className="weekly-test__summary">
          <li>Démarrage : {existing.startDelaySeconds}s</li>
          <li>Pauses au milieu d'une phrase : {existing.midSentencePauses ?? existing.longPauses}</li>
          <li>Pauses entre deux idées : {existing.betweenIdeaPauses ?? 0}</li>
          <li>Hésitations importantes : {existing.majorFillers}</li>
          <li>Phrases abandonnées : {existing.abandonedSentences}</li>
          <li>Mots contournés : {existing.successfulParaphrases}</li>
          <li>Plus long segment fluide : {existing.longestFluentSegmentSeconds}s</li>
          <li>Débit approximatif : {wordsPerMinute(existing)} mots/min</li>
          <li>Score ressenti : {existing.score}/5</li>
        </ul>
      </section>
    )
  }

  const handleStart = () => {
    setTopic(pickTopic(recentTopicIds))
    setStage('running')
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const now = new Date()
    const midSentencePauses = toNumber(measurement.midSentencePauses)
    const betweenIdeaPauses = toNumber(measurement.betweenIdeaPauses)
    const record: WeeklyTestRecord = {
      id: `wt-${weekKey}`,
      weekKey,
      date: toLocalDateString(now),
      topicId: topic?.id ?? '',
      durationMinutes: Math.round(TEST_SECONDS / 60),
      startDelaySeconds: toNumber(measurement.startDelaySeconds),
      longPauses: midSentencePauses + betweenIdeaPauses,
      midSentencePauses,
      betweenIdeaPauses,
      majorFillers: toNumber(measurement.majorFillers),
      successfulParaphrases: toNumber(measurement.successfulParaphrases),
      abandonedSentences: toNumber(measurement.abandonedSentences),
      longestFluentSegmentSeconds: toNumber(measurement.longestFluentSegmentSeconds),
      wordsSpoken: toNumber(measurement.wordsSpoken),
      score: Math.min(5, Math.max(1, toNumber(measurement.score) || 3)),
    }
    updateWith((prev) => recordWeeklyTest(prev, record))
    setStage('intro')
  }

  return (
    <section className="card weekly-test" aria-labelledby="weekly-title">
      <h2 id="weekly-title">Test de fluidité hebdomadaire</h2>

      {stage === 'intro' || !topic ? (
        <>
          <p className="muted">
            Un sujet jamais vu récemment, aucune préparation, puis 3 minutes de
            parole spontanée dans les mêmes conditions chaque semaine.
          </p>
          <button type="button" className="button button--block" onClick={handleStart}>
            Lancer le test de 3 minutes
          </button>
        </>
      ) : null}

      {stage === 'running' && topic ? (
        <>
          <h3 className="weekly-test__topic">{topic.title}</h3>
          <p className="muted">
            Parle sans préparation. Compte ensuite tes pauses et estime le
            nombre de mots prononcés.
          </p>
          <Timer
            durationSeconds={TEST_SECONDS}
            autoStart
            hideControls
            label="Parle librement"
            onComplete={() => setStage('form')}
          />
        </>
      ) : null}

      {stage === 'form' ? (
        <form onSubmit={handleSubmit}>
          <h3>Mesures</h3>
          {(
            [
              ['startDelaySeconds', "Temps avant de démarrer (s)"],
              ['midSentencePauses', "Pauses > 1 s au milieu d'une phrase"],
              ['betweenIdeaPauses', 'Pauses > 1 s entre deux idées'],
              ['majorFillers', 'Hésitations importantes'],
              ['abandonedSentences', 'Phrases abandonnées'],
              ['successfulParaphrases', 'Mots contournés avec succès'],
              ['longestFluentSegmentSeconds', 'Durée max sans blocage (s)'],
              ['wordsSpoken', 'Nombre approximatif de mots en 3 min'],
            ] as const
          ).map(([field, label]) => (
            <div className="field" key={field}>
              <label htmlFor={`wt-${field}`}>{label}</label>
              <input
                id={`wt-${field}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={measurement[field]}
                onChange={(event) =>
                  setMeasurement((prev) => ({
                    ...prev,
                    [field]: event.target.value,
                  }))
                }
              />
            </div>
          ))}

          <div className="field">
            <label htmlFor="wt-score">Score ressenti (1 à 5)</label>
            <select
              id="wt-score"
              value={measurement.score}
              onChange={(event) =>
                setMeasurement((prev) => ({ ...prev, score: event.target.value }))
              }
            >
              <option value="">Choisir…</option>
              {[1, 2, 3, 4, 5].map((score) => (
                <option key={score} value={score}>{score}</option>
              ))}
            </select>
          </div>

          <button type="submit" className="button button--block">
            Enregistrer le test
          </button>
        </form>
      ) : null}
    </section>
  )
}
