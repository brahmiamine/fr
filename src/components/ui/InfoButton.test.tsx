import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EXERCISE_INFO } from '../../data/exerciseInfo'
import type { ExerciseInfoId } from '../../data/exerciseInfo'
import { STAGE_ORDER } from '../../features/training/types'
import { STAGE_ORDER as PROSODY_STAGES } from '../../features/prosody/types'
import { InfoButton } from './InfoButton'

describe('InfoButton', () => {
  it('opens the explanation and closes it with Escape or the button', () => {
    render(<InfoButton id="fluency" />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Infos : 4 → 3 → 2/ }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent("Ce que ça améliore à l'oral")
    expect(dialog).toHaveTextContent('4 min')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Infos/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Compris' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('documents every training and prosody stage', () => {
    const ids: ExerciseInfoId[] = [...STAGE_ORDER, ...PROSODY_STAGES]
    for (const id of ids) {
      expect(EXERCISE_INFO[id].improves.length).toBeGreaterThan(0)
    }
  })
})
