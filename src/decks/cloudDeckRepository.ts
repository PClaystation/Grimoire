import { GRIMOIRE_API_BASE } from '@/auth/config'
import type { AuthContextValue } from '@/auth/auth-context'
import type {
  DeckDeleteResult,
  DeckLoadResult,
  DeckRepository,
  DeckSaveResult,
  DeckSyncState,
} from '@/decks/deckRepository'
import {
  buildSavedDeckFromDraft,
  persistCloudCachedDecks,
  persistDeckSyncStatus,
  persistLocalSavedDecks,
  persistPendingDeckImports,
  readCloudCachedDecks,
  readDeckSyncStatus,
  readLocalSavedDecks,
  readPendingDeckImports,
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

function buildPendingSyncMessage(pendingDeckCount: number, fallback = 'Cloud sync will retry automatically.') {
  if (pendingDeckCount <= 0) {
    return fallback
  }

  return pendingDeckCount === 1
    ? '1 deck is waiting to sync to Continental ID. Grimoire will retry automatically.'
    : `${pendingDeckCount} decks are waiting to sync to Continental ID. Grimoire will retry automatically.`
}

function buildCloudSyncState(
  health: DeckSyncState['health'],
  pendingDecks: SavedDeck[],
  message: string | null,
): DeckSyncState {
  return {
    mode: 'cloud',
    health,
    pendingDeckCount: pendingDecks.length,
    message,
  }
}

function resolveDeckList(payload: { decks?: SavedDeck[] }) {
  return Array.isArray(payload.decks) ? sortSavedDecks(payload.decks) : []
}

function removeDeckIds(decks: SavedDeck[], deckIds: string[]) {
  const normalizedIds = new Set(deckIds.map((deckId) => deckId.trim()).filter(Boolean))
  if (normalizedIds.size === 0) {
    return sortSavedDecks(decks)
  }

  return sortSavedDecks(decks.filter((deck) => !normalizedIds.has(deck.id)))
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

function stageLocalDecksForPendingImport(continentalId: string, decksToStage: SavedDeck[]) {
  if (decksToStage.length === 0) {
    return readPendingDeckImports(continentalId)
  }

  const nextPendingDecks = mergeDeckCollections(readPendingDeckImports(continentalId), decksToStage)
  persistPendingDeckImports(continentalId, nextPendingDecks)
  removeLocalDeckCopies(decksToStage.map((deck) => deck.id))
  return nextPendingDecks
}

function persistPendingDecks(continentalId: string, pendingDecks: SavedDeck[]) {
  persistPendingDeckImports(continentalId, sortSavedDecks(pendingDecks))
}

function removePendingDeckCopies(continentalId: string, deckIds: string[]) {
  const nextPendingDecks = removeDeckIds(readPendingDeckImports(continentalId), deckIds)
  persistPendingDecks(continentalId, nextPendingDecks)
  return nextPendingDecks
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
      let pendingDecks = readPendingDeckImports(continentalId)
      const syncStatus = readDeckSyncStatus(continentalId)

      let cloudResponse: RemoteDeckListResponse

      try {
        cloudResponse = await requestJson<RemoteDeckListResponse>(`${GRIMOIRE_API_BASE}/decks`)
      } catch {
        const visibleDecks = mergeDeckCollections(localDecks, mergeDeckCollections(pendingDecks, cachedCloudDecks))

        return {
          decks: visibleDecks,
          syncedAt: syncStatus.lastSyncedAt,
          syncState: buildCloudSyncState(
            pendingDecks.length > 0 ? 'pending' : 'offline',
            pendingDecks,
            pendingDecks.length > 0
              ? buildPendingSyncMessage(pendingDecks.length)
              : 'Continental ID is temporarily unavailable. Showing the latest deck data cached in this browser.',
          ),
        } satisfies DeckLoadResult
      }

      let cloudDecks = resolveDeckList(cloudResponse)
      let syncedAt = normalizeSyncedAt(cloudResponse.syncedAt)
      const localDecksToStage = selectLocalDecksForImport(localDecks, cloudDecks, syncStatus.lastSyncedAt)

      pendingDecks = stageLocalDecksForPendingImport(continentalId, localDecksToStage)
      pendingDecks = selectLocalDecksForImport(pendingDecks, cloudDecks, null)
      persistPendingDecks(continentalId, pendingDecks)

      if (pendingDecks.length > 0) {
        try {
          const importResponse = await requestJson<RemoteDeckImportResponse>(
            `${GRIMOIRE_API_BASE}/decks/import`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                decks: pendingDecks,
              }),
            },
          )

          cloudDecks = resolveDeckList(importResponse)
          syncedAt = normalizeSyncedAt(importResponse.syncedAt) ?? syncedAt
          pendingDecks = removePendingDeckCopies(
            continentalId,
            pendingDecks.map((deck) => deck.id),
          )
        } catch {
          const mergedDecks = mergeDeckCollections(pendingDecks, cloudDecks)
          persistCloudCachedDecks(continentalId, cloudDecks)

          return {
            decks: mergedDecks,
            syncedAt: syncStatus.lastSyncedAt,
            syncState: buildCloudSyncState(
              'pending',
              pendingDecks,
              buildPendingSyncMessage(pendingDecks.length),
            ),
          } satisfies DeckLoadResult
        }
      }

      persistCloudSnapshot(continentalId, cloudDecks, syncedAt)

      return {
        decks: pendingDecks.length > 0 ? mergeDeckCollections(pendingDecks, cloudDecks) : cloudDecks,
        syncedAt,
        syncState: buildCloudSyncState(
          pendingDecks.length > 0 ? 'pending' : 'ready',
          pendingDecks,
          pendingDecks.length > 0 ? buildPendingSyncMessage(pendingDecks.length) : null,
        ),
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
      const cloudDecks = upsertSavedDeck(savedDeck, readCloudCachedDecks(continentalId))
      const syncedAt = normalizeSyncedAt(response.syncedAt)

      removeLocalDeckCopies([savedDeck.id])
      const pendingDecks = removePendingDeckCopies(continentalId, [savedDeck.id])
      persistCloudSnapshot(continentalId, cloudDecks, syncedAt)
      const visibleDecks =
        pendingDecks.length > 0 ? mergeDeckCollections(pendingDecks, cloudDecks) : cloudDecks

      return {
        savedDeck,
        decks: visibleDecks,
        syncedAt,
        syncState: buildCloudSyncState(
          pendingDecks.length > 0 ? 'pending' : 'ready',
          pendingDecks,
          pendingDecks.length > 0 ? buildPendingSyncMessage(pendingDecks.length) : null,
        ),
      } satisfies DeckSaveResult
    },
    async deleteDeck(deckId) {
      const response = await requestJson<RemoteDeckDeleteResponse>(
        `${GRIMOIRE_API_BASE}/decks/${encodeURIComponent(deckId)}`,
        {
          method: 'DELETE',
        },
      )

      const cloudDecks = removeSavedDeck(deckId, readCloudCachedDecks(continentalId))
      const syncedAt = normalizeSyncedAt(response.syncedAt)

      removeLocalDeckCopies([deckId])
      const pendingDecks = removePendingDeckCopies(continentalId, [deckId])
      persistCloudSnapshot(continentalId, cloudDecks, syncedAt)
      const visibleDecks =
        pendingDecks.length > 0 ? mergeDeckCollections(pendingDecks, cloudDecks) : cloudDecks

      return {
        decks: visibleDecks,
        syncedAt,
        syncState: buildCloudSyncState(
          pendingDecks.length > 0 ? 'pending' : 'ready',
          pendingDecks,
          pendingDecks.length > 0 ? buildPendingSyncMessage(pendingDecks.length) : null,
        ),
      } satisfies DeckDeleteResult
    },
  }
}
