import { useMemo } from 'react'

import { useAuth } from '@/auth/useAuth'
import { createCloudDeckRepository } from '@/decks/cloudDeckRepository'
import { createLocalDeckRepository } from '@/decks/localDeckRepository'

export function useDeckRepository() {
  const { status, user, requestJson } = useAuth()

  return useMemo(() => {
    const accountUser = status === 'authenticated' ? user : null
    if (accountUser) {
      return createCloudDeckRepository({
        continentalId: accountUser.continentalId,
        requestJson,
      })
    }

    return createLocalDeckRepository({
      badgeLabel: 'Local only',
      subtitle:
        'Deck snapshots stay in this browser until you sign in. Once you connect Continental ID, saved decks sync to the cloud automatically.',
      emptyStateDescription:
        'Use Save Deck to keep browser-local snapshots, or sign in with Continental ID to sync decks across devices.',
    })
  }, [requestJson, status, user])
}
