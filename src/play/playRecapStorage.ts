import type { GameSnapshot, RoomSnapshot } from '@/shared/play'

const PLAY_RECAP_STORAGE_KEY = 'grimoire.play.recap-history.v1'
const PLAY_RECAPS_EVENT = 'grimoire:play-recaps-changed'
const PLAY_RECAP_LIMIT = 24

export interface PlaySessionPlayerRecap {
  id: string
  name: string
  lifeTotal: number
  handCount: number
  libraryCount: number
  graveyardCount: number
  battlefieldCount: number
  exileCount: number
  commandCount: number
}

export interface PlaySessionRecap {
  id: string
  gameId: string
  roomId: string
  roomName: string
  roomCode: string | null
  startedAt: string
  endedAt: string | null
  updatedAt: string
  localPlayerId: string | null
  localPlayerName: string
  activePlayerName: string | null
  turnNumber: number
  actionCount: number
  debugMode: boolean
  players: PlaySessionPlayerRecap[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizePlayerRecap(value: unknown): PlaySessionPlayerRecap | null {
  if (
    !(
      isRecord(value) &&
      typeof value.id === 'string' &&
      typeof value.name === 'string' &&
      typeof value.lifeTotal === 'number' &&
      typeof value.handCount === 'number' &&
      typeof value.libraryCount === 'number' &&
      typeof value.graveyardCount === 'number' &&
      typeof value.battlefieldCount === 'number' &&
      typeof value.exileCount === 'number' &&
      typeof value.commandCount === 'number'
    )
  ) {
    return null
  }

  return {
    id: value.id,
    name: value.name,
    lifeTotal: value.lifeTotal,
    handCount: value.handCount,
    libraryCount: value.libraryCount,
    graveyardCount: value.graveyardCount,
    battlefieldCount: value.battlefieldCount,
    exileCount: value.exileCount,
    commandCount: value.commandCount,
  }
}

function normalizePlaySessionRecap(value: unknown): PlaySessionRecap | null {
  if (
    !(
      isRecord(value) &&
      typeof value.id === 'string' &&
      typeof value.gameId === 'string' &&
      typeof value.roomId === 'string' &&
      typeof value.roomName === 'string' &&
      (value.roomCode === null || typeof value.roomCode === 'string') &&
      typeof value.startedAt === 'string' &&
      (value.endedAt === null || typeof value.endedAt === 'string') &&
      typeof value.updatedAt === 'string' &&
      (value.localPlayerId === null || typeof value.localPlayerId === 'string') &&
      typeof value.localPlayerName === 'string' &&
      (value.activePlayerName === null || typeof value.activePlayerName === 'string') &&
      typeof value.turnNumber === 'number' &&
      typeof value.actionCount === 'number' &&
      typeof value.debugMode === 'boolean' &&
      Array.isArray(value.players)
    )
  ) {
    return null
  }

  const players = value.players
    .map((entry) => normalizePlayerRecap(entry))
    .filter((entry): entry is PlaySessionPlayerRecap => entry !== null)

  return {
    id: value.id,
    gameId: value.gameId,
    roomId: value.roomId,
    roomName: value.roomName,
    roomCode: value.roomCode,
    startedAt: value.startedAt,
    endedAt: value.endedAt,
    updatedAt: value.updatedAt,
    localPlayerId: value.localPlayerId,
    localPlayerName: value.localPlayerName,
    activePlayerName: value.activePlayerName,
    turnNumber: value.turnNumber,
    actionCount: value.actionCount,
    debugMode: value.debugMode,
    players,
  }
}

function readStorageValue() {
  try {
    return window.localStorage.getItem(PLAY_RECAP_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStorageValue(recaps: PlaySessionRecap[]) {
  try {
    window.localStorage.setItem(PLAY_RECAP_STORAGE_KEY, JSON.stringify(recaps))
  } catch {
    // Ignore storage write failures.
  }

  window.dispatchEvent(new Event(PLAY_RECAPS_EVENT))
}

export function readPlaySessionRecaps() {
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
      .map((entry) => normalizePlaySessionRecap(entry))
      .filter((entry): entry is PlaySessionRecap => entry !== null)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
  } catch {
    return []
  }
}

function sortAndTrimRecaps(recaps: PlaySessionRecap[]) {
  return [...recaps]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, PLAY_RECAP_LIMIT)
}

export function buildPlaySessionRecap(
  game: GameSnapshot,
  room: RoomSnapshot | null,
  localPlayerName: string,
): PlaySessionRecap {
  const activePlayer =
    game.publicState.players.find((player) => player.id === game.publicState.turn.activePlayerId) ??
    null

  return {
    id: game.gameId,
    gameId: game.gameId,
    roomId: game.roomId,
    roomName: room?.settings.name ?? 'Play session',
    roomCode: room?.code ?? null,
    startedAt: game.publicState.startedAt,
    endedAt: null,
    updatedAt: new Date().toISOString(),
    localPlayerId: game.localPlayerId,
    localPlayerName,
    activePlayerName: activePlayer?.name ?? null,
    turnNumber: game.publicState.turn.turnNumber,
    actionCount: game.publicState.actionLog.length,
    debugMode: game.debugMode,
    players: game.publicState.players.map((player) => ({
      id: player.id,
      name: player.name,
      lifeTotal: player.lifeTotal,
      handCount: player.zoneCounts.hand,
      libraryCount: player.zoneCounts.library,
      graveyardCount: player.zoneCounts.graveyard,
      battlefieldCount: player.zoneCounts.battlefield,
      exileCount: player.zoneCounts.exile,
      commandCount: player.zoneCounts.command,
    })),
  }
}

export function upsertPlaySessionRecap(recap: PlaySessionRecap) {
  const recaps = readPlaySessionRecaps()
  const nextRecaps = sortAndTrimRecaps([
    recap,
    ...recaps.filter((entry) => entry.gameId !== recap.gameId),
  ])

  writeStorageValue(nextRecaps)
}

export function finalizePlaySessionRecap(gameId: string) {
  const recaps = readPlaySessionRecaps()
  const now = new Date().toISOString()
  const nextRecaps = recaps.map((recap) =>
    recap.gameId === gameId && recap.endedAt === null
      ? {
          ...recap,
          endedAt: now,
          updatedAt: now,
        }
      : recap,
  )

  writeStorageValue(sortAndTrimRecaps(nextRecaps))
}

export function getPlayRecapsEventName() {
  return PLAY_RECAPS_EVENT
}
