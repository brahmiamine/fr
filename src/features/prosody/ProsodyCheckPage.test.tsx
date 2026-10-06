import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProsodyCheckPage from './ProsodyCheckPage'
import type { ProsodyCheckRecord } from './check'

const store = new Map<string, unknown>()

vi.mock('../../services/storage/audioDb', () => ({
  listEntryKeys: async () => [...store.keys()],
  getJson: async (key: string) => {
    const value = store.get(key)
    return typeof value === 'string' ? JSON.parse(value) : null
  },
  putJson: async (key: string, value: unknown) => {
    store.set(key, JSON.stringify(value))
  },
  putEntry: async (key: string, value: unknown) => {
    store.set(key, value)
  },
}))

const s0 = (date: string): ProsodyCheckRecord => ({ id: 'c0', kind: 'S0', date, items: [] })

beforeEach(() => store.clear())

function renderPage() {
  return render(
    <MemoryRouter>
      <ProsodyCheckPage />
    </MemoryRouter>,
  )
}

describe('ProsodyCheckPage', () => {
  it('does not offer S4 the same day as S0, and says when it opens', async () => {
    store.set('check-c0', JSON.stringify(s0(new Date().toISOString())))
    renderPage()
    expect(await screen.findByRole('heading', { name: /Le bilan S4 n'est pas encore disponible/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /Bilan prosodique S4/ })).not.toBeInTheDocument()
  })

  it('offers S4 once four weeks have passed', async () => {
    const old = new Date(Date.now() - 29 * 86_400_000).toISOString()
    store.set('check-c0', JSON.stringify(s0(old)))
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Bilan prosodique S4' })).toBeInTheDocument()
  })

  it('starts with S0 when nothing was recorded', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: 'Bilan prosodique S0' })).toBeInTheDocument()
  })
})
