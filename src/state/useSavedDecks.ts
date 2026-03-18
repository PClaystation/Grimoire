import { useEffect, useRef, useState } from 'react'

import type { DeckRepository } from '@/decks/deckRepository'
import type { DeckDraft, SavedDeck } from '@/types/deck'

export function useSavedDecks(repository: DeckRepository) {
  const [savedDecks, setSavedDecks] = useState<SavedDeck[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const savedDecksRef = useRef<SavedDeck[]>(savedDecks)

  useEffect(() => {
    savedDecksRef.current = savedDecks
  }, [savedDecks])

  useEffect(() => {
    let isCancelled = false

    setIsLoading(true)

    void (async () => {
      try {
        const nextDecks = await repository.loadDecks()

        if (isCancelled) {
          return
        }

        savedDecksRef.current = nextDecks
        setSavedDecks(nextDecks)
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

    return result.savedDeck
  }

  async function deleteDeck(deckId: string) {
    const nextDecks = await repository.deleteDeck(deckId, savedDecksRef.current)

    savedDecksRef.current = nextDecks
    setSavedDecks(nextDecks)
  }

  return {
    savedDecks,
    isLoading,
    presentation: repository.presentation,
    saveDeck,
    deleteDeck,
  }
}
