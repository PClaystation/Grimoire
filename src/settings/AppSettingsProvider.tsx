import { useEffect, useState, type ReactNode } from 'react'

import { AppSettingsContext } from '@/settings/appSettingsContext'
import {
  DEFAULT_APP_SETTINGS,
  applySettingsToDocument,
  loadInitialSettings,
  persistSettings,
  type AppSettings,
} from '@/settings/appSettings'

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadInitialSettings())

  useEffect(() => {
    persistSettings(settings)
    applySettingsToDocument(settings)
  }, [settings])

  function updateSettings(updates: Partial<AppSettings>) {
    setSettings((current) => ({
      ...current,
      ...updates,
    }))
  }

  function resetSettings() {
    setSettings(DEFAULT_APP_SETTINGS)
  }

  return (
    <AppSettingsContext.Provider
      value={{
        settings,
        updateSettings,
        resetSettings,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  )
}
