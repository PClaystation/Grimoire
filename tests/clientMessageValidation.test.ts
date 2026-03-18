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
