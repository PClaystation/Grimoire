import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider } from '@/auth/AuthProvider'
import AppRouter from '@/AppRouter'
import { AppSettingsProvider } from '@/settings/AppSettingsProvider'
import '@/index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Unable to find the Grimoire root element.')
}

createRoot(rootElement).render(
  <StrictMode>
    <AuthProvider>
      <AppSettingsProvider>
        <AppRouter />
      </AppSettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
