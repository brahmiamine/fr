import { describe, expect, it } from 'vitest'
import questions from './questions.json'
import topics from './topics.json'
import chunks from './native-expressions.json'
import words from './paraphrase-words.json'
import prosody from './prosody.json'
import scenarios from './conversation-scenarios.json'

const badFrenchContraction = /\b(?:de les|de le|à les|à le)\b/i

describe('pedagogical content quality', () => {
  it('contains no common uncontracted French article mistakes in questions', () => {
    const invalid = questions.filter((question) => badFrenchContraction.test(question.text))
    expect(invalid.map((question) => `${question.id}: ${question.text}`)).toEqual([])
  })

  it('classifies questions by speaking task and gives each one pivot options', () => {
    expect(questions.length).toBeGreaterThanOrEqual(500)
    expect(questions.every((question) => typeof question.type === 'string')).toBe(true)
    expect(questions.every((question) => Array.isArray(question.pivots) && question.pivots.length >= 2)).toBe(true)

    const byId = new Map(questions.map((question) => [question.id, question]))
    for (const question of questions) {
      for (const pivotId of question.pivots) {
        const pivot = byId.get(pivotId)
        expect(pivot).toBeDefined()
        expect(pivot?.category).not.toBe(question.category)
      }
    }
  })

  it('uses varied 4-3-2 prompt families', () => {
    const promptSets = new Set(topics.map((topic) => topic.prompts.join(' | ')))
    expect(promptSets.size).toBeGreaterThanOrEqual(15)
  })

  it('adds usage metadata to chunks and circumlocution angles to words', () => {
    expect(chunks.every((chunk) => typeof chunk.register === 'string')).toBe(true)
    expect(words.every((word) => Array.isArray(word.rescueAngles) && word.rescueAngles.length >= 3)).toBe(true)
  })

  it('ships realistic interruption scenarios for conversation transfer', () => {
    expect(scenarios.length).toBeGreaterThanOrEqual(30)
    expect(scenarios.every((scenario) => scenario.events.length >= 2)).toBe(true)
  })

  it('ships a substantial prosody bank that can be played without placeholder silence', () => {
    expect(prosody.length).toBeGreaterThanOrEqual(30)
    expect(prosody.every((item) => item.ready === true)).toBe(true)
    expect(prosody.every((item) => item.modelKind === 'tts' || item.modelKind === 'recording')).toBe(true)
  })
})
