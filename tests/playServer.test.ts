import assert from 'node:assert/strict'
import test from 'node:test'

import { PlayServer } from '../server/playServer.ts'
import type {
  GameSnapshot,
  RoomSnapshot,
  ServerMessage,
} from '../src/shared/play.ts'

function createHarness() {
  const sentMessages = new Map<string, ServerMessage[]>()
  const scheduledTimeouts = new Map<number, { callback: () => void; delayMs: number }>()
  let nextTimeoutId = 1

  return {
    clearMessages() {
      sentMessages.clear()
    },
    clearTimeout(timeoutId: ReturnType<typeof globalThis.setTimeout>) {
      scheduledTimeouts.delete(Number(timeoutId))
    },
    roomSnapshotCount(sessionId: string) {
      return (
        sentMessages
          .get(sessionId)
          ?.filter((message) => message.type === 'room_snapshot').length ?? 0
      )
    },
    latestRoomSnapshot(sessionId: string) {
      const roomMessages =
        sentMessages
          .get(sessionId)
          ?.filter((message): message is Extract<ServerMessage, { type: 'room_snapshot' }> => {
            return message.type === 'room_snapshot'
          }) ?? []

      const latestMessage = roomMessages.at(-1)
      assert.ok(latestMessage, `Expected a room snapshot for ${sessionId}.`)
      return latestMessage.room
    },
    latestGameSnapshot(sessionId: string) {
      const gameMessages =
        sentMessages
          .get(sessionId)
          ?.filter((message): message is Extract<ServerMessage, { type: 'game_snapshot' }> => {
            return message.type === 'game_snapshot'
          }) ?? []

      const latestMessage = gameMessages.at(-1)
      assert.ok(latestMessage, `Expected a game snapshot for ${sessionId}.`)
      return latestMessage.game
    },
    pendingTimeoutCount() {
      return scheduledTimeouts.size
    },
    runNextTimeout() {
      const nextEntry = scheduledTimeouts.entries().next().value
      assert.ok(nextEntry, 'Expected a scheduled timeout.')
      const [timeoutId, scheduledTimeout] = nextEntry
      scheduledTimeouts.delete(timeoutId)
      scheduledTimeout.callback()
      return scheduledTimeout.delayMs
    },
    sendToSession(sessionId: string, message: ServerMessage) {
      const existingMessages = sentMessages.get(sessionId) ?? []
      existingMessages.push(message)
      sentMessages.set(sessionId, existingMessages)
    },
    setTimeout(callback: () => void, delayMs: number) {
      const timeoutId = nextTimeoutId
      nextTimeoutId += 1
      scheduledTimeouts.set(timeoutId, { callback, delayMs })
      return timeoutId as ReturnType<typeof globalThis.setTimeout>
    },
  }
}

function findPlayer(room: RoomSnapshot, playerName: string) {
  const player = room.players.find((entry) => entry.name === playerName)
  assert.ok(player, `Expected ${playerName} to exist in the room snapshot.`)
  return player
}

const sampleCard = {
  id: 'card-1',
  oracleId: 'oracle-1',
  name: 'Island',
  manaCost: '',
  manaValue: 0,
  releasedAt: '2024-01-01',
  typeLine: 'Basic Land — Island',
  oracleText: '({T}: Add {U}.)',
  colors: [],
  colorIdentity: ['U'],
  setCode: 'fdn',
  setName: 'Foundations',
  collectorNumber: '257',
  rarity: 'common',
  legalities: {
    standard: 'legal',
  },
  imageUrl: 'https://cards.scryfall.io/normal/front/example.jpg',
  largeImageUrl: 'https://cards.scryfall.io/large/front/example.jpg',
  prices: {
    usd: 0.12,
    usdFoil: 0.2,
    eur: 0.1,
    eurFoil: 0.15,
    tix: null,
  },
}

function createDeck(id: string, name: string) {
  return {
    id,
    name,
    format: 'standard' as const,
    mainboardCount: 12,
    sideboardCount: 0,
    mainboard: [
      {
        quantity: 12,
        card: sampleCard,
      },
    ],
    sideboard: [],
  }
}

function createStartedGame(harness: ReturnType<typeof createHarness>) {
  const playServer = new PlayServer({
    sendToSession: harness.sendToSession,
    disconnectGracePeriodMs: 5_000,
    setTimeout: harness.setTimeout,
    clearTimeout: harness.clearTimeout,
  })

  playServer.handleHello('session-alice', 'Alice')
  playServer.handleMessage('session-alice', { type: 'create_room' })
  const roomId = harness.latestRoomSnapshot('session-alice').roomId

  playServer.handleHello('session-bob', 'Bob')
  playServer.handleMessage('session-bob', { type: 'join_room', roomId })
  playServer.handleMessage('session-alice', {
    type: 'select_deck',
    roomId,
    deck: createDeck('deck-alice', 'Alice Deck'),
  })
  playServer.handleMessage('session-bob', {
    type: 'select_deck',
    roomId,
    deck: createDeck('deck-bob', 'Bob Deck'),
  })
  playServer.handleMessage('session-alice', { type: 'start_game', roomId })

  const aliceGame = harness.latestGameSnapshot('session-alice')
  return {
    playServer,
    roomId,
    gameId: aliceGame.gameId,
  }
}

test('PlayServer keeps a player connected when they reconnect before the grace timeout', () => {
  const harness = createHarness()
  const playServer = new PlayServer({
    sendToSession: harness.sendToSession,
    disconnectGracePeriodMs: 5_000,
    setTimeout: harness.setTimeout,
    clearTimeout: harness.clearTimeout,
  })

  playServer.handleHello('session-alice', 'Alice')
  playServer.handleMessage('session-alice', { type: 'create_room' })
  const roomId = harness.latestRoomSnapshot('session-alice').roomId

  playServer.handleHello('session-bob', 'Bob')
  playServer.handleMessage('session-bob', { type: 'join_room', roomId })

  harness.clearMessages()

  playServer.handleDisconnect('session-bob')

  assert.equal(harness.pendingTimeoutCount(), 1)
  assert.equal(harness.roomSnapshotCount('session-alice'), 0)
  playServer.handleHello('session-bob', 'Bob')

  assert.equal(harness.pendingTimeoutCount(), 0)
  assert.equal(findPlayer(harness.latestRoomSnapshot('session-alice'), 'Bob').isConnected, true)
})

test('PlayServer marks a player disconnected after the grace timeout expires', () => {
  const harness = createHarness()
  const playServer = new PlayServer({
    sendToSession: harness.sendToSession,
    disconnectGracePeriodMs: 5_000,
    setTimeout: harness.setTimeout,
    clearTimeout: harness.clearTimeout,
  })

  playServer.handleHello('session-alice', 'Alice')
  playServer.handleMessage('session-alice', { type: 'create_room' })
  const roomId = harness.latestRoomSnapshot('session-alice').roomId

  playServer.handleHello('session-bob', 'Bob')
  playServer.handleMessage('session-bob', { type: 'join_room', roomId })

  harness.clearMessages()

  playServer.handleDisconnect('session-bob')

  assert.equal(harness.pendingTimeoutCount(), 1)
  assert.equal(harness.runNextTimeout(), 5_000)
  assert.equal(findPlayer(harness.latestRoomSnapshot('session-alice'), 'Bob').isConnected, false)
})

test('PlayServer exposes the local library privately and can move cards out of it', () => {
  const harness = createHarness()
  const { playServer, gameId } = createStartedGame(harness)

  const initialSnapshot = harness.latestGameSnapshot('session-alice')
  const libraryCardId = initialSnapshot.privateState?.library[0]?.instanceId

  assert.ok(libraryCardId, 'Expected a private library card to exist for Alice.')
  assert.equal(initialSnapshot.privateState?.library.length, 5)
  assert.equal(initialSnapshot.privateState?.hand.length, 7)

  playServer.handleMessage('session-alice', {
    type: 'game_action',
    gameId,
    action: {
      type: 'move_owned_card',
      cardId: libraryCardId,
      fromZone: 'library',
      toZone: 'hand',
    },
  })

  const nextSnapshot = harness.latestGameSnapshot('session-alice')
  assert.equal(nextSnapshot.privateState?.library.length, 4)
  assert.equal(nextSnapshot.privateState?.hand.length, 8)
})

test('PlayServer stacks permanents and can unstack them again', () => {
  const harness = createHarness()
  const { playServer, gameId } = createStartedGame(harness)

  const initialSnapshot = harness.latestGameSnapshot('session-alice')
  const firstHandCard = initialSnapshot.privateState?.hand[0]?.instanceId
  const secondHandCard = initialSnapshot.privateState?.hand[1]?.instanceId

  assert.ok(firstHandCard, 'Expected a first hand card for Alice.')
  assert.ok(secondHandCard, 'Expected a second hand card for Alice.')

  playServer.handleMessage('session-alice', {
    type: 'game_action',
    gameId,
    action: {
      type: 'move_owned_card',
      cardId: firstHandCard,
      fromZone: 'hand',
      toZone: 'battlefield',
      position: { x: 24, y: 40 },
    },
  })
  playServer.handleMessage('session-alice', {
    type: 'game_action',
    gameId,
    action: {
      type: 'move_owned_card',
      cardId: secondHandCard,
      fromZone: 'hand',
      toZone: 'battlefield',
      position: { x: 42, y: 40 },
    },
  })

  let stackedSnapshot: GameSnapshot = harness.latestGameSnapshot('session-alice')
  const [firstPermanent, secondPermanent] = stackedSnapshot.publicState.battlefield

  assert.ok(firstPermanent, 'Expected the first permanent on the battlefield.')
  assert.ok(secondPermanent, 'Expected the second permanent on the battlefield.')

  playServer.handleMessage('session-alice', {
    type: 'game_action',
    gameId,
    action: {
      type: 'set_permanent_stack',
      cardId: secondPermanent.instanceId,
      stackWithCardId: firstPermanent.instanceId,
    },
  })

  stackedSnapshot = harness.latestGameSnapshot('session-alice')
  const stackedCards = stackedSnapshot.publicState.battlefield
  const sharedStackId = stackedCards[0]?.stackId

  assert.ok(sharedStackId, 'Expected stacked permanents to share a stack id.')
  assert.equal(stackedCards[0]?.stackId, stackedCards[1]?.stackId)

  playServer.handleMessage('session-alice', {
    type: 'game_action',
    gameId,
    action: {
      type: 'set_permanent_stack',
      cardId: stackedCards[1].instanceId,
      stackWithCardId: null,
    },
  })

  const unstackedSnapshot = harness.latestGameSnapshot('session-alice')
  const unstackedCards = unstackedSnapshot.publicState.battlefield

  assert.equal(unstackedCards[0]?.stackId, null)
  assert.equal(unstackedCards[1]?.stackId, null)
})

test('PlayServer tracks turn state, shared stack items, and player tabletop markers', () => {
  const harness = createHarness()
  const { playServer, gameId } = createStartedGame(harness)
  const initialSnapshot = harness.latestGameSnapshot('session-alice')
  const handCardId = initialSnapshot.privateState?.hand[0]?.instanceId
  const bobPlayer = initialSnapshot.publicState.players.find((player) => player.name === 'Bob')

  assert.ok(handCardId, 'Expected a hand card for Alice.')
  assert.ok(bobPlayer, 'Expected Bob in the game.')
  assert.equal(initialSnapshot.publicState.turn.turnNumber, 1)
  assert.equal(initialSnapshot.publicState.turn.phase, 'untap')

  playServer.handleMessage('session-alice', {
    type: 'game_action',
    gameId,
    action: {
      type: 'advance_turn_phase',
    },
  })
  playServer.handleMessage('session-alice', {
    type: 'game_action',
    gameId,
    action: {
      type: 'adjust_player_counter',
      playerId: bobPlayer.id,
      counterKind: 'poison',
      delta: 3,
    },
  })
  playServer.handleMessage('session-alice', {
    type: 'game_action',
    gameId,
    action: {
      type: 'adjust_commander_tax',
      playerId: bobPlayer.id,
      delta: 2,
    },
  })
  playServer.handleMessage('session-alice', {
    type: 'game_action',
    gameId,
    action: {
      type: 'set_player_designation',
      playerId: bobPlayer.id,
      designation: 'monarch',
      value: true,
    },
  })
  playServer.handleMessage('session-alice', {
    type: 'game_action',
    gameId,
    action: {
      type: 'create_stack_item',
      itemType: 'spell',
      cardId: handCardId,
      fromZone: 'hand',
      note: 'Testing stack sync',
    },
  })

  const nextSnapshot = harness.latestGameSnapshot('session-alice')
  const nextBob = nextSnapshot.publicState.players.find((player) => player.id === bobPlayer.id)

  assert.equal(nextSnapshot.publicState.turn.phase, 'upkeep')
  assert.ok(nextBob, 'Expected Bob to remain in the game snapshot.')
  assert.equal(nextBob.counters.find((counter) => counter.kind === 'poison')?.amount, 3)
  assert.equal(nextBob.commanderTax, 2)
  assert.equal(nextBob.designations.monarch, true)
  assert.equal(nextSnapshot.publicState.stack.length, 1)
  assert.equal(nextSnapshot.privateState?.hand.length, 6)

  playServer.handleMessage('session-alice', {
    type: 'game_action',
    gameId,
    action: {
      type: 'resolve_stack_item',
      stackItemId: nextSnapshot.publicState.stack[0].id,
    },
  })

  const resolvedSnapshot = harness.latestGameSnapshot('session-alice')
  assert.equal(resolvedSnapshot.publicState.stack.length, 0)
  assert.equal(resolvedSnapshot.publicState.battlefield.length, 1)
})

test('PlayServer hides face-down permanents from opponents', () => {
  const harness = createHarness()
  const { playServer, gameId } = createStartedGame(harness)
  const initialSnapshot = harness.latestGameSnapshot('session-alice')
  const handCardId = initialSnapshot.privateState?.hand[0]?.instanceId

  assert.ok(handCardId, 'Expected a hand card for Alice.')

  playServer.handleMessage('session-alice', {
    type: 'game_action',
    gameId,
    action: {
      type: 'move_owned_card',
      cardId: handCardId,
      fromZone: 'hand',
      toZone: 'battlefield',
    },
  })

  const battlefieldSnapshot = harness.latestGameSnapshot('session-alice')
  const permanentId = battlefieldSnapshot.publicState.battlefield[0]?.instanceId
  const originalName = battlefieldSnapshot.publicState.battlefield[0]?.card.name

  assert.ok(permanentId, 'Expected a battlefield permanent.')
  assert.ok(originalName, 'Expected the permanent to have a visible name for its owner.')

  playServer.handleMessage('session-alice', {
    type: 'game_action',
    gameId,
    action: {
      type: 'set_permanent_face_down',
      cardId: permanentId,
      faceDown: true,
    },
  })

  const aliceSnapshot = harness.latestGameSnapshot('session-alice')
  const bobSnapshot = harness.latestGameSnapshot('session-bob')

  assert.equal(aliceSnapshot.publicState.battlefield[0]?.card.name, originalName)
  assert.equal(bobSnapshot.publicState.battlefield[0]?.faceDown, true)
  assert.equal(bobSnapshot.publicState.battlefield[0]?.card.name, 'Face-down card')
})
