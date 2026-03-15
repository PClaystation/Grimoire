import type { DeckCardEntry } from '../src/types/deck.js'
import {
  PLAY_MAX_PLAYERS,
  PLAY_MIN_PLAYERS,
  PLAY_OPENING_HAND_SIZE,
  PLAY_STARTING_LIFE_TOTAL,
  buildDeckSelectionSummary,
  buildRandomRoomCode,
  countDeckCards,
  normalizeDeckFormat,
  normalizePlayerName,
  normalizeRoomCode,
  type BattlefieldPermanentSnapshot,
  type ClientGameAction,
  type ClientMessage,
  type DeckSelectionSnapshot,
  type DeckSelectionSummary,
  type GameActionEvent,
  type GamePlayerPublicSnapshot,
  type GameSnapshot,
  type OwnedZone,
  type RoomSnapshot,
  type ServerMessage,
  type TableCardSnapshot,
} from '../src/shared/play.js'
import {
  expandDeckEntries,
  shuffleCardInstances,
  type CardInstance,
} from '../src/shared/playDeck.js'

interface RoomPlayerState {
  id: string
  sessionId: string
  name: string
  joinedAt: string
  isConnected: boolean
  selectedDeck: DeckSelectionSnapshot | null
}

interface BattlefieldPermanentState extends CardInstance {
  controllerPlayerId: string
  tapped: boolean
  enteredAt: string
}

interface GamePlayerState {
  id: string
  sessionId: string
  name: string
  isConnected: boolean
  joinedAt: string
  selectedDeck: DeckSelectionSummary
  lifeTotal: number
  library: CardInstance[]
  hand: CardInstance[]
  graveyard: CardInstance[]
  exile: CardInstance[]
}

interface GameState {
  gameId: string
  roomId: string
  createdAt: string
  startedAt: string
  players: GamePlayerState[]
  battlefield: BattlefieldPermanentState[]
  actionLog: GameActionEvent[]
}

interface RoomState {
  roomId: string
  code: string
  createdAt: string
  hostPlayerId: string
  players: RoomPlayerState[]
  gameId: string | null
  game: GameState | null
}

interface PlayServerDependencies {
  sendToSession: (sessionId: string, message: ServerMessage) => void
}

function removeCardFromZone(cards: CardInstance[], cardId: string) {
  const cardIndex = cards.findIndex((card) => card.instanceId === cardId)

  if (cardIndex < 0) {
    return null
  }

  const [card] = cards.splice(cardIndex, 1)
  return card
}

export class PlayServer {
  private readonly rooms = new Map<string, RoomState>()
  private readonly gameRoomIds = new Map<string, string>()
  private readonly sessionRoomIds = new Map<string, string>()
  private readonly sessionNames = new Map<string, string>()

  constructor(private readonly dependencies: PlayServerDependencies) {}

  handleHello(sessionId: string, playerName: string) {
    const normalizedName = normalizePlayerName(playerName)
    this.sessionNames.set(sessionId, normalizedName)
    const room = this.getRoomBySession(sessionId)
    this.dependencies.sendToSession(sessionId, {
      type: 'session_ready',
      sessionId,
      playerName: normalizedName,
      roomId: room?.roomId ?? null,
      gameId: room?.gameId ?? null,
    })

    if (!room) {
      return
    }

    const roomPlayer = room.players.find((player) => player.sessionId === sessionId)

    if (roomPlayer) {
      roomPlayer.name = normalizedName
      roomPlayer.isConnected = true
    }

    const gamePlayer = room.game?.players.find((player) => player.sessionId === sessionId)

    if (gamePlayer) {
      gamePlayer.name = normalizedName
      gamePlayer.isConnected = true
    }

    this.emitRoomSnapshots(room)
    this.emitGameSnapshots(room)
  }

  handleDisconnect(sessionId: string) {
    const room = this.getRoomBySession(sessionId)

    if (!room) {
      return
    }

    const roomPlayer = room.players.find((player) => player.sessionId === sessionId)

    if (roomPlayer) {
      roomPlayer.isConnected = false
    }

    const gamePlayer = room.game?.players.find((player) => player.sessionId === sessionId)

    if (gamePlayer) {
      gamePlayer.isConnected = false
    }

    const connectedPlayers = room.players.filter((player) => player.isConnected)

    if (connectedPlayers.length === 0) {
      this.deleteRoom(room.roomId)
      return
    }

    if (!room.game && !connectedPlayers.some((player) => player.id === room.hostPlayerId)) {
      room.hostPlayerId = connectedPlayers[0].id
    }

    this.emitRoomSnapshots(room)
    this.emitGameSnapshots(room)
  }

  handleMessage(sessionId: string, message: Exclude<ClientMessage, { type: 'hello' }>) {
    switch (message.type) {
      case 'create_room':
        this.createRoom(sessionId)
        break
      case 'join_room':
        this.joinRoom(sessionId, message.roomId)
        break
      case 'leave_room':
        this.leaveRoom(sessionId, message.roomId)
        break
      case 'select_deck':
        this.selectDeck(sessionId, message.roomId, message.deck)
        break
      case 'start_game':
        this.startGame(sessionId, message.roomId)
        break
      case 'game_action':
        this.applyGameAction(sessionId, message.gameId, message.action)
        break
    }
  }

  private createRoom(sessionId: string) {
    const existingRoom = this.getRoomBySession(sessionId)

    if (existingRoom) {
      this.emitRoomSnapshots(existingRoom)
      return
    }

    const roomId = this.generateUniqueRoomId()
    const player = this.createRoomPlayer(sessionId)
    const createdAt = new Date().toISOString()

    const room: RoomState = {
      roomId,
      code: roomId,
      createdAt,
      hostPlayerId: player.id,
      players: [player],
      gameId: null,
      game: null,
    }

    this.rooms.set(roomId, room)
    this.sessionRoomIds.set(sessionId, roomId)
    this.emitRoomSnapshots(room)
  }

  private joinRoom(sessionId: string, requestedRoomId: string) {
    const roomId = normalizeRoomCode(requestedRoomId)
    const room = this.rooms.get(roomId)

    if (!room) {
      this.emitError(sessionId, 'Room not found.')
      return
    }

    const existingRoom = this.getRoomBySession(sessionId)

    if (existingRoom && existingRoom.roomId !== room.roomId) {
      this.emitError(sessionId, 'Leave your current room before joining another one.')
      return
    }

    const existingPlayer = room.players.find((player) => player.sessionId === sessionId)

    if (existingPlayer) {
      existingPlayer.name = this.getPlayerName(sessionId)
      existingPlayer.isConnected = true
      this.sessionRoomIds.set(sessionId, room.roomId)
      this.emitRoomSnapshots(room)
      this.emitGameSnapshots(room)
      return
    }

    if (room.game) {
      this.emitError(sessionId, 'This room already started a game.')
      return
    }

    if (room.players.length >= PLAY_MAX_PLAYERS) {
      this.emitError(sessionId, 'This room is full.')
      return
    }

    room.players.push(this.createRoomPlayer(sessionId))
    this.sessionRoomIds.set(sessionId, room.roomId)
    this.emitRoomSnapshots(room)
  }

  private leaveRoom(sessionId: string, requestedRoomId: string) {
    const room = this.getRoomBySession(sessionId)

    if (!room || room.roomId !== normalizeRoomCode(requestedRoomId)) {
      this.emitError(sessionId, 'You are not in that room.')
      return
    }

    if (room.game) {
      this.emitError(sessionId, 'Leaving an active game is not supported yet. Close the tab to disconnect instead.')
      return
    }

    room.players = room.players.filter((player) => player.sessionId !== sessionId)
    this.sessionRoomIds.delete(sessionId)
    this.dependencies.sendToSession(sessionId, {
      type: 'room_left',
      roomId: room.roomId,
    })

    if (room.players.length === 0) {
      this.deleteRoom(room.roomId)
      return
    }

    if (!room.players.some((player) => player.id === room.hostPlayerId)) {
      room.hostPlayerId = room.players[0].id
    }

    this.emitRoomSnapshots(room)
  }

  private selectDeck(sessionId: string, requestedRoomId: string, deck: DeckSelectionSnapshot) {
    const room = this.getRoomBySession(sessionId)

    if (!room || room.roomId !== normalizeRoomCode(requestedRoomId)) {
      this.emitError(sessionId, 'You are not in that room.')
      return
    }

    if (room.game) {
      this.emitError(sessionId, 'Decks cannot be changed after the game starts.')
      return
    }

    const player = room.players.find((entry) => entry.sessionId === sessionId)

    if (!player) {
      this.emitError(sessionId, 'Player not found in room.')
      return
    }

    const normalizedDeck = this.normalizeDeckSelection(deck)

    if (!normalizedDeck) {
      this.emitError(sessionId, 'Unable to use that deck for play.')
      return
    }

    player.selectedDeck = normalizedDeck
    this.emitRoomSnapshots(room)
  }

  private startGame(sessionId: string, requestedRoomId: string) {
    const room = this.getRoomBySession(sessionId)

    if (!room || room.roomId !== normalizeRoomCode(requestedRoomId)) {
      this.emitError(sessionId, 'You are not in that room.')
      return
    }

    if (room.game) {
      this.emitRoomSnapshots(room)
      this.emitGameSnapshots(room)
      return
    }

    const hostPlayer = room.players.find((player) => player.id === room.hostPlayerId)

    if (!hostPlayer || hostPlayer.sessionId !== sessionId) {
      this.emitError(sessionId, 'Only the host can start the game.')
      return
    }

    if (room.players.length < PLAY_MIN_PLAYERS) {
      this.emitError(sessionId, 'You need at least two players to start.')
      return
    }

    if (room.players.some((player) => !player.isConnected)) {
      this.emitError(sessionId, 'All lobby players need to be connected before starting.')
      return
    }

    if (room.players.some((player) => player.selectedDeck === null)) {
      this.emitError(sessionId, 'Every player needs to choose a deck before starting.')
      return
    }

    const startedAt = new Date().toISOString()
    const gameId = crypto.randomUUID()
    const players: GamePlayerState[] = room.players.map((player) => {
      const selectedDeck = player.selectedDeck!
      const library = shuffleCardInstances(expandDeckEntries(selectedDeck.mainboard, player.id))
      const hand = library.splice(0, PLAY_OPENING_HAND_SIZE)

      return {
        id: player.id,
        sessionId: player.sessionId,
        name: player.name,
        isConnected: player.isConnected,
        joinedAt: player.joinedAt,
        selectedDeck: buildDeckSelectionSummary(selectedDeck),
        lifeTotal: PLAY_STARTING_LIFE_TOTAL,
        library,
        hand,
        graveyard: [],
        exile: [],
      }
    })

    room.gameId = gameId
    room.game = {
      gameId,
      roomId: room.roomId,
      createdAt: room.createdAt,
      startedAt,
      players,
      battlefield: [],
      actionLog: [],
    }

    this.gameRoomIds.set(gameId, room.roomId)
    this.recordEvent(
      room.game,
      hostPlayer.id,
      'game_start',
      `${hostPlayer.name} started the game.`,
    )
    this.emitRoomSnapshots(room)
    this.emitGameSnapshots(room)
  }

  private applyGameAction(sessionId: string, gameId: string, action: ClientGameAction) {
    const room = this.getRoomByGameId(gameId)
    const game = room?.game

    if (!room || !game) {
      this.emitError(sessionId, 'Game not found.')
      return
    }

    const actor = game.players.find((player) => player.sessionId === sessionId)

    if (!actor) {
      this.emitError(sessionId, 'You are not part of this game.')
      return
    }

    switch (action.type) {
      case 'shuffle_library': {
        actor.library = shuffleCardInstances(actor.library)
        this.recordEvent(game, actor.id, action.type, `${actor.name} shuffled their library.`)
        break
      }

      case 'draw_card': {
        const nextCard = actor.library.shift()

        if (!nextCard) {
          this.emitError(sessionId, 'Your library is empty.')
          return
        }

        actor.hand.push(nextCard)
        this.recordEvent(game, actor.id, action.type, `${actor.name} drew a card.`)
        break
      }

      case 'move_owned_card': {
        if (action.fromZone === action.toZone) {
          return
        }

        const movedCard = this.takeOwnedCard(game, actor, action.fromZone, action.cardId)

        if (!movedCard) {
          this.emitError(sessionId, 'Card not found in that zone.')
          return
        }

        this.placeOwnedCard(game, actor, action.toZone, movedCard)
        this.recordEvent(
          game,
          actor.id,
          action.type,
          `${actor.name} moved ${movedCard.card.name} from ${this.formatZoneLabel(action.fromZone)} to ${this.formatZoneLabel(action.toZone)}.`,
        )
        break
      }

      case 'tap_card': {
        const permanent = game.battlefield.find(
          (card) =>
            card.instanceId === action.cardId &&
            (card.ownerPlayerId === actor.id || card.controllerPlayerId === actor.id),
        )

        if (!permanent) {
          this.emitError(sessionId, 'Permanent not found on your battlefield.')
          return
        }

        permanent.tapped = action.tapped
        this.recordEvent(
          game,
          actor.id,
          action.type,
          `${actor.name} ${action.tapped ? 'tapped' : 'untapped'} ${permanent.card.name}.`,
        )
        break
      }

      case 'adjust_life': {
        const targetPlayer = game.players.find((player) => player.id === action.playerId)

        if (!targetPlayer) {
          this.emitError(sessionId, 'Target player not found.')
          return
        }

        const normalizedDelta = Math.max(-99, Math.min(99, Math.trunc(action.delta)))

        if (normalizedDelta === 0) {
          return
        }

        targetPlayer.lifeTotal += normalizedDelta
        this.recordEvent(
          game,
          actor.id,
          action.type,
          `${actor.name} changed ${targetPlayer.name}'s life by ${normalizedDelta > 0 ? `+${normalizedDelta}` : normalizedDelta}.`,
        )
        break
      }
    }

    this.emitGameSnapshots(room)
  }

  private takeOwnedCard(
    game: GameState,
    player: GamePlayerState,
    fromZone: OwnedZone,
    cardId: string,
  ) {
    switch (fromZone) {
      case 'hand':
        return removeCardFromZone(player.hand, cardId)
      case 'graveyard':
        return removeCardFromZone(player.graveyard, cardId)
      case 'exile':
        return removeCardFromZone(player.exile, cardId)
      case 'battlefield': {
        const permanentIndex = game.battlefield.findIndex(
          (card) => card.instanceId === cardId && card.ownerPlayerId === player.id,
        )

        if (permanentIndex < 0) {
          return null
        }

        const [permanent] = game.battlefield.splice(permanentIndex, 1)
        return {
          instanceId: permanent.instanceId,
          ownerPlayerId: permanent.ownerPlayerId,
          card: permanent.card,
        }
      }
    }
  }

  private placeOwnedCard(
    game: GameState,
    player: GamePlayerState,
    toZone: OwnedZone,
    card: CardInstance,
  ) {
    switch (toZone) {
      case 'hand':
        player.hand.push(card)
        break
      case 'graveyard':
        player.graveyard.push(card)
        break
      case 'exile':
        player.exile.push(card)
        break
      case 'battlefield':
        game.battlefield.push({
          ...card,
          controllerPlayerId: player.id,
          tapped: false,
          enteredAt: new Date().toISOString(),
        })
        break
    }
  }

  private emitRoomSnapshots(room: RoomState) {
    room.players.forEach((player) => {
      this.dependencies.sendToSession(player.sessionId, {
        type: 'room_snapshot',
        room: this.buildRoomSnapshot(room, player.id),
      })
    })
  }

  private emitGameSnapshots(room: RoomState) {
    if (!room.game) {
      return
    }

    room.game.players.forEach((player) => {
      this.dependencies.sendToSession(player.sessionId, {
        type: 'game_snapshot',
        game: this.buildGameSnapshot(room.game!, player.id),
      })
    })
  }

  private buildRoomSnapshot(room: RoomState, localPlayerId: string): RoomSnapshot {
    return {
      roomId: room.roomId,
      code: room.code,
      phase: room.game ? 'game' : 'lobby',
      createdAt: room.createdAt,
      gameId: room.gameId,
      hostPlayerId: room.hostPlayerId,
      localPlayerId,
      minPlayers: PLAY_MIN_PLAYERS,
      maxPlayers: PLAY_MAX_PLAYERS,
      players: room.players.map((player) => ({
        id: player.id,
        name: player.name,
        isHost: player.id === room.hostPlayerId,
        isConnected: player.isConnected,
        selectedDeck: player.selectedDeck ? buildDeckSelectionSummary(player.selectedDeck) : null,
      })),
    }
  }

  private buildGameSnapshot(game: GameState, localPlayerId: string): GameSnapshot {
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
      },
      graveyard: player.graveyard.map((card) => this.toTableCardSnapshot(card)),
      exile: player.exile.map((card) => this.toTableCardSnapshot(card)),
    }))

    const localPlayer = game.players.find((player) => player.id === localPlayerId) ?? null

    return {
      gameId: game.gameId,
      roomId: game.roomId,
      localPlayerId,
      publicState: {
        gameId: game.gameId,
        roomId: game.roomId,
        createdAt: game.createdAt,
        startedAt: game.startedAt,
        battlefield: game.battlefield.map((card): BattlefieldPermanentSnapshot => ({
          ...this.toTableCardSnapshot(card),
          controllerPlayerId: card.controllerPlayerId,
          tapped: card.tapped,
          enteredAt: card.enteredAt,
        })),
        players: publicPlayers,
        actionLog: game.actionLog,
      },
      privateState: localPlayer
        ? {
            playerId: localPlayer.id,
            hand: localPlayer.hand.map((card) => this.toTableCardSnapshot(card)),
          }
        : null,
    }
  }

  private toTableCardSnapshot(card: CardInstance): TableCardSnapshot {
    return {
      instanceId: card.instanceId,
      ownerPlayerId: card.ownerPlayerId,
      card: card.card,
    }
  }

  private recordEvent(
    game: GameState,
    actorPlayerId: string,
    actionType: GameActionEvent['actionType'],
    message: string,
  ) {
    game.actionLog = [
      {
        id: crypto.randomUUID(),
        actorPlayerId,
        actionType,
        message,
        createdAt: new Date().toISOString(),
      },
      ...game.actionLog,
    ].slice(0, 18)
  }

  private generateUniqueRoomId() {
    let candidate = buildRandomRoomCode()

    while (this.rooms.has(candidate)) {
      candidate = buildRandomRoomCode()
    }

    return candidate
  }

  private createRoomPlayer(sessionId: string): RoomPlayerState {
    return {
      id: crypto.randomUUID(),
      sessionId,
      name: this.getPlayerName(sessionId),
      joinedAt: new Date().toISOString(),
      isConnected: true,
      selectedDeck: null,
    }
  }

  private getPlayerName(sessionId: string) {
    return this.sessionNames.get(sessionId) ?? 'Planeswalker'
  }

  private getRoomBySession(sessionId: string) {
    const roomId = this.sessionRoomIds.get(sessionId)
    return roomId ? this.rooms.get(roomId) ?? null : null
  }

  private getRoomByGameId(gameId: string) {
    const roomId = this.gameRoomIds.get(gameId)
    return roomId ? this.rooms.get(roomId) ?? null : null
  }

  private deleteRoom(roomId: string) {
    const room = this.rooms.get(roomId)

    if (!room) {
      return
    }

    room.players.forEach((player) => {
      this.sessionRoomIds.delete(player.sessionId)
    })

    if (room.gameId) {
      this.gameRoomIds.delete(room.gameId)
    }

    this.rooms.delete(roomId)
  }

  private emitError(sessionId: string, message: string) {
    this.dependencies.sendToSession(sessionId, {
      type: 'error',
      message,
    })
  }

  private normalizeDeckSelection(deck: DeckSelectionSnapshot) {
    if (!deck || !Array.isArray(deck.mainboard)) {
      return null
    }

    const mainboard = deck.mainboard.filter(
      (entry): entry is DeckCardEntry =>
        Boolean(
          entry &&
            typeof entry.quantity === 'number' &&
            entry.quantity > 0 &&
            entry.card &&
            typeof entry.card.id === 'string' &&
            typeof entry.card.name === 'string',
        ),
    )

    if (mainboard.length === 0 || countDeckCards(mainboard) === 0) {
      return null
    }

    return {
      id: deck.id.trim() || crypto.randomUUID(),
      name: deck.name.trim().slice(0, 60) || 'Untitled Deck',
      format: normalizeDeckFormat(deck.format),
      mainboard,
      mainboardCount: countDeckCards(mainboard),
      sideboardCount:
        typeof deck.sideboardCount === 'number' ? Math.max(0, Math.trunc(deck.sideboardCount)) : 0,
    }
  }

  private formatZoneLabel(zone: OwnedZone) {
    switch (zone) {
      case 'battlefield':
        return 'the battlefield'
      case 'graveyard':
        return 'the graveyard'
      case 'exile':
        return 'exile'
      case 'hand':
        return 'their hand'
    }
  }
}
