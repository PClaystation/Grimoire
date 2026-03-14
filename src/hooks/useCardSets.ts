import { useEffect, useState } from 'react'

import { fetchCardSets } from '@/api/scryfall'
import type { CardSetOption } from '@/types/filters'

interface UseCardSetsState {
  sets: CardSetOption[]
  isLoading: boolean
  error: string | null
}

export function useCardSets(): UseCardSetsState {
  const [sets, setSets] = useState<CardSetOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function loadSets() {
      setIsLoading(true)
      setError(null)

      try {
        const nextSets = await fetchCardSets(controller.signal)
        setSets(nextSets)
      } catch (setsError) {
        if (controller.signal.aborted) {
          return
        }

        setError(
          setsError instanceof Error ? setsError.message : 'Unable to load MTG set data.',
        )
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }

    loadSets()

    return () => {
      controller.abort()
    }
  }, [])

  return {
    sets,
    isLoading,
    error,
  }
}
