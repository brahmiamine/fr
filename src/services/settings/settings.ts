export const SETTINGS_KEY = 'parle-plus-settings'

export type ThemeMode = 'system' | 'light' | 'dark'

export interface AppSettings {
  theme: ThemeMode
  /** Shows the "Passer" button on the surprise questions. */
  allowSkip: boolean
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  allowSkip: true,
}

export function loadSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AppSettings> | null
    const theme = parsed?.theme
    return {
      theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : DEFAULT_SETTINGS.theme,
      allowSkip: typeof parsed?.allowSkip === 'boolean' ? parsed.allowSkip : DEFAULT_SETTINGS.allowSkip,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    /* storage unavailable: the settings last for this visit only */
  }
}

/** "system" removes the attribute so the OS preference applies. */
export function applyTheme(theme: ThemeMode): void {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
}
