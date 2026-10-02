import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'
import { STORAGE_KEY } from '../types/progress'

describe('smoke: full hash-routing journey', () => {
  it('starts a session from home and reaches the training view', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await user.click(
      screen.getByRole('link', { name: 'Commencer la session du jour' }),
    )

    expect(
      screen.getByText('Manche 1 · 4 minutes'),
    ).toBeInTheDocument()
    // Training hides the global navigation.
    expect(
      screen.queryByRole('link', { name: /Progression/ }),
    ).not.toBeInTheDocument()

    // The in-progress session is persisted for refresh recovery.
    expect(window.localStorage.getItem(STORAGE_KEY)).toBeTruthy()
  })
})
