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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(
      `${import.meta.env.BASE_URL}service-worker.js`,
      { scope: import.meta.env.BASE_URL },
    )
  })
}
