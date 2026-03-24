import assert from 'node:assert/strict'
import test from 'node:test'

import { parseClientMessage } from '../server/clientMessageValidation.ts'

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

test('parseClientMessage accepts a valid deck selection payload', () => {
  const message = parseClientMessage(
    JSON.stringify({
      type: 'select_deck',
      roomId: 'ABC123',
      deck: {
        id: 'deck-1',
        name: 'Blue Tempo',
        format: 'standard',
        mainboardCount: 60,
        sideboardCount: 15,
        mainboard: [
          {
            quantity: 4,
            card: sampleCard,
          },
        ],
        sideboard: [],
      },
    }),
  )

  assert.ok(message)
  assert.equal(message.type, 'select_deck')
  assert.equal(message.deck.mainboard[0].card.name, 'Island')
})

test('parseClientMessage rejects malformed room and action payloads', () => {
  assert.equal(
    parseClientMessage(
      JSON.stringify({
        type: 'join_room',
        roomId: 12345,
      }),
    ),
    null,
  )

  assert.equal(
    parseClientMessage(
      JSON.stringify({
        type: 'game_action',
        gameId: 'game-1',
        action: {
          type: 'tap_card',
          cardId: 'card-1',
          tapped: 'yes',
        },
      }),
    ),
    null,
  )
})

test('parseClientMessage rejects incomplete card payloads before they reach the game server', () => {
  const message = parseClientMessage(
    JSON.stringify({
      type: 'select_deck',
      roomId: 'ABC123',
      deck: {
        id: 'deck-1',
        name: 'Broken Deck',
        format: 'standard',
        mainboardCount: 60,
        sideboardCount: 0,
        mainboard: [
          {
            quantity: 1,
            card: {
              ...sampleCard,
              imageUrl: undefined,
            },
          },
        ],
        sideboard: [],
      },
    }),
  )

  assert.equal(message, null)
})

test('parseClientMessage accepts library moves and stack actions', () => {
  const libraryMove = parseClientMessage(
    JSON.stringify({
      type: 'game_action',
      gameId: 'game-1',
      action: {
        type: 'move_owned_card',
        cardId: 'card-1',
        fromZone: 'library',
        toZone: 'hand',
      },
    }),
  )

  const stackAction = parseClientMessage(
    JSON.stringify({
      type: 'game_action',
      gameId: 'game-1',
      action: {
        type: 'set_permanent_stack',
        cardId: 'perm-1',
        stackWithCardId: 'perm-2',
      },
    }),
  )

  assert.ok(libraryMove)
  assert.ok(stackAction)
})

test('parseClientMessage accepts room creation and room settings updates with settings payloads', () => {
  const createRoom = parseClientMessage(
    JSON.stringify({
      type: 'create_room',
      settings: {
        visibility: 'public',
        name: 'Commander Corner',
        minPlayers: 2,
        maxPlayers: 4,
        format: 'commander',
        powerLevel: 'focused',
        description: 'Mid-power pod',
        tags: ['budget', 'paper'],
      },
    }),
  )

  const updateRoomSettings = parseClientMessage(
    JSON.stringify({
      type: 'update_room_settings',
      roomId: 'ABC123',
      settings: {
        visibility: 'private',
        maxPlayers: 3,
      },
    }),
  )

  assert.ok(createRoom)
  assert.equal(createRoom.type, 'create_room')
  assert.equal(createRoom.settings?.visibility, 'public')
  assert.ok(updateRoomSettings)
  assert.equal(updateRoomSettings.type, 'update_room_settings')
  assert.equal(updateRoomSettings.settings.maxPlayers, 3)
})

test('parseClientMessage accepts spectator joins and room chat payloads', () => {
  const joinSpectator = parseClientMessage(
    JSON.stringify({
      type: 'join_room',
      roomId: 'ABC123',
      role: 'spectator',
    }),
  )

  const chatMessage = parseClientMessage(
    JSON.stringify({
      type: 'send_chat',
      roomId: 'ABC123',
      message: 'Spectator hello',
    }),
  )

  assert.ok(joinSpectator)
  assert.equal(joinSpectator.type, 'join_room')
  assert.equal(joinSpectator.role, 'spectator')
  assert.ok(chatMessage)
  assert.equal(chatMessage.type, 'send_chat')
})

test('parseClientMessage accepts debug room unlock and placeholder seat actions', () => {
  const unlockDebugMode = parseClientMessage(
    JSON.stringify({
      type: 'unlock_debug_mode',
      password: 'grimoire-lab',
    }),
  )

  const createDebugRoom = parseClientMessage(
    JSON.stringify({
      type: 'create_debug_room',
      settings: {
        name: 'Sandbox',
        minPlayers: 1,
        maxPlayers: 6,
      },
    }),
  )

  const addDebugPlayer = parseClientMessage(
    JSON.stringify({
      type: 'add_debug_player',
      roomId: 'ABC123',
      name: 'Seat 4',
    }),
  )

  const removeDebugPlayer = parseClientMessage(
    JSON.stringify({
      type: 'remove_debug_player',
      roomId: 'ABC123',
      playerId: 'player-4',
    }),
  )

  assert.ok(unlockDebugMode)
  assert.equal(unlockDebugMode.type, 'unlock_debug_mode')
  assert.ok(createDebugRoom)
  assert.equal(createDebugRoom.type, 'create_debug_room')
  assert.ok(addDebugPlayer)
  assert.equal(addDebugPlayer.type, 'add_debug_player')
  assert.ok(removeDebugPlayer)
  assert.equal(removeDebugPlayer.type, 'remove_debug_player')
})

test('parseClientMessage rejects malformed stack payloads', () => {
  const invalidStackAction = parseClientMessage(
    JSON.stringify({
      type: 'game_action',
      gameId: 'game-1',
      action: {
        type: 'set_permanent_stack',
        cardId: 'perm-1',
        stackWithCardId: 42,
      },
    }),
  )

  assert.equal(invalidStackAction, null)
})

test('parseClientMessage rejects malformed room settings payloads', () => {
  const invalidCreateRoom = parseClientMessage(
    JSON.stringify({
      type: 'create_room',
      settings: {
        tags: ['good', 42],
      },
    }),
  )

  const invalidUpdateRoomSettings = parseClientMessage(
    JSON.stringify({
      type: 'update_room_settings',
      roomId: 'ABC123',
      settings: 'public',
    }),
  )

  assert.equal(invalidCreateRoom, null)
  assert.equal(invalidUpdateRoomSettings, null)
})
