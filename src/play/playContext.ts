import { createContext } from 'react'

import type {
  ClientGameAction,
  DeckSelectionSnapshot,
  GameSnapshot,
  RoomDirectoryEntry,
  RoomSettingsInput,
  RoomSnapshot,
} from '@/shared/play'

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected'

export interface PlayState {
  sessionId: string
  playerName: string
  connectionStatus: ConnectionStatus
  room: RoomSnapshot | null
  roomDirectory: RoomDirectoryEntry[]
  game: GameSnapshot | null
  error: string | null
}

export interface PlayContextValue extends PlayState {
  clearError: () => void
  setPlayerName: (playerName: string) => void
  createRoom: (settings?: RoomSettingsInput) => void
  joinRoom: (roomId: string) => void
  leaveRoom: (roomId: string) => void
  updateRoomSettings: (roomId: string, settings: RoomSettingsInput) => void
  selectDeck: (roomId: string, deck: DeckSelectionSnapshot) => void
  startGame: (roomId: string) => void
  sendGameAction: (gameId: string, action: ClientGameAction) => void
}

export const PlayContext = createContext<PlayContextValue | null>(null)
