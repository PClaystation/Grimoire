import { useContext } from 'react'

import { AppSettingsContext } from '@/settings/appSettingsContext'

export function useAppSettings() {
  const context = useContext(AppSettingsContext)

  if (!context) {
    throw new Error('useAppSettings must be used inside an AppSettingsProvider.')
  }

  return context
}
