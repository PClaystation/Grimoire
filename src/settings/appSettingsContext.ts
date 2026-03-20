import { createContext } from 'react'

import type { AppSettings } from '@/settings/appSettings'

export interface AppSettingsContextValue {
  settings: AppSettings
  updateSettings: (updates: Partial<AppSettings>) => void
  resetSettings: () => void
}

export const AppSettingsContext = createContext<AppSettingsContextValue | null>(null)
