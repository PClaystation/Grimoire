import { createContext } from 'react'

import type {
  ClientGameAction,
  DeckSelectionSnapshot,
  GameSnapshot,
  RoomParticipantRole,
  RoomDirectoryEntry,
  RoomSettingsInput,
  RoomSnapshot,
} from '@/shared/play'

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected'

export interface PlayState {
  sessionId: string
  playerName: string
  connectionStatus: ConnectionStatus
  connectionMessage: string | null
  pendingMessageCount: number
  reconnectAttemptCount: number
  room: RoomSnapshot | null
  roomDirectory: RoomDirectoryEntry[]
  game: GameSnapshot | null
  error: string | null
  debugUnlocked: boolean
}

export interface PlayContextValue extends PlayState {
  clearError: () => void
  setPlayerName: (playerName: string) => void
  unlockDebugMode: (password: string) => void
  createRoom: (settings?: RoomSettingsInput) => void
  createDebugRoom: (settings?: RoomSettingsInput) => void
  joinRoom: (roomId: string, role?: RoomParticipantRole) => void
  leaveRoom: (roomId: string) => void
  updateRoomSettings: (roomId: string, settings: RoomSettingsInput) => void
  addDebugPlayer: (roomId: string, name?: string) => void
  removeDebugPlayer: (roomId: string, playerId: string) => void
  selectDeck: (roomId: string, deck: DeckSelectionSnapshot) => void
  startGame: (roomId: string) => void
  sendRoomChat: (roomId: string, message: string) => void
  sendGameAction: (gameId: string, action: ClientGameAction) => void
}

export const PlayContext = createContext<PlayContextValue | null>(null)
