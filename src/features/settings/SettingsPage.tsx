import { useSettings } from '../../app/SettingsProvider'
import { Card, Eyebrow } from '../../components/ui'
import { AiSettingsCard } from '../ai/AiSettingsCard'
import type { ThemeMode } from '../../services/settings/settings'
import './settings.css'

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
]

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings()

  return (
    <div className="settings">
      <header>
        <Eyebrow>Préférences</Eyebrow>
        <h1>Paramètres</h1>
      </header>

      <Card>
        <h2 className="settings__title">Thème</h2>
        <p className="muted">« Auto » suit le réglage de ton appareil.</p>
        <div className="settings__segmented" role="radiogroup" aria-label="Thème">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              role="radio"
              aria-checked={settings.theme === theme.value}
              className={`settings__option${settings.theme === theme.value ? ' is-active' : ''}`}
              onClick={() => updateSettings({ theme: theme.value })}
            >
              {theme.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <div className="settings__row">
          <div>
            <h2 className="settings__title">Bouton « Passer »</h2>
            <p className="muted">
              Affiche un bouton « Passer » sous chaque exercice et défi (séance guidée,
              prosodie, test hebdomadaire, situation à jouer) pour passer à la suite.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.allowSkip}
            aria-label="Afficher le bouton Passer"
            className={`settings__switch${settings.allowSkip ? ' is-on' : ''}`}
            onClick={() => updateSettings({ allowSkip: !settings.allowSkip })}
          >
            <span className="settings__knob" />
          </button>
        </div>
      </Card>

      <AiSettingsCard />
    </div>
  )
}
