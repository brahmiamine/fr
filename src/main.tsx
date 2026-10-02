import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './app/App'
import './styles/global.css'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error("Élément racine #root introuvable.")
}

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)

// Register the service worker in production so the app is installable and
// usable offline. Skipped in development and in environments without support.
if (
  import.meta.env.PROD &&
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator
) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .catch(() => {
        // Offline support is a bonus; ignore registration failures.
      })
  })
}
