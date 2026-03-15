import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppRouter from '@/AppRouter'
import '@/index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Unable to find the Grimoire root element.')
}

createRoot(rootElement).render(
  <StrictMode>
    <AppRouter />
  </StrictMode>,
)
