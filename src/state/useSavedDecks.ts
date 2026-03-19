import { useEffect, useRef, useState } from 'react'

import type { DeckRepository } from '@/decks/deckRepository'
import type { DeckDraft, SavedDeck } from '@/types/deck'

export function useSavedDecks(repository: DeckRepository) {
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null)
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

    return result.savedDeck
  }

  async function deleteDeck(deckId: string) {
    const result = await repository.deleteDeck(deckId, savedDecksRef.current)

    savedDecksRef.current = result.decks
    setSavedDecks(result.decks)
    setLastSyncedAt(result.syncedAt)
  }

  return {
    savedDecks,
    isLoading,
    lastSyncedAt,
    presentation: repository.presentation,
    saveDeck,
    deleteDeck,
  }
}
