import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { AiMark, Eyebrow, Segmented } from '../../components/ui'
import { RoleplayChat } from './RoleplayChat'
import { SurpriseCoach } from './SurpriseCoach'
import { useAiEnabled } from './useAiEnabled'
import './ai.css'

type Mode = 'question' | 'roleplay'

const MODES: { value: Mode; label: string }[] = [
  { value: 'question', label: 'Question surprise' },
  { value: 'roleplay', label: 'Jeu de rôle' },
]

export default function CoachPage() {
  const enabled = useAiEnabled()
  const [params] = useSearchParams()
  // The home page can open the coach straight on the role-play (?mode=roleplay).
  const [mode, setMode] = useState<Mode>(params.get('mode') === 'roleplay' ? 'roleplay' : 'question')

  if (!enabled) return <Navigate to="/settings" replace />

  return (
    <div className="page ai-coach">
      <header className="page-title">
        <Eyebrow gradient>Entraînement libre</Eyebrow>
        <h1 className="ai-coach__title">
          Coach IA
          <AiMark size={40} />
        </h1>
      </header>

      <Segmented label="Mode" value={mode} options={MODES} onChange={setMode} />

      {mode === 'question' ? <SurpriseCoach /> : <RoleplayChat />}
    </div>
  )
}
