import { describe, expect, it } from 'vitest'
import { classifyPauses, computeFluencyMetrics, countRestarts } from './fluencyMetrics'

describe('fluency metrics', () => {
  it('counts restarts, not legitimate doubled pronouns', () => {
    expect(countRestarts('je… je pense que, que c’est bien')).toBe(2)
    expect(countRestarts('je pense je pense que oui')).toBe(1)
    expect(countRestarts('nous nous voyons demain, euh, euh, bon')).toBe(0)
    expect(countRestarts('')).toBe(0)
  })

  it('splits long silences inside a clause from those between two clauses', () => {
    const words = [
      { word: 'je', start: 0, end: 0.2 },
      { word: 'suis', start: 0.25, end: 0.5 },
      { word: 'allé', start: 0.55, end: 0.8 },
      { word: 'à', start: 0.85, end: 0.9 },
      // "à … la gare": a search for words, mid-clause.
      { word: 'la', start: 2.4, end: 2.5 },
      { word: 'gare.', start: 2.55, end: 2.9 },
      // After a full stop: between two ideas.
      { word: 'Ensuite', start: 4.2, end: 4.6 },
      { word: 'j’ai', start: 4.65, end: 4.8 },
      { word: 'attendu', start: 4.85, end: 5.2 },
      { word: 'mais', start: 6.5, end: 6.7 },
    ]
    expect(classifyPauses(words)).toEqual({ long: 3, mid: 1, between: 2, longest: 1.5 })
  })

  it('combines the transcript, the timestamps and the microphone levels', () => {
    const metrics = computeFluencyMetrics({
      transcript: 'euh en fait je je pense que oui',
      words: [
        { word: 'euh', start: 0, end: 0.3 },
        { word: 'oui', start: 1.6, end: 2 },
      ],
      activity: { startDelaySeconds: 0.8, longPauses: 4, longestSpeechSeconds: 9, speechRatio: 0.8, spokenSeconds: 30 },
    })
    expect(metrics).toMatchObject({
      words: 8,
      fillers: 1,
      markers: 1,
      restarts: 1,
      durationSeconds: 30,
      wordsPerMinute: 16,
      // The timestamps locate the pauses; the microphone gives the start delay.
      longPauses: 1,
      midClausePauses: 1,
      startDelaySeconds: 0.8,
      longestSpeechSeconds: 9,
    })
  })

  it('leaves out the timing when nothing measured it', () => {
    const metrics = computeFluencyMetrics({ transcript: 'bon alors je pense' })
    expect(metrics.longPauses).toBeUndefined()
    expect(metrics.durationSeconds).toBeUndefined()
  })
})
