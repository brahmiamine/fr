import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { SettingsProvider } from '../../app/SettingsProvider'
import { SETTINGS_KEY } from '../../services/settings/settings'
import SettingsPage from './SettingsPage'

beforeEach(() => {
  window.localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.removeAttribute('data-style')
})

describe('SettingsPage', () => {
  it('applies and persists the chosen theme', async () => {
    const user = userEvent.setup()
    render(
      <SettingsProvider>
        <SettingsPage />
      </SettingsProvider>,
    )
    await user.click(screen.getByRole('radio', { name: 'Sombre' }))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}').theme).toBe('dark')

    await user.click(screen.getByRole('radio', { name: 'Auto' }))
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('toggles the skip option', async () => {
    const user = userEvent.setup()
    render(
      <SettingsProvider>
        <SettingsPage />
      </SettingsProvider>,
    )
    const toggle = screen.getByRole('switch', { name: 'Afficher le bouton Passer' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('switches between the Aurora and Pulse styles and remembers the choice', async () => {
    const user = userEvent.setup()
    render(
      <SettingsProvider>
        <SettingsPage />
      </SettingsProvider>,
    )
    expect(screen.getByRole('radio', { name: 'Aurora' })).toHaveAttribute('aria-checked', 'true')
    expect(document.documentElement.hasAttribute('data-style')).toBe(false)

    await user.click(screen.getByRole('radio', { name: 'Pulse' }))
    expect(document.documentElement.getAttribute('data-style')).toBe('pulse')
    expect(JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? '{}').themeStyle).toBe('pulse')

    await user.click(screen.getByRole('radio', { name: 'Aurora' }))
    expect(document.documentElement.hasAttribute('data-style')).toBe(false)
  })
})
