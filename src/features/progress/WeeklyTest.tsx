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
  const fresh = contentRepository.topics.filter(
    (topic) => !recent.includes(topic.id),
  )
  const pool = fresh.length > 0 ? fresh : [...contentRepository.topics]
  return pool[Math.floor(Math.random() * pool.length)]
}

function emptyMeasurement() {
  return {
    startDelaySeconds: '',
    longPauses: '',
    majorFillers: '',
    successfulParaphrases: '',
    abandonedSentences: '',
    longestFluentSegmentSeconds: '',
  }
}

function toNumber(value: string): number {
  return value.trim() === '' ? 0 : Math.max(0, Number(value))
}

export default function WeeklyTest() {
  const { state, updateWith } = useAppState()
  const weekKey = getWeekKey()
  const existing = state.weeklyTests.find((test) => test.weekKey === weekKey)

  const [topic, setTopic] = useState<Topic | null>(null)
  const [stage, setStage] = useState<'intro' | 'running' | 'form'>('intro')
  const [measurement, setMeasurement] = useState(emptyMeasurement())

  const recentTopicIds = useMemo(
    () => [...state.recentTopicIds, ...state.weeklyTests.map((t) => t.topicId)],
    [state.recentTopicIds, state.weeklyTests],
  )

  if (existing) {
    return (
      <section className="card weekly-test" aria-labelledby="weekly-done">
        <h2 id="weekly-done">Test de la semaine ✓</h2>
        <p className="muted">
          Déjà réalisé cette semaine. Reviens lundi pour le prochain.
        </p>
        <ul className="weekly-test__summary">
          <li>Coup d'envoi : {existing.startDelaySeconds}s</li>
          <li>Pauses longues : {existing.longPauses}</li>
          <li>Faux départs : {existing.majorFillers}</li>
          <li>Paraphrases réussies : {existing.successfulParaphrases}</li>
          <li>Phrases abandonnées : {existing.abandonedSentences}</li>
          <li>
            Plus long segment fluide : {existing.longestFluentSegmentSeconds}s
          </li>
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
    const record: WeeklyTestRecord = {
      id: `wt-${weekKey}`,
      weekKey,
      date: toLocalDateString(now),
      topicId: topic?.id ?? '',
      durationMinutes: Math.round(TEST_SECONDS / 60),
      startDelaySeconds: toNumber(measurement.startDelaySeconds),
      longPauses: toNumber(measurement.longPauses),
      majorFillers: toNumber(measurement.majorFillers),
      successfulParaphrases: toNumber(measurement.successfulParaphrases),
      abandonedSentences: toNumber(measurement.abandonedSentences),
      longestFluentSegmentSeconds: toNumber(
        measurement.longestFluentSegmentSeconds,
      ),
    }
    updateWith((prev) => recordWeeklyTest(prev, record))
    setStage('intro')
  }

  return (
    <section className="card weekly-test" aria-labelledby="weekly-title">
      <h2 id="weekly-title">Test hebdomadaire</h2>

      {stage === 'intro' || !topic ? (
        <>
          <p className="muted">
            Une fois par semaine : 3 minutes de parole spontanée sur un nouveau
            sujet, puis note tes mesures.
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
            Parle sans préparation. Mesure ensuite ton démarrage et tes pauses.
          </p>
          <Timer
            durationSeconds={TEST_SECONDS}
            label="Parle librement"
            onComplete={() => setStage('form')}
          />
          <button
            type="button"
            className="button button--ghost button--block"
            onClick={() => setStage('form')}
          >
            J'ai terminé
          </button>
        </>
      ) : null}

      {stage === 'form' ? (
        <form onSubmit={handleSubmit}>
          <h3>Mesures</h3>
          {(
            [
              ['startDelaySeconds', "Temps avant de démarrer (s)"],
              ['longPauses', 'Pauses longues'],
              ['majorFillers', 'Faux départs / hésitations'],
              ['successfulParaphrases', 'Paraphrases réussies'],
              ['abandonedSentences', 'Phrases abandonnées'],
              ['longestFluentSegmentSeconds', 'Plus long segment fluide (s)'],
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
          <button type="submit" className="button button--block">
            Enregistrer le test
          </button>
        </form>
      ) : null}
    </section>
  )
}
