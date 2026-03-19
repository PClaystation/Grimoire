import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createCloudDeckRepository,
  mergeDeckCollections,
  selectLocalDecksForImport,
} from '@/decks/cloudDeckRepository'
import {
  persistDeckSyncStatus,
  persistPendingDeckImports,
  readCloudCachedDecks,
  readLocalSavedDecks,
  readPendingDeckImports,
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

async function withMockLocalStorage(fn: (storage: Map<string, string>) => Promise<void> | void) {
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
    await fn(storage)
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
  return withMockLocalStorage((storage) => {
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
  })
})

test('pending deck imports still upload after later sync activity advances lastSyncedAt', async () => {
  await withMockLocalStorage(async () => {
    const pendingDeck = createDeck('pending-after-failure', '2026-03-18T10:30:00.000Z')
    persistPendingDeckImports('account-a', [pendingDeck])
    persistDeckSyncStatus('account-a', '2026-03-18T11:00:00.000Z')

    const requestLog: string[] = []
    const repository = createCloudDeckRepository({
      continentalId: 'account-a',
      async requestJson(input, init) {
        const url = String(input)
        requestLog.push(`${init?.method ?? 'GET'} ${url}`)

        if (url.endsWith('/decks') && !init?.method) {
          return {
            decks: [],
            syncedAt: '2026-03-18T11:05:00.000Z',
          }
        }

        if (url.endsWith('/decks/import') && init?.method === 'POST') {
          return {
            decks: [pendingDeck],
            syncedAt: '2026-03-18T11:06:00.000Z',
          }
        }

        throw new Error(`Unexpected request: ${init?.method ?? 'GET'} ${url}`)
      },
    })

    const result = await repository.loadDecks()

    assert.deepEqual(requestLog, ['GET https://mpmc.ddns.net:5000/api/grimoire/decks', 'POST https://mpmc.ddns.net:5000/api/grimoire/decks/import'])
    assert.equal(result.syncState.health, 'ready')
    assert.deepEqual(result.decks.map((deck) => deck.id), ['pending-after-failure'])
    assert.deepEqual(readPendingDeckImports('account-a'), [])
    assert.deepEqual(
      readCloudCachedDecks('account-a').map((deck) => deck.id),
      ['pending-after-failure'],
    )
  })
})
