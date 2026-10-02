import { InfoButton } from '../../components/ui'
import { useEffect, useState } from 'react'
import { Timer } from '../../components/Timer/Timer'
import { contentRepository } from '../../services/content/contentRepository'
import { cancelSpeech, speakText } from '../../services/speech'
import type { ConversationScenario } from '../../types/content'

export const SIMULATION_SECONDS = 120

function pickScenario(
  exclude: string | null,
  random: () => number = Math.random,
): ConversationScenario | null {
  const pool = contentRepository.conversationScenarios.filter(
    (scenario) => scenario.id !== exclude,
  )
  if (pool.length === 0) return null
  return pool[Math.floor(random() * pool.length)] ?? null
}

/** Seconds at which each interruption arrives, spread over the simulation. */
export function interruptionTimes(count: number, total = SIMULATION_SECONDS): number[] {
  return Array.from({ length: count }, (_, index) =>
    Math.round(((index + 1) * total) / (count + 1)),
  )
}

/**
 * Prepares the weekly real conversation: a situation with interruptions to
 * bring into it, and an optional solo rehearsal where the interruptions are
 * read aloud while the learner is speaking.
 */
export default function ConversationPrep() {
  const [scenario, setScenario] = useState(() => pickScenario(null))
  const [running, setRunning] = useState(false)
  const [revealed, setRevealed] = useState(0)

  useEffect(() => {
    if (!running || !scenario) return
    const timers = interruptionTimes(scenario.events.length).map((seconds, index) =>
      setTimeout(() => {
        setRevealed(index + 1)
        speakText(scenario.events[index])
      }, seconds * 1000),
    )
    return () => {
      timers.forEach(clearTimeout)
      cancelSpeech()
    }
  }, [running, scenario])

  if (!scenario) return null

  const finish = () => {
    setRunning(false)
    setRevealed(0)
  }

  return (
    <section className="card weekly-test" aria-labelledby="conversation-prep-title">
      <div className="title-row">
        <h2 id="conversation-prep-title">Situation à jouer</h2>
        <InfoButton id="conversation" />
      </div>
      <p>{scenario.situation}</p>
      <p className="muted">Objectif : {scenario.goal}</p>

      {running ? (
        <>
          <Timer
            durationSeconds={SIMULATION_SECONDS}
            autoStart
            hideControls
            label="Parle, et réagis aux interruptions"
            onComplete={finish}
          />
          <ul className="exercise__rescue" aria-live="assertive">
            {scenario.events.slice(0, revealed).map((event) => (
              <li key={event}>
                <strong>Interruption :</strong> {event}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p className="muted">
            Avec ton interlocuteur, demande-lui de t'interrompre comme ceci :
          </p>
          <ul>
            {scenario.events.map((event) => (
              <li key={event}>{event}</li>
            ))}
          </ul>
          <div className="stack">
            <button
              type="button"
              className="button button--ghost button--block"
              onClick={() => {
                setRevealed(0)
                setRunning(true)
              }}
            >
              Répétition solo de 2 min (interruptions lues à voix haute)
            </button>
            <button
              type="button"
              className="button button--subtle button--block"
              onClick={() => setScenario((current) => pickScenario(current?.id ?? null))}
            >
              Autre situation
            </button>
          </div>
        </>
      )}
    </section>
  )
}
