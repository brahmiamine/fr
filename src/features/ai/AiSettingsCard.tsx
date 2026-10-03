import { useEffect, useState } from 'react'
import { useSettings } from '../../app/SettingsProvider'
import { Card } from '../../components/ui'
import {
  AI_PROVIDERS,
  aiErrorMessage,
  fetchAiStatus,
} from '../../services/ai/client'
import type { AiStatus } from '../../services/ai/client'
import { AiStatsTable } from './AiStatsTable'
import './ai.css'

/** Master switch, provider choice and access code for every AI feature. */
export function AiSettingsCard() {
  const { settings, updateSettings } = useSettings()
  const { aiEnabled, aiProvider } = settings
  const [status, setStatus] = useState<AiStatus | null>(null)
  const [error, setError] = useState('')

  // Only talks to the server while AI is on.
  useEffect(() => {
    if (!aiEnabled) {
      setStatus(null)
      setError('')
      return
    }
    let cancelled = false
    fetchAiStatus()
      .then((result) => {
        if (!cancelled) {
          setStatus(result)
          setError('')
        }
      })
      .catch((caught) => {
        if (!cancelled) {
          setStatus(null)
          setError(aiErrorMessage(caught))
        }
      })
    return () => {
      cancelled = true
    }
  }, [aiEnabled])

  const configured = status?.providers.filter((provider) => provider.configured) ?? []

  return (
    <Card>
      <div className="settings__row">
        <div>
          <h2 className="settings__title">Intelligence artificielle</h2>
          <p className="muted">
            Active l'analyse de tes enregistrements, la vérification des mots, les questions
            générées et le jeu de rôle. Désactivée, l'application fonctionne exactement comme
            avant et rien n'est envoyé.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={aiEnabled}
          aria-label="Activer l'intelligence artificielle"
          className={`settings__switch${aiEnabled ? ' is-on' : ''}`}
          onClick={() => updateSettings({ aiEnabled: !aiEnabled })}
        >
          <span className="settings__knob" />
        </button>
      </div>

      {aiEnabled ? (
        <div className="form-stack">
          <p className="muted">
            Quand tu utilises l'IA, ta voix ou ton texte est envoyé à un service externe
            (Google, Groq, Mistral…). Rien n'est conservé par l'application.
          </p>

          <div className="field">
            <label htmlFor="ai-provider">Fournisseur</label>
            <select
              id="ai-provider"
              value={aiProvider}
              onChange={(event) => updateSettings({ aiProvider: event.target.value })}
            >
              <option value="auto">Automatique (bascule en cas d'échec)</option>
              {AI_PROVIDERS.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </div>

          <div aria-live="polite">
            {error ? <p role="alert" className="ai-error">{error}</p> : null}
            {status ? (
              configured.length > 0 ? (
                <p className="muted">
                  Services disponibles : {configured
                    .map((provider) => AI_PROVIDERS.find((p) => p.id === provider.id)?.label ?? provider.id)
                    .join(', ')}.
                </p>
              ) : (
                <p className="muted">
                  Aucun service n'est configuré sur le serveur : ajoute des clés dans
                  Cloudflare.
                </p>
              )
            ) : null}
          </div>

          <AiStatsTable />
        </div>
      ) : null}
    </Card>
  )
}
