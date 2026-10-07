import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AppStateProvider, useAppState } from '../../app/AppStateProvider'
import { NEW_WORD_GAPS_PER_DAY, captureWordGap } from '../../services/progress/progress'
import { createInitialState } from '../../types/progress'
import type { AppState } from '../../types/progress'
import { QuickWordGap } from './QuickWordGap'
import { WordGapList } from './WordGapList'

let current: AppState = createInitialState()
function Probe() {
  current = useAppState().state
  return null
}

function renderWith(node: React.ReactNode, state: AppState = createInitialState()) {
  return render(
    <AppStateProvider initialState={state}>
      {node}
      <Probe />
    </AppStateProvider>,
  )
}

describe('quick word gap', () => {
  it('saves the word with its idea at once', async () => {
    const user = userEvent.setup()
    renderWith(<QuickWordGap id="t" />)
    await user.click(screen.getByRole('button', { name: /Mot qui m'a manqué/ }))
    const add = screen.getByRole('button', { name: 'Ajouter' })
    await user.type(screen.getByLabelText('Mot'), 'échéance')
    // The idea is what will be shown to find the word again: required.
    expect(add).toBeDisabled()
    await user.type(screen.getByLabelText(/Ce que je voulais dire/), 'la date limite pour payer')
    await user.click(add)
    expect(current.wordGaps.map((gap) => [gap.target, gap.context])).toEqual([
      ['échéance', 'la date limite pour payer'],
    ])
    expect(screen.getByRole('status')).toHaveTextContent('rejoint tes trous de mots')
  })

  it('caps the new words of the day but always accepts a word missed again', async () => {
    const user = userEvent.setup()
    let state = createInitialState()
    for (let index = 0; index < NEW_WORD_GAPS_PER_DAY; index += 1) {
      state = captureWordGap(state, `mot ${index}`, 'idée')
    }
    renderWith(<QuickWordGap id="t" defaultOpen />, state)
    await user.type(screen.getByLabelText('Mot'), 'nouveau')
    await user.type(screen.getByLabelText(/Ce que je voulais dire/), 'idée')
    await user.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(screen.getByRole('status')).toHaveTextContent('garde les plus utiles')
    expect(current.wordGaps).toHaveLength(NEW_WORD_GAPS_PER_DAY)

    await user.clear(screen.getByLabelText('Mot'))
    await user.type(screen.getByLabelText('Mot'), 'mot 1')
    await user.type(screen.getByLabelText(/Ce que je voulais dire/), 'idée')
    await user.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(screen.getByRole('status')).toHaveTextContent('était déjà dans ta liste')
  })
})

describe('word gap list', () => {
  it('corrects and removes a word', async () => {
    const user = userEvent.setup()
    renderWith(<WordGapList />, captureWordGap(createInitialState(), 'prise electrik', 'dans le mur'))
    await user.click(screen.getByRole('button', { name: 'Modifier' }))
    const word = screen.getByLabelText('Mot')
    await user.clear(word)
    await user.type(word, 'prise électrique')
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }))
    expect(current.wordGaps[0].target).toBe('prise électrique')

    await user.click(screen.getByRole('button', { name: 'Supprimer prise électrique' }))
    expect(current.wordGaps).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Confirmer la suppression de prise électrique' }))
    expect(current.wordGaps).toHaveLength(0)
  })
})
