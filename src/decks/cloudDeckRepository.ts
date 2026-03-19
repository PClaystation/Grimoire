import { GRIMOIRE_API_BASE } from '@/auth/config'
import type { AuthContextValue } from '@/auth/auth-context'
import type {
  DeckDeleteResult,
  DeckLoadResult,
  DeckRepository,
  DeckSaveResult,
} from '@/decks/deckRepository'
import {
  buildSavedDeckFromDraft,
  persistCloudCachedDecks,
  persistDeckSyncStatus,
  persistLocalSavedDecks,
  readCloudCachedDecks,
  readDeckSyncStatus,
  readLocalSavedDecks,
  removeSavedDeck,
  sortSavedDecks,
  upsertSavedDeck,
} from '@/decks/localDeckStorage'
import type { SavedDeck } from '@/types/deck'

interface RemoteDeckListResponse {
  decks?: SavedDeck[]
  syncedAt?: string | null
}

interface RemoteDeckSaveResponse {
  deck?: SavedDeck
  syncedAt?: string | null
}

interface RemoteDeckImportResponse {
  decks?: SavedDeck[]
  syncedAt?: string | null
}

interface RemoteDeckDeleteResponse {
  deckId?: string
  syncedAt?: string | null
}

function toTimestamp(value: string | null | undefined) {
  const timestamp = Date.parse(String(value || ''))
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function normalizeSyncedAt(value: string | null | undefined) {
  const candidate = String(value || '').trim()
  return toTimestamp(candidate) > 0 ? candidate : null
}

function dedupeDecksById(decks: SavedDeck[]) {
  const deckMap = new Map<string, SavedDeck>()

  for (const deck of decks) {
    const currentDeck = deckMap.get(deck.id)

    if (!currentDeck || toTimestamp(deck.updatedAt) >= toTimestamp(currentDeck.updatedAt)) {
      deckMap.set(deck.id, deck)
    }
  }

  return sortSavedDecks(Array.from(deckMap.values()))
}

export function mergeDeckCollections(primaryDecks: SavedDeck[], secondaryDecks: SavedDeck[]) {
  return dedupeDecksById([...primaryDecks, ...secondaryDecks])
}

export function selectLocalDecksForImport(
  localDecks: SavedDeck[],
  cloudDecks: SavedDeck[],
  lastSyncedAt: string | null,
) {
  const lastSyncedAtTimestamp = toTimestamp(lastSyncedAt)
  const cloudDeckMap = new Map(cloudDecks.map((deck) => [deck.id, deck]))

  return localDecks.filter((localDeck) => {
    const localUpdatedAt = toTimestamp(localDeck.updatedAt)
    const cloudDeck = cloudDeckMap.get(localDeck.id)
    const cloudUpdatedAt = cloudDeck ? toTimestamp(cloudDeck.updatedAt) : 0
    const changedSinceLastSync = lastSyncedAtTimestamp === 0 || localUpdatedAt > lastSyncedAtTimestamp
    const isNewerThanCloud = !cloudDeck || localUpdatedAt > cloudUpdatedAt

    return changedSinceLastSync && isNewerThanCloud
  })
}

function persistCloudSnapshot(continentalId: string, decks: SavedDeck[], syncedAt: string | null) {
  persistCloudCachedDecks(continentalId, decks)
  persistDeckSyncStatus(continentalId, syncedAt)
}

function resolveDeckList(payload: { decks?: SavedDeck[] }) {
  return Array.isArray(payload.decks) ? sortSavedDecks(payload.decks) : []
}

function removeLocalDeckCopies(deckIds: string[]) {
  const normalizedIds = new Set(deckIds.map((deckId) => deckId.trim()).filter(Boolean))
  if (normalizedIds.size === 0) {
    return
  }

  const localDecks = readLocalSavedDecks()
  const nextLocalDecks = localDecks.filter((deck) => !normalizedIds.has(deck.id))

  if (nextLocalDecks.length !== localDecks.length) {
    persistLocalSavedDecks(nextLocalDecks)
  }
}

export function createCloudDeckRepository(options: {
  continentalId: string
  requestJson: AuthContextValue['requestJson']
}): DeckRepository {
  const { continentalId, requestJson } = options

  return {
    id: `cloud:${continentalId}`,
    presentation: {
      badgeLabel: 'Cloud sync',
      subtitle:
        'Saved decks sync to your Continental ID account automatically and stay cached in this browser for faster reloads. Local decks newer than the last successful sync are imported automatically when you sign in.',
      emptyStateDescription:
        'No synced decks yet. Save a deck while signed in and it will sync to your Continental ID account.',
    },
    async loadDecks() {
      const localDecks = readLocalSavedDecks()
      const cachedCloudDecks = readCloudCachedDecks(continentalId)
      const syncStatus = readDeckSyncStatus(continentalId)

      let cloudResponse: RemoteDeckListResponse

      try {
        cloudResponse = await requestJson<RemoteDeckListResponse>(`${GRIMOIRE_API_BASE}/decks`)
      } catch {
        return {
          decks: mergeDeckCollections(localDecks, cachedCloudDecks),
          syncedAt: syncStatus.lastSyncedAt,
        } satisfies DeckLoadResult
      }

      let cloudDecks = resolveDeckList(cloudResponse)
      let syncedAt = normalizeSyncedAt(cloudResponse.syncedAt)
      const decksToImport = selectLocalDecksForImport(localDecks, cloudDecks, syncStatus.lastSyncedAt)

      if (decksToImport.length > 0) {
        try {
          const importResponse = await requestJson<RemoteDeckImportResponse>(
            `${GRIMOIRE_API_BASE}/decks/import`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                decks: decksToImport,
              }),
            },
          )

          cloudDecks = resolveDeckList(importResponse)
          syncedAt = normalizeSyncedAt(importResponse.syncedAt) ?? syncedAt
          removeLocalDeckCopies(decksToImport.map((deck) => deck.id))
        } catch {
          const mergedDecks = mergeDeckCollections(localDecks, cloudDecks)
          persistCloudCachedDecks(continentalId, cloudDecks)

          return {
            decks: mergedDecks,
            syncedAt: syncStatus.lastSyncedAt,
          } satisfies DeckLoadResult
        }
      }

      persistCloudSnapshot(continentalId, cloudDecks, syncedAt)

      return {
        decks: cloudDecks,
        syncedAt,
      } satisfies DeckLoadResult
    },
    async saveDeck(draft, currentDecks) {
      const nextSavedDeck = buildSavedDeckFromDraft(draft, currentDecks)
      const response = await requestJson<RemoteDeckSaveResponse>(
        `${GRIMOIRE_API_BASE}/decks/${encodeURIComponent(nextSavedDeck.id)}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(nextSavedDeck),
        },
      )

      const savedDeck = response.deck ?? nextSavedDeck
      const decks = upsertSavedDeck(savedDeck, currentDecks)
      const syncedAt = normalizeSyncedAt(response.syncedAt)

      removeLocalDeckCopies([savedDeck.id])
      persistCloudSnapshot(continentalId, decks, syncedAt)

      return {
        savedDeck,
        decks,
        syncedAt,
      } satisfies DeckSaveResult
    },
    async deleteDeck(deckId, currentDecks) {
      const response = await requestJson<RemoteDeckDeleteResponse>(
        `${GRIMOIRE_API_BASE}/decks/${encodeURIComponent(deckId)}`,
        {
          method: 'DELETE',
        },
      )

      const decks = removeSavedDeck(deckId, currentDecks)
      const syncedAt = normalizeSyncedAt(response.syncedAt)

      removeLocalDeckCopies([deckId])
      persistCloudSnapshot(continentalId, decks, syncedAt)

      return {
        decks,
        syncedAt,
      } satisfies DeckDeleteResult
    },
  }
}
