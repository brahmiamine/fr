import { describe, expect, it } from 'vitest'
import { contentRepository } from './contentRepository'
import { SESSION_SIZES, buildSessionContent, selectUniqueItems } from './selectContent'
import type { RecentContent } from '../../types/content'

const items = Array.from({ length: 10 }, (_, index) => ({ id: `i${index}` }))

const noRecent: RecentContent = {
  topicIds: [],
  questionIds: [],
  wordIds: [],
  expressionIds: [],
}

describe('selectUniqueItems', () => {
  it('returns the requested count with unique ids', () => {
    const result = selectUniqueItems(items, 4, [], () => 0.4)
    expect(result).toHaveLength(4)
    expect(new Set(result.map((item) => item.id)).size).toBe(4)
  })

  it('excludes recently used items when enough fresh items exist', () => {
    const recent = items.slice(0, 8).map((item) => item.id)
    const result = selectUniqueItems(items, 2, recent, () => 0.4)
    expect(result).toHaveLength(2)
    expect(result.every((item) => !recent.includes(item.id))).toBe(true)
  })

  it('relaxes recency rather than blocking when the dataset is small', () => {
    const small = items.slice(0, 3)
    const recent = small.map((item) => item.id)
    const result = selectUniqueItems(small, 3, recent, () => 0.4)
    expect(result).toHaveLength(3)
    expect(new Set(result.map((item) => item.id)).size).toBe(3)
  })

  it('never returns duplicate ids even with duplicate source items', () => {
    const duplicated = [...items, ...items]
    const result = selectUniqueItems(duplicated, 5, [], () => 0.3)
    expect(new Set(result.map((item) => item.id)).size).toBe(5)
  })

  it('caps the result at the available item count', () => {
    const result = selectUniqueItems(items.slice(0, 2), 5, [], () => 0.3)
    expect(result).toHaveLength(2)
  })
})

describe('buildSessionContent', () => {
  it('builds a complete session without duplicate ids', () => {
    const session = buildSessionContent(contentRepository, noRecent, () => 0.5)

    expect(session.topic).toBeDefined()
    expect(session.paraphraseWords).toHaveLength(SESSION_SIZES.paraphraseWords)
    expect(session.questions).toHaveLength(SESSION_SIZES.questions)
    expect(session.expressions).toHaveLength(SESSION_SIZES.expressions)

    const allIds = [
      ...session.paraphraseWords.map((item) => item.id),
      ...session.questions.map((item) => item.id),
      ...session.expressions.map((item) => item.id),
    ]
    expect(new Set(allIds).size).toBe(allIds.length)
  })

  it('prefers topics outside the recent list', () => {
    const recentTopicIds = contentRepository.topics
      .slice(0, contentRepository.topics.length - 1)
      .map((topic) => topic.id)
    const session = buildSessionContent(
      contentRepository,
      { ...noRecent, topicIds: recentTopicIds },
      () => 0.5,
    )
    expect(recentTopicIds).not.toContain(session.topic.id)
  })
})
