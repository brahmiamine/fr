import { describe, expect, it } from 'vitest'
import { pickInPriority, selectUniqueItems } from './selectContent'

const items = Array.from({ length: 10 }, (_, index) => ({ id: `i${index}` }))

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
    const result = selectUniqueItems([...items, ...items], 5, [], () => 0.3)
    expect(new Set(result.map((item) => item.id)).size).toBe(5)
  })
})

describe('pickInPriority', () => {
  it('fills from higher-priority pools first, preserving order', () => {
    const due = [{ id: 'a' }, { id: 'b' }]
    const unseen = [{ id: 'c' }, { id: 'd' }]
    const result = pickInPriority([due, unseen], 3, () => 0.5)
    const ids = result.map((item) => item.id)
    // All "due" items come before any "unseen" item.
    expect(ids.slice(0, 2).sort()).toEqual(['a', 'b'])
    expect(ids).toHaveLength(3)
  })

  it('never duplicates an id across pools', () => {
    const result = pickInPriority(
      [[{ id: 'x' }], [{ id: 'x' }, { id: 'y' }]],
      2,
      () => 0.5,
    )
    expect(result.map((item) => item.id)).toEqual(['x', 'y'])
  })
})
