import { Navigate, Route, Routes } from 'react-router-dom'
import { AppStateProvider } from './AppStateProvider'
import { AppShell } from '../components/Layout/AppShell'
import HomePage from '../features/home/HomePage'
import ProgressPage from '../features/progress/ProgressPage'
import TrainingPage from '../features/training/TrainingPage'
import ProsodyPage from '../features/prosody/ProsodyPage'

export default function App() {
  return (
    <AppStateProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/prosody" element={<ProsodyPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppStateProvider>
  )
}
