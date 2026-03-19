import { useEffect, useRef, useState } from 'react'

import type { DeckRepository, DeckSyncState } from '@/decks/deckRepository'
import type { DeckDraft, SavedDeck } from '@/types/deck'

export function useSavedDecks(repository: DeckRepository) {
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
  const [syncState, setSyncState] = useState<DeckSyncState>({
    mode: 'local',
    health: 'ready',
    pendingDeckCount: 0,
    message: null,
  })
  const savedDecksRef = useRef<SavedDeck[]>(savedDecks)

  useEffect(() => {
    savedDecksRef.current = savedDecks
  }, [savedDecks])

  useEffect(() => {
    let isCancelled = false

    setIsLoading(true)

    void (async () => {
      try {
        const result = await repository.loadDecks()

        if (isCancelled) {
          return
        }

        savedDecksRef.current = result.decks
        setSavedDecks(result.decks)
        setLastSyncedAt(result.syncedAt)
        setSyncState(result.syncState)
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [repository])

  async function saveDeck(draft: DeckDraft) {
    const result = await repository.saveDeck(draft, savedDecksRef.current)

    savedDecksRef.current = result.decks
    setSavedDecks(result.decks)
    setLastSyncedAt(result.syncedAt)
    setSyncState(result.syncState)

    return result
  }

  async function deleteDeck(deckId: string) {
    const result = await repository.deleteDeck(deckId, savedDecksRef.current)

    savedDecksRef.current = result.decks
    setSavedDecks(result.decks)
    setLastSyncedAt(result.syncedAt)
    setSyncState(result.syncState)

    return result
  }

  return {
    savedDecks,
    isLoading,
    lastSyncedAt,
    syncState,
    presentation: repository.presentation,
    saveDeck,
    deleteDeck,
  }
}
