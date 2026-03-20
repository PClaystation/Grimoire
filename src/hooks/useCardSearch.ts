import { useEffect, useState } from 'react'

import { searchCards } from '@/api/scryfall'
import type { CardSearchFilters, CardSortOption } from '@/types/filters'
import type { MagicCard } from '@/types/scryfall'

interface UseCardSearchState {
  cards: MagicCard[]
  totalCards: number
  hasMore: boolean
  isLoading: boolean
  error: string | null
}

export function useCardSearch(
  filters: CardSearchFilters,
  sortBy: CardSortOption,
  page: number,
): UseCardSearchState {
  const [cards, setCards] = useState<MagicCard[]>([])
  const [totalCards, setTotalCards] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const filtersKey = JSON.stringify(filters)

  useEffect(() => {
    const controller = new AbortController()
    const stableFilters = JSON.parse(filtersKey) as CardSearchFilters

    async function runSearch() {
      setIsLoading(true)
      setError(null)

      try {
        const result = await searchCards(stableFilters, sortBy, page, controller.signal)
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
  }, [filtersKey, sortBy, page])

  return {
    cards,
    totalCards,
    hasMore,
    isLoading,
    error,
  }
}
