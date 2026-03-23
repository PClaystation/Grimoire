import { useEffect, useState } from 'react'

import {
  deleteRoomPreset,
  getRoomPresetsEventName,
  readRoomPresets,
  saveRoomPreset,
  type RoomPreset,
} from '@/play/playRoomPresetStorage'
import type { RoomSettingsInput } from '@/shared/play'

export function useRoomPresets() {
  const [presets, setPresets] = useState<RoomPreset[]>(() => readRoomPresets())

  useEffect(() => {
    function handleRefresh() {
      setPresets(readRoomPresets())
    }

    window.addEventListener(getRoomPresetsEventName(), handleRefresh)
    window.addEventListener('storage', handleRefresh)

    return () => {
      window.removeEventListener(getRoomPresetsEventName(), handleRefresh)
      window.removeEventListener('storage', handleRefresh)
    }
  }, [])

  return {
    presets,
    savePreset(name: string, settings: RoomSettingsInput) {
      const preset = saveRoomPreset(name, settings)
      setPresets(readRoomPresets())
      return preset
    },
    deletePreset(presetId: string) {
      deleteRoomPreset(presetId)
      setPresets(readRoomPresets())
    },
  }
}
