import type { DeckCardEntry } from '../src/types/deck.js'
import type { MagicCard } from '../src/types/scryfall.js'
import type {
  ClientGameAction,
  ClientMessage,
  DeckSelectionSnapshot,
  OwnedZone,
} from '../src/shared/play.js'

const MAX_CLIENT_STRING_LENGTH = 256
const MAX_DECK_ENTRIES = 300

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.length > 0 && value.length <= MAX_CLIENT_STRING_LENGTH
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value))
}

function isOwnedZone(value: unknown): value is OwnedZone {
  return value === 'hand' || value === 'battlefield' || value === 'graveyard' || value === 'exile'
}

function isMagicCardPayload(value: unknown): value is MagicCard {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    (value.oracleId === null || typeof value.oracleId === 'string') &&
    isNonEmptyString(value.name) &&
    typeof value.manaCost === 'string' &&
    typeof value.manaValue === 'number' &&
    Number.isFinite(value.manaValue) &&
    typeof value.releasedAt === 'string' &&
    typeof value.typeLine === 'string' &&
    typeof value.oracleText === 'string' &&
    isStringArray(value.colors) &&
    isStringArray(value.colorIdentity) &&
    isNonEmptyString(value.setCode) &&
    isNonEmptyString(value.setName) &&
    isNonEmptyString(value.collectorNumber) &&
    isNonEmptyString(value.rarity) &&
    isRecord(value.legalities) &&
    Object.values(value.legalities).every((entry) => typeof entry === 'string') &&
    isNonEmptyString(value.imageUrl) &&
    isNonEmptyString(value.largeImageUrl) &&
    isRecord(value.prices) &&
    isNullableNumber(value.prices.usd) &&
    isNullableNumber(value.prices.usdFoil) &&
    isNullableNumber(value.prices.eur) &&
    isNullableNumber(value.prices.eurFoil) &&
    isNullableNumber(value.prices.tix)
  )
}

function isDeckCardEntryPayload(value: unknown): value is DeckCardEntry {
  return (
    isRecord(value) &&
    typeof value.quantity === 'number' &&
    Number.isInteger(value.quantity) &&
    value.quantity > 0 &&
    value.quantity <= MAX_DECK_ENTRIES &&
    isMagicCardPayload(value.card)
  )
}

function isDeckSelectionSnapshotPayload(value: unknown): value is DeckSelectionSnapshot {
  return (
    isRecord(value) &&
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.name) &&
    typeof value.format === 'string' &&
    typeof value.mainboardCount === 'number' &&
    Number.isFinite(value.mainboardCount) &&
    typeof value.sideboardCount === 'number' &&
    Number.isFinite(value.sideboardCount) &&
    Array.isArray(value.mainboard) &&
    value.mainboard.length <= MAX_DECK_ENTRIES &&
    value.mainboard.every((entry) => isDeckCardEntryPayload(entry))
  )
}

function isClientGameActionPayload(value: unknown): value is ClientGameAction {
  if (!(isRecord(value) && typeof value.type === 'string')) {
    return false
  }

  switch (value.type) {
    case 'shuffle_library':
    case 'draw_card':
      return true
    case 'move_owned_card':
      return (
        isNonEmptyString(value.cardId) &&
        isOwnedZone(value.fromZone) &&
        isOwnedZone(value.toZone)
      )
    case 'tap_card':
      return isNonEmptyString(value.cardId) && typeof value.tapped === 'boolean'
    case 'adjust_life':
      return isNonEmptyString(value.playerId) && typeof value.delta === 'number'
    default:
      return false
  }
}

function isClientMessagePayload(value: unknown): value is ClientMessage {
  if (!(isRecord(value) && typeof value.type === 'string')) {
    return false
  }

  switch (value.type) {
    case 'hello':
      return typeof value.sessionId === 'string' && typeof value.playerName === 'string'
    case 'create_room':
      return true
    case 'join_room':
    case 'leave_room':
    case 'start_game':
      return isNonEmptyString(value.roomId)
    case 'select_deck':
      return isNonEmptyString(value.roomId) && isDeckSelectionSnapshotPayload(value.deck)
    case 'game_action':
      return isNonEmptyString(value.gameId) && isClientGameActionPayload(value.action)
    default:
      return false
  }
}

export function parseClientMessage(rawData: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(rawData) as unknown
    return isClientMessagePayload(parsed) ? parsed : null
  } catch {
    return null
  }
}
