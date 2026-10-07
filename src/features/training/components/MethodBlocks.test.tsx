import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { contentRepository } from '../../../services/content/contentRepository'
import type { Question, TabooTopic, Topic } from '../../../types/content'
import { ChunksExercise } from './ChunksExercise'
import { RepriseExercise } from './RepriseExercise'
import { TabooExercise } from './TabooExercise'
import { ZappingExercise } from './ZappingExercise'
import { PROSODY_ROUND_CUES, prosodyCueForRound } from '../types'

afterEach(() => vi.useRealTimers())

const topic: Topic = {
  id: 't-reprise',
  title: 'Télétravail ou bureau ?',
  category: 'travail',
  difficulty: 'medium',
  prompts: [],
  transferPrompt: 'La semaine de quatre jours ?',
}

describe('reprise of a recent subject', () => {
  it('starts without preparation and lasts 3 minutes', () => {
    vi.useFakeTimers()
    const onStart = vi.fn()
    const onDone = vi.fn()
    const onSpoken = vi.fn()
    const { rerender } = render(
      <RepriseExercise topic={topic} stage="intro" onStart={onStart} onSpoken={onSpoken} onDone={onDone} />,
    )
    expect(screen.getByText(/sans préparation/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Commencer la reprise/ }))
    expect(onStart).toHaveBeenCalled()

    rerender(<RepriseExercise topic={topic} stage="running" onStart={onStart} onSpoken={onSpoken} onDone={onDone} />)
    act(() => {
      vi.advanceTimersByTime(179_000)
    })
    expect(onSpoken).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(1_000)
    })
    expect(onSpoken).toHaveBeenCalledTimes(1)
    expect(onDone).not.toHaveBeenCalled()

    // Once spoken, a moment to note a missing word before moving on.
    rerender(<RepriseExercise topic={topic} stage="review" onStart={onStart} onSpoken={onSpoken} onDone={onDone} />)
    expect(screen.getByText('Reprise terminée')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Continuer/ }))
    expect(onDone).toHaveBeenCalledTimes(1)
  })
})

describe('zapping', () => {
  const questions = contentRepository.questions.slice(0, 4) as Question[]

  it('chains 45-second questions with a spoken transition from the second one', () => {
    vi.useFakeTimers()
    const onNext = vi.fn()
    const { rerender } = render(
      <ZappingExercise questions={questions} stage="running" index={0} onStart={() => undefined} onNext={onNext} />,
    )
    expect(screen.queryByText(/Enchaîne avec/)).not.toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(45_000)
    })
    expect(onNext).toHaveBeenCalledTimes(1)

    rerender(<ZappingExercise questions={questions} stage="running" index={1} onStart={() => undefined} onNext={onNext} />)
    expect(screen.getByText(/Enchaîne avec/)).toHaveTextContent('Rien à voir, mais…')
  })
})

describe('taboo monologue', () => {
  const taboo: TabooTopic = contentRepository.tabooTopics[0]

  it('shows the forbidden words and the one-second rule, then asks about long stops', () => {
    vi.useFakeTimers()
    const onSpoken = vi.fn()
    const onRate = vi.fn()
    const { rerender } = render(
      <TabooExercise taboo={taboo} stage="intro" onStart={() => undefined} onSpoken={onSpoken} onRate={onRate} />,
    )
    for (const word of taboo.forbidden) expect(screen.getByText(word)).toBeInTheDocument()
    expect(screen.getByText(/Règle d'une seconde/)).toBeInTheDocument()

    rerender(<TabooExercise taboo={taboo} stage="running" onStart={() => undefined} onSpoken={onSpoken} onRate={onRate} />)
    expect(screen.getByText('Tes formules de contournement')).toBeInTheDocument()
    act(() => {
      vi.advanceTimersByTime(90_000)
    })
    expect(onSpoken).toHaveBeenCalledTimes(1)

    rerender(<TabooExercise taboo={taboo} stage="rate" onStart={() => undefined} onSpoken={onSpoken} onRate={onRate} />)
    fireEvent.click(screen.getByRole('button', { name: /Une ou deux fois/ }))
    expect(onRate).toHaveBeenCalledWith('some')
  })

  it('has 3 to 5 forbidden words for every subject', () => {
    for (const item of contentRepository.tabooTopics) {
      expect(item.forbidden.length).toBeGreaterThanOrEqual(3)
      expect(item.forbidden.length).toBeLessThanOrEqual(5)
    }
  })
})

describe('chunks: retrieval before checking, spoken form and real voice', () => {
  const chunk = contentRepository.chunks.find((item) => item.spoken && item.nativeClip)

  it('asks for two sentences before revealing, then shows the spoken form and a native clip', () => {
    expect(chunk).toBeDefined()
    if (!chunk) return
    vi.useFakeTimers()
    const props = {
      chunk,
      index: 0,
      total: 4,
      chunksOfDay: [chunk],
      onReveal: () => undefined,
      onRate: () => undefined,
      onContinue: () => undefined,
    }
    const { rerender } = render(<ChunksExercise {...props} step="retrieve" />)
    act(() => {
      vi.advanceTimersByTime(3_000)
    })
    expect(screen.getByText(/dis 2 phrases différentes/)).toBeInTheDocument()

    rerender(<ChunksExercise {...props} step="revealed" />)
    expect(screen.getByText(`« ${chunk.spoken} »`)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Écouter un natif le dire' })).toBeInTheDocument()
  })
})

describe('one prosodic cue per round', () => {
  it('leaves round 1 to the content, then gives one cue per round', () => {
    expect(prosodyCueForRound(0, 'Allonge la fin')).toBeNull()
    expect(prosodyCueForRound(1, 'Allonge la fin')).toBe('Allonge la fin')
    expect(prosodyCueForRound(1, null)).toBe(PROSODY_ROUND_CUES[0])
    expect(prosodyCueForRound(2, null)).toBe(PROSODY_ROUND_CUES[1])
    expect(prosodyCueForRound(3, null)).toBe(PROSODY_ROUND_CUES[2])
  })
})
