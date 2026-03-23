import type { RoomSettingsInput } from '@/shared/play'

const ROOM_PRESETS_STORAGE_KEY = 'grimoire.play.room-presets.v1'
const ROOM_PRESETS_EVENT = 'grimoire:play-room-presets-changed'

export interface RoomPreset {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  settings: RoomSettingsInput
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeRoomPreset(value: unknown): RoomPreset | null {
  if (
    !(
      isRecord(value) &&
      typeof value.id === 'string' &&
      typeof value.name === 'string' &&
      typeof value.createdAt === 'string' &&
      typeof value.updatedAt === 'string' &&
      isRecord(value.settings)
    )
  ) {
    return null
  }

  const settings = value.settings

  return {
    id: value.id,
    name: value.name.trim() || 'Room preset',
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    settings: {
      name: typeof settings.name === 'string' ? settings.name : undefined,
      visibility: settings.visibility === 'public' ? 'public' : 'private',
      minPlayers:
        typeof settings.minPlayers === 'number' ? Math.trunc(settings.minPlayers) : undefined,
      maxPlayers:
        typeof settings.maxPlayers === 'number' ? Math.trunc(settings.maxPlayers) : undefined,
      format:
        settings.format === 'standard' ||
        settings.format === 'pioneer' ||
        settings.format === 'modern' ||
        settings.format === 'legacy' ||
        settings.format === 'vintage' ||
        settings.format === 'pauper' ||
        settings.format === 'commander' ||
        settings.format === 'any'
          ? settings.format
          : undefined,
      powerLevel:
        settings.powerLevel === 'casual' ||
        settings.powerLevel === 'focused' ||
        settings.powerLevel === 'competitive'
          ? settings.powerLevel
          : undefined,
      description: typeof settings.description === 'string' ? settings.description : undefined,
      tags: Array.isArray(settings.tags)
        ? settings.tags.filter((entry): entry is string => typeof entry === 'string')
        : undefined,
    },
  }
}

function readStorageValue() {
  try {
    return window.localStorage.getItem(ROOM_PRESETS_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStorageValue(value: RoomPreset[]) {
  try {
    window.localStorage.setItem(ROOM_PRESETS_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // Ignore storage write failures and keep the in-memory UI responsive.
  }

  window.dispatchEvent(new Event(ROOM_PRESETS_EVENT))
}

export function readRoomPresets() {
  const rawValue = readStorageValue()

  if (!rawValue) {
    return []
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown

    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((entry) => normalizeRoomPreset(entry))
      .filter((entry): entry is RoomPreset => entry !== null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  } catch {
    return []
  }
}

export function saveRoomPreset(name: string, settings: RoomSettingsInput) {
  const now = new Date().toISOString()
  const presets = readRoomPresets()
  const normalizedName = name.trim() || settings.name?.trim() || 'Room preset'
  const existingPreset = presets.find(
    (preset) => preset.name.toLowerCase() === normalizedName.toLowerCase(),
  )

  const nextPreset: RoomPreset = existingPreset
    ? {
        ...existingPreset,
        updatedAt: now,
        settings,
      }
    : {
        id: crypto.randomUUID(),
        name: normalizedName,
        createdAt: now,
        updatedAt: now,
        settings,
      }

  const nextPresets = [nextPreset, ...presets.filter((preset) => preset.id !== nextPreset.id)]
  writeStorageValue(nextPresets)
  return nextPreset
}

export function deleteRoomPreset(presetId: string) {
  writeStorageValue(readRoomPresets().filter((preset) => preset.id !== presetId))
}

export function getRoomPresetsEventName() {
  return ROOM_PRESETS_EVENT
}
