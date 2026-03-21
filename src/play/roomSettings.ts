import {
  PLAY_MAX_PLAYERS,
  PLAY_MIN_PLAYERS,
  ROOM_DESCRIPTION_MAX_LENGTH,
  ROOM_NAME_MAX_LENGTH,
  ROOM_TAG_MAX_LENGTH,
  buildDefaultRoomName,
  normalizeRoomTags,
  type RoomFormatPreference,
  type RoomPowerLevel,
  type RoomSettings,
  type RoomSettingsInput,
  type RoomVisibility,
} from '@/shared/play'

export interface RoomSettingsDraft {
  name: string
  visibility: RoomVisibility
  minPlayers: number
  maxPlayers: number
  format: RoomFormatPreference
  powerLevel: RoomPowerLevel
  description: string
  tagsInput: string
}

export const ROOM_VISIBILITY_LABELS: Record<RoomVisibility, string> = {
  private: 'Private',
  public: 'Public',
}

export const ROOM_FORMAT_LABELS: Record<RoomFormatPreference, string> = {
  any: 'Any format',
  standard: 'Standard',
  pioneer: 'Pioneer',
  modern: 'Modern',
  legacy: 'Legacy',
  vintage: 'Vintage',
  pauper: 'Pauper',
  commander: 'Commander',
}

export const ROOM_POWER_LEVEL_LABELS: Record<RoomPowerLevel, string> = {
  casual: 'Casual',
  focused: 'Focused',
  competitive: 'Competitive',
}

export const ROOM_VISIBILITY_OPTIONS = [
  { value: 'private', label: ROOM_VISIBILITY_LABELS.private },
  { value: 'public', label: ROOM_VISIBILITY_LABELS.public },
] as const satisfies ReadonlyArray<{ value: RoomVisibility; label: string }>

export const ROOM_FORMAT_OPTIONS = Object.entries(ROOM_FORMAT_LABELS).map(([value, label]) => ({
  value: value as RoomFormatPreference,
  label,
}))

export const ROOM_POWER_LEVEL_OPTIONS = Object.entries(ROOM_POWER_LEVEL_LABELS).map(
  ([value, label]) => ({
    value: value as RoomPowerLevel,
    label,
  }),
)

export const ROOM_PLAYER_COUNT_OPTIONS = Array.from(
  { length: PLAY_MAX_PLAYERS - PLAY_MIN_PLAYERS + 1 },
  (_, index) => PLAY_MIN_PLAYERS + index,
)

export function createRoomSettingsDraft(
  settings?: Partial<RoomSettings> | null,
  hostPlayerName = 'Planeswalker',
): RoomSettingsDraft {
  return {
    name: settings?.name ?? buildDefaultRoomName(hostPlayerName),
    visibility: settings?.visibility ?? 'private',
    minPlayers: settings?.minPlayers ?? PLAY_MIN_PLAYERS,
    maxPlayers: settings?.maxPlayers ?? PLAY_MAX_PLAYERS,
    format: settings?.format ?? 'any',
    powerLevel: settings?.powerLevel ?? 'casual',
    description: settings?.description ?? '',
    tagsInput: settings?.tags?.join(', ') ?? '',
  }
}

export function draftToRoomSettingsInput(draft: RoomSettingsDraft): RoomSettingsInput {
  return {
    name: draft.name,
    visibility: draft.visibility,
    minPlayers: draft.minPlayers,
    maxPlayers: draft.maxPlayers,
    format: draft.format,
    powerLevel: draft.powerLevel,
    description: draft.description,
    tags: parseRoomTagsInput(draft.tagsInput),
  }
}

export function parseRoomTagsInput(value: string) {
  return normalizeRoomTags(
    value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean),
  )
}

export function updateRoomPlayerBounds(
  draft: RoomSettingsDraft,
  key: 'minPlayers' | 'maxPlayers',
  nextValue: number,
): RoomSettingsDraft {
  if (key === 'minPlayers') {
    return {
      ...draft,
      minPlayers: nextValue,
      maxPlayers: Math.max(nextValue, draft.maxPlayers),
    }
  }

  return {
    ...draft,
    maxPlayers: nextValue,
    minPlayers: Math.min(draft.minPlayers, nextValue),
  }
}

export {
  ROOM_DESCRIPTION_MAX_LENGTH,
  ROOM_NAME_MAX_LENGTH,
  ROOM_TAG_MAX_LENGTH,
}
