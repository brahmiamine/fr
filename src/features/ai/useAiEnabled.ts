import { useSettings } from '../../app/SettingsProvider'
import './ai.css'

/** The master switch from Paramètres. Every AI surface renders nothing when it is off. */
export function useAiEnabled(): boolean {
  return useSettings().settings.aiEnabled
}
