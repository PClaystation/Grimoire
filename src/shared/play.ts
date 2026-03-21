import type { DeckCardEntry, DeckFormat, SavedDeck } from '../types/deck.js'
import type { CardColor, MagicCard } from '../types/scryfall.js'

export const PLAY_MIN_PLAYERS = 2
export const PLAY_MAX_PLAYERS = 6
export const PLAY_STARTING_LIFE_TOTAL = 20
export const PLAY_COMMANDER_STARTING_LIFE_TOTAL = 40
export const PLAY_OPENING_HAND_SIZE = 7
export const ROOM_CODE_LENGTH = 6
export const PLAYER_NAME_MAX_LENGTH = 24
export const ROOM_NAME_MAX_LENGTH = 48
export const ROOM_DESCRIPTION_MAX_LENGTH = 180
export const ROOM_MAX_TAGS = 6
export const ROOM_TAG_MAX_LENGTH = 18

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export type RoomPhase = 'lobby' | 'game'
export type RoomVisibility = 'private' | 'public'
export type RoomFormatPreference = DeckFormat | 'any'
export type RoomPowerLevel = 'casual' | 'focused' | 'competitive'
export type OwnedZone = 'library' | 'hand' | 'battlefield' | 'graveyard' | 'exile' | 'command'
export type StackItemType = 'spell' | 'ability' | 'trigger'
export type PlayerDesignation = 'monarch' | 'initiative' | 'citys_blessing'

export interface PermanentPosition {
  x: number
  y: number
}

export interface PermanentCounter {
  kind: string
  amount: number
}

export interface PlayerCounter {
  kind: string
  amount: number
}

export interface CommanderDamageEntry {
  sourcePlayerId: string
  amount: number
}

export interface PlayerDesignations {
  monarch: boolean
  initiative: boolean
  citysBlessing: boolean
}

export interface TurnStateSnapshot {
  turnNumber: number
  activePlayerId: string
}

export interface DeckSelectionSummary {
  id: string
  name: string
  format: DeckFormat
  mainboardCount: number
  sideboardCount: number
}

export interface DeckSelectionSnapshot extends DeckSelectionSummary {
  mainboard: DeckCardEntry[]
  sideboard: DeckCardEntry[]
}

export interface PlayerZoneCounts {
  library: number
  hand: number
  battlefield: number
  graveyard: number
  exile: number
  command: number
}

export interface RoomPlayerSnapshot {
  id: string
  name: string
  isHost: boolean
  isConnected: boolean
  selectedDeck: DeckSelectionSummary | null
}

export interface RoomSettings {
  name: string
  visibility: RoomVisibility
  minPlayers: number
  maxPlayers: number
  format: RoomFormatPreference
  powerLevel: RoomPowerLevel
  description: string
  tags: string[]
}

export interface RoomSettingsInput {
  name?: string
  visibility?: RoomVisibility
  minPlayers?: number
  maxPlayers?: number
  format?: RoomFormatPreference
  powerLevel?: RoomPowerLevel
  description?: string
  tags?: string[]
}

export interface RoomSnapshot {
  roomId: string
  code: string
  phase: RoomPhase
  createdAt: string
  gameId: string | null
  hostPlayerId: string
  localPlayerId: string | null
  settings: RoomSettings
  players: RoomPlayerSnapshot[]
}

export interface RoomDirectoryPlayerSnapshot {
  name: string
  isHost: boolean
  isConnected: boolean
}

export interface RoomDirectoryEntry {
  roomId: string
  code: string
  phase: RoomPhase
  createdAt: string
  hostPlayerId: string
  hostPlayerName: string
  settings: RoomSettings
  playerCount: number
  connectedPlayerCount: number
  openSeatCount: number
  players: RoomDirectoryPlayerSnapshot[]
}

export interface TableCardSnapshot {
  instanceId: string
  ownerPlayerId: string
  card: MagicCard
}

export interface BattlefieldPermanentSnapshot extends TableCardSnapshot {
  controllerPlayerId: string
  tapped: boolean
  enteredAt: string
  position: PermanentPosition
  stackId: string | null
  stackIndex: number
  counters: PermanentCounter[]
  note: string
  isToken: boolean
  faceDown: boolean
}

export interface StackItemSnapshot {
  id: string
  controllerPlayerId: string
  itemType: StackItemType
  label: string
  sourceZone: OwnedZone | null
  sourceCard: TableCardSnapshot | null
  note: string
  targets: string[]
  createdAt: string
  faceDown: boolean
}

export interface GamePlayerPublicSnapshot {
  id: string
  name: string
  isConnected: boolean
  lifeTotal: number
  deck: DeckSelectionSummary | null
  zoneCounts: PlayerZoneCounts
  graveyard: TableCardSnapshot[]
  exile: TableCardSnapshot[]
  command: TableCardSnapshot[]
  counters: PlayerCounter[]
  note: string
  designations: PlayerDesignations
  commanderTax: number
  commanderDamage: CommanderDamageEntry[]
}

export interface GamePrivatePlayerState {
  playerId: string
  library: TableCardSnapshot[]
  hand: TableCardSnapshot[]
}

export interface GameActionEvent {
  id: string
  actorPlayerId: string
  actionType: ClientGameAction['type'] | 'game_start'
  message: string
  createdAt: string
}

export interface GamePublicState {
  gameId: string
  roomId: string
  createdAt: string
  startedAt: string
  turn: TurnStateSnapshot
  stack: StackItemSnapshot[]
  battlefield: BattlefieldPermanentSnapshot[]
  players: GamePlayerPublicSnapshot[]
  actionLog: GameActionEvent[]
}

export interface GameSnapshot {
  gameId: string
  roomId: string
  localPlayerId: string | null
  publicState: GamePublicState
  privateState: GamePrivatePlayerState | null
}

export type ClientGameAction =
  | { type: 'shuffle_library' }
  | { type: 'draw_card'; amount?: number }
  | { type: 'advance_turn'; nextPlayerId?: string }
  | { type: 'set_active_player'; playerId: string; turnNumber?: number }
  | {
      type: 'move_owned_card'
      cardId: string
      fromZone: OwnedZone
      toZone: OwnedZone
      position?: PermanentPosition
    }
  | { type: 'tap_card'; cardId: string; tapped: boolean }
  | { type: 'untap_all' }
  | { type: 'adjust_life'; playerId: string; delta: number }
  | { type: 'adjust_player_counter'; playerId: string; counterKind: string; delta: number }
  | { type: 'set_player_note'; playerId: string; note: string }
  | { type: 'set_player_designation'; playerId: string; designation: PlayerDesignation; value: boolean }
  | { type: 'adjust_commander_tax'; playerId: string; delta: number }
  | { type: 'adjust_commander_damage'; playerId: string; sourcePlayerId: string; delta: number }
  | { type: 'set_permanent_position'; cardId: string; position: PermanentPosition }
  | { type: 'set_permanent_stack'; cardId: string; stackWithCardId: string | null }
  | { type: 'adjust_permanent_counter'; cardId: string; counterKind: string; delta: number }
  | { type: 'set_permanent_note'; cardId: string; note: string }
  | { type: 'set_permanent_face_down'; cardId: string; faceDown: boolean }
  | { type: 'change_control'; cardId: string; controllerPlayerId: string }
  | {
      type: 'create_stack_item'
      itemType: StackItemType
      label?: string
      cardId?: string
      fromZone?: OwnedZone
      note?: string
      targets?: string[]
      faceDown?: boolean
    }
  | {
      type: 'resolve_stack_item'
      stackItemId: string
      toZone?: OwnedZone
      position?: PermanentPosition
    }
  | {
      type: 'remove_stack_item'
      stackItemId: string
      toZone?: OwnedZone
      position?: PermanentPosition
    }
  | {
      type: 'create_token'
      name: string
      tokenType?: string
      note?: string
      colors?: CardColor[]
      power?: string
      toughness?: string
      position?: PermanentPosition
    }

export type ClientMessage =
  | { type: 'hello'; sessionId: string; playerName: string }
  | { type: 'create_room'; settings?: RoomSettingsInput }
  | { type: 'join_room'; roomId: string }
  | { type: 'leave_room'; roomId: string }
  | { type: 'update_room_settings'; roomId: string; settings: RoomSettingsInput }
  | { type: 'select_deck'; roomId: string; deck: DeckSelectionSnapshot }
  | { type: 'start_game'; roomId: string }
  | { type: 'game_action'; gameId: string; action: ClientGameAction }

export type ServerMessage =
  | {
      type: 'session_ready'
      sessionId: string
      playerName: string
      roomId: string | null
      gameId: string | null
    }
  | { type: 'room_snapshot'; room: RoomSnapshot }
  | { type: 'room_directory'; rooms: RoomDirectoryEntry[] }
  | { type: 'game_snapshot'; game: GameSnapshot }
  | { type: 'room_left'; roomId: string }
  | { type: 'error'; message: string }

export function countDeckCards(entries: DeckCardEntry[]): number {
  return entries.reduce((total, entry) => total + entry.quantity, 0)
}

export function createDeckSelectionSnapshot(
  deck: Pick<SavedDeck, 'id' | 'name' | 'format' | 'mainboard' | 'sideboard'>,
): DeckSelectionSnapshot {
  return {
    id: deck.id,
    name: deck.name,
    format: deck.format,
    mainboard: deck.mainboard,
    sideboard: deck.sideboard,
    mainboardCount: countDeckCards(deck.mainboard),
    sideboardCount: countDeckCards(deck.sideboard),
  }
}

export function buildDeckSelectionSummary(
  deck: Pick<DeckSelectionSnapshot, 'id' | 'name' | 'format' | 'mainboardCount' | 'sideboardCount'>,
): DeckSelectionSummary {
  return {
    id: deck.id,
    name: deck.name,
    format: deck.format,
    mainboardCount: deck.mainboardCount,
    sideboardCount: deck.sideboardCount,
  }
}

export function normalizeRoomCode(value: string) {
  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ROOM_CODE_LENGTH)
}

export function buildRandomRoomCode() {
  let code = ''

  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    const alphabetIndex = Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)
    code += ROOM_CODE_ALPHABET[alphabetIndex]
  }

  return code
}

export function normalizePlayerName(value: string) {
  const trimmed = value.trim().replace(/\s+/g, ' ')

  if (!trimmed) {
    return 'Planeswalker'
  }

  return trimmed.slice(0, PLAYER_NAME_MAX_LENGTH)
}

export function buildDefaultRoomName(hostPlayerName: string) {
  const normalizedHostName = normalizePlayerName(hostPlayerName)
  return `${normalizedHostName}'s Table`.slice(0, ROOM_NAME_MAX_LENGTH)
}

function sanitizeRoomText(value: string | undefined, maxLength: number) {
  return (value ?? '').trim().replace(/\s+/g, ' ').slice(0, maxLength)
}

function normalizeRoomVisibility(value: unknown): RoomVisibility {
  return value === 'public' ? 'public' : 'private'
}

function normalizeRoomFormatPreference(value: unknown): RoomFormatPreference {
  switch (value) {
    case 'standard':
    case 'pioneer':
    case 'modern':
    case 'legacy':
    case 'vintage':
    case 'pauper':
    case 'commander':
      return value
    default:
      return 'any'
  }
}

function normalizeRoomPowerLevel(value: unknown): RoomPowerLevel {
  switch (value) {
    case 'focused':
    case 'competitive':
      return value
    default:
      return 'casual'
  }
}

function clampRoomPlayerCount(value: number | undefined, fallback: number) {
  return Math.max(PLAY_MIN_PLAYERS, Math.min(PLAY_MAX_PLAYERS, Math.round(value ?? fallback)))
}

function normalizeRoomTag(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9+#/ -]/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, ROOM_TAG_MAX_LENGTH)
}

export function normalizeRoomTags(value: string[] | undefined) {
  const normalizedTags: string[] = []
  const seenTags = new Set<string>()

  for (const tag of value ?? []) {
    const normalizedTag = normalizeRoomTag(tag)

    if (!normalizedTag || seenTags.has(normalizedTag)) {
      continue
    }

    seenTags.add(normalizedTag)
    normalizedTags.push(normalizedTag)

    if (normalizedTags.length >= ROOM_MAX_TAGS) {
      break
    }
  }

  return normalizedTags
}

export function normalizeRoomSettings(
  value: RoomSettingsInput | null | undefined,
  hostPlayerName = 'Planeswalker',
): RoomSettings {
  const fallbackMaxPlayers = clampRoomPlayerCount(value?.maxPlayers, PLAY_MAX_PLAYERS)
  const maxPlayers = fallbackMaxPlayers
  const minPlayers = Math.min(
    maxPlayers,
    clampRoomPlayerCount(value?.minPlayers, PLAY_MIN_PLAYERS),
  )
  const name = sanitizeRoomText(value?.name, ROOM_NAME_MAX_LENGTH) || buildDefaultRoomName(hostPlayerName)

  return {
    name,
    visibility: normalizeRoomVisibility(value?.visibility),
    minPlayers,
    maxPlayers,
    format: normalizeRoomFormatPreference(value?.format),
    powerLevel: normalizeRoomPowerLevel(value?.powerLevel),
    description: sanitizeRoomText(value?.description, ROOM_DESCRIPTION_MAX_LENGTH),
    tags: normalizeRoomTags(value?.tags),
  }
}

export function clampPermanentPosition(
  position: Partial<PermanentPosition> | null | undefined,
): PermanentPosition {
  const nextX = typeof position?.x === 'number' ? position.x : 50
  const nextY = typeof position?.y === 'number' ? position.y : 50

  return {
    x: Math.max(4, Math.min(96, Number(nextX.toFixed(1)))),
    y: Math.max(8, Math.min(88, Number(nextY.toFixed(1)))),
  }
}

export function normalizeDeckFormat(value: string): DeckFormat {
  switch (value) {
    case 'standard':
    case 'pioneer':
    case 'modern':
    case 'legacy':
    case 'vintage':
    case 'pauper':
    case 'commander':
      return value
    default:
      return 'standard'
  }
}
