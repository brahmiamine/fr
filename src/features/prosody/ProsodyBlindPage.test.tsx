import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProsodyBlindPage from './ProsodyBlindPage'
import type { ProsodyCheckRecord } from './check'

const store = new Map<string, unknown>()

vi.mock('../../services/storage/audioDb', () => ({
  listEntryKeys: async () => [...store.keys()],
  getEntry: async (key: string) => store.get(key) ?? null,
  getJson: async (key: string) => {
    const value = store.get(key)
    return typeof value === 'string' ? JSON.parse(value) : null
  },
  putJson: async (key: string, value: unknown) => {
    store.set(key, JSON.stringify(value))
  },
}))

const record: ProsodyCheckRecord = {
  id: 'c0',
  kind: 'S0',
  date: '2026-10-01',
  items: [{ id: 'a', kind: 'story', prompt: '', audioId: 'audio-a', measures: null }],
}

beforeEach(() => {
  store.clear()
  store.set('check-c0', JSON.stringify(record))
  store.set('audio-a', new Blob(['x'], { type: 'audio/webm' }))
  URL.createObjectURL = vi.fn(() => 'blob:test')
  URL.revokeObjectURL = vi.fn()
})

describe('ProsodyBlindPage', () => {
  it('flags an unrated recording, rates per person, then reveals the bilan and exports', async () => {
    render(
      <MemoryRouter>
        <ProsodyBlindPage />
      </MemoryRouter>,
    )
    expect(await screen.findByText(/Pas encore noté/)).toBeInTheDocument()

    // A native listens under their own name.
    fireEvent.change(screen.getByLabelText('Qui note ?'), { target: { value: 'Claire' } })
    fireEvent.change(screen.getByLabelText(/^Naturel/), { target: { value: '8' } })
    await waitFor(() => expect(store.has('rating-Claire::a')).toBe(true))
    expect(screen.queryByText(/Pas encore noté/)).not.toBeInTheDocument()
    expect(JSON.parse(store.get('rating-Claire::a') as string)).toMatchObject({
      rater: 'Claire',
      itemId: 'a',
      naturalness: 8,
    })
    // The learner's own rating was not touched.
    expect(store.has('rating-Moi::a')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Terminer' }))
    expect(await screen.findByRole('heading', { name: 'Notation terminée' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'S0' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: 'Claire' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Exporter les notes/ })).toBeInTheDocument()
  })
})
