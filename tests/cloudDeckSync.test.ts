import test from 'node:test'
import assert from 'node:assert/strict'

import {
  mergeDeckCollections,
  selectLocalDecksForImport,
} from '@/decks/cloudDeckRepository'
import {
  persistDeckSyncStatus,
  readCloudCachedDecks,
  readLocalSavedDecks,
} from '@/decks/localDeckStorage'
import type { SavedDeck } from '@/types/deck'

function createDeck(id: string, updatedAt: string, name = id): SavedDeck {
  return {
    id,
    name,
    format: 'standard',
    createdAt: '2026-03-01T10:00:00.000Z',
    updatedAt,
    mainboard: [
      {
        quantity: 4,
        card: {
          id: `card-${id}`,
          oracleId: null,
          name: `Card ${name}`,
          manaCost: '{1}{U}',
          manaValue: 2,
          releasedAt: '2026-01-01',
          typeLine: 'Creature — Test',
          oracleText: 'Test text',
          colors: ['U'],
          colorIdentity: ['U'],
          setCode: 'tst',
          setName: 'Test Set',
          collectorNumber: '1',
          rarity: 'rare',
          legalities: {
            standard: 'legal',
          },
          imageUrl: 'https://example.com/card.jpg',
          largeImageUrl: 'https://example.com/card-large.jpg',
          prices: {
            usd: 1,
            usdFoil: null,
            eur: null,
            eurFoil: null,
            tix: null,
          },
        },
      },
    ],
    sideboard: [],
    notes: '',
    matchupNotes: '',
    budgetTargetUsd: null,
  }
}

test('selectLocalDecksForImport includes only decks newer than the last sync or cloud copy', () => {
  const localDecks = [
    createDeck('new-local', '2026-03-18T10:15:00.000Z'),
    createDeck('same-but-newer', '2026-03-18T10:20:00.000Z'),
    createDeck('stale-local-cache', '2026-03-18T09:00:00.000Z'),
  ]
  const cloudDecks = [
    createDeck('same-but-newer', '2026-03-18T10:05:00.000Z'),
    createDeck('stale-local-cache', '2026-03-18T09:30:00.000Z'),
  ]

  const selectedDeckIds = selectLocalDecksForImport(
    localDecks,
    cloudDecks,
    '2026-03-18T10:00:00.000Z',
  ).map((deck) => deck.id)

  assert.deepEqual(selectedDeckIds, ['new-local', 'same-but-newer'])
})

test('selectLocalDecksForImport does not resurrect a cached deck deleted after the last sync', () => {
  const localDecks = [createDeck('cached-only', '2026-03-18T08:00:00.000Z')]

  const selectedDecks = selectLocalDecksForImport(
    localDecks,
    [],
    '2026-03-18T09:00:00.000Z',
  )

  assert.equal(selectedDecks.length, 0)
})

test('mergeDeckCollections keeps the newest version of each deck id', () => {
  const mergedDecks = mergeDeckCollections(
    [
      createDeck('older', '2026-03-18T08:00:00.000Z', 'older-local'),
      createDeck('local-only', '2026-03-18T10:00:00.000Z'),
    ],
    [
      createDeck('older', '2026-03-18T09:00:00.000Z', 'older-cloud'),
      createDeck('cloud-only', '2026-03-18T11:00:00.000Z'),
    ],
  )

  assert.deepEqual(
    mergedDecks.map((deck) => [deck.id, deck.name]),
    [
      ['cloud-only', 'cloud-only'],
      ['local-only', 'local-only'],
      ['older', 'older-cloud'],
    ],
  )
})

test('legacy shared storage migrates only into the matching cloud cache and not anonymous local decks', () => {
  const storage = new Map<string, string>()
  const originalWindow = (globalThis as typeof globalThis & { window?: unknown }).window

  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem(key: string) {
          return storage.has(key) ? storage.get(key) ?? null : null
        },
        setItem(key: string, value: string) {
          storage.set(key, value)
        },
        removeItem(key: string) {
          storage.delete(key)
        },
      },
    },
  })

  try {
    storage.set(
      'grimoire.saved-decks.v1',
      JSON.stringify([createDeck('legacy-cloud', '2026-03-18T12:00:00.000Z')]),
    )
    persistDeckSyncStatus('account-a', '2026-03-18T12:05:00.000Z')

    assert.deepEqual(readLocalSavedDecks(), [])
    assert.deepEqual(
      readCloudCachedDecks('account-a').map((deck) => deck.id),
      ['legacy-cloud'],
    )
    assert.deepEqual(readCloudCachedDecks('account-b'), [])
  } finally {
    if (originalWindow === undefined) {
      delete (globalThis as typeof globalThis & { window?: unknown }).window
    } else {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      })
    }
  }
})
