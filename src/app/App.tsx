import { Navigate, Route, Routes } from 'react-router-dom'
import { SettingsProvider } from './SettingsProvider'
import { AppStateProvider } from './AppStateProvider'
import { AppShell } from '../components/Layout/AppShell'
import HomePage from '../features/home/HomePage'
import ProgressPage from '../features/progress/ProgressPage'
import TrainingPage from '../features/training/TrainingPage'
import SettingsPage from '../features/settings/SettingsPage'
import CoachPage from '../features/ai/CoachPage'
import ProsodyPage from '../features/prosody/ProsodyPage'
import IntonationPairsPage from '../features/prosody/IntonationPairsPage'

export default function App() {
  return (
    <SettingsProvider>
    <AppStateProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/prosody" element={<ProsodyPage />} />
          <Route path="/prosody/pairs" element={<IntonationPairsPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppStateProvider>
    </SettingsProvider>
  )
}
