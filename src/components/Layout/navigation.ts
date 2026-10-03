import type { IconName } from '../ui'

export interface NavItem {
  to: string
  label: string
  icon: IconName
  end?: boolean
  /** Small tag shown at the right of the label. */
  badge?: string
}

export const MAIN_NAV: NavItem[] = [
  { to: '/', label: 'Accueil', icon: 'home', end: true },
  { to: '/prosody', label: 'Prosodie', icon: 'music' },
  { to: '/progress', label: 'Progression', icon: 'chart' },
  { to: '/settings', label: 'Paramètres', icon: 'settings' },
]

/** Only offered while AI is switched on in the settings. */
export const AI_NAV: NavItem = { to: '/coach', label: 'Coach IA', icon: 'sparkle', badge: 'IA' }

export const TAB_NAV: NavItem[] = [
  { to: '/', label: 'Accueil', icon: 'home', end: true },
  { to: '/training', label: 'Séance', icon: 'play' },
  { to: '/prosody', label: 'Prosodie', icon: 'music' },
  { to: '/progress', label: 'Progrès', icon: 'chart' },
  { to: '/settings', label: 'Réglages', icon: 'settings' },
]

/** The guided session takes the whole screen: no tab bar, a stage rail instead of the menu. */
export function isSessionPath(pathname: string): boolean {
  return pathname.startsWith('/training')
}
