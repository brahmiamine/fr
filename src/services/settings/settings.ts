export const SETTINGS_KEY = 'parle-plus-settings'

export type ThemeMode = 'system' | 'light' | 'dark'

/** Visual identity, independent from light/dark: Aurora (indigo → pink) or Pulse (coral → magenta). */
export type ThemeStyle = 'aurora' | 'pulse'

export interface AppSettings {
  theme: ThemeMode
  themeStyle: ThemeStyle
  /** Shows the "Passer" button under every exercise and challenge. */
  allowSkip: boolean
  /** Master switch: when off, no screen offers AI and nothing is ever sent. */
  aiEnabled: boolean
  /** "auto" falls back across providers; otherwise only this provider is used. */
  aiProvider: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  themeStyle: 'aurora',
  allowSkip: true,
  aiEnabled: false,
  aiProvider: 'auto',
}

export function loadSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AppSettings> | null
    const theme = parsed?.theme
    return {
      theme: theme === 'light' || theme === 'dark' || theme === 'system' ? theme : DEFAULT_SETTINGS.theme,
      themeStyle: parsed?.themeStyle === 'pulse' ? 'pulse' : 'aurora',
      allowSkip: typeof parsed?.allowSkip === 'boolean' ? parsed.allowSkip : DEFAULT_SETTINGS.allowSkip,
      aiEnabled: parsed?.aiEnabled === true,
      aiProvider:
        typeof parsed?.aiProvider === 'string' && parsed.aiProvider
          ? parsed.aiProvider
          : DEFAULT_SETTINGS.aiProvider,
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

const THEME_COLOR: Record<ThemeStyle, string> = { aurora: '#5b5bd6', pulse: '#e8453c' }

/** "aurora" is the default look: it removes the attribute. */
export function applyThemeStyle(style: ThemeStyle): void {
  const root = document.documentElement
  if (style === 'aurora') root.removeAttribute('data-style')
  else root.setAttribute('data-style', style)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', THEME_COLOR[style])
}
