import type { DeckSelectionSummary, DeckSelectionSnapshot, PermanentCounter, PermanentPosition, PlayerCounter, PlayerDesignation, PlayerDesignations, RoomSettings, RoomSettingsInput, StackItemSnapshot, TurnStateSnapshot } from '../../src/shared/play.js'
import type { CardInstance } from '../../src/shared/playDeck.js'

export interface RoomPlayerState {
  id: string
  sessionId: string | null
  name: string
  joinedAt: string
  isConnected: boolean
  selectedDeck: DeckSelectionSnapshot | null
  isDebugPlaceholder: boolean
}

export interface BattlefieldPermanentState extends CardInstance {
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

export interface StackItemState {
  id: string
  controllerPlayerId: string
  itemType: StackItemSnapshot['itemType']
  label: string
  sourceZone: import('../../src/shared/play.js').OwnedZone | null
  sourceCard: CardInstance | null
  note: string
  targets: string[]
  createdAt: string
  faceDown: boolean
}

export interface GamePlayerState {
  id: string
  sessionId: string | null
  name: string
  isConnected: boolean
  joinedAt: string
  selectedDeck: DeckSelectionSummary
  lifeTotal: number
  library: CardInstance[]
  hand: CardInstance[]
  graveyard: CardInstance[]
  exile: CardInstance[]
  command: CardInstance[]
  counters: PlayerCounter[]
  note: string
  designations: PlayerDesignations
  commanderTax: number
  commanderDamage: import('../../src/shared/play.js').CommanderDamageEntry[]
}

export interface GameState {
  gameId: string
  roomId: string
  createdAt: string
  startedAt: string
  turn: TurnStateSnapshot
  stack: StackItemState[]
  players: GamePlayerState[]
  battlefield: BattlefieldPermanentState[]
  actionLog: import('../../src/shared/play.js').GameActionEvent[]
}

export interface RoomState {
  roomId: string
  code: string
  createdAt: string
  hostPlayerId: string
  debugMode: boolean
  settings: RoomSettings
  players: RoomPlayerState[]
  gameId: string | null
  game: GameState | null
}

export interface PlayServerDependencies {
  sendToSession: (sessionId: string, message: import('../../src/shared/play.js').ServerMessage) => void
  disconnectGracePeriodMs?: number
  setTimeout?: (callback: () => void, delayMs: number) => ReturnType<typeof globalThis.setTimeout>
  clearTimeout?: (timeoutId: ReturnType<typeof globalThis.setTimeout>) => void
}

export type OwnedZone = import('../../src/shared/play.js').OwnedZone
export type PlayerDesignationKey = PlayerDesignation
export type RoomSettingsInputValue = RoomSettingsInput
