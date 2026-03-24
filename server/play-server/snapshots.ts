import {
  buildDeckSelectionSummary,
  type BattlefieldPermanentSnapshot,
  type GamePlayerPublicSnapshot,
  type GameSnapshot,
  type RoomDirectoryEntry,
  type RoomSnapshot,
  type StackItemSnapshot,
  type TableCardSnapshot,
} from '../../src/shared/play.js'
import type { CardInstance } from '../../src/shared/playDeck.js'

import { buildHiddenCard } from './helpers.js'
import type {
  BattlefieldPermanentState,
  GameState,
  RoomState,
  StackItemState,
} from './types.js'

export function toTableCardSnapshot(card: CardInstance): TableCardSnapshot {
  return {
    instanceId: card.instanceId,
    ownerPlayerId: card.ownerPlayerId,
    card: card.card,
  }
}

export function toBattlefieldCardSnapshot(
  card: BattlefieldPermanentState,
  viewerPlayerId: string,
): TableCardSnapshot {
  if (
    !card.faceDown ||
    viewerPlayerId === card.ownerPlayerId ||
    viewerPlayerId === card.controllerPlayerId
  ) {
    return toTableCardSnapshot(card)
  }

  return {
    instanceId: card.instanceId,
    ownerPlayerId: card.ownerPlayerId,
    card: buildHiddenCard(card.card),
  }
}

export function toStackItemSnapshot(
  item: StackItemState,
  viewerPlayerId: string,
): StackItemSnapshot {
  const canViewCard =
    !item.faceDown ||
    item.sourceCard === null ||
    viewerPlayerId === item.sourceCard.ownerPlayerId ||
    viewerPlayerId === item.controllerPlayerId

  return {
    id: item.id,
    controllerPlayerId: item.controllerPlayerId,
    itemType: item.itemType,
    label: item.label,
    sourceZone: item.sourceZone,
    sourceCard:
      item.sourceCard === null
        ? null
        : canViewCard
          ? toTableCardSnapshot(item.sourceCard)
          : {
              instanceId: item.sourceCard.instanceId,
              ownerPlayerId: item.sourceCard.ownerPlayerId,
              card: buildHiddenCard(item.sourceCard.card),
            },
    note: item.note,
    targets: item.targets,
    createdAt: item.createdAt,
    faceDown: item.faceDown,
  }
}

export function buildRoomSnapshot(room: RoomState, localPlayerId: string): RoomSnapshot {
  return {
    roomId: room.roomId,
    code: room.code,
    phase: room.game ? 'game' : 'lobby',
    createdAt: room.createdAt,
    gameId: room.gameId,
    hostPlayerId: room.hostPlayerId,
    localPlayerId,
    debugMode: room.debugMode,
    settings: room.settings,
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      isHost: player.id === room.hostPlayerId,
      isConnected: player.isConnected,
      selectedDeck: player.selectedDeck ? buildDeckSelectionSummary(player.selectedDeck) : null,
      isDebugPlaceholder: player.isDebugPlaceholder,
    })),
  }
}

export function buildRoomDirectoryEntry(room: RoomState): RoomDirectoryEntry | null {
  if (room.debugMode || room.settings.visibility !== 'public' || room.game) {
    return null
  }

  const hostPlayer = room.players.find((player) => player.id === room.hostPlayerId) ?? room.players[0]

  if (!hostPlayer) {
    return null
  }

  return {
    roomId: room.roomId,
    code: room.code,
    phase: 'lobby',
    createdAt: room.createdAt,
    hostPlayerId: room.hostPlayerId,
    hostPlayerName: hostPlayer.name,
    settings: room.settings,
    playerCount: room.players.length,
    connectedPlayerCount: room.players.filter((player) => player.isConnected).length,
    openSeatCount: Math.max(0, room.settings.maxPlayers - room.players.length),
    players: room.players.map((player) => ({
      name: player.name,
      isHost: player.id === room.hostPlayerId,
      isConnected: player.isConnected,
    })),
  }
}

export function buildGameSnapshot(
  game: GameState,
  localPlayerId: string,
  debugMode: boolean,
): GameSnapshot {
  const publicPlayers: GamePlayerPublicSnapshot[] = game.players.map((player) => ({
    id: player.id,
    name: player.name,
    isConnected: player.isConnected,
    lifeTotal: player.lifeTotal,
    deck: player.selectedDeck,
    zoneCounts: {
      library: player.library.length,
      hand: player.hand.length,
      battlefield: game.battlefield.filter((card) => card.ownerPlayerId === player.id).length,
      graveyard: player.graveyard.length,
      exile: player.exile.length,
      command: player.command.length,
    },
    graveyard: player.graveyard.map((card) => toTableCardSnapshot(card)),
    exile: player.exile.map((card) => toTableCardSnapshot(card)),
    command: player.command.map((card) => toTableCardSnapshot(card)),
    counters: player.counters,
    note: player.note,
    designations: player.designations,
    commanderTax: player.commanderTax,
    commanderDamage: player.commanderDamage,
  }))

  const localPlayer = game.players.find((player) => player.id === localPlayerId) ?? null

  return {
    gameId: game.gameId,
    roomId: game.roomId,
    localPlayerId,
    debugMode,
    publicState: {
      gameId: game.gameId,
      roomId: game.roomId,
      createdAt: game.createdAt,
      startedAt: game.startedAt,
      turn: game.turn,
      stack: game.stack.map((item) => toStackItemSnapshot(item, localPlayerId)),
      battlefield: game.battlefield.map((card): BattlefieldPermanentSnapshot => ({
        ...toBattlefieldCardSnapshot(card, localPlayerId),
        controllerPlayerId: card.controllerPlayerId,
        tapped: card.tapped,
        enteredAt: card.enteredAt,
        position: card.position,
        stackId: card.stackId,
        stackIndex: card.stackIndex,
        counters: card.counters,
        note: card.note,
        isToken: card.isToken,
        faceDown: card.faceDown,
      })),
      players: publicPlayers,
      actionLog: game.actionLog,
    },
    privateState: localPlayer
      ? {
          playerId: localPlayer.id,
          library: localPlayer.library.map((card) => toTableCardSnapshot(card)),
          hand: localPlayer.hand.map((card) => toTableCardSnapshot(card)),
        }
      : null,
  }
}
