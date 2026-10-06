import { describe, expect, it } from 'vitest'
import { nextCheckKind } from './check'
import type { ProsodyCheckKind } from './check'

describe('nextCheckKind', () => {
  it('walks S0 → S4 → S8 then stops', () => {
    expect(nextCheckKind([])).toBe('S0')
    expect(nextCheckKind(['S0'])).toBe('S4')
    expect(nextCheckKind(['S0', 'S4'])).toBe('S8')
    expect(nextCheckKind(['S0', 'S4', 'S8'])).toBeNull()
  })

  it('recovers a missed intermediate bilan', () => {
    expect(nextCheckKind(['S4'] as ProsodyCheckKind[])).toBe('S0')
  })
})
