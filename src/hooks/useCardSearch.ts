import { useEffect, useState } from 'react'

import { searchCards } from '@/api/scryfall'
import type { CardSearchFilters } from '@/types/filters'
import type { MagicCard } from '@/types/scryfall'

interface UseCardSearchState {
  cards: MagicCard[]
  totalCards: number
  hasMore: boolean
  isLoading: boolean
  error: string | null
}

export function useCardSearch(filters: CardSearchFilters, page: number): UseCardSearchState {
  const [cards, setCards] = useState<MagicCard[]>([])
  const [totalCards, setTotalCards] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function runSearch() {
      setIsLoading(true)
      setError(null)

      try {
        const result = await searchCards(filters, page, controller.signal)
        setCards(result.cards)
        setTotalCards(result.totalCards)
        setHasMore(result.hasMore)
      } catch (searchError) {
        if (controller.signal.aborted) {
          return
        }

        setError(
          searchError instanceof Error
            ? searchError.message
            : 'Unable to load cards from Scryfall.',
        )
        setCards([])
        setTotalCards(0)
        setHasMore(false)
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    runSearch()

    return () => {
      controller.abort()
    }
  }, [filters, page])

  return {
    cards,
    totalCards,
    hasMore,
    isLoading,
    error,
  }
}
