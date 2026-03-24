import { useEffect, useRef, type Dispatch, type SetStateAction } from 'react'

import { DEFAULT_FILTERS, normalizeCardSearchFilters } from '@/constants/mtg'
import type { DeckDraft } from '@/types/deck'
import type { CardSearchFilters } from '@/types/filters'
import { resolveImportedDeckInput } from '@/utils/resolveImportedDeck'
import { decodeDeckSharePayload } from '@/utils/share'

interface UseSharedDeckQueryLoaderOptions {
  replaceDeck: (draft: DeckDraft) => void
  setDraftFilters: Dispatch<SetStateAction<CardSearchFilters>>
  setAppliedFilters: Dispatch<SetStateAction<CardSearchFilters>>
  setCurrentPage: Dispatch<SetStateAction<number>>
  setStatusMessage: Dispatch<SetStateAction<string | null>>
}

export function useSharedDeckQueryLoader({
  replaceDeck,
  setDraftFilters,
  setAppliedFilters,
  setCurrentPage,
  setStatusMessage,
}: UseSharedDeckQueryLoaderOptions) {
  const hasProcessedSharedDeckRef = useRef(false)

  useEffect(() => {
    if (hasProcessedSharedDeckRef.current) {
      return
    }

    hasProcessedSharedDeckRef.current = true
    const deckParam = new URLSearchParams(window.location.search).get('deck')

    if (!deckParam) {
      return
    }

    const sharedPayload = decodeDeckSharePayload(deckParam)

    if (!sharedPayload) {
      setStatusMessage('Unable to decode the shared deck link.')
      return
    }

    let isCancelled = false

    void (async () => {
      try {
        const importedDeck = await resolveImportedDeckInput(
          JSON.stringify(sharedPayload),
          sharedPayload.format ?? DEFAULT_FILTERS.format,
        )

        if (isCancelled) {
          return
        }

        replaceDeck(importedDeck.deck)
        setDraftFilters((currentFilters) => ({
          ...normalizeCardSearchFilters(currentFilters),
          format: importedDeck.deck.format,
        }))
        setAppliedFilters((currentFilters) => ({
          ...normalizeCardSearchFilters(currentFilters),
          format: importedDeck.deck.format,
        }))
        setCurrentPage(1)

        const suffix =
          importedDeck.missingCards.length > 0
            ? ` Missing ${importedDeck.missingCards.length} unresolved cards.`
            : ''

        setStatusMessage(`Loaded shared deck "${importedDeck.deck.name}".${suffix}`)
      } catch {
        if (!isCancelled) {
          setStatusMessage('Unable to load the shared deck from Scryfall.')
        }
      }
    })()

    return () => {
      isCancelled = true
    }
  }, [replaceDeck, setAppliedFilters, setCurrentPage, setDraftFilters, setStatusMessage])
}
