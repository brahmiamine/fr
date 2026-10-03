import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Eyebrow } from '../../components/ui'
import { RoleplayChat } from './RoleplayChat'
import { SurpriseCoach } from './SurpriseCoach'
import { useAiEnabled } from './useAiEnabled'
import './ai.css'

type Mode = 'question' | 'roleplay'

export default function CoachPage() {
  const enabled = useAiEnabled()
  const [mode, setMode] = useState<Mode>('question')

  if (!enabled) return <Navigate to="/settings" replace />

  return (
    <div className="page ai-coach">
      <header>
        <Eyebrow>Entraînement libre</Eyebrow>
        <h1>Coach IA</h1>
      </header>

      <div className="settings__segmented ai-coach__tabs" role="radiogroup" aria-label="Mode">
        {(
          [
            ['question', 'Question surprise'],
            ['roleplay', 'Jeu de rôle'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={mode === value}
            className={`settings__option${mode === value ? ' is-active' : ''}`}
            onClick={() => setMode(value)}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'question' ? <SurpriseCoach /> : <RoleplayChat />}
    </div>
  )
}
