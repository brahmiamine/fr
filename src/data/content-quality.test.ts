import { describe, expect, it } from 'vitest'
import questions from './questions.json'
import topics from './topics.json'
import chunks from './native-expressions.json'
import words from './paraphrase-words.json'
import prosody from './prosody.json'
import scenarios from './conversation-scenarios.json'
import stories from './retelling-stories.json'
import retellingRecordings from './retelling-recordings.json'
import { contentRepository } from '../services/content/contentRepository'
import { secondsPerSyllable } from '../services/content/prosodyTiming'

const badFrenchContraction = /\b(?:de les|de le|à les|à le)\b/i

const bundledAudio = new Set(
  Object.keys(import.meta.glob('/public/audio/prosody/*.ogg', { query: '?url', import: 'default' })),
)

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

  it('times synthetic prosody models from their syllables, not with fake 4-second groups', () => {
    for (const item of prosody.filter((entry) => entry.modelKind === 'tts')) {
      expect(item.timing).toBe('estimated')
      const duration = Math.max(...item.groups.map((group) => group.end))
      expect(duration).toBeGreaterThanOrEqual(10)
      expect(duration).toBeLessThanOrEqual(30)
      for (const group of item.groups) {
        const rate = secondsPerSyllable(group as Parameters<typeof secondsPerSyllable>[0])
        expect(rate).toBeGreaterThan(0.12)
        expect(rate).toBeLessThan(0.4)
      }
      // The full transcript is what the voice actually reads.
      for (const group of item.groups) {
        const firstWord = group.text.split(' ')[0]
        expect(item.transcript).toContain(firstWord)
      }
    }
  })

  it('ships short stories for the 4-3-2 retelling variant', () => {
    expect(stories.length).toBeGreaterThanOrEqual(12)
    for (const story of stories) {
      const words = story.text.split(/\s+/).length
      expect(words).toBeGreaterThanOrEqual(70)
      expect(words).toBeLessThanOrEqual(160)
      expect(story.transferPrompt.length).toBeGreaterThan(10)
    }
  })

  it('adds real speakers from the prosody bank to the retelling stories', () => {
    const recorded = contentRepository.retellingStories.filter((story) => story.audio)
    expect(recorded).toHaveLength(retellingRecordings.length)
    for (const story of recorded) {
      expect(story.audio).toMatch(/^audio\/prosody\/prosody_yt_\d{3}\.ogg$/)
      expect(bundledAudio.has(`/public/${story.audio}`)).toBe(true)
      expect(story.attribution).toBeTruthy()
      expect(story.transferPrompt.length).toBeGreaterThan(10)
    }
  })

  it('gives every recording its own retelling idea, not one per video', () => {
    const recordings = prosody.filter((item) => item.modelKind === 'recording')
    const ideas = new Set(recordings.map((item) => item.retelling.idea))
    expect(ideas.size).toBe(recordings.length)
  })
})
