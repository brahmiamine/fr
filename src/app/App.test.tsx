import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import App from './App'

function renderApp(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  )
}

describe('App routing', () => {
  it('renders home at /', () => {
    renderApp('/')
    expect(
      screen.getByRole('heading', { name: 'Prêt pour ta séance ?' }),
    ).toBeInTheDocument()
  })

  it('navigates to progress from the top navigation', async () => {
    const user = userEvent.setup()
    renderApp('/')

    await user.click(screen.getByRole('link', { name: 'Progression' }))
    expect(
      screen.getByRole('heading', { name: 'Progression' }),
    ).toBeInTheDocument()
  })

  it('falls back to home for unknown routes', () => {
    renderApp('/inconnu')
    expect(
      screen.getByRole('heading', { name: 'Prêt pour ta séance ?' }),
    ).toBeInTheDocument()
  })
})
