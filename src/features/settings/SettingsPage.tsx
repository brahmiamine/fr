import { useSettings } from '../../app/SettingsProvider'
import { Card, Eyebrow, Segmented, Switch } from '../../components/ui'
import { AiSettingsCard } from '../ai/AiSettingsCard'
import type { ThemeMode, ThemeStyle } from '../../services/settings/settings'
import './settings.css'

const THEMES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
]

const STYLES: { value: ThemeStyle; label: string }[] = [
  { value: 'aurora', label: 'Aurora' },
  { value: 'pulse', label: 'Pulse' },
]

export default function SettingsPage() {
  const { settings, updateSettings } = useSettings()

  return (
    <div className="page settings">
      <header className="page-title">
        <Eyebrow gradient>Préférences</Eyebrow>
        <h1>Paramètres</h1>
      </header>

      <Card padding="md">
        <h2 className="settings__title">Thème</h2>
        <p className="muted">« Auto » suit le réglage de ton appareil.</p>
        <Segmented
          label="Thème"
          value={settings.theme}
          options={THEMES}
          onChange={(theme) => updateSettings({ theme })}
        />
        <p className="muted settings__subtitle">
          Style : Aurora (indigo et rose) ou Pulse (corail et magenta).
        </p>
        <Segmented
          label="Style"
          value={settings.themeStyle}
          options={STYLES}
          onChange={(themeStyle) => updateSettings({ themeStyle })}
        />
      </Card>

      <Card padding="md">
        <div className="settings__row">
          <div>
            <h2 className="settings__title">Bouton « Passer »</h2>
            <p className="muted">
              Affiche un bouton « Passer » sous chaque exercice et défi (séance guidée,
              prosodie, test hebdomadaire, situation à jouer) pour passer à la suite.
            </p>
          </div>
          <Switch
            aria-label="Afficher le bouton Passer"
            checked={settings.allowSkip}
            onChange={(allowSkip) => updateSettings({ allowSkip })}
          />
        </div>
      </Card>

      <AiSettingsCard />
    </div>
  )
}
