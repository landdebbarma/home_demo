import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { RouterProvider } from './lib/router'
import { setupReveals } from './components/ui'

if ('scrollRestoration' in history) history.scrollRestoration = 'manual'
setupReveals()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider>
      <App />
    </RouterProvider>
  </StrictMode>,
)
